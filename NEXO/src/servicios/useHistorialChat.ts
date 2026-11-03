import { useCallback, useEffect, useRef, useState } from "react";
import { pedir } from "./api";
import type { Mensaje, PaginaMensajes } from "./chat";

type Historial = { clave: string; mensajes: Mensaje[]; siguiente: string | null };
/** Revalida el tramo visible completo sin perder páginas ni dejar huecos al reconectar. */
export function useHistorialChat(id: string | null, busqueda: string) {
  const clave = JSON.stringify([id, busqueda]);
  const [historial, setHistorial] = useState<Historial | null>(null);
  const ultimo = useRef<Historial | null>(null);
  const [revision, setRevision] = useState(0);
  const [estado, setEstado] = useState<{ clave: string; revision: number; error: string | null } | null>(null);
  const [pendiente, setPendiente] = useState<string | null>(null);
  const [fallo, setFallo] = useState<{ clave: string; mensaje: string } | null>(null);
  const generacion = useRef(0);
  const enCurso = useRef(false);
  const guardar = useCallback((h: Historial) => { ultimo.current = h; setHistorial(h); }, []);
  useEffect(() => {
    const turno = ++generacion.current;
    if (!id) return;
    const controlador = new AbortController();
    const previo = ultimo.current?.clave === clave ? ultimo.current : null;
    const hasta = previo?.mensajes[0]?.id;
    const ruta = `/api/chat/conversaciones/${id}/mensajes?limite=50&q=${encodeURIComponent(busqueda)}`;
    const cargar = async () => {
      try {
        let pagina = await pedir<PaginaMensajes>(ruta, controlador.signal);
        let lista = pagina.mensajes;
        while (hasta && pagina.siguienteAntes && Number(pagina.siguienteAntes) > Number(hasta)) {
          pagina = await pedir<PaginaMensajes>(`${ruta}&antes=${pagina.siguienteAntes}`, controlador.signal);
          lista = [...pagina.mensajes, ...lista];
        }
        if (turno !== generacion.current || controlador.signal.aborted) return;
        guardar({ clave, mensajes: lista, siguiente: pagina.siguienteAntes });
        setEstado({ clave, revision, error: null });
      } catch (e) {
        if (turno === generacion.current && !controlador.signal.aborted) setEstado({ clave, revision, error: e instanceof Error ? e.message : "No se pudo cargar el historial." });
      }
    };
    void cargar();
    return () => { generacion.current = turno + 1; controlador.abort(); };
  }, [id, busqueda, clave, revision, guardar]);
  const vigente = historial?.clave === clave ? historial : null;
  const cargando = !!id && !(estado?.clave === clave && estado.revision === revision);
  const cargarAnteriores = async () => {
    if (!id || !vigente?.siguiente || enCurso.current || cargando) return;
    enCurso.current = true; setPendiente(clave); setFallo(null);
    const turno = generacion.current;
    try {
      const pagina = await pedir<PaginaMensajes>(`/api/chat/conversaciones/${id}/mensajes?limite=50&antes=${vigente.siguiente}&q=${encodeURIComponent(busqueda)}`);
      if (turno === generacion.current) guardar({ clave, mensajes: [...pagina.mensajes, ...vigente.mensajes], siguiente: pagina.siguienteAntes });
    } catch (e) { if (turno === generacion.current) setFallo({ clave, mensaje: e instanceof Error ? e.message : "No se pudo cargar el historial." }); }
    finally { enCurso.current = false; setPendiente(null); }
  };
  const recargar = useCallback(() => { ++generacion.current; setRevision(r => r + 1); setFallo(null); }, []);
  return { mensajes: vigente?.mensajes ?? null, cargando, error: estado?.clave === clave ? estado.error : null,
    recargar, cargarAnteriores, hayAnteriores: !!vigente?.siguiente,
    cargandoAnteriores: pendiente === clave || cargando, errorAnteriores: fallo?.clave === clave ? fallo.mensaje : null };
}
