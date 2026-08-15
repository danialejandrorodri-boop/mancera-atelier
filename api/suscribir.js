/**
 * POST /api/suscribir
 *
 * Registra el correo, genera un código de bienvenida único, guarda el
 * contacto en Resend y envía el primer correo.
 *
 * Cuerpo: { email, consentimiento, origen?, fecha_consentimiento? }
 * Responde: { codigo, desc, vence }
 */

import { kv, CLAVES, generarCodigoUnico } from "../lib/almacen.js";
import { guardarContacto, enviarCorreo } from "../lib/resend.js";
import { correoBienvenida } from "../lib/correos.js";
import { soloPost, cuerpo, RE_EMAIL, dentroDelLimite } from "../lib/comun.js";

const DESCUENTO = Number(process.env.DESCUENTO_BIENVENIDA || 0.10);
const DIAS = Number(process.env.DIAS_VIGENCIA_BIENVENIDA || 5);

export default async function handler(req, res) {
  if (!soloPost(req, res)) return;

  const { email, consentimiento, origen, fecha_consentimiento } = cuerpo(req);
  const correo = String(email || "").trim().toLowerCase();

  if (!RE_EMAIL.test(correo)) {
    return res.status(400).json({ error: "Escribe un correo válido" });
  }

  /* Sin autorización expresa no se trata ningún dato: Ley 1581 de 2012, art. 9. */
  if (consentimiento !== true) {
    return res.status(400).json({
      error: "Debes aceptar la política de tratamiento de datos personales"
    });
  }

  if (!(await dentroDelLimite(req, { clave: "suscribir", maximo: 8 }))) {
    return res.status(429).json({ error: "Demasiados intentos. Inténtalo más tarde." });
  }

  try {
    const ahora = Date.now();
    const ttl = DIAS * 86400;
    let registro = await kv.leer(CLAVES.lead(correo));

    /* Si ya se registró y su código sigue vigente, se le reenvía el mismo:
       nadie debe acumular códigos distintos por volver a suscribirse. */
    const vigente =
      registro && registro.codigo && new Date(registro.vence).getTime() > ahora;

    if (!vigente) {
      const codigo = await generarCodigoUnico();
      const vence = new Date(ahora + ttl * 1000).toISOString();

      registro = {
        email: correo,
        codigo,
        emitido: new Date(ahora).toISOString(),
        vence,
        consentimiento: true,
        fecha_consentimiento: fecha_consentimiento || new Date(ahora).toISOString(),
        origen: origen || "web"
      };

      // Prueba de la autorización: se conserva sin vencimiento.
      await kv.escribir(CLAVES.lead(correo), registro);

      // El código sí caduca solo, a los 5 días.
      await kv.escribir(
        CLAVES.codigo(codigo),
        { email: correo, vence, usado: false },
        ttl + 3600
      );
    }

    // Guardar en Resend no debe bloquear el envío del correo.
    const contacto = await guardarContacto({
      email: correo,
      codigo: registro.codigo,
      fechaConsentimiento: registro.fecha_consentimiento,
      origen: registro.origen
    });

    const plantilla = correoBienvenida({
      codigo: registro.codigo,
      vence: registro.vence
    });

    await enviarCorreo({
      para: correo,
      asunto: plantilla.asunto,
      html: plantilla.html,
      etiquetas: [{ name: "tipo", value: "bienvenida" }]
    });

    return res.status(200).json({
      codigo: registro.codigo,
      desc: DESCUENTO,
      vence: registro.vence,
      contacto_guardado: contacto.ok
    });
  } catch (e) {
    console.error("suscribir:", e);
    return res.status(500).json({ error: "No pudimos completar tu registro. Inténtalo de nuevo." });
  }
}
