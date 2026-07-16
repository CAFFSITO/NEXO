// ============================================================================
// NEXO — Cifrado de contraseñas (scrypt)
// ----------------------------------------------------------------------------
// Único lugar de todo el proyecto donde se cifra y se verifica una contraseña.
// Si algún día hay que cambiar el algoritmo, se cambia acá y en ningún otro lado.
//
// Por qué scrypt y no SHA-256: SHA-256 está diseñado para ser RÁPIDO, y esa es
// exactamente la propiedad que no se quiere en una contraseña — quien robe la
// base puede probar millones de claves por segundo. scrypt está diseñado para
// ser lento y para consumir mucha memoria, lo que vuelve la fuerza bruta cara.
// Viene incluido en Node (node:crypto): no hay nada que instalar.
//
// Formato guardado en usuarios.hash_contrasena:
//   scrypt$N$r$p$<sal en hexadecimal>$<hash en hexadecimal>
// Los parámetros viajan adentro del texto para poder endurecerlos en el futuro
// sin invalidar las contraseñas ya guardadas.
// ============================================================================

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

// Parámetros de costo. N es el principal: subirlo al doble duplica el trabajo
// que cuesta probar una contraseña. 16384 usa ~16 MB por intento.
const N = 16384;
const R = 8;
const P = 1;
const LARGO_CLAVE = 32; // bytes del hash resultante
const LARGO_SAL = 16;   // bytes de sal aleatoria, distinta para cada usuario

/**
 * Cifra una contraseña en texto plano. Devuelve el texto listo para guardar
 * en la columna usuarios.hash_contrasena.
 */
export async function hashearContrasena(contrasenaPlana) {
  const sal = randomBytes(LARGO_SAL);
  const hash = await scryptAsync(contrasenaPlana, sal, LARGO_CLAVE, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${sal.toString("hex")}$${hash.toString("hex")}`;
}

/**
 * Compara una contraseña tecleada contra lo guardado en la base.
 * Nunca lanza: ante un hash con formato inválido devuelve false.
 */
export async function verificarContrasena(contrasenaPlana, guardado) {
  if (typeof guardado !== "string") return false;

  const partes = guardado.split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;

  const [, nTexto, rTexto, pTexto, salHex, hashHex] = partes;
  const n = Number(nTexto);
  const r = Number(rTexto);
  const p = Number(pTexto);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  let salEsperada;
  let hashEsperado;
  try {
    salEsperada = Buffer.from(salHex, "hex");
    hashEsperado = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  if (hashEsperado.length === 0) return false;

  const hashCalculado = await scryptAsync(contrasenaPlana, salEsperada, hashEsperado.length, {
    N: n,
    r,
    p,
    // scrypt necesita ~128*N*r bytes; el límite por defecto de Node (32 MB) se
    // queda corto si algún día se sube N, así que lo dimensionamos al parámetro.
    maxmem: 256 * n * r,
  });

  // Comparación de tiempo constante: comparar con === filtra información sobre
  // cuántos bytes coincidieron y abre la puerta a ataques de temporización.
  return timingSafeEqual(hashCalculado, hashEsperado);
}
