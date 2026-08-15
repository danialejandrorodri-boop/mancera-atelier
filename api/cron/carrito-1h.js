/**
 * GET /api/cron/carrito-1h
 *
 * Recordatorio de bolsa sin finalizar, una hora después.
 * Se ejecuta cada 15 minutos y revisa las bolsas actualizadas
 * entre hace 90 y hace 60 minutos.
 */

import { procesarRecordatorios } from "../../lib/recordatorios.js";
import { correoCarrito1h } from "../../lib/correos.js";
import { autorizado } from "../../lib/comun.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!autorizado(req)) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    const r = await procesarRecordatorios({
      desdeMs: 90 * 60 * 1000,
      hastaMs: 60 * 60 * 1000,
      etapaEsperada: 0,
      etapaSiguiente: 1,
      plantilla: correoCarrito1h,
      etiqueta: "carrito-1h"
    });
    return res.status(200).json({ ok: true, ...r });
  } catch (e) {
    console.error("cron carrito-1h:", e);
    return res.status(500).json({ error: e.message });
  }
}
