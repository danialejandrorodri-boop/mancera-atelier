/**
 * GET /api/estado
 *
 * Diagnóstico: dice qué está configurado y qué falta, para no tener que
 * adivinar por qué algo no funciona.
 *
 * Solo devuelve "sí / no": nunca el valor de una clave. Por eso se puede
 * consultar desde el navegador sin riesgo.
 */

import { kv, configAlmacen } from "../lib/almacen.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  /* Prueba real de la base: escribe y lee una marca temporal. */
  let base = { configurada: configAlmacen.listo, responde: false, error: null };
  try {
    const marca = "diagnostico-" + Date.now();
    await kv.escribir("diagnostico", marca, 60);
    base.responde = (await kv.leer("diagnostico")) === marca;
  } catch (e) {
    base.error = e.message;
  }

  const hay = (n) => Boolean(process.env[n]);

  return res.status(200).json({
    resumen: base.responde && hay("MP_ACCESS_TOKEN") && hay("RESEND_API_KEY")
      ? "Todo listo para vender"
      : "Falta configuración",

    base_de_datos: {
      ...base,
      url_tomada_de: configAlmacen.urlDesde,
      token_tomado_de: configAlmacen.tokenDesde
    },

    mercado_pago: {
      access_token: hay("MP_ACCESS_TOKEN")
    },

    resend: {
      api_key: hay("RESEND_API_KEY"),
      remitente: hay("CORREO_REMITENTE"),
      segmento: hay("RESEND_SEGMENT_ID"),
      topic: hay("RESEND_TOPIC_ID")
    },

    descuentos: {
      codigo_maestro_definido: hay("CODIGO_MAESTRO"),
      descuento_maestro: Number(process.env.DESCUENTO_MAESTRO || 0.20),
      descuento_bienvenida: Number(process.env.DESCUENTO_BIENVENIDA || 0.10),
      dias_vigencia: Number(process.env.DIAS_VIGENCIA_BIENVENIDA || 5)
    },

    seguridad: {
      cron_secret: hay("CRON_SECRET"),
      admin_clave: hay("ADMIN_CLAVE")
    },

    sitio_url: process.env.SITIO_URL || "(sin definir: se deduce de la petición)"
  });
}
