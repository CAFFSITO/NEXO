// Apps educativas públicas: la definición viaja; la configuración y los datos no.
import { usuarioDeLaSesion } from './sesiones.js';
import { ventanilla } from './comun.js';
import { normalizarFichaEvidencia } from './personalizacion.js';
import { registrarCapacidadesApps, prepararCapacidadesApp } from './apps-publicas-capacidades.js';

const TIPOS = new Set(['texto', 'enlace', 'accionable', 'embed', 'encuesta', 'juego', 'bienvenida', 'reserva','chat','foro','ayuda','sugerencias','directorio','tablon','propuestas','desafio','documento','formulario','curso']);
const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
const cadena = (v, max = 180) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const json = (v) => JSON.stringify(v);
const leer = (v) => JSON.parse(v);

function validarDefinicion(entrada) {
  const d = objeto(entrada);
  const nombre = cadena(d.nombre, 100);
  const descripcion = cadena(d.descripcion, 500);
  if (!nombre) throw new Error('La app necesita un nombre.');
  if (!Array.isArray(d.bloques) || d.bloques.length < 1 || d.bloques.length > 40) throw new Error('Agregá entre 1 y 40 bloques.');
  const ids = new Set();
  const bloques = d.bloques.map((valor, indice) => {
    const b = objeto(valor);
    const id = cadena(b.id, 40) || `bloque-${indice + 1}`;
    const tipo = cadena(b.tipo, 25);
    const titulo = cadena(b.titulo, 100);
    if (!/^[\w-]+$/.test(id) || ids.has(id) || !TIPOS.has(tipo) || !titulo) throw new Error(`Bloque ${indice + 1} inválido.`);
    ids.add(id);
    const contenido = cadena(b.contenido, 4000);
    const ruta = cadena(b.ruta, 300);
    if (tipo === 'enlace' && (!/^\/[a-zA-Z0-9/_?=&%.-]+$/.test(ruta) || ruta.startsWith('//'))) throw new Error(`El enlace de ${titulo} debe ser una ruta interna de NEXO.`);
    if (tipo === 'embed' && (!/^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/[\w./?=&%-]*)?$/i.test(ruta) || ruta.includes('..'))) throw new Error(`La página embebida de ${titulo} requiere HTTPS.`);
    const dependeDe = cadena(b.dependeDe,40);
    if (dependeDe && (dependeDe === id || !ids.has(dependeDe))) throw new Error(`La condición de ${titulo} debe apuntar a un bloque anterior.`);
    const opciones = ['encuesta','juego','reserva'].includes(tipo) ? (Array.isArray(b.opciones) ? b.opciones.map(o => cadena(o,160)) : []) : [];
    if (['encuesta','juego','reserva'].includes(tipo) && (opciones.length < (tipo==='reserva'?1:2) || opciones.length > 8 || opciones.some(o => !o))) throw new Error(`${titulo} requiere entre ${tipo==='reserva'?1:2} y 8 opciones.`);
    const capacidad = tipo === 'reserva' ? Number(b.capacidad) : null;
    if(tipo==='reserva'&&(!Number.isInteger(capacidad)||capacidad<1||capacidad>1000))throw new Error(`${titulo} necesita una capacidad por turno de 1 a 1000.`);
    const correcta = tipo === 'juego' ? Number(b.correcta) : null;
    if (tipo === 'juego' && (!Number.isInteger(correcta) || correcta < 0 || correcta >= opciones.length)) throw new Error(`${titulo} necesita una respuesta correcta.`);
    const evidencia = objeto(b.evidencia);
    const ficha = normalizarFichaEvidencia({...evidencia,id:`app-${id.toLowerCase()}`,tipo:'app',fuentes:Array.isArray(evidencia.fuentes)?evidencia.fuentes:cadena(evidencia.fuente,500)?[{titulo:'Fuente declarada por el creador',url:evidencia.fuente}]:[]});
    return { id, tipo, titulo, contenido, ...(ruta && ['enlace','embed'].includes(tipo) ? { ruta } : {}),
      ...(dependeDe ? { dependeDe } : {}), ...(opciones.length ? { opciones } : {}), ...(tipo==='juego' ? { correcta } : {}), ...(tipo==='reserva' ? { capacidad } : {}),
      evidencia:{...ficha,fuente:ficha.fuentes[0]?.url??''} };
  });
  return { nombre, descripcion, bloques };
}

