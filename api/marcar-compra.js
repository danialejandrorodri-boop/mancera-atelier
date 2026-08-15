/**
 * POST /api/marcar-compra
 *
 * Marca un correo como cliente que ya compró. A partir de ese momento su
 * código de bienvenida deja de funcionar y no recibe recordatorios de bolsa.
 *
 * Llámalo desde el webhook de tu pasarela cuando el pago quede aprobado, o
 * a mano cuando cierres un pedido por WhatsApp.
 *
 * Cabecera obligatoria: Authorization: Bearer <CRON_SECRET>
 * Cuerpo: { email, codigo? }
 */

import { kv, CLAVES } from "../lib/almacen.js";
import { soloPost, cuerpo, autorizado, RE_EMAIL } from "../lib/comun.js";

export default async function handler(req, res) {
  if (!soloPost(req, res)) return;

  if (!autorizado(req)) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const { email, codigo } = cuerpo(req);
  const correo = String(email || "").trim().toLowerCase();

  if (!RE_EMAIL.test(correo)) {
    return res.status(400).json({ error: "Correo no válido" });
  }

  try {
    await kv.escribir(CLAVES.comprador(correo), { desde: new Date().toISOString() });

    // Quema el código de bienvenida usado en esta compra.
    if (codigo) {
      const c = String(codigo).trim().toUpperCase();
      const reg = await kv.leer(CLAVES.codigo(c));
      if (reg) await kv.escribir(CLAVES.codigo(c), { ...reg, usado: true }, 86400 * 30);
    }

    // Ya compró: fuera de la cola de recordatorios.
    await kv.borrar(CLAVES.carrito(correo));
    await kv.desindexar(CLAVES.indiceCarritos, correo);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("marcar-compra:", e);
    return res.status(500).json({ error: "No se pudo registrar la compra" });
  }
}
