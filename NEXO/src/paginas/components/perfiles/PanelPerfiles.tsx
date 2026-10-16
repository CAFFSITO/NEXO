// src/paginas/components/perfiles/PanelPerfiles.tsx
// Gestión de Perfiles de la dirección. Lista con búsqueda + filtros (rol/estado),
// paginación, alta/edición por modal y papelera con contador de 7 días.
// Eliminar y borrar definitivamente piden confirmación con un cartel que explica
// qué va a pasar: quien administra suele ser un adulto de la dirección, y un clic
// de más no puede costarle una cuenta.
// Reutilizado por PerfilesAcademicosPage (Gestión de Perfiles de la dirección).
//
// Etapa 3: todo esto ahora es REAL y persiste. El alta crea una cuenta con
// contraseña de verdad (Errores 6.B.3, 6.B.4); la baja manda a la papelera con
// registro de quién y cuándo, y a los 7 días el servidor la borra solo
// (Error 6.B.5, sección 14.17). Ya no se pierde nada al recargar: la lista sale
// siempre de `/api/perfiles`, y después de cada cambio se vuelve a pedir.

import { useMemo, useState } from "react";
import EstadisticasPerfiles from "./EstadisticasPerfiles";
import FiltrosPerfiles, {
  type FiltroEstado,
  type FiltroRol,
} from "./FiltrosPerfiles";
import TablaPerfiles from "./TablaPerfiles";
import ModalPerfil from "./ModalPerfil";
import DialogoConfirmar from "../shared/DialogoConfirmar";
import { type Perfil, type PerfilEditable } from "./tipos";
import {
  usePerfiles,
  crearPerfil,
  editarPerfil,
  enviarAPapelera,
  restaurarPerfilEnServidor,
  borrarDefinitivamente,
} from "../../../servicios/perfiles";
import { usePerfilesEscuela } from "../../../servicios/instancia";
import { Cargando, Fallo } from "../shared/EstadoCarga";

const POR_PAGINA = 5;

// Aviso que aparece tras un alta: las credenciales que la dirección tiene que
// entregarle a la persona. Se muestra UNA vez (la contraseña no se puede volver
// a ver); si se pierde, se usa "olvidé mi contraseña".
interface Credenciales {
  email: string;
  contrasena: string;
}

