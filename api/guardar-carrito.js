/**
 * POST /api/guardar-carrito
 *
 * Guarda la bolsa sin finalizar para poder enviar los recordatorios de
 * 1 hora y 48 horas. Solo se guarda si el cliente ya nos dio su correo
 * y autorizó el tratamiento de sus datos.
 *
 * Cuerpo: { email, items[], total, cupon? }
 */

import { kv, CLAVES } from "../lib/almacen.js";
import { soloPost, cuerpo, RE_EMAIL } from "../lib/comun.js";

const DIAS_VIDA = 7;

export default async function handler(req, res) {
  if (!soloPost(req, res)) return;

  const { email, items, total, cupon } = cuerpo(req);
  const correo = String(email || "").trim().toLowerCase();

  if (!RE_EMAIL.test(correo)) {
    return res.status(400).json({ error: "Correo no válido" });
  }

  try {
    /* Sin registro previo no hay autorización: no se guarda nada. */
    const lead = await kv.leer(CLAVES.lead(correo));
    if (!lead || lead.consentimiento !== true) {
      return res.status(403).json({ error: "Sin autorización de tratamiento de datos" });
    }

    /* Bolsa vacía o cliente que ya compró: se retira del índice. */
    const vacia = !Array.isArray(items) || items.length === 0;
    const yaCompro = await kv.existe(CLAVES.comprador(correo));

    if (vacia || yaCompro) {
      await kv.borrar(CLAVES.carrito(correo));
      await kv.desindexar(CLAVES.indiceCarritos, correo);
      return res.status(200).json({ guardado: false });
    }

    const ahora = Date.now();
    await kv.escribir(
      CLAVES.carrito(correo),
      {
        email: correo,
        items: items.slice(0, 40),
        total: Number(total) || 0,
        cupon: cupon || null,
        actualizado: ahora,
        etapa: 0 // 0 = sin avisar · 1 = avisado a 1 h · 2 = avisado a 48 h
      },
      DIAS_VIDA * 86400
    );

    await kv.indexar(CLAVES.indiceCarritos, ahora, correo);

    return res.status(200).json({ guardado: true });
  } catch (e) {
    console.error("guardar-carrito:", e);
    return res.status(500).json({ error: "No se pudo guardar la bolsa" });
  }
}
