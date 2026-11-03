import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/** Un detalle conserva su identidad al recargar y al volver desde el chat. */
export function useDetalleEnRuta(clave: string): [string | null, (id: string | null) => void] {
  const [parametros, setParametros] = useSearchParams();
  const cambiar = useCallback((id: string | null) => {
    setParametros(previos => {
      const siguientes = new URLSearchParams(previos);
      if (id) siguientes.set(clave, id);
      else siguientes.delete(clave);
      if (id && clave === "tarea") siguientes.delete("correccion");
      if (id && clave === "correccion") siguientes.delete("tarea");
      if (clave === "tarea" || clave === "correccion") siguientes.delete("entrega");
      return siguientes;
    });
  }, [clave, setParametros]);
  return [parametros.get(clave), cambiar];
}
