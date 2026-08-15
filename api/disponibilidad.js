/**
 * GET /api/disponibilidad
 *
 * Devuelve qué piezas están agotadas u ocultas. Lo consulta la tienda al
 * cargar, así que es público y no expone nada sensible.
 *
 * Responde: { estados: { "cb1": "agotado", "po3": "oculta" } }
 * Las piezas que no aparecen están a la venta.
 */

import { kv } from "../lib/almacen.js";

export const CLAVE_DISPONIBILIDAD = "disponibilidad";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=30, stale-while-revalidate=300");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const estados = (await kv.leer(CLAVE_DISPONIBILIDAD)) || {};
    return res.status(200).json({ estados });
  } catch (e) {
    console.error("disponibilidad:", e.message);
    /* Ante un fallo del almacén se muestra todo el catálogo: es preferible
       vender una pieza agotada y avisar, que esconder la tienda entera. */
    return res.status(200).json({ estados: {} });
  }
}
