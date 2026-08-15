/**
 * Validación de códigos de descuento.
 *
 * Vive aquí y no en el endpoint para que el checkout use exactamente la misma
 * lógica: así nadie puede saltarse una regla enviando el código directo a la
 * pasarela.
 */

import { kv, CLAVES } from "./almacen.js";

const MAESTRO = (process.env.CODIGO_MAESTRO || "MANCERA20").toUpperCase();
const DESC_MAESTRO = Number(process.env.DESCUENTO_MAESTRO || 0.20);
const DESC_BIENVENIDA = Number(process.env.DESCUENTO_BIENVENIDA || 0.10);

export async function validarDescuento(codigoBruto, email) {
  const codigo = String(codigoBruto || "").trim().toUpperCase();
  const correo = email ? String(email).trim().toLowerCase() : null;

  if (!codigo) return { valido: false, motivo: "Escribe un código de descuento" };

  /* Código maestro: fijo, sin vencimiento, sin límite de uso. */
  if (codigo === MAESTRO) {
    return { valido: true, codigo: MAESTRO, desc: DESC_MAESTRO, tipo: "maestro" };
  }

  const registro = await kv.leer(CLAVES.codigo(codigo));
  if (!registro) {
    return { valido: false, motivo: "Ese código no existe o ya venció" };
  }

  if (new Date(registro.vence).getTime() < Date.now()) {
    return { valido: false, motivo: "Este código venció. Los códigos de bienvenida duran 5 días." };
  }

  if (registro.usado) {
    return { valido: false, motivo: "Este descuento es válido únicamente para tu primera compra" };
  }

  const duenoYaCompro = await kv.existe(CLAVES.comprador(registro.email));
  const quienUsaYaCompro = correo ? await kv.existe(CLAVES.comprador(correo)) : false;

  if (duenoYaCompro || quienUsaYaCompro) {
    return { valido: false, motivo: "Este descuento es válido únicamente para tu primera compra" };
  }

  return {
    valido: true,
    codigo,
    desc: DESC_BIENVENIDA,
    tipo: "bienvenida",
    vence: registro.vence
  };
}
