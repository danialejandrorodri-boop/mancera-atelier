/**
 * /api/disponibilidad
 *
 *   GET   → público. Devuelve qué piezas están agotadas u ocultas.
 *   POST  → solo la marca. Cambia esa disponibilidad.
 *
 * Lectura y escritura comparten archivo porque el plan Hobby de Vercel limita
 * a 12 el número de funciones por despliegue.
 *
 * GET responde:  { estados: { "ost01": "agotado", "kvt02": "oculta" } }
 *                Las piezas que no aparecen están a la venta.
 * POST recibe:   { cambios: { "ost01": "agotado" } }
 *                con la cabecera Authorization: Bearer <ADMIN_CLAVE>
 */

import { kv } from "../lib/almacen.js";
import { CATALOGO } from "../lib/catalogo.js";
import { cuerpo } from "../lib/comun.js";

const CLAVE = "disponibilidad";
const ESTADOS = ["disponible", "agotado", "oculta"];

export default async function handler(req, res) {
  if (req.method === "GET") return leer(req, res);
  if (req.method === "POST") return escribir(req, res);
  res.setHeader("Cache-Control", "no-store");
  return res.status(405).json({ error: "Método no permitido" });
}

async function leer(req, res) {
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=30, stale-while-revalidate=300");
  try {
    return res.status(200).json({ estados: (await kv.leer(CLAVE)) || {} });
  } catch (e) {
    console.error("disponibilidad (lectura):", e.message);
    /* Ante un fallo del almacén se muestra todo el catálogo: es preferible
       vender una pieza agotada y avisar, que esconder la tienda entera. */
    return res.status(200).json({ estados: {} });
  }
}

async function escribir(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const esperada = process.env.ADMIN_CLAVE;
  if (!esperada) {
    return res.status(500).json({ error: "Falta configurar ADMIN_CLAVE" });
  }

  const recibida = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (recibida !== esperada) {
    return res.status(401).json({ error: "Clave incorrecta" });
  }

  const { cambios } = cuerpo(req);
  if (!cambios || typeof cambios !== "object") {
    return res.status(400).json({ error: "No se recibió ningún cambio" });
  }

  try {
    const estados = (await kv.leer(CLAVE)) || {};

    for (const [id, estado] of Object.entries(cambios)) {
      if (!CATALOGO[id]) continue;              // pieza inexistente: se ignora
      if (!ESTADOS.includes(estado)) continue;  // estado inválido: se ignora
      if (estado === "disponible") delete estados[id];
      else estados[id] = estado;
    }

    await kv.escribir(CLAVE, estados);
    return res.status(200).json({ estados });
  } catch (e) {
    console.error("disponibilidad (escritura):", e.message);
    return res.status(500).json({ error: "No se pudo guardar la disponibilidad" });
  }
}