export default function PanelPerfiles() {
  const { perfiles: perfilesDelServidor, diasPapelera, cargando, error, recargar } = usePerfiles();
  const { perfiles: perfilesEscuela } = usePerfilesEscuela();

  // La lista viene del servidor y es la única verdad. No hay copia en memoria que
  // editar: cada cambio se guarda en la base y se vuelve a leer.
  const perfiles = useMemo(() => perfilesDelServidor ?? [], [perfilesDelServidor]);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState<FiltroRol>("todos");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos");
  const [pagina, setPagina] = useState(1);

  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [perfilEnEdicion, setPerfilEnEdicion] = useState<Perfil | null>(null);

  // Avisos
  const [credenciales, setCredenciales] = useState<Credenciales | null>(null);
  const [avisoError, setAvisoError] = useState("");
  const [avisoExito, setAvisoExito] = useState("");

  // El cartel de "¿Estás seguro?" abierto, y para qué perfil.
  const [aConfirmar, setAConfirmar] = useState<{ accion: "papelera" | "definitivo"; perfil: Perfil } | null>(null);

  // ─── Derivados ──────────────────────────────────────────

  // Para las estadísticas: todo lo que NO está en papelera.
  const perfilesVigentes = useMemo(
    () => perfiles.filter((p) => p.estado !== "papelera"),
    [perfiles],
  );

  const perfilesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return perfiles.filter((p) => {
      // Por defecto la papelera queda oculta salvo que se filtre explícitamente por ella.
      if (filtroEstado === "todos" && p.estado === "papelera") return false;
      if (filtroEstado !== "todos" && p.estado !== filtroEstado) return false;
      if (filtroRol !== "todos" && p.rol !== filtroRol) return false;
      if (q !== "" && !p.nombre.toLowerCase().includes(q) && !p.identificador.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [perfiles, busqueda, filtroRol, filtroEstado]);

  const totalPaginas = Math.max(1, Math.ceil(perfilesFiltrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const perfilesPagina = perfilesFiltrados.slice(
    (paginaSegura - 1) * POR_PAGINA,
    paginaSegura * POR_PAGINA,
  );

  // ─── Handlers de filtros (resetean a la página 1) ───────

  const onBuscar = (texto: string) => {
    setBusqueda(texto);
    setPagina(1);
  };
  const onFiltrarRol = (rol: FiltroRol) => {
    setFiltroRol(rol);
    setPagina(1);
  };
  const onFiltrarEstado = (estado: FiltroEstado) => {
    setFiltroEstado(estado);
    setPagina(1);
  };

  // ─── CRUD (todo contra el servidor) ─────────────────────

  const abrirAlta = () => {
    setPerfilEnEdicion(null);
    setAvisoError("");
    setModalAbierto(true);
  };

  const abrirEdicion = (perfil: Perfil) => {
    setPerfilEnEdicion(perfil);
    setAvisoError("");
    setModalAbierto(true);
  };

  // Devuelve el mensaje de error del servidor (o null si salió bien). El modal lo
  // usa para quedarse abierto y mostrar el motivo de un rechazo.
  const guardarPerfil = async (
    datos: PerfilEditable,
    idEnEdicion: string | null,
  ): Promise<string | null> => {
    if (idEnEdicion) {
      const r = await editarPerfil(idEnEdicion, {
        nombre: datos.nombre,
        rol: datos.rol,
        email: datos.email,
        estado: datos.estado,
        perfilClave: datos.perfilClave || null,
      });
      if (!r.ok) return r.error ?? "No se pudo guardar.";
      cerrarModal();
      recargar();
      return null;
    }

    const r = await crearPerfil({ nombre: datos.nombre, rol: datos.rol, email: datos.email, perfilClave: datos.perfilClave || null, asignaciones: datos.asignaciones ?? [] });
    if (!r.ok) return r.error ?? "No se pudo crear el perfil.";
    // Las credenciales viajan una sola vez: se muestran para que la dirección las
    // copie y se las dé a la persona.
    if (r.email && r.contrasenaInicial) {
      setCredenciales({ email: r.email, contrasena: r.contrasenaInicial });
    }
    cerrarModal();
    setPagina(1);
    recargar();
    return null;
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setPerfilEnEdicion(null);
  };

  const eliminarPerfil = async (perfil: Perfil) => {
    setAvisoError("");
    setAvisoExito("");
    const r = await enviarAPapelera(perfil.id);
    setAConfirmar(null);
    if (!r.ok) setAvisoError(r.error ?? "No se pudo enviar a la papelera.");
    else setAvisoExito(`${perfil.nombre} pasó a la papelera. Para verlo, filtrá por "En papelera".`);
    recargar();
  };

  const restaurarPerfil = async (id: string) => {
    setAvisoError("");
    setAvisoExito("");
    const r = await restaurarPerfilEnServidor(id);
    if (!r.ok) setAvisoError(r.error ?? "No se pudo restaurar.");
    recargar();
  };

  const borrarPerfilParaSiempre = async (perfil: Perfil) => {
    setAvisoError("");
    setAvisoExito("");
    const r = await borrarDefinitivamente(perfil.id);
    setAConfirmar(null);
    if (!r.ok) setAvisoError(r.error ?? "No se pudo borrar el perfil.");
    else setAvisoExito(r.mensaje ?? `${perfil.nombre} se borró definitivamente.`);
    recargar();
  };

  return (
    <>
      {/* Encabezado de sección + acciones */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-white font-headline tracking-tight">
            Perfiles Académicos
          </h2>
          <p className="text-slate-400 mt-1">
            Administra el acceso y roles de toda la comunidad educativa.
          </p>
        </div>
        <button
          onClick={abrirAlta}
          className="flex items-center gap-2 bg-acento hover:opacity-90 active:scale-95 text-white px-5 py-2.5 rounded-full font-bold shadow-lg shadow-acento/20 transition-all self-start"
        >
          <span className="material-symbols-outlined text-xl">person_add</span>
          <span>Nuevo perfil</span>
        </button>
      </div>

      {/* Credenciales recién generadas (se muestran una vez) */}
      {credenciales && (
        <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-green-300 font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">key</span>
                Credenciales del nuevo perfil
              </p>
              <p className="text-slate-300 text-sm mt-2">
                Correo: <span className="font-mono text-white">{credenciales.email}</span>
              </p>
              <p className="text-slate-300 text-sm">
                Contraseña inicial:{" "}
                <span className="font-mono text-white">{credenciales.contrasena}</span>
              </p>
              <p className="text-slate-400 text-xs mt-2">
                Entregáselas a la persona. La primera vez que entre, NEXO le va a ofrecer
                cambiarla. No se van a poder volver a ver: si se pierden, se usa “olvidé mi
                contraseña”.
              </p>
            </div>
            <button
              onClick={() => setCredenciales(null)}
              className="text-slate-400 hover:text-white transition-colors"
              title="Cerrar"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}

      {avisoError && (
        <div className="mb-6 rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">
          {avisoError}
        </div>
      )}
      {avisoExito && (
        <div role="status" className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">
          <span>{avisoExito}</span>
          <button onClick={() => setAvisoExito("")} className="text-slate-400 hover:text-white transition-colors" title="Cerrar">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      {cargando && <Cargando que="los perfiles del colegio" />}
      {error && <Fallo error={error} onReintentar={recargar} />}

      {!cargando && !error && (
        <>
          <EstadisticasPerfiles perfiles={perfilesVigentes} />

          <FiltrosPerfiles
            busqueda={busqueda}
            filtroRol={filtroRol}
            filtroEstado={filtroEstado}
            onBuscar={onBuscar}
            onFiltrarRol={onFiltrarRol}
            onFiltrarEstado={onFiltrarEstado}
          />

          <TablaPerfiles
            perfiles={perfilesPagina}
            totalFiltrados={perfilesFiltrados.length}
            totalGeneral={perfiles.length}
            paginaActual={paginaSegura}
            totalPaginas={totalPaginas}
            onCambiarPagina={setPagina}
            onEditar={abrirEdicion}
            onEliminar={(perfil) => setAConfirmar({ accion: "papelera", perfil })}
            onRestaurar={restaurarPerfil}
            onBorrarDefinitivo={(perfil) => setAConfirmar({ accion: "definitivo", perfil })}
            diasPapelera={diasPapelera}
            perfilesEscuela={perfilesEscuela ?? []}
          />
        </>
      )}

      {aConfirmar?.accion === "papelera" && (
        <DialogoConfirmar
          titulo={`¿Seguro que querés eliminar a ${aConfirmar.perfil.nombre}?`}
          icono="delete"
          textoConfirmar="Sí, eliminar"
          onConfirmar={() => eliminarPerfil(aConfirmar.perfil)}
          onCancelar={() => setAConfirmar(null)}
        >
          <p>Va a pasar a la papelera y no va a poder entrar a NEXO.</p>
          <p>
            {diasPapelera === null
              ? "Lo podés restaurar desde la papelera cuando quieras."
              : `Lo podés restaurar desde la papelera durante ${diasPapelera} ${diasPapelera === 1 ? "día" : "días"}; después se borra para siempre.`}
          </p>
        </DialogoConfirmar>
      )}
      {aConfirmar?.accion === "definitivo" && (
        <DialogoConfirmar
          titulo={`¿Borrar para siempre a ${aConfirmar.perfil.nombre}?`}
          icono="delete_forever"
          tono="peligro"
          textoConfirmar="Sí, borrar para siempre"
          onConfirmar={() => borrarPerfilParaSiempre(aConfirmar.perfil)}
          onCancelar={() => setAConfirmar(null)}
        >
          <p>
            <strong className="text-white">Esto no se puede deshacer.</strong> La cuenta se borra
            y no se puede restaurar.
          </p>
          <p>
            El correo <span className="font-mono text-white">{aConfirmar.perfil.email}</span> queda
            libre para usarlo en un perfil nuevo.
          </p>
        </DialogoConfirmar>
      )}

      {modalAbierto && <ModalPerfil
        key={perfilEnEdicion?.id ?? "nuevo"}
        abierto={modalAbierto}
        perfilEnEdicion={perfilEnEdicion}
        onCerrar={cerrarModal}
        onGuardar={guardarPerfil}
      />}
    </>
  );
}
