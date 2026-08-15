/** Utilidades compartidas por los endpoints. */

import { kv } from "./almacen.js";

export const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function soloPost(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).end();
    return false;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return false;
  }
  return true;
}

export function cuerpo(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

/** Comprueba el secreto que protege los endpoints de cron. */
export function autorizado(req) {
  const esperado = process.env.CRON_SECRET;
  if (!esperado) return false;
  const recibido = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  return recibido === esperado;
}

/** Límite básico por IP para que nadie abuse del formulario. */
export async function dentroDelLimite(req, { clave, maximo = 10, ventanaSegundos = 3600 }) {
  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "desconocida";
  const k = `limite:${clave}:${ip}`;
  try {
    const actual = (await kv.leer(k)) || 0;
    if (actual >= maximo) return false;
    await kv.escribir(k, actual + 1, ventanaSegundos);
    return true;
  } catch {
    // Si el almacén falla, no bloqueamos al cliente legítimo.
    return true;
  }
}
