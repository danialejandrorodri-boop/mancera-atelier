/**
 * Plantillas de correo de Mancera Atelier.
 *
 * HTML en tablas y con estilos en línea: es lo único que renderiza igual en
 * Gmail, Outlook y Apple Mail. Misma paleta que la tienda.
 */

const M = {
  marfil: "#F7F4EE",
  lino: "#EFEAE1",
  filete: "#E2DDD5",
  botanico: "#2C3E2E",
  azabache: "#1A1A1A",
  piedra: "#6E6A62",
  laton: "#9C7C4F",
  blanco: "#FFFCF7"
};

const SITIO = process.env.SITIO_URL || "https://manceracol.com";
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "'Segoe UI',Helvetica,Arial,sans-serif";

export const dinero = (n) =>
  "$ " + Number(n || 0).toLocaleString("es-CO", { maximumFractionDigits: 0 });

export const fechaLarga = (iso) =>
  new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

/** Estructura común: cabecera con el logotipo, cuerpo y pie legal. */
function envoltura(contenido, { preheader = "" } = {}) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
</head>
<body style="margin:0;padding:0;background:${M.marfil};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${M.marfil};padding:28px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${M.blanco};border:1px solid ${M.filete};">

      <tr><td align="center" style="padding:34px 30px 26px;border-bottom:1px solid ${M.filete};">
        <div style="font-family:${SERIF};font-size:21px;letter-spacing:6px;color:${M.azabache};text-transform:uppercase;">MANCERA</div>
        <div style="font-family:${SANS};font-size:8px;letter-spacing:4px;color:${M.piedra};text-transform:uppercase;padding-top:7px;">Atelier &middot; Old Money</div>
      </td></tr>

      <tr><td style="padding:32px 30px 30px;">${contenido}</td></tr>

      <tr><td style="padding:20px 30px 26px;background:${M.lino};border-top:1px solid ${M.filete};">
        <p style="margin:0 0 8px;font-family:${SANS};font-size:11px;line-height:1.65;color:${M.piedra};">
          Recibes este correo porque autorizaste el tratamiento de tus datos personales en manceracol.com,
          conforme a la Ley 1581 de 2012.
        </p>
        <p style="margin:0;font-family:${SANS};font-size:11px;line-height:1.65;color:${M.piedra};">
          Puedes revocar tu autorización o solicitar la supresión de tus datos escribiendo a
          <a href="mailto:datos@manceracol.com" style="color:${M.botanico};">datos@manceracol.com</a>.
          &middot; <a href="${SITIO}" style="color:${M.botanico};">manceracol.com</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

function boton(texto, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 6px;">
    <tr><td style="background:${M.botanico};">
      <a href="${url}" style="display:inline-block;padding:15px 32px;font-family:${SANS};font-size:11px;
         letter-spacing:2px;text-transform:uppercase;font-weight:600;color:#F4F1E9;text-decoration:none;">${texto}</a>
    </td></tr></table>`;
}

function titulo(t) {
  return `<h1 style="margin:0 0 14px;font-family:${SERIF};font-weight:400;font-size:27px;line-height:1.2;color:${M.botanico};">${t}</h1>`;
}

function parrafo(t) {
  return `<p style="margin:0 0 14px;font-family:${SANS};font-size:14px;line-height:1.75;color:${M.piedra};">${t}</p>`;
}

/** Recuadro con el código de descuento. */
function recuadroCodigo(codigo, vence) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td align="center" style="padding:24px 18px;background:${M.lino};border:1px dashed ${M.botanico};">
      <div style="font-family:${SANS};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${M.piedra};">Tu código personal</div>
      <div style="font-family:${SANS};font-size:26px;letter-spacing:4px;font-weight:700;color:${M.botanico};padding:12px 0 8px;">${codigo}</div>
      <div style="font-family:${SANS};font-size:12px;color:${M.piedra};">10 % de descuento &middot; válido hasta el <strong style="color:${M.azabache};">${fechaLarga(vence)}</strong></div>
    </td></tr></table>`;
}

/** Listado de prendas de la bolsa. */
function tablaItems(items) {
  const filas = items.map((i) => `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid ${M.filete};font-family:${SANS};font-size:13px;color:${M.azabache};">
        ${i.n}
        <div style="font-size:11px;color:${M.piedra};padding-top:3px;">${i.color} &middot; Talla ${i.talla} &middot; Cant. ${i.q}</div>
      </td>
      <td align="right" style="padding:11px 0;border-bottom:1px solid ${M.filete};font-family:${SANS};font-size:13px;font-weight:600;color:${M.azabache};white-space:nowrap;">
        ${dinero(i.precio * i.q)}
      </td>
    </tr>`).join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 8px;border-top:1px solid ${M.filete};">${filas}</table>`;
}

/* ============================================================
   CORREO 1 — Bienvenida (inmediato)
   ============================================================ */
