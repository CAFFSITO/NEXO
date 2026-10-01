// Actualizaciones aditivas: conservar siempre las bases existentes.
export function migrarBase(db) {
  const columnas = db.prepare("PRAGMA table_info(evidencias)").all();
  if (!columnas.some((columna) => columna.name === "tarea_id")) {
    db.exec("ALTER TABLE evidencias ADD COLUMN tarea_id INTEGER REFERENCES tareas(id)");
  }
}
