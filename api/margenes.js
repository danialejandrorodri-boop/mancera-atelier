/**
 * POST /api/margenes
 *
 * Ficha operativa interna: costo de adquisición, nombre de búsqueda en el
 * proveedor y margen real de cada pieza.
 *
 * Exige la clave de administración. Es un endpoint POST y protegido a
 * propósito: esta información no debe poder consultarse desde el navegador
 * de un cliente ni quedar indexada por un buscador.
 *
 * Cabecera: Authorization: Bearer <ADMIN_CLAVE>
 */

import { calcularMargenes } from "../lib/costos.js";
import { soloPost } from "../lib/comun.js";

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

  try {
    const envio = Number(process.env.ENVIO_CONTRAENTREGA || 15000);
    return res.status(200).json(calcularMargenes({ envioContraentrega: envio }));
  } catch (e) {
    console.error("margenes:", e.message);
    return res.status(500).json({ error: "No se pudieron calcular los márgenes" });
  }
}
