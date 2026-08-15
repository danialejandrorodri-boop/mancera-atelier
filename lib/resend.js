/**
 * Cliente mínimo de Resend.
 *
 * Cubre lo que necesita la tienda: enviar correos transaccionales, guardar
 * contactos en el segmento y lanzar el boletín mensual como broadcast
 * (el broadcast respeta automáticamente las bajas, lo que importa
 * legalmente y para la reputación del dominio).
 */

const API = "https://api.resend.com";
const KEY = process.env.RESEND_API_KEY;

const SEGMENTO = process.env.RESEND_SEGMENT_ID;
const TOPIC = process.env.RESEND_TOPIC_ID;

const REMITENTE = process.env.CORREO_REMITENTE || "Mancera Atelier <hola@manceracol.com>";
const RESPUESTA = process.env.CORREO_RESPUESTA || "hola@manceracol.com";

async function llamar(ruta, metodo = "GET", cuerpo) {
  if (!KEY) throw new Error("Falta RESEND_API_KEY");
  const r = await fetch(API + ruta, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json"
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });
  const texto = await r.text();
  let datos = {};
  try { datos = texto ? JSON.parse(texto) : {}; } catch { datos = { raw: texto }; }
  if (!r.ok) {
    const e = new Error(datos.message || datos.error || `Resend ${r.status}`);
    e.status = r.status;
    e.datos = datos;
    throw e;
  }
  return datos;
}

/** Envía un correo transaccional. */
export function enviarCorreo({ para, asunto, html, etiquetas }) {
  return llamar("/emails", "POST", {
    from: REMITENTE,
    to: Array.isArray(para) ? para : [para],
    reply_to: RESPUESTA,
    subject: asunto,
    html,
    tags: etiquetas
  });
}

/**
 * Guarda o actualiza el contacto en el segmento.
 * Nunca hace fallar la petición del cliente: si Resend rechaza el contacto,
 * el correo de bienvenida igual debe salir.
 */
export async function guardarContacto({ email, codigo, fechaConsentimiento, origen }) {
  const cuerpo = {
    email,
    unsubscribed: false,
    segment_ids: SEGMENTO ? [SEGMENTO] : undefined,
    topics: TOPIC ? [{ id: TOPIC, subscription: "opt_in" }] : undefined,
    properties: {
      codigo_bienvenida: codigo || "",
      fecha_consentimiento: fechaConsentimiento || new Date().toISOString(),
      origen: origen || "web"
    }
  };

  try {
    return { ok: true, datos: await llamar("/contacts", "POST", cuerpo) };
  } catch (e) {
    // 409 = ya existe. Se actualiza en lugar de crear.
    if (e.status === 409 || e.status === 422) {
      try {
        return { ok: true, datos: await llamar(`/contacts/${encodeURIComponent(email)}`, "PATCH", cuerpo) };
      } catch (e2) {
        console.error("No se pudo actualizar el contacto:", e2.message);
        return { ok: false, error: e2.message };
      }
    }
    console.error("No se pudo crear el contacto:", e.message);
    return { ok: false, error: e.message };
  }
}

/** Crea y envía un broadcast al segmento completo (boletín mensual). */
export async function enviarBoletin({ asunto, html, texto, nombre, preview }) {
  const base = {
    name: nombre || asunto,
    from: REMITENTE,
    reply_to: [RESPUESTA],
    subject: asunto,
    preview_text: preview,
    html,
    text: texto
  };

  let creado;
  try {
    creado = await llamar("/broadcasts", "POST", { ...base, segment_id: SEGMENTO });
  } catch (e) {
    // Las cuentas más antiguas todavía llaman "audience" al segmento.
    if (e.status === 400 || e.status === 422) {
      creado = await llamar("/broadcasts", "POST", { ...base, audience_id: SEGMENTO });
    } else {
      throw e;
    }
  }

  await llamar(`/broadcasts/${creado.id}/send`, "POST", {});
  return creado;
}
