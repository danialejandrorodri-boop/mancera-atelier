/**
 * POST /api/crear-preferencia
 *
 * Arma el cobro en Mercado Pago y devuelve el enlace de checkout.
 *
 * Todo lo que importa se recalcula aquí: los precios salen del catálogo del
 * servidor, el descuento se vuelve a validar y se comprueba que ninguna pieza
 * esté agotada. Lo único que aporta el navegador es qué piezas quiere el
 * cliente, en qué talla y a dónde se las llevamos.
 *
 * Cuerpo: { email, envio{}, items[], cupon?, pago }
 * Responde: { init_point, referencia, total }
 */

import { kv, CLAVES } from "../lib/almacen.js";
import { reconstruirPedido } from "../lib/catalogo.js";
import { validarDescuento } from "../lib/descuentos.js";
import { crearPreferencia, urlBase } from "../lib/mercadopago.js";
import { soloPost, cuerpo, RE_EMAIL, dentroDelLimite } from "../lib/comun.js";

const CLAVE_DISPONIBILIDAD = "disponibilidad";

/** Los mismos requisitos que valida el formulario, comprobados de nuevo aquí. */
function validarEnvio(e) {
  if (!e || typeof e !== "object") return "Faltan los datos de envío";
  const t = (v) => String(v || "").trim();

  if (t(e.nombre).split(/\s+/).filter(Boolean).length < 2) return "Falta el nombre completo";
  if (!/^\d{6,12}$/.test(t(e.cedula).replace(/[.\s-]/g, ""))) return "La cédula no es válida";
  if (!/^\d{10}$/.test(t(e.tel).replace(/\D/g, ""))) return "El teléfono no es válido";
  if (!t(e.depto)) return "Falta el departamento";
  if (!t(e.ciudad)) return "Falta la ciudad";
  if (t(e.dir).length < 8) return "La dirección está incompleta";
  return null;
}

function limpiarEnvio(e) {
  const t = (v, n) => String(v || "").trim().slice(0, n);
  return {
    nombre: t(e.nombre, 80),
    cedula: t(e.cedula, 20).replace(/[.\s-]/g, ""),
    tel: t(e.tel, 20).replace(/\D/g, ""),
    email: t(e.email, 120).toLowerCase(),
    depto: t(e.depto, 60),
    ciudad: t(e.ciudad, 60),
    dir: t(e.dir, 160),
    compl: t(e.compl, 120),
    cp: t(e.cp, 12),
    notas: t(e.notas, 300)
  };
}

export default async function handler(req, res) {
  if (!soloPost(req, res)) return;

  const { email, envio, items, cupon, pago } = cuerpo(req);
  const correo = String(email || "").trim().toLowerCase();

  if (!RE_EMAIL.test(correo)) {
    return res.status(400).json({ error: "Escribe un correo válido" });
  }

  /* El pago contra entrega no pasa por la pasarela: se cierra por WhatsApp. */
  if (pago === "contraentrega") {
    return res.status(400).json({ error: "El pago contra entrega se confirma por WhatsApp" });
  }

  const falla = validarEnvio(envio);
  if (falla) return res.status(400).json({ error: falla });

  if (!(await dentroDelLimite(req, { clave: "preferencia", maximo: 20 }))) {
    return res.status(429).json({ error: "Demasiados intentos. Inténtalo en un momento." });
  }

  try {
    /* 1. Precios reales, tomados del servidor. */
    const { lineas, subtotal } = reconstruirPedido(items);

    /* 2. Ninguna pieza agotada u oculta puede llegar a cobrarse. */
    const estados = (await kv.leer(CLAVE_DISPONIBILIDAD)) || {};
    const noDisponible = lineas.find((l) => estados[l.id]);
    if (noDisponible) {
      return res.status(409).json({
        error: `«${noDisponible.nombre}» ya no está disponible. Retírala de la bolsa para continuar.`,
        id: noDisponible.id
      });
    }

    /* 3. Descuento revalidado: el cliente solo manda el código, no el monto. */
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
    const datosEnvio = limpiarEnvio({ ...envio, email: correo });

    /* 4. El descuento se reparte sobre cada pieza: Checkout Pro cobra la suma
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

    /* 5. Referencia propia del pedido: el webhook la usa para saber a quién
          pertenece el pago y qué código quemar. */
    const referencia = `MA-${Date.now().toString(36).toUpperCase()}`;
    const sitio = urlBase(req);

    await kv.escribir(
      `pedido:${referencia}`,
      {
        referencia,
        email: correo,
        nombre: datosEnvio.nombre,
        envio: datosEnvio,
        lineas,
        subtotal,
        cupon: codigoAplicado,
        total: totalObjetivo,
        estado: "creado",
        creado: new Date().toISOString()
      },
      30 * 86400
    );

    const partesNombre = datosEnvio.nombre.split(/\s+/);

    /* 6. La preferencia. */
    const preferencia = await crearPreferencia(
      {
        items: itemsMP,
        payer: {
          email: correo,
          name: partesNombre[0],
          surname: partesNombre.slice(1).join(" ") || undefined,
          phone: { area_code: "57", number: datosEnvio.tel },
          identification: { type: "CC", number: datosEnvio.cedula },
          address: {
            street_name: datosEnvio.dir,
            zip_code: datosEnvio.cp || undefined
          }
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
        metadata: { referencia, cupon: codigoAplicado, ciudad: datosEnvio.ciudad },
        shipments: {
          mode: "not_specified",
          receiver_address: {
            street_name: datosEnvio.dir,
            city_name: datosEnvio.ciudad,
            state_name: datosEnvio.depto,
            zip_code: datosEnvio.cp || undefined,
            apartment: datosEnvio.compl || undefined
          }
        }
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
