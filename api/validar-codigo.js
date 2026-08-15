/**
 * POST /api/validar-codigo
 *
 * Dos tipos de código conviven:
 *   · Maestro (MANCERA20): fijo, 20 %, sin vencimiento, sin límite de uso.
 *   · Bienvenida (MANCERA-XXXX): único por persona, 10 %, 5 días, primera compra.
 *
 * Cuerpo: { codigo, email? }
 * Responde: { valido, codigo, desc, tipo } o { valido:false, motivo }
 */

import { validarDescuento } from "../lib/descuentos.js";
import { soloPost, cuerpo } from "../lib/comun.js";

export default async function handler(req, res) {
  if (!soloPost(req, res)) return;

  const { codigo, email } = cuerpo(req);

  try {
    const r = await validarDescuento(codigo, email);
    return res.status(200).json(r);
  } catch (e) {
    console.error("validar-codigo:", e);
    return res.status(500).json({
      valido: false,
      motivo: "No pudimos verificar el código. Inténtalo de nuevo."
    });
  }
}
