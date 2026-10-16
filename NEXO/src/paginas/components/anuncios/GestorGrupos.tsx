// Los grupos de difusión de una escuela, como tarjetas de su color: quién le
// habla a quién, cuántos avisos pasaron por ahí, y el botón para editarlos.
// Lo usan la dirección (su escuela) y el Maestro (la escuela que elija).

import { useState } from "react";
import { useDatos } from "../../../servicios/api";
import { estiloAviso, iconoDestino, nombreTipo, type GrupoAnuncios, type GruposDeEscuela, type PersonaAnuncio } from "../../../servicios/anuncios";
import Avatar from "./Avatar";
import EditorGrupo from "./EditorGrupo";

function Caras({ personas, maximo = 5 }: { personas: PersonaAnuncio[]; maximo?: number }) {
  const resto = personas.length - maximo;
  return (
    <span className="av-caras" title={personas.map((p) => p.nombre).join(", ")}>
      {personas.slice(0, maximo).map((p) => <Avatar key={p.id} persona={p} className="chico" />)}
      {resto > 0 && <span className="av-avatar chico">+{resto}</span>}
    </span>
  );
}

function TarjetaGrupo({ grupo, onEditar }: { grupo: GrupoAnuncios; onEditar: () => void }) {
  const vacio = <span className="opacity-70">nadie</span>;
  return (
    <article className="av-grupo" style={estiloAviso(grupo.color)}>
      <h3>{grupo.nombre}</h3>
      {grupo.descripcion && <p>{grupo.descripcion}</p>}
      <span className="av-pill">
        <span className="material-symbols-outlined" aria-hidden="true">{iconoDestino(grupo.tipo)}</span>
        <span>{nombreTipo(grupo.tipo)}</span>
      </span>
      <div className="av-grupo-flujo">
        {grupo.tipo === "muchos-a-muchos" ? (
          <>
            {grupo.miembros.length ? <Caras personas={grupo.miembros} maximo={7} /> : vacio}
            <span className="material-symbols-outlined" aria-hidden="true">sync_alt</span>
            <span>{grupo.miembros.length} personas</span>
          </>
        ) : (
          <>
            {grupo.emisores.length ? <Caras personas={grupo.emisores} /> : vacio}
            <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
            {grupo.receptores.length ? <Caras personas={grupo.receptores} /> : vacio}
          </>
        )}
      </div>
      <p className="mt-3">
        {grupo.enviados === 1 ? "1 aviso enviado" : `${grupo.enviados} avisos enviados`}
        {grupo.creadoPor ? ` · creado por ${grupo.creadoPor}` : ""}
      </p>
      <div className="av-grupo-acciones">
        <button type="button" onClick={onEditar}>
          <span className="material-symbols-outlined" aria-hidden="true">edit</span>
          Editar
        </button>
      </div>
    </article>
  );
}

export default function GestorGrupos({ institucionId }: { institucionId?: string }) {
  const ruta = "/api/anuncios/grupos" + (institucionId ? `?institucion=${encodeURIComponent(institucionId)}` : "");
  const { datos, cargando, error, recargar } = useDatos<GruposDeEscuela>(ruta);
  const [editando, setEditando] = useState<GrupoAnuncios | "nuevo" | null>(null);

  if (cargando && !datos) return <p className="text-sm text-on-surface-variant">Cargando los grupos…</p>;
  if (error && !datos) {
    return (
      <div className="av-panel flex flex-wrap items-center justify-between gap-3 text-sm">
        <span>{error}</span>
        <button type="button" className="av-boton suave chico" onClick={recargar}>Reintentar</button>
      </div>
    );
  }
  if (!datos) return null;

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-3xl text-sm leading-relaxed text-on-surface-variant">
        Cada grupo decide quién le puede escribir a quién. <b className="text-white">Uno a muchos</b>: una persona avisa a varias.{" "}
        <b className="text-white">Muchos a uno</b>: varias personas le escriben a una sola, en un mismo lugar.{" "}
        <b className="text-white">Todos con todos</b>: cualquiera avisa y les llega a los demás. Las tarjetas de cada grupo llevan su color.
      </p>
      <div className="av-grupos">
        {datos.grupos.map((g) => <TarjetaGrupo key={g.id} grupo={g} onEditar={() => setEditando(g)} />)}
        <button type="button" className="av-grupo-nuevo" onClick={() => setEditando("nuevo")}>
          <span className="material-symbols-outlined" aria-hidden="true">add_circle</span>
          Nuevo grupo
        </button>
      </div>
      {datos.personas.length < 2 && (
        <p className="text-sm text-on-surface-variant">
          Para armar grupos hacen falta al menos dos personas de la dirección o la preceptoría con cuenta activa.
        </p>
      )}
      {editando && (
        <EditorGrupo
          grupo={editando === "nuevo" ? null : editando}
          personas={datos.personas}
          paleta={datos.paleta}
          institucionId={institucionId}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); recargar(); }}
        />
      )}
    </div>
  );
}
