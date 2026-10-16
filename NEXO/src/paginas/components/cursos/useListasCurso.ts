// Las listas de turnos y especialidades de la escuela, tal como llegaron del
// servidor más las que se sumaron recién desde la ventana (así aparecen al
// instante, sin volver a cargar todo el formulario).

import { useState } from "react";
import { crearEspecialidad, crearTurno, type DatoDeLista } from "../../../servicios/gestionAcademica";

const unir = (base: DatoDeLista[], nuevas: DatoDeLista[]) => [...base, ...nuevas.filter((n) => !base.some((b) => b.id === n.id))];

export function useListasCurso(base: { turnos?: DatoDeLista[]; especialidades?: DatoDeLista[] } | null | undefined) {
  const [turnosNuevos, setTurnosNuevos] = useState<DatoDeLista[]>([]);
  const [especialidadesNuevas, setEspecialidadesNuevas] = useState<DatoDeLista[]>([]);
  return {
    turnos: unir(base?.turnos ?? [], turnosNuevos),
    especialidades: unir(base?.especialidades ?? [], especialidadesNuevas),
    agregarTurno: async (nombre: string) => {
      const nuevo = await crearTurno(nombre);
      setTurnosNuevos((l) => [...l, nuevo]);
      return nuevo;
    },
    agregarEspecialidad: async (nombre: string) => {
      const nueva = await crearEspecialidad(nombre);
      setEspecialidadesNuevas((l) => [...l, nueva]);
      return nueva;
    },
  };
}