export function correoBienvenida({ codigo, vence }) {
  return {
    asunto: `Tu 10 % de bienvenida: ${codigo}`,
    html: envoltura(
      titulo("Bienvenido a Mancera") +
      parrafo("Gracias por sumarte. Aquí tienes tu código personal de bienvenida: es único, solo tuyo, y aplica a tu primera compra.") +
      recuadroCodigo(codigo, vence) +
      parrafo(`Tienes <strong style="color:${M.azabache};">5 días</strong> para usarlo. Pasada esa fecha el código deja de funcionar automáticamente.`) +
      parrafo("Trabajamos con series cortas: cuando una talla se agota, no siempre vuelve.") +
      boton("Ver la colección", SITIO + "#coleccion") +
      `<p style="margin:22px 0 0;font-family:${SANS};font-size:12px;line-height:1.7;color:${M.piedra};border-top:1px solid ${M.filete};padding-top:16px;">
        <strong style="color:${M.azabache};">¿No ves nuestros correos?</strong> Arrastra este mensaje desde Promociones o Spam
        a tu bandeja Principal y añádenos a tus contactos. Así no te pierdes las ediciones limitadas.
      </p>`,
      { preheader: `Tu código ${codigo} vence en 5 días.` }
    )
  };
}

/* ============================================================
   CORREO 2 — Bolsa sin finalizar (1 hora después)
   ============================================================ */
