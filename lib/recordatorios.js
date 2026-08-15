/**
 * Lógica compartida por los dos recordatorios de bolsa sin finalizar.
 *
 * Cada bolsa lleva una `etapa` que impide enviar dos veces el mismo aviso:
 *   0 → todavía no se ha avisado
 *   1 → ya se envió el recordatorio de 1 hora
 *   2 → ya se envió el aviso de urgencia de 48 horas
 */

import { kv, CLAVES } from "./almacen.js";
import { enviarCorreo } from "./resend.js";

export async function procesarRecordatorios({
  desdeMs,
  hastaMs,
  etapaEsperada,
  etapaSiguiente,
  plantilla,
  etiqueta
}) {
  const ahora = Date.now();
  const correos = await kv.rango(CLAVES.indiceCarritos, ahora - desdeMs, ahora - hastaMs);

  const resultado = { revisados: correos.length, enviados: 0, omitidos: 0, errores: [] };

  for (const correo of correos) {
    try {
      const bolsa = await kv.leer(CLAVES.carrito(correo));

      if (!bolsa || bolsa.etapa !== etapaEsperada || !bolsa.items?.length) {
        resultado.omitidos++;
        continue;
      }

      // Si compró entre medias, se cancela el recordatorio.
      if (await kv.existe(CLAVES.comprador(correo))) {
        await kv.desindexar(CLAVES.indiceCarritos, correo);
        resultado.omitidos++;
        continue;
      }

      const lead = await kv.leer(CLAVES.lead(correo));
      const codigoVigente =
        lead?.codigo && new Date(lead.vence).getTime() > ahora ? lead.codigo : null;

      const { asunto, html } = plantilla({
        items: bolsa.items,
        total: bolsa.total,
        codigo: codigoVigente,
        vence: lead?.vence
      });

      await enviarCorreo({
        para: correo,
        asunto,
        html,
        etiquetas: [{ name: "tipo", value: etiqueta }]
      });

      await kv.escribir(
        CLAVES.carrito(correo),
        { ...bolsa, etapa: etapaSiguiente },
        7 * 86400
      );

      // Tras el último aviso, la bolsa sale de la cola.
      if (etapaSiguiente >= 2) {
        await kv.desindexar(CLAVES.indiceCarritos, correo);
      }

      resultado.enviados++;
    } catch (e) {
      console.error(`recordatorio ${etiqueta} para ${correo}:`, e.message);
      resultado.errores.push(correo);
    }
  }

  return resultado;
}
