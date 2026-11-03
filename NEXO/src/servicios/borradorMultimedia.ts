const NOMBRE = "nexo-multimedia-local";
const ALMACEN = "borradores";
function abrir(): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    const pedido = indexedDB.open(NOMBRE, 2);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      for (const nombre of [ALMACEN, 'capturas', 'fragmentos']) if (!db.objectStoreNames.contains(nombre)) db.createObjectStore(nombre);
      if (!db.objectStoreNames.contains('intentos')) db.createObjectStore('intentos', { keyPath: 'id' }).createIndex('usuarioId', 'usuarioId');
    };
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rechazar(pedido.error);
  });
}
export type CapituloMultimedia = { segundo: number; titulo: string };
export type MetricaAudio = { pausas: number; segundosEnPausa: number; volumenMedioDbfs: number | null; picoDbfs: number | null; umbralPausaDbfs: number; pausaMinimaSegundos: number; intervalos?: {inicio:number;fin:number}[] };
export type DatosMultimedia = { texto?: string; duracion?: number; subtitulos?: { inicio: number; fin: number; texto: string }[]; metricasAudio?: MetricaAudio | null; metricasVideo?: { cuadros: number; luzMedia: number; cambioMedio: number } | null };
export type BorradorMultimedia = DatosMultimedia & { archivo: File; capitulos: CapituloMultimedia[] };
export type IntentoMultimedia = BorradorMultimedia & { id: string; usuarioId: number; titulo: string; creadoEn: string };
export async function guardarBorradorMultimedia(usuarioId: number, archivo: File, capitulos: CapituloMultimedia[] = [], datos: DatosMultimedia = {}): Promise<void> {
  const db = await abrir();
  try { await new Promise<void>((resolver, rechazar) => { const tx = db.transaction(ALMACEN, "readwrite"); tx.objectStore(ALMACEN).put({ archivo, capitulos, ...datos }, usuarioId); tx.oncomplete = () => resolver(); tx.onerror = () => rechazar(tx.error); tx.onabort = () => rechazar(tx.error); }); }
  finally { db.close(); }
}
export async function leerBorradorMultimedia(usuarioId: number): Promise<BorradorMultimedia | null> {
  const db = await abrir();
  try { return await new Promise((resolver, rechazar) => { const pedido = db.transaction(ALMACEN).objectStore(ALMACEN).get(usuarioId); pedido.onsuccess = () => { const valor = pedido.result; resolver(valor instanceof File ? { archivo: valor, capitulos: [] } : valor?.archivo instanceof File ? { ...valor, capitulos: Array.isArray(valor.capitulos) ? valor.capitulos : [] } : null); }; pedido.onerror = () => rechazar(pedido.error); }); }
  finally { db.close(); }
}
async function operar<T>(almacenes: string[], modo: IDBTransactionMode, accion: (tx: IDBTransaction, resolver: (valor: T) => void) => void): Promise<T> {
  const db = await abrir();
  try { return await new Promise<T>((resolver, rechazar) => {
    const tx = db.transaction(almacenes, modo); let resultado: T;
    tx.oncomplete = () => resolver(resultado); tx.onerror = () => rechazar(tx.error); tx.onabort = () => rechazar(tx.error ?? new Error('No se guardó el cambio local.'));
    accion(tx, valor => { resultado = valor; });
  }); } finally { db.close(); }
}
export function iniciarCapturaLocal(usuarioId: number, sesion: string, tipo: string): Promise<void> {
  return operar(['capturas','fragmentos'], 'readwrite', tx => {
    tx.objectStore('fragmentos').delete(IDBKeyRange.bound([usuarioId], [usuarioId, []]));
    tx.objectStore('capturas').put({ sesion, tipo }, usuarioId);
  });
}
export function guardarFragmentoLocal(usuarioId: number, sesion: string, numero: number, blob: Blob): Promise<void> {
  return operar(['capturas','fragmentos'], 'readwrite', tx => {
    const p = tx.objectStore('capturas').get(usuarioId);
    p.onsuccess = () => { if (p.result?.sesion === sesion) tx.objectStore('fragmentos').put(blob, [usuarioId, sesion, numero]); };
  });
}
export function recuperarCapturaLocal(usuarioId: number): Promise<File | null> {
  return operar(['capturas','fragmentos'], 'readonly', (tx, resolver) => {
    const p = tx.objectStore('capturas').get(usuarioId);
    p.onsuccess = () => {
      const c = p.result; if (!c) { resolver(null); return; }
      const partes = tx.objectStore('fragmentos').getAll(IDBKeyRange.bound([usuarioId,c.sesion], [usuarioId,c.sesion,[]]));
      partes.onsuccess = () => resolver(partes.result.length ? new File(partes.result, `nexo-recuperada-${c.sesion}.${c.tipo.includes('mp4') ? 'mp4' : 'webm'}`, { type: c.tipo }) : null);
    };
  });
}
export function finalizarCapturaLocal(usuarioId: number, sesion: string): Promise<void> {
  return operar(['capturas','fragmentos'], 'readwrite', tx => {
    const p = tx.objectStore('capturas').get(usuarioId);
    p.onsuccess = () => { if (p.result?.sesion === sesion) {
      tx.objectStore('capturas').delete(usuarioId);
      tx.objectStore('fragmentos').delete(IDBKeyRange.bound([usuarioId,sesion], [usuarioId,sesion,[]]));
    } };
  });
}
export function guardarIntentoLocal(usuarioId: number, titulo: string, borrador: BorradorMultimedia): Promise<string> {
  const id = `${usuarioId}:${crypto.randomUUID()}`;
  return operar(['intentos'], 'readwrite', (tx,resolver) => { tx.objectStore('intentos').put({ ...borrador, id, usuarioId, titulo: titulo.trim() || borrador.archivo.name, creadoEn: new Date().toISOString() }); resolver(id); });
}
export function listarIntentosLocales(usuarioId: number): Promise<IntentoMultimedia[]> {
  return operar(['intentos'], 'readonly', (tx,resolver) => { const p = tx.objectStore('intentos').index('usuarioId').getAll(usuarioId); p.onsuccess = () => resolver(p.result.sort((a: IntentoMultimedia,b: IntentoMultimedia) => b.creadoEn.localeCompare(a.creadoEn))); });
}
export function quitarIntentoLocal(usuarioId: number, id: string): Promise<void> {
  return operar(['intentos'], 'readwrite', tx => { const s = tx.objectStore('intentos'); const p = s.get(id); p.onsuccess = () => { if (p.result?.usuarioId === usuarioId) s.delete(id); }; });
}
