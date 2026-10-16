// "+ Agregar otro turno" / "+ Agregar otra especialidad": sumar una opción a la
// lista de la escuela sin salir de la ventana. Se escribe el nombre y queda
// elegida. Si ya existía (aunque se escriba con otras mayúsculas), no se repite:
// se elige la que estaba.

import { useState, type KeyboardEvent } from "react";
import type { DatoDeLista } from "../../../servicios/gestionAcademica";

interface Props {
  /** "Agregar otro turno". */
  etiqueta: string;
  placeholder: string;
  existentes: DatoDeLista[];
  onElegir: (id: string) => void;
  onCrear: (nombre: string) => Promise<DatoDeLista>;
  disabled?: boolean;
}

const comparable = (t: string) => t.replace(/\s+/g, " ").trim().toLocaleLowerCase("es");

export default function AgregarOpcion({ etiqueta, placeholder, existentes, onElegir, onCrear, disabled = false }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cerrar = () => {
    setAbierto(false);
    setNombre("");
    setError("");
  };

  const agregar = async () => {
    if (guardando) return;
    const limpio = nombre.replace(/\s+/g, " ").trim();
    if (!limpio) {
      setError("Escribí el nombre.");
      return;
    }
    const yaEsta = existentes.find((x) => comparable(x.nombre) === comparable(limpio));
    if (yaEsta) {
      onElegir(yaEsta.id);
      cerrar();
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const nuevo = await onCrear(limpio);
      onElegir(nuevo.id);
      cerrar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo agregar.");
    } finally {
      setGuardando(false);
    }
  };

  const alTeclear = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void agregar();
    }
    if (e.key === "Escape") {
      // Que cierre solo esta cajita y no la ventana entera.
      e.preventDefault();
      e.stopPropagation();
      cerrar();
    }
  };

  if (!abierto) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAbierto(true)}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-lg" aria-hidden="true">add</span>
        {etiqueta}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl bg-fondo p-3">
      <div className="flex flex-wrap gap-2">
        <input
          autoFocus
          value={nombre}
          maxLength={40}
          onChange={(e) => { setNombre(e.target.value); setError(""); }}
          onKeyDown={alTeclear}
          placeholder={placeholder}
          aria-label={placeholder}
          className="min-w-0 flex-1 rounded-lg bg-lienzo px-3 py-2.5 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button type="button" onClick={() => void agregar()} disabled={guardando} className="rounded-lg bg-acento px-4 py-2.5 font-bold text-white disabled:opacity-50">
          {guardando ? "Agregando…" : "Agregar"}
        </button>
        <button type="button" onClick={cerrar} className="rounded-lg px-3 py-2.5 font-semibold text-slate-300 hover:bg-white/5">
          Cancelar
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-rose-300">{error}</p>}
    </div>
  );
}
