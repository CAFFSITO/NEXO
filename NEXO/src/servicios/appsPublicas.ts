import { enviar, pedir } from './api';

export type BloqueApp = { id: string; tipo: 'texto' | 'enlace' | 'accionable' | 'embed' | 'encuesta' | 'juego' | 'bienvenida' | 'reserva' | 'chat' | 'foro' | 'ayuda' | 'sugerencias' | 'directorio' | 'tablon' | 'propuestas' | 'desafio' | 'documento' | 'formulario' | 'curso'; titulo: string; contenido: string; ruta?: string; dependeDe?: string; opciones?: string[]; correcta?: number; capacidad?: number; evidencia?: { estado: 'sin-evaluar' | 'favorable' | 'mixta' | 'insuficiente' | 'desfavorable'; fuente: string; resumen?: string; limites?: string; revisadoEn?: string|null; fuentes?: {titulo:string;url:string}[] } };
export type DefinicionApp = { nombre: string; descripcion: string; bloques: BloqueApp[] };
export type AppPublica = { id: number; nombre: string; descripcion: string; versionActual: number; publicada?: boolean; definicion: DefinicionApp; versiones?: { version: number; creadaEn: string }[] };
export type InstanciaApp = { id: number; appId: number; nombre: string; version: number; revision: number; configuracion: { nombre?: string; bloques?: Record<string,{catedraId?:number|string}> }; datos: Record<string, boolean | string>; definicion: DefinicionApp };

export const catalogoApps = () => pedir<AppPublica[]>('/api/apps-publicas/catalogo');
export const appsMaestro = () => pedir<AppPublica[]>('/api/apps-publicas/maestro');
export const instalacionesApps = () => pedir<InstanciaApp[]>('/api/apps-publicas/instancias');
export const crearApp = (d: DefinicionApp) => enviar('/api/apps-publicas/maestro', 'POST', d);
export const nuevaVersionApp = (id: number, d: DefinicionApp) => enviar(`/api/apps-publicas/maestro/${id}/versiones`, 'POST', d);
export const publicarApp = (id: number, publicada: boolean) => enviar(`/api/apps-publicas/maestro/${id}/publicacion`, 'PUT', { publicada });
export const instalarApp = (appId: number, nombre?: string) => enviar<InstanciaApp>('/api/apps-publicas/instancias', 'POST', { appId, nombre });
export const cambiarInstanciaApp = (i: InstanciaApp, operacion: 'version' | 'configuracion' | 'datos', cambio: Record<string, unknown>) =>
  enviar<InstanciaApp>(`/api/apps-publicas/instancias/${i.id}`, 'PUT', { revision: i.revision, operacion, ...cambio });

export const capacidadesApp = ["chat","foro","ayuda","sugerencias","directorio","tablon","propuestas","desafio","documento","formulario","curso"] as const;