export function correoCarrito1h({ items, total, codigo, vence }) {
  return {
    asunto: "Dejaste algunas piezas en tu bolsa",
    html: envoltura(
      titulo("Tus piezas siguen aquí") +
      parrafo("Guardamos tu bolsa por si te interrumpieron. Estas son las prendas que elegiste:") +
      tablaItems(items) +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:14px 0;font-family:${SANS};font-size:15px;color:${M.azabache};">Total</td>
          <td align="right" style="padding:14px 0;font-family:${SANS};font-size:18px;font-weight:600;color:${M.botanico};">${dinero(total)}</td>
        </tr>
      </table>` +
      (codigo
        ? parrafo(`Recuerda que tu código <strong style="color:${M.botanico};">${codigo}</strong> sigue activo hasta el <strong style="color:${M.azabache};">${fechaLarga(vence)}</strong>.`)
        : "") +
      parrafo("El envío es gratis si pagas por adelantado. La preparación toma de 5 a 7 días hábiles.") +
      boton("Retomar mi pedido", SITIO + "#coleccion"),
      { preheader: "Tu bolsa sigue guardada." }
    )
  };
}

/* ============================================================
   CORREO 3 — Bolsa sin finalizar, urgencia (48 horas después)
   ============================================================ */
export function correoCarrito48h({ items, total, codigo, vence }) {
  return {
    asunto: "Tus prendas están por liberarse",
    html: envoltura(
      titulo("Últimas horas para tus piezas") +
      parrafo("Producimos en series cortas y reservamos el inventario por tiempo limitado. Las prendas que apartaste están a punto de volver a quedar disponibles para el resto de clientes.") +
      tablaItems(items) +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:14px 0;font-family:${SANS};font-size:15px;color:${M.azabache};">Total</td>
          <td align="right" style="padding:14px 0;font-family:${SANS};font-size:18px;font-weight:600;color:${M.botanico};">${dinero(total)}</td>
        </tr>
      </table>` +
      (codigo
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;">
             <tr><td style="padding:15px 18px;background:${M.lino};border-left:3px solid ${M.laton};font-family:${SANS};font-size:13px;line-height:1.7;color:${M.piedra};">
               Tu descuento <strong style="color:${M.botanico};">${codigo}</strong> vence el
               <strong style="color:${M.azabache};">${fechaLarga(vence)}</strong>. Después de esa fecha no podremos reactivarlo.
             </td></tr></table>`
        : "") +
      boton("Completar mi compra", SITIO + "#coleccion") +
      parrafo(`Si prefieres cerrar el pedido hablando con alguien, respóndenos este correo y te atendemos.`),
      { preheader: "Tu reserva está por vencer." }
    )
  };
}

/* ============================================================
   Confirmación de compra (al acreditarse el pago)
   ============================================================ */
export function correoPedidoConfirmado({ referencia, lineas, total, nombre, envio }) {
  const items = lineas.map((l) => ({
    n: l.nombre, color: l.color, talla: l.talla, q: l.cantidad, precio: l.precio
  }));

  const bloqueEnvio = envio
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
         <tr><td style="padding:16px 18px;background:${M.blanco};border:1px solid ${M.filete};font-family:${SANS};font-size:13px;line-height:1.8;color:${M.piedra};">
           <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;font-weight:700;color:${M.azabache};padding-bottom:8px;">Entrega</div>
           <strong style="color:${M.azabache};">${envio.nombre}</strong> · C.C. ${envio.cedula}<br>
           ${envio.dir}${envio.compl ? "<br>" + envio.compl : ""}<br>
           ${envio.ciudad}, ${envio.depto}${envio.cp ? " · C.P. " + envio.cp : ""}<br>
           Tel. ${envio.tel}
           ${envio.notas ? `<br><span style="color:${M.piedra};">Indicaciones: ${envio.notas}</span>` : ""}
         </td></tr></table>`
    : "";

  return {
    asunto: `Pedido confirmado · ${referencia}`,
    html: envoltura(
      titulo(nombre ? `Gracias, ${nombre.split(" ")[0]}` : "Gracias por tu compra") +
      parrafo(`Tu pago quedó confirmado y tu pedido <strong style="color:${M.azabache};">${referencia}</strong> ya entró al taller.`) +
      tablaItems(items) +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:14px 0;font-family:${SANS};font-size:15px;color:${M.azabache};">Total pagado</td>
          <td align="right" style="padding:14px 0;font-family:${SANS};font-size:18px;font-weight:600;color:${M.botanico};">${dinero(total)}</td>
        </tr>
      </table>` +
      bloqueEnvio +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr><td style="padding:16px 18px;background:${M.lino};border-left:3px solid ${M.botanico};font-family:${SANS};font-size:13px;line-height:1.75;color:${M.piedra};">
          <strong style="color:${M.azabache};">Preparación: 5 a 7 días hábiles</strong><br>
          Contados de lunes a viernes, sin incluir festivos. Te enviamos el número de guía
          por WhatsApp en cuanto el pedido salga del taller.
        </td></tr></table>` +
      parrafo("Si necesitas cambiar la dirección de entrega o tienes cualquier duda, responde este correo y te atendemos."),
      { preheader: `Pedido ${referencia} confirmado.` }
    )
  };
}

/* ============================================================
   CORREO 4 — Boletín mensual (broadcast al segmento)
   ============================================================ */
export function correoMensual({ mes, ano }) {
  const mesNombre = new Date(ano, mes - 1, 1)
    .toLocaleDateString("es-CO", { month: "long" });

  return {
    nombre: `Boletín ${mesNombre} ${ano}`,
    asunto: `Lo nuevo de este mes en Mancera`,
    preview: `La edición de ${mesNombre} ya está disponible.`,
    texto:
`MANCERA ATELIER — Edición de ${mesNombre}

Una vez al mes te contamos qué entró al taller, qué está por agotarse y qué vale la pena mirar antes que el resto.

· Prendas superiores: camisetas de peso real, polos de punto firme y quarter-zips de media estación.
· Prendas inferiores: chinos y pantalones de vestir en tiro medio y tiro alto, con y sin pinzas.
· Accesorios: joyería sobria, relojería y marroquinería de grano fino.

Envío gratis en todos los pedidos con pago por adelantado. Preparación de 5 a 7 días hábiles.

Ver la colección: ${SITIO}#coleccion

Para dejar de recibir estas ediciones: {{{RESEND_UNSUBSCRIBE_URL}}}`,
    html: envoltura(
      `<div style="font-family:${SANS};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${M.piedra};margin-bottom:12px;">Edición de ${mesNombre}</div>` +
      titulo("Elegancia silenciosa, cada mes") +
      parrafo("Una vez al mes te contamos qué entró al taller, qué está por agotarse y qué vale la pena mirar antes que el resto.") +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border-top:1px solid ${M.filete};">
        <tr><td style="padding:18px 0;border-bottom:1px solid ${M.filete};">
          <div style="font-family:${SERIF};font-size:18px;color:${M.azabache};">Prendas superiores</div>
          <div style="font-family:${SANS};font-size:13px;line-height:1.7;color:${M.piedra};padding-top:5px;">
            Camisetas de peso real, polos de punto firme y quarter-zips de media estación.
          </div>
        </td></tr>
        <tr><td style="padding:18px 0;border-bottom:1px solid ${M.filete};">
          <div style="font-family:${SERIF};font-size:18px;color:${M.azabache};">Prendas inferiores</div>
          <div style="font-family:${SANS};font-size:13px;line-height:1.7;color:${M.piedra};padding-top:5px;">
            Chinos y pantalones de vestir en tiro medio y tiro alto, con y sin pinzas.
          </div>
        </td></tr>
        <tr><td style="padding:18px 0;border-bottom:1px solid ${M.filete};">
          <div style="font-family:${SERIF};font-size:18px;color:${M.azabache};">Accesorios</div>
          <div style="font-family:${SANS};font-size:13px;line-height:1.7;color:${M.piedra};padding-top:5px;">
            Joyería sobria, relojería y marroquinería de grano fino.
          </div>
        </td></tr>
      </table>` +
      parrafo("Envío gratis en todos los pedidos con pago por adelantado. Preparación de 5 a 7 días hábiles.") +
      boton("Ver la colección", SITIO + "#coleccion") +
      `<p style="margin:24px 0 0;font-family:${SANS};font-size:11px;color:${M.piedra};">
        ¿Ya no quieres recibir estas ediciones?
        <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:${M.botanico};">Date de baja aquí</a>.
      </p>`,
      { preheader: `La edición de ${mesNombre} ya está disponible.` }
    )
  };
}
