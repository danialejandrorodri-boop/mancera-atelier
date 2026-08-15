/**
 * GET /api/cron/carrito-48h
 *
 * Aviso de urgencia dos días después. Se ejecuta cada hora y revisa las
 * bolsas actualizadas entre hace 50 y hace 48 horas que ya recibieron
 * el primer recordatorio.
 */

import { procesarRecordatorios } from "../../lib/recordatorios.js";
import { correoCarrito48h } from "../../lib/correos.js";
import { autorizado } from "../../lib/comun.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!autorizado(req)) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    const r = await procesarRecordatorios({
      desdeMs: 50 * 60 * 60 * 1000,
      hastaMs: 48 * 60 * 60 * 1000,
      etapaEsperada: 1,
      etapaSiguiente: 2,
      plantilla: correoCarrito48h,
      etiqueta: "carrito-48h"
    });
    return res.status(200).json({ ok: true, ...r });
  } catch (e) {
    console.error("cron carrito-48h:", e);
    return res.status(500).json({ error: e.message });
  }
}
