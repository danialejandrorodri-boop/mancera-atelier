/**
 * POST /api/crear-preferencia
 *
 * Arma el cobro en Mercado Pago y devuelve el enlace de checkout.
 *
 * Todo lo que importa se recalcula aquí: los precios salen del catálogo del
 * servidor y el descuento se vuelve a validar. Lo único que aporta el
 * navegador es qué piezas quiere el cliente y en qué talla.
 *
 * Cuerpo: { email, nombre?, items[], cupon?, pago }
 * Responde: { init_point, referencia, total }
 */

import { kv, CLAVES } from "../lib/almacen.js";
import { reconstruirPedido } from "../lib/catalogo.js";
import { validarDescuento } from "../lib/descuentos.js";
import { crearPreferencia, urlBase } from "../lib/mercadopago.js";
import { soloPost, cuerpo, RE_EMAIL, dentroDelLimite } from "../lib/comun.js";

export default async function handler(req, res) {
  if (!soloPost(req, res)) return;

  const { email, nombre, items, cupon, pago } = cuerpo(req);
  const correo = String(email || "").trim().toLowerCase();

  if (!RE_EMAIL.test(correo)) {
    return res.status(400).json({ error: "Escribe un correo válido" });
  }

  /* El pago contra entrega no pasa por la pasarela: se cierra por WhatsApp. */
  if (pago === "contraentrega") {
    return res.status(400).json({ error: "El pago contra entrega se confirma por WhatsApp" });
  }

  if (!(await dentroDelLimite(req, { clave: "preferencia", maximo: 20 }))) {
    return res.status(429).json({ error: "Demasiados intentos. Inténtalo en un momento." });
  }

  try {
    /* 1. Precios reales, tomados del servidor. */
    const { lineas, subtotal } = reconstruirPedido(items);

    /* 2. Descuento revalidado: el cliente solo manda el código, no el monto. */
    let factor = 1;
    let codigoAplicado = null;
    if (cupon) {
      const d = await validarDescuento(cupon, correo);
      if (d.valido) {
        factor = 1 - d.desc;
        codigoAplicado = d.codigo;
      }
    }

    const totalObjetivo = Math.round(subtotal * factor);

    /* 3. El descuento se reparte sobre cada pieza: Checkout Pro cobra la suma
          de los items, no admite un descuento a nivel de pedido. Se redondea
          hacia abajo y la diferencia se ajusta al final para que el total
          cuadre al peso. */
    const itemsMP = lineas.map((l) => ({
      id: l.id,
      title: l.nombre,
      description: `${l.color} · Talla ${l.talla}`.trim(),
      quantity: l.cantidad,
      unit_price: Math.floor(l.precio * factor),
      currency_id: "COP",
      category_id: "fashion"
    }));

    const sumaItems = itemsMP.reduce((t, i) => t + i.unit_price * i.quantity, 0);
    const diferencia = totalObjetivo - sumaItems;
    if (diferencia > 0) {
      itemsMP.push({
        id: "ajuste",
        title: "Ajuste de redondeo",
        quantity: 1,
        unit_price: diferencia,
        currency_id: "COP"
      });
    }

    /* 4. Referencia propia del pedido: el webhook la usa para saber a quién
          pertenece el pago y qué código quemar. */
    const referencia = `MA-${Date.now().toString(36).toUpperCase()}`;
    const sitio = urlBase(req);

    await kv.escribir(
      `pedido:${referencia}`,
      {
        referencia,
        email: correo,
        nombre: String(nombre || "").slice(0, 80),
        lineas,
        subtotal,
        cupon: codigoAplicado,
        total: totalObjetivo,
        estado: "creado",
        creado: new Date().toISOString()
      },
      30 * 86400
    );

    /* 5. La preferencia. */
    const preferencia = await crearPreferencia(
      {
        items: itemsMP,
        payer: {
          email: correo,
          name: String(nombre || "").split(" ")[0] || undefined,
          surname: String(nombre || "").split(" ").slice(1).join(" ") || undefined
        },
        external_reference: referencia,
        statement_descriptor: "MANCERA",
        notification_url: `${sitio}/api/webhook-mercadopago`,
        back_urls: {
          success: `${sitio}/?pago=exito`,
          pending: `${sitio}/?pago=pendiente`,
          failure: `${sitio}/?pago=fallo`
        },
        auto_return: "approved",
        metadata: { referencia, cupon: codigoAplicado },
        shipments: { mode: "not_specified" }
      },
      referencia
    );

    return res.status(200).json({
      init_point: preferencia.init_point,
      preference_id: preferencia.id,
      referencia,
      total: totalObjetivo
    });
  } catch (e) {
    console.error("crear-preferencia:", e.message, e.datos || "");
    return res.status(500).json({ error: "No pudimos abrir la pasarela de pago" });
  }
}
