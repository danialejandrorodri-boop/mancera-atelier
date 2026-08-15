/**
 * GET /api/cron/boletin-mensual
 *
 * Boletín de marketing, el día 1 de cada mes a las 9:00 de Colombia.
 * Se envía como broadcast al segmento completo: así Resend respeta
 * automáticamente a quien se dio de baja y añade el enlace de baja.
 */

import { enviarBoletin } from "../../lib/resend.js";
import { correoMensual } from "../../lib/correos.js";
import { autorizado } from "../../lib/comun.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!autorizado(req)) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    const hoy = new Date();
    const { nombre, asunto, html, texto, preview } = correoMensual({
      mes: hoy.getMonth() + 1,
      ano: hoy.getFullYear()
    });

    const b = await enviarBoletin({ nombre, asunto, html, texto, preview });
    return res.status(200).json({ ok: true, broadcast: b.id, asunto });
  } catch (e) {
    console.error("cron boletin-mensual:", e);
    return res.status(500).json({ error: e.message });
  }
}
