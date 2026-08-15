/**
 * POST /api/admin-disponibilidad
 *
 * Cambia la disponibilidad de las piezas. Solo para la marca.
 *
 * Cabecera: Authorization: Bearer <ADMIN_CLAVE>
 * Cuerpo:   { cambios: { "cb1": "agotado", "po3": "disponible" } }
 * Responde: { estados }
 */

import { kv } from "../lib/almacen.js";
import { CATALOGO } from "../lib/catalogo.js";
import { soloPost, cuerpo } from "../lib/comun.js";

const CLAVE_DISPONIBILIDAD = "disponibilidad";
const ESTADOS = ["disponible", "agotado", "oculta"];

export default async function handler(req, res) {
  if (!soloPost(req, res)) return;

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
    const estados = (await kv.leer(CLAVE_DISPONIBILIDAD)) || {};

    for (const [id, estado] of Object.entries(cambios)) {
      if (!CATALOGO[id]) continue;              // pieza inexistente: se ignora
      if (!ESTADOS.includes(estado)) continue;  // estado inválido: se ignora
      if (estado === "disponible") delete estados[id];
      else estados[id] = estado;
    }

    await kv.escribir(CLAVE_DISPONIBILIDAD, estados);
    return res.status(200).json({ estados });
  } catch (e) {
    console.error("admin-disponibilidad:", e.message);
    return res.status(500).json({ error: "No se pudo guardar la disponibilidad" });
  }
}
