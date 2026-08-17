/**
 * GET|POST /api/cron?tarea=...
 *
 * Las tres tareas programadas viven en un solo archivo porque el plan Hobby
 * de Vercel permite un máximo de 12 funciones por despliegue, y tres archivos
 * separados gastaban tres de esas plazas.
 *
 * Tareas:
 *   ?tarea=carrito-1h   → recordatorio de bolsa, una hora después
 *   ?tarea=carrito-48h  → aviso de urgencia, dos días después
 *   ?tarea=boletin      → boletín mensual de marketing
 *
 * Cabecera obligatoria: Authorization: Bearer <CRON_SECRET>
 */

import { procesarRecordatorios } from "../lib/recordatorios.js";
import { correoCarrito1h, correoCarrito48h, correoMensual } from "../lib/correos.js";
import { enviarBoletin } from "../lib/resend.js";
import { autorizado } from "../lib/comun.js";

const TAREAS = {
  "carrito-1h": () => procesarRecordatorios({
    desdeMs: 90 * 60 * 1000,
    hastaMs: 60 * 60 * 1000,
    etapaEsperada: 0,
    etapaSiguiente: 1,
    plantilla: correoCarrito1h,
    etiqueta: "carrito-1h"
  }),

  "carrito-48h": () => procesarRecordatorios({
    desdeMs: 50 * 60 * 60 * 1000,
    hastaMs: 48 * 60 * 60 * 1000,
    etapaEsperada: 1,
    etapaSiguiente: 2,
    plantilla: correoCarrito48h,
    etiqueta: "carrito-48h"
  }),

  "boletin": async () => {
    const hoy = new Date();
    const { nombre, asunto, html, texto, preview } = correoMensual({
      mes: hoy.getMonth() + 1,
      ano: hoy.getFullYear()
    });
    const b = await enviarBoletin({ nombre, asunto, html, texto, preview });
    return { broadcast: b.id, asunto };
  }
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!autorizado(req)) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const tarea = String((req.query && req.query.tarea) || "").trim();
  const ejecutar = TAREAS[tarea];

  if (!ejecutar) {
    return res.status(400).json({
      error: "Tarea desconocida",
      disponibles: Object.keys(TAREAS)
    });
  }

  try {
    const r = await ejecutar();
    return res.status(200).json({ ok: true, tarea, ...r });
  } catch (e) {
    console.error(`cron ${tarea}:`, e.message);
    return res.status(500).json({ error: e.message, tarea });
  }
}