export function registrarAppsPublicas(app, db) {
  db.exec(`CREATE TABLE IF NOT EXISTS apps_publicas (
    id INTEGER PRIMARY KEY, creador_id INTEGER NOT NULL REFERENCES usuarios(id), nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL, version_actual INTEGER NOT NULL DEFAULT 1,
    publicada INTEGER NOT NULL DEFAULT 0, creada_en TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS apps_publicas_versiones (
    app_id INTEGER NOT NULL REFERENCES apps_publicas(id), version INTEGER NOT NULL,
    definicion TEXT NOT NULL, creada_en TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (app_id, version));
    CREATE TABLE IF NOT EXISTS apps_publicas_instancias (
    id INTEGER PRIMARY KEY, app_id INTEGER NOT NULL REFERENCES apps_publicas(id),
    institucion_id INTEGER NOT NULL REFERENCES instituciones(id), version INTEGER NOT NULL,
    nombre TEXT NOT NULL, configuracion TEXT NOT NULL DEFAULT '{}', datos TEXT NOT NULL DEFAULT '{}',
    revision INTEGER NOT NULL DEFAULT 1, creada_en TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE INDEX IF NOT EXISTS idx_apps_instancias_institucion ON apps_publicas_instancias(institucion_id);`);
  db.exec(`CREATE TABLE IF NOT EXISTS apps_publicas_usuario_datos (
    instancia_id INTEGER NOT NULL REFERENCES apps_publicas_instancias(id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id), datos TEXT NOT NULL DEFAULT '{}',
    PRIMARY KEY(instancia_id, usuario_id));`);
  registrarCapacidadesApps(app,db);

  function usuario(req, res, maestro = false) {
    const u = usuarioDeLaSesion(db, req);
    if (!u) { res.status(401).json({ error: 'No hay sesión abierta.' }); return null; }
    if (maestro ? u.rol !== 'administrador' : u.rol !== 'admin-academico') {
      res.status(403).json({ error: 'Esta acción requiere el perfil correspondiente.' }); return null;
    }
    return u;
  }
  function responderError(res, fn) {
    try { fn(); } catch (e) { res.status(400).json({ error: e.message }); }
  }
  const appPorId = db.prepare('SELECT * FROM apps_publicas WHERE id = ?');
  const versionPorId = db.prepare('SELECT definicion FROM apps_publicas_versiones WHERE app_id = ? AND version = ?');
  const instanciaPorId = db.prepare('SELECT * FROM apps_publicas_instancias WHERE id = ? AND institucion_id = ?');
  const serializarInstancia = (fila) => ({ id: fila.id, appId: fila.app_id, nombre: fila.nombre, version: fila.version,
    revision: fila.revision, configuracion: leer(fila.configuracion), datos: leer(fila.datos),
    definicion: leer(versionPorId.get(fila.app_id, fila.version).definicion) });

  app.get('/api/apps-publicas/maestro', ventanilla((req, res) => {
    if (!usuario(req, res, true)) return;
    const filas = db.prepare('SELECT * FROM apps_publicas ORDER BY id DESC').all();
    res.json(filas.map((f) => ({ id: f.id, nombre: f.nombre, descripcion: f.descripcion, versionActual: f.version_actual,
      publicada: Boolean(f.publicada), definicion: leer(versionPorId.get(f.id, f.version_actual).definicion),
      versiones: db.prepare('SELECT version, creada_en AS creadaEn FROM apps_publicas_versiones WHERE app_id = ? ORDER BY version DESC').all(f.id) })));
  }));
  app.post('/api/apps-publicas/maestro', ventanilla((req, res) => {
    const u = usuario(req, res, true); if (!u) return;
    responderError(res, () => {
      const d = validarDefinicion(req.body);
      db.exec('BEGIN');
      let id;
      try {
        id = Number(db.prepare('INSERT INTO apps_publicas(creador_id,nombre,descripcion) VALUES(?,?,?)').run(u.id,d.nombre,d.descripcion).lastInsertRowid);
        db.prepare('INSERT INTO apps_publicas_versiones(app_id,version,definicion) VALUES(?,1,?)').run(id,json(d));
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      res.status(201).json({ id, version: 1 });
    });
  }));
  app.post('/api/apps-publicas/maestro/:id/versiones', ventanilla((req, res) => {
    if (!usuario(req, res, true)) return;
    responderError(res, () => {
      const a = appPorId.get(req.params.id); if (!a) return res.status(404).json({ error: 'App inexistente.' });
      const d = validarDefinicion(req.body);
      const version = a.version_actual + 1;
      db.exec('BEGIN');
      try {
        db.prepare('INSERT INTO apps_publicas_versiones(app_id,version,definicion) VALUES(?,?,?)').run(a.id,version,json(d));
        db.prepare('UPDATE apps_publicas SET nombre=?, descripcion=?, version_actual=? WHERE id=?').run(d.nombre,d.descripcion,version,a.id);
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      res.status(201).json({ id: a.id, version });
    });
  }));
  app.put('/api/apps-publicas/maestro/:id/publicacion', ventanilla((req, res) => {
    if (!usuario(req, res, true)) return;
    const cambio = db.prepare('UPDATE apps_publicas SET publicada=? WHERE id=?').run(req.body?.publicada === true ? 1 : 0,req.params.id);
    if (!cambio.changes) return res.status(404).json({ error: 'App inexistente.' });
    res.json({ publicada: req.body?.publicada === true });
  }));
  app.get('/api/apps-publicas/catalogo', ventanilla((req, res) => {
    if (!usuario(req, res)) return;
    const filas = db.prepare('SELECT * FROM apps_publicas WHERE publicada=1 ORDER BY nombre').all();
    res.json(filas.map((f) => ({ id: f.id, nombre: f.nombre, descripcion: f.descripcion,
      versionActual: f.version_actual, definicion: leer(versionPorId.get(f.id,f.version_actual).definicion) })));
  }));
  app.get('/api/apps-publicas/instancias', ventanilla((req, res) => {
    const u = usuario(req, res); if (!u) return;
    res.json(db.prepare('SELECT * FROM apps_publicas_instancias WHERE institucion_id=? ORDER BY id DESC').all(u.institucionId).map(serializarInstancia));
  }));
  app.get('/api/apps-publicas/comunidad', ventanilla((req, res) => {
    const u = usuarioDeLaSesion(db, req);
    if (!u) return res.status(401).json({ error: 'No hay sesión abierta.' });
    if (!u.institucionId) return res.json([]);
    const filas = db.prepare('SELECT * FROM apps_publicas_instancias WHERE institucion_id=? ORDER BY id DESC').all(u.institucionId);
    const dato = db.prepare('SELECT datos FROM apps_publicas_usuario_datos WHERE instancia_id=? AND usuario_id=?');
    res.json(filas.map(f => ({ id:f.id, nombre:f.nombre, version:f.version,
      definicion:leer(versionPorId.get(f.app_id,f.version).definicion), datos:leer(dato.get(f.id,u.id)?.datos ?? '{}') })));
  }));
  const resumen=(instanciaId,definicion)=>{
    const bloques=definicion.bloques.filter(b=>['encuesta','reserva'].includes(b.tipo));
    const totales=Object.fromEntries(bloques.map(b=>[b.id,Array(b.opciones.length).fill(0)]));
    const filas=db.prepare('SELECT datos FROM apps_publicas_usuario_datos WHERE instancia_id=?').all(instanciaId);
    for(const fila of filas){const datos=leer(fila.datos);for(const b of bloques){const indice=Number(datos[b.id]);
      if(typeof datos[b.id]==='string'&&Number.isInteger(indice)&&indice>=0&&indice<b.opciones.length&&String(indice)===datos[b.id])totales[b.id][indice]++;}}
    return totales;
  };
  app.get('/api/apps-publicas/comunidad/:id/resumen',ventanilla((req,res)=>{
    const u=usuarioDeLaSesion(db,req);if(!u)return res.status(401).json({error:'No hay sesión abierta.'});
    const i=instanciaPorId.get(req.params.id,u.institucionId);if(!i)return res.status(404).json({error:'Instalación inexistente.'});
    const definicion=leer(versionPorId.get(i.app_id,i.version).definicion);
    res.json({totales:resumen(i.id,definicion)});
  }));
  app.put('/api/apps-publicas/comunidad/:id/reservas/:bloqueId',ventanilla((req,res)=>{
    const u=usuarioDeLaSesion(db,req);if(!u)return res.status(401).json({error:'No hay sesión abierta.'});
    const i=instanciaPorId.get(req.params.id,u.institucionId);if(!i)return res.status(404).json({error:'Instalación inexistente.'});
    const definicion=leer(versionPorId.get(i.app_id,i.version).definicion);
    const b=definicion.bloques.find(x=>x.id===req.params.bloqueId&&x.tipo==='reserva');
    if(!b)return res.status(404).json({error:'Reserva inexistente.'});
    const opcion=req.body?.opcion;
    if(opcion!==null&&(!Number.isInteger(opcion)||opcion<0||opcion>=b.opciones.length))return res.status(400).json({error:'Turno inválido.'});
    db.exec('BEGIN IMMEDIATE');
    try{
      const fila=db.prepare('SELECT datos FROM apps_publicas_usuario_datos WHERE instancia_id=? AND usuario_id=?').get(i.id,u.id);
      const datos=fila?leer(fila.datos):{};
      if(opcion!==null&&b.dependeDe&&!datos[b.dependeDe]){db.exec('ROLLBACK');return res.status(409).json({error:'Completá primero el bloque requerido.'});}
      const anterior=datos[b.id];
      if(opcion===null)delete datos[b.id];else datos[b.id]=String(opcion);
      const totales=resumen(i.id,definicion);
      if(opcion!==null&&anterior!==String(opcion)&&totales[b.id][opcion]>=b.capacidad){db.exec('ROLLBACK');return res.status(409).json({error:'No quedan lugares para ese turno.'});}
      db.prepare(`INSERT INTO apps_publicas_usuario_datos(instancia_id,usuario_id,datos) VALUES(?,?,?)
        ON CONFLICT(instancia_id,usuario_id) DO UPDATE SET datos=excluded.datos`).run(i.id,u.id,json(datos));
      db.exec('COMMIT');res.json({datos,totales:resumen(i.id,definicion)});
    }catch(e){db.exec('ROLLBACK');throw e;}
  }));
  app.put('/api/apps-publicas/comunidad/:id/datos', ventanilla((req, res) => {
    const u = usuarioDeLaSesion(db, req);
    if (!u) return res.status(401).json({ error: 'No hay sesión abierta.' });
    const i = instanciaPorId.get(req.params.id,u.institucionId);
    if (!i) return res.status(404).json({ error: 'Instalación inexistente.' });
    const definicion = leer(versionPorId.get(i.app_id,i.version).definicion);
    const acciones = new Set(definicion.bloques.filter(b=>['accionable','bienvenida','encuesta','juego'].includes(b.tipo)).map(b=>b.id));
    const cambios = Object.fromEntries(Object.entries(objeto(req.body?.datos)).filter(([k,v]) => {
      if(!acciones.has(k))return false;
      const b=definicion.bloques.find(x=>x.id===k);
      if(['encuesta','juego'].includes(b.tipo))return typeof v==='string'&&/^\d$/.test(v)&&Number(v)<b.opciones.length;
      return typeof v==='boolean';
    }));
    const previo=leer(db.prepare('SELECT datos FROM apps_publicas_usuario_datos WHERE instancia_id=? AND usuario_id=?').get(i.id,u.id)?.datos??'{}');
    // Cada interacción modifica sólo sus bloques; otra pestaña no borra avances independientes.
    const datos={...previo,...cambios};
    for(const b of definicion.bloques)if(Object.hasOwn(cambios,b.id)&&cambios[b.id]!==false&&b.dependeDe&&!datos[b.dependeDe])return res.status(409).json({error:'Completá primero el bloque requerido.'});
    db.prepare(`INSERT INTO apps_publicas_usuario_datos(instancia_id,usuario_id,datos) VALUES(?,?,?)
      ON CONFLICT(instancia_id,usuario_id) DO UPDATE SET datos=excluded.datos`).run(i.id,u.id,json(datos));
    res.json({ datos });
  }));
  app.post('/api/apps-publicas/instancias', ventanilla((req, res) => {
    const u = usuario(req, res); if (!u) return;
    const a = appPorId.get(req.body?.appId);
    if (!a || !a.publicada) return res.status(404).json({ error: 'App no publicada.' });
    const nombre = cadena(req.body?.nombre, 100) || a.nombre;
    db.exec('BEGIN IMMEDIATE');let id;
    try {id = Number(db.prepare('INSERT INTO apps_publicas_instancias(app_id,institucion_id,version,nombre) VALUES(?,?,?,?)').run(a.id,u.institucionId,a.version_actual,nombre).lastInsertRowid);
      prepararCapacidadesApp(db,instanciaPorId.get(id,u.institucionId),leer(versionPorId.get(a.id,a.version_actual).definicion),u);
      db.exec('COMMIT');
    } catch(e) {db.exec('ROLLBACK');throw e;}
    res.status(201).json(serializarInstancia(instanciaPorId.get(id,u.institucionId)));
  }));
  app.put('/api/apps-publicas/instancias/:id', ventanilla((req, res) => {
    const u = usuario(req, res); if (!u) return;
    const i = instanciaPorId.get(req.params.id,u.institucionId);
    if (!i) return res.status(404).json({ error: 'Instalación inexistente.' });
    if (req.body?.revision !== i.revision) return res.status(409).json({ error: 'La instalación cambió. Recargá antes de guardar.' });
    responderError(res, () => {
      const operacion = req.body?.operacion;
      if (operacion === 'version') {
        const version = Number(req.body.version);
        if (!Number.isInteger(version) || !versionPorId.get(i.app_id,version)) throw new Error('Versión inexistente.');
        const anterior=leer(versionPorId.get(i.app_id,i.version).definicion);
        const siguiente=leer(versionPorId.get(i.app_id,version).definicion);
        const conteos=resumen(i.id,anterior);
        for(const b of anterior.bloques.filter(x=>x.tipo==='reserva')){
          if(!conteos[b.id]?.some(n=>n>0))continue;
          const nuevo=siguiente.bloques.find(x=>x.id===b.id&&x.tipo==='reserva');
          if(!nuevo||json(nuevo.opciones)!==json(b.opciones)||conteos[b.id].some(n=>n>nuevo.capacidad))
            throw new Error('Hay reservas activas: conservá sus turnos y capacidad o pedí que se cancelen antes de actualizar.');
        }
        db.exec('BEGIN IMMEDIATE');try{prepararCapacidadesApp(db,i,siguiente,u);db.prepare('UPDATE apps_publicas_instancias SET version=?, revision=revision+1 WHERE id=? AND institucion_id=?').run(version,i.id,u.institucionId);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
      } else if (operacion === 'configuracion') {
        const config = objeto(req.body.configuracion);
        const nombre = cadena(config.nombre,100) || i.nombre;
        const bloques={...objeto(leer(i.configuracion).bloques)};
        const definicion=leer(versionPorId.get(i.app_id,i.version).definicion);
        for(const [id,valor] of Object.entries(objeto(config.bloques))){const b=definicion.bloques.find(b=>b.id===id&&b.tipo==='curso');if(!b)throw new Error('Sólo se configura una cátedra para bloques curso.');const catedraId=Number(objeto(valor).catedraId);if(!Number.isSafeInteger(catedraId)||!db.prepare('SELECT 1 FROM catedras ca JOIN cursos c ON c.id=ca.curso_id WHERE ca.id=? AND c.institucion_id=?').get(catedraId,u.institucionId))throw new Error('Cátedra de otra institución o inexistente.');bloques[id]={catedraId};}
        db.prepare('UPDATE apps_publicas_instancias SET nombre=?, configuracion=?, revision=revision+1 WHERE id=? AND institucion_id=?').run(nombre,json({nombre,bloques}),i.id,u.institucionId);
      } else if (operacion === 'datos') {
        const d = objeto(req.body.datos);
        const definicion = leer(versionPorId.get(i.app_id,i.version).definicion);
        const acciones = new Set(definicion.bloques.filter(b=>['accionable','bienvenida','encuesta','juego'].includes(b.tipo)).map(b=>b.id));
        const datos = Object.fromEntries(Object.entries(d).filter(([k,v]) => acciones.has(k) && typeof v === 'boolean'));
        db.prepare('UPDATE apps_publicas_instancias SET datos=?, revision=revision+1 WHERE id=? AND institucion_id=?').run(json(datos),i.id,u.institucionId);
      } else throw new Error('Operación inválida.');
      res.json(serializarInstancia(instanciaPorId.get(i.id,u.institucionId)));
    });
  }));
}
