import { createHash } from 'node:crypto';

const huella = valor => createHash('sha256').update(String(valor)).digest('hex');
export const idExportacion = (cuentaId, tipo, nativoId) => huella(`nexo:${cuentaId}:${tipo}:${nativoId}`);
export function uuidExportacion(...partes) {
  const h=huella(partes.join(':'));
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}
export const fechaValida = valor => /^\d{4}-\d{2}-\d{2}$/.test(valor||'') && Number.isFinite(Date.parse(`${valor}T00:00:00Z`)) && new Date(`${valor}T00:00:00Z`).toISOString().slice(0,10)===valor;
const diaSiguiente = fecha => new Date(Date.parse(`${fecha}T00:00:00Z`)+86400000).toISOString().slice(0,10);
export function eventoCalendar(nativo, id, zona) {
  if (!fechaValida(nativo.fecha) || (nativo.fecha_fin && !fechaValida(nativo.fecha_fin))) throw new Error('El evento tiene una fecha inválida.');
  if (nativo.recurrencia) throw new Error('La exportación de eventos recurrentes aún no está disponible.');
  if (nativo.hora_inicio && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(nativo.hora_inicio)) throw new Error('La hora inicial es inválida.');
  if (nativo.hora_inicio && !zona) throw new Error('Indicá una zona horaria IANA para exportar un evento con hora.');
  if (zona) { try { new Intl.DateTimeFormat('es',{timeZone:zona}); } catch { throw new Error('Zona horaria inválida.'); } }
  if (nativo.hora_inicio && (!nativo.hora_fin || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(nativo.hora_fin))) throw new Error('El evento con hora necesita una hora final válida.');
  const fin=nativo.fecha_fin||nativo.fecha;
  const horario=!!nativo.hora_inicio;
  if(fin<nativo.fecha || (horario&&fin===nativo.fecha&&nativo.hora_fin<=nativo.hora_inicio))throw new Error('El final del evento debe ser posterior al inicio.');
  return {id,summary:nativo.titulo,description:nativo.descripcion||'',
    start:horario?{dateTime:`${nativo.fecha}T${nativo.hora_inicio}:00`,timeZone:zona}:{date:nativo.fecha},
    end:horario?{dateTime:`${fin}T${nativo.hora_fin}:00`,timeZone:zona}:{date:diaSiguiente(fin)},
    extendedProperties:{private:{nexoExportId:id}}};
}
export function tareaTodoist(nativo) {
  if (nativo.fecha_limite && !fechaValida(nativo.fecha_limite)) throw new Error('La tarea tiene una fecha inválida.');
  return {content:nativo.titulo,description:nativo.descripcion||'',...(nativo.fecha_limite?{due:{date:nativo.fecha_limite}}:{})};
}
export function camposCalendar(x) {return {summary:x.summary||'',description:x.description||'',start:x.start,end:x.end};}
export function camposTodoist(x) {return {content:x.content||'',description:x.description||'',due:x.due?.date?.slice(0,10)||null};}
export const huellaCampos = x => huella(JSON.stringify(x));
export async function enviarComandoTodoist(transportar, token, comando) {
  const resultado=await transportar('https://api.todoist.com/api/v1/sync',token,{method:'POST',form:{commands:JSON.stringify([comando])},headers:{'Content-Type':'application/x-www-form-urlencoded'}});
  const estado=resultado.sync_status?.[comando.uuid];
  if(estado!=='ok')throw new Error(`Todoist no aplicó la exportación: ${typeof estado==='object'?estado?.error||'error de comando':'respuesta incompleta'}.`);
  return resultado;
}
