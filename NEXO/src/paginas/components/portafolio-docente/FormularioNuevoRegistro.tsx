// src/paginas/components/portafolio-docente/FormularioNuevoRegistro.tsx
// Formulario controlado para crear una nueva entrada del Diario Reflexivo.
// Valida campos obligatorios y delega la creación al padre vía onGuardar.

import { useState } from "react";
import type { Registro } from "./TarjetaRegistro";

// Datos que produce el formulario (sin id — lo asigna el padre)
export type NuevoRegistro = Omit<Registro, "id">;

interface FormularioNuevoRegistroProps {
  materiasCurso: string[];
  onGuardar: (registro: NuevoRegistro) => void;
  /**
   * Si viene, el formulario arranca en modo edición con estos valores. La
   * pantalla lo remonta (con `key`) al cambiar de registro, así que alcanza con
   * leerlo una vez en el estado inicial; no hace falta sincronizarlo después.
   */
  valorInicial?: NuevoRegistro | null;
  /** Salir del modo edición sin guardar. Solo aparece cuando se está editando. */
  onCancelar?: () => void;
}

const ESTADO_INICIAL = {
  fecha: "",
  materiaCurso: "",
  resumen: "",
  queFunciono: "",
  queMejorar: "",
};

// "Sin registrar." es lo que guarda el formulario cuando el campo quedó vacío.
// Al editar no lo mostramos como texto a borrar: vuelve a quedar en blanco.
const vacioSiSinRegistrar = (texto: string) =>
  texto === "Sin registrar." ? "" : texto;

export default function FormularioNuevoRegistro({
  materiasCurso,
  onGuardar,
  valorInicial = null,
  onCancelar,
}: FormularioNuevoRegistroProps) {
  const editando = valorInicial !== null;

  const [form, setForm] = useState(() =>
    valorInicial
      ? {
          fecha: valorInicial.fecha,
          materiaCurso: valorInicial.materiaCurso,
          resumen: valorInicial.resumen,
          queFunciono: vacioSiSinRegistrar(valorInicial.queFunciono),
          queMejorar: vacioSiSinRegistrar(valorInicial.queMejorar),
        }
      : { ...ESTADO_INICIAL, materiaCurso: materiasCurso[0] ?? "" }
  );
  const [error, setError] = useState<string>("");

  // El registro que se edita puede tener una etiqueta (ej. la de un dato
  // sembrado) que no está entre las cátedras del docente: la sumamos como
  // opción para que el desplegable no la pierda.
  const opciones =
    form.materiaCurso && !materiasCurso.includes(form.materiaCurso)
      ? [form.materiaCurso, ...materiasCurso]
      : materiasCurso;

  const actualizar = (
    campo: keyof typeof ESTADO_INICIAL,
    valor: string
  ) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (error) setError("");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validación de campos obligatorios
    if (!form.fecha) {
      setError("Indicá la fecha de la sesión.");
      return;
    }
    if (!form.resumen.trim()) {
      setError("Escribí un resumen de la sesión.");
      return;
    }

    // El título se deriva del resumen (primeras palabras) para dar identidad a la tarjeta
    const titulo =
      form.resumen.trim().split(/\s+/).slice(0, 5).join(" ") +
      (form.resumen.trim().split(/\s+/).length > 5 ? "…" : "");

    // Guardar (crear o editar). La pantalla decide qué hacer con el resultado y
    // remonta el formulario limpio si salió bien; si falla, conserva lo escrito.
    onGuardar({
      titulo,
      fecha: form.fecha,
      materiaCurso: form.materiaCurso,
      resumen: form.resumen.trim(),
      queFunciono: form.queFunciono.trim() || "Sin registrar.",
      queMejorar: form.queMejorar.trim() || "Sin registrar.",
    });
  };

  return (
    <section className="bg-[#2D1B4E] p-6 rounded-lg shadow-xl mb-12 border border-[#C548F5]/20">
      <div className="flex items-center gap-2 mb-6 text-[#C548F5]">
        <span className="material-symbols-outlined">edit_note</span>
        <h3 className="text-xl font-bold font-headline">
          {editando ? "Editar registro" : "Nuevo registro"}
        </h3>
      </div>

      <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-tight font-label">
                Fecha
              </label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e) => actualizar("fecha", e.target.value)}
                className="bg-[#1C1030] border-none rounded-full px-4 py-2 text-white focus:ring-2 focus:ring-[#C548F5]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-tight font-label">
                Materia / Curso
              </label>
              <select
                value={form.materiaCurso}
                onChange={(e) => actualizar("materiaCurso", e.target.value)}
                className="bg-[#1C1030] border-none rounded-full px-4 py-2 text-white focus:ring-2 focus:ring-[#C548F5]"
              >
                {opciones.map((mc) => (
                  <option key={mc}>{mc}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-tight font-label">
              Resumen de la sesión
            </label>
            <textarea
              rows={3}
              value={form.resumen}
              onChange={(e) => actualizar("resumen", e.target.value)}
              placeholder="Describe brevemente el tema tratado..."
              className="bg-[#1C1030] border-none rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[#C548F5] resize-none"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-tight font-label">
              ¿Qué funcionó?
            </label>
            <textarea
              rows={2}
              value={form.queFunciono}
              onChange={(e) => actualizar("queFunciono", e.target.value)}
              placeholder="Aspectos positivos y logros..."
              className="bg-[#1C1030] border-l-4 border-[#10B981] rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[#C548F5] resize-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-tight font-label">
              ¿Qué mejorar?
            </label>
            <textarea
              rows={2}
              value={form.queMejorar}
              onChange={(e) => actualizar("queMejorar", e.target.value)}
              placeholder="Desafíos y ajustes necesarios..."
              className="bg-[#1C1030] border-l-4 border-[#F59E0B] rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-[#C548F5] resize-none"
            />
          </div>

          {error && (
            <p className="text-[#EF4444] text-sm font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </p>
          )}

          <div className="flex justify-end items-center gap-3 pt-2">
            {editando && onCancelar && (
              <button
                type="button"
                onClick={onCancelar}
                className="text-slate-400 font-bold px-5 py-3 rounded-full hover:text-white transition-colors font-label"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="bg-[#C548F5] text-white font-bold px-8 py-3 rounded-full hover:shadow-[0_0_20px_rgba(197,72,245,0.4)] transition-all active:scale-95 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              {editando ? "Actualizar registro" : "Guardar registro"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
