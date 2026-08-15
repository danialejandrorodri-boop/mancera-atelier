/**
 * Cliente mínimo de Mercado Pago (Checkout Pro).
 *
 * El access token es una credencial de producción: vive solo aquí, en el
 * servidor, y nunca se envía al navegador.
 */

const API = "https://api.mercadopago.com";
const TOKEN = process.env.MP_ACCESS_TOKEN;

async function mp(ruta, metodo = "GET", cuerpo, cabeceras = {}) {
  if (!TOKEN) throw new Error("Falta MP_ACCESS_TOKEN");

  const r = await fetch(API + ruta, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...cabeceras
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });

  const texto = await r.text();
  let datos = {};
  try { datos = texto ? JSON.parse(texto) : {}; } catch { datos = { raw: texto }; }

  if (!r.ok) {
    const e = new Error(datos.message || `Mercado Pago ${r.status}`);
    e.status = r.status;
    e.datos = datos;
    throw e;
  }
  return datos;
}

export function crearPreferencia(preferencia, idempotencia) {
  return mp("/checkout/preferences", "POST", preferencia,
    idempotencia ? { "X-Idempotency-Key": idempotencia } : {});
}

/** Se consulta el pago directamente a Mercado Pago: nunca se confía en el webhook. */
export function obtenerPago(id) {
  return mp(`/v1/payments/${encodeURIComponent(id)}`);
}

/** URL pública del sitio, deducida de la petición si no está configurada. */
export function urlBase(req) {
  if (process.env.SITIO_URL) return process.env.SITIO_URL.replace(/\/+$/, "");
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}
