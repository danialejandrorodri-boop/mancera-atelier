/**
 * POST /api/webhook-mercadopago
 *
 * Mercado Pago avisa aquí cada vez que cambia el estado de un pago.
 *
 * Nunca se confía en el contenido del aviso: solo se toma el id del pago y se
 * consulta directamente a la API de Mercado Pago con el access token. Si
 * alguien inventara una notificación falsa, la consulta la desmentiría.
 *
 * Al confirmarse el pago: se marca al cliente como comprador (lo que quema su
 * código de bienvenida), se saca su bolsa de la cola de recordatorios y se le
 * envía la confirmación.
 */

import { kv, CLAVES } from "../lib/almacen.js";
import { obtenerPago } from "../lib/mercadopago.js";
import { enviarCorreo } from "../lib/resend.js";
import { correoPedidoConfirmado } from "../lib/correos.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  /* Mercado Pago manda el id en el cuerpo o en la query, según la versión. */
  const q = req.query || {};
  const b = typeof req.body === "string" ? safeJson(req.body) : (req.body || {});

  const tipo = q.type || q.topic || b.type || b.action?.split(".")[0];
  const idPago = q["data.id"] || q.id || b.data?.id;

  if (tipo !== "payment" || !idPago) {
    // Otros eventos (merchant_order, tests) se aceptan y se ignoran.
    return res.status(200).json({ ok: true, ignorado: true });
  }

  try {
    const pago = await obtenerPago(idPago);
    const referencia = pago.external_reference;

    if (pago.status !== "approved" || !referencia) {
      return res.status(200).json({ ok: true, estado: pago.status });
    }

    const pedido = await kv.leer(`pedido:${referencia}`);
    if (!pedido) {
      console.warn("Pago aprobado sin pedido asociado:", referencia);
      return res.status(200).json({ ok: true, sinPedido: true });
    }

    // Idempotencia: Mercado Pago reintenta el aviso varias veces.
    if (pedido.estado === "pagado") {
      return res.status(200).json({ ok: true, repetido: true });
    }

    const correo = pedido.email;

    await kv.escribir(`pedido:${referencia}`, {
      ...pedido,
      estado: "pagado",
      pago_id: String(idPago),
      pagado_en: new Date().toISOString()
    }, 180 * 86400);

    // Ya es cliente: su código de bienvenida deja de servir.
    await kv.escribir(CLAVES.comprador(correo), { desde: new Date().toISOString() });

    if (pedido.cupon) {
      const reg = await kv.leer(CLAVES.codigo(pedido.cupon));
      if (reg) await kv.escribir(CLAVES.codigo(pedido.cupon), { ...reg, usado: true }, 30 * 86400);
    }

    // Fuera de la cola de recordatorios de bolsa abandonada.
    await kv.borrar(CLAVES.carrito(correo));
    await kv.desindexar(CLAVES.indiceCarritos, correo);

    const plantilla = correoPedidoConfirmado({
      referencia,
      lineas: pedido.lineas,
      total: pedido.total,
      nombre: pedido.nombre
    });

    await enviarCorreo({
      para: correo,
      asunto: plantilla.asunto,
      html: plantilla.html,
      etiquetas: [{ name: "tipo", value: "pedido-confirmado" }]
    });

    return res.status(200).json({ ok: true, referencia });
  } catch (e) {
    console.error("webhook-mercadopago:", e.message);
    // 200 a propósito: si devolvemos error, Mercado Pago reintenta en bucle.
    return res.status(200).json({ ok: false, error: e.message });
  }
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
