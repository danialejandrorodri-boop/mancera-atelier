# Mancera Atelier

Tienda online de una sola página con catálogo filtrable, bolsa de compra, cierre
de pedido por WhatsApp, códigos de descuento y correos automáticos.

```
index.html               La tienda completa (HTML + CSS + JS, sin dependencias)
api/
  suscribir.js           Registra el correo, crea el código y envía el correo 1
  validar-codigo.js      Valida el código maestro y el de bienvenida
  guardar-carrito.js     Guarda la bolsa para los recordatorios
  crear-preferencia.js   Arma el cobro en Mercado Pago
  webhook-mercadopago.js Recibe la confirmación del pago
  marcar-compra.js       Marca al cliente como comprador (quema su código)
  cron/
    carrito-1h.js        Correo 2 — recordatorio a la hora
    carrito-48h.js       Correo 3 — urgencia a las 48 horas
    boletin-mensual.js   Correo 4 — boletín del día 1 de cada mes
lib/
  almacen.js             Acceso a Upstash Redis
  catalogo.js            PRECIOS OFICIALES — fuente de verdad del cobro
  descuentos.js          Reglas de los dos tipos de código
  mercadopago.js         Cliente de Mercado Pago
  resend.js              Cliente de Resend (correos, contactos, broadcasts)
  correos.js             Las plantillas de correo
  recordatorios.js       Lógica común de los dos recordatorios
  comun.js               Validación, límite por IP y protección de los cron
```

> **Los precios se cobran desde `lib/catalogo.js`, no desde el navegador.** Si
> cambias un precio en `index.html`, cámbialo también ahí o cobrarás el viejo.

---

## 1. Poner el sitio online en Vercel

Requiere una cuenta de GitHub y la cuenta de Vercel que ya tienes.

**a. Sube el proyecto a GitHub**

```bash
git init
git add .
git commit -m "Mancera Atelier"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/mancera-atelier.git
git push -u origin main
```

**b. Importa el repositorio en Vercel**

En [vercel.com/new](https://vercel.com/new) elige el repositorio y pulsa *Deploy*.
No hay que configurar framework ni comando de build: Vercel sirve `index.html`
como estático y convierte cada archivo de `api/` en una función.

**c. Conecta la base de datos**

En el proyecto: *Storage → Marketplace → Upstash → Redis → Connect*.
Vercel inyecta solas `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.

**d. Añade las variables de entorno**

En *Settings → Environment Variables*, copia lo que está en `.env.example`
con tus valores reales. Después vuelve a desplegar para que tomen efecto.

---

## 2. Verificar el dominio en Resend

Ahora mismo `manceracol.com` aparece **pending** en tu cuenta: hasta que no esté
verificado, Resend rechaza los envíos.

1. Entra a [resend.com/domains](https://resend.com/domains) → `manceracol.com`.
2. Copia los registros DKIM, SPF y DMARC que te muestra.
3. Pégalos en el DNS de tu proveedor de dominio.
4. Pulsa *Verify*. Suele tardar entre 15 minutos y unas horas.

Mientras tanto puedes probar todo enviándote correos a ti mismo desde el dominio
de pruebas `onboarding@resend.dev`.

---

## 3. Las tareas programadas

El proyecto está en el **plan Hobby**, que solo permite tareas programadas una
vez al día. Un recordatorio de carrito que se revisa una vez cada 24 horas no
sirve de nada, así que `vercel.json` **no lleva bloque `crons`** y las tres
tareas se disparan desde fuera, gratis.

| Tarea | Cada cuánto | Qué hace |
|---|---|---|
| `/api/cron/carrito-1h` | 15 minutos | Busca bolsas de entre 60 y 90 minutos |
| `/api/cron/carrito-48h` | 1 hora | Busca bolsas de entre 48 y 50 horas |
| `/api/cron/boletin-mensual` | día 1 de cada mes, 9:00 | Boletín de marketing |

### Configurarlas en cron-job.org (gratis)

1. Crea una cuenta en [cron-job.org](https://cron-job.org).
2. **Create cronjob** por cada fila de la tabla.
3. En *URL* pon `https://TU-DOMINIO/api/cron/carrito-1h` (y así con cada una).
4. En *Schedule* elige la frecuencia de la tabla.
5. Abre *Advanced* → **Headers** y añade una cabecera:
   - Nombre: `Authorization`
   - Valor: `Bearer TU_CRON_SECRET`

Sin esa cabecera el endpoint responde `401` y no hace nada: es lo que impide
que un desconocido dispare tus correos.

> Si algún día pasas a Vercel Pro, basta con devolver el bloque `crons` a
> `vercel.json` y borrar las tareas de cron-job.org.

---

## 3.b Mercado Pago

El cobro usa **Checkout Pro**: la tienda arma la preferencia en el servidor y
manda al comprador a la pasarela de Mercado Pago.

**Qué se valida en el servidor, no en el navegador**

- Los precios salen de `lib/catalogo.js`.
- El descuento se vuelve a validar con `lib/descuentos.js`.
- El pago se confirma consultando la API de Mercado Pago, nunca creyéndole al webhook.

**Configura el webhook**

En [tus aplicaciones de Mercado Pago](https://www.mercadopago.com.co/developers/panel/app)
→ *Webhooks*, apunta el evento **Pagos** a:

```
https://TU-DOMINIO/api/webhook-mercadopago
```

Cuando entra un pago aprobado, el sistema marca al cliente como comprador (lo que
quema su código de bienvenida), lo saca de la cola de recordatorios y le envía la
confirmación del pedido. Es lo que cierra el ciclo automáticamente.

**El pago contra entrega no pasa por la pasarela**: en la bolsa desaparece el
botón de Mercado Pago y solo queda el cierre por WhatsApp.

---

## 4. Cómo funcionan los códigos

**Bienvenida — 10 %**
Se genera uno distinto por cada correo (`MANCERA-A8K2`), vence a los 5 días y
solo sirve para la primera compra. Cuando marcas al cliente como comprador, el
código deja de funcionar y quien lo intente ve el mensaje
*«Este descuento es válido únicamente para tu primera compra»*.

**Maestro — 20 %**
Fijo, sin vencimiento y sin límite de usos. Cámbialo en la variable
`CODIGO_MAESTRO`. Sirve para redes sociales y clientes VIP.

**Importante:** el descuento se valida en el servidor, no en el navegador. Nadie
puede activarlo editando la página desde su computador.

---

## 5. Cerrar el ciclo: marcar la compra

Para que el código de primera compra se queme, hay que avisar al sistema cuando
alguien paga. Es el único paso que queda manual mientras no conectes la pasarela:

```bash
curl -X POST https://tu-sitio.vercel.app/api/marcar-compra \
  -H "Authorization: Bearer TU_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"email":"cliente@correo.com","codigo":"MANCERA-A8K2"}'
```

Cuando conectes Wompi o Mercado Pago, llama a este mismo endpoint desde el
webhook de pago aprobado y queda todo automático.

---

## 6. Probar antes de lanzar

```bash
npm i -g vercel
vercel dev
```

Con el servidor local corriendo:

```bash
curl -X POST http://localhost:3000/api/suscribir \
  -H "Content-Type: application/json" \
  -d '{"email":"tu@correo.com","consentimiento":true,"origen":"prueba"}'
```

Debe responder con el código y llegarte el correo de bienvenida.

Para forzar un recordatorio sin esperar una hora, edita a mano el campo
`actualizado` de la clave `carrito:tu@correo.com` en la consola de Upstash y
llama al endpoint del cron con la cabecera de autorización.

---

## 7. Pendientes antes de vender

- [x] Número de WhatsApp conectado (+57 319 737 9462).
- [x] Mercado Pago integrado (Checkout Pro + webhook).
- [ ] **Rotar el access token de Mercado Pago** (se compartió por chat).
- [ ] Ajustar `envioContraentrega` a tu tarifa real de envío.
- [ ] Verificar el dominio en Resend (sigue en *pending*).
- [ ] Registrar el webhook de pagos en el panel de Mercado Pago.
- [ ] Completar NIT, dirección y teléfono en la política de datos.
- [ ] Crear el buzón `datos@manceracol.com` (lo exige la política).
- [ ] Reemplazar las ilustraciones por fotografía de producto.

---

## 8. Variables que deben quedar en Vercel

Sin estas, las funciones responden error y la tienda cae en modo demostración
(el catálogo y el carrito siguen funcionando, pero no hay códigos ni pagos):

| Variable | De dónde sale |
|---|---|
| `MP_ACCESS_TOKEN` | Panel de Mercado Pago (rótalo primero) |
| `RESEND_API_KEY` | resend.com/api-keys |
| `CORREO_REMITENTE` | `Mancera Atelier <hola@manceracol.com>` |
| `RESEND_SEGMENT_ID` | `76f321d9-e38a-41f5-bd34-33cbe1830ae3` |
| `RESEND_TOPIC_ID` | `40740b96-648a-49de-b2c9-bcb4e7fbf92f` |
| `UPSTASH_REDIS_REST_URL` | La inyecta Vercel al conectar Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | La inyecta Vercel al conectar Upstash |
| `CODIGO_MAESTRO` | `MANCERA20` |
| `DESCUENTO_MAESTRO` | `0.20` |
| `DESCUENTO_BIENVENIDA` | `0.10` |
| `DIAS_VIGENCIA_BIENVENIDA` | `5` |
| `CRON_SECRET` | Invéntala: cadena larga y aleatoria |
| `ADMIN_CLAVE` | Invéntala: es tu clave del modo marca |
| `SITIO_URL` | Tu dominio final, sin barra al final |

---

## 9. Modo marca: activar y desactivar piezas

Cuando una talla se agota no hace falta tocar el código.

1. Entra a tu tienda añadiendo `?admin=1` al final de la dirección:
   `https://tu-dominio.com/?admin=1`
2. Bajo cada pieza aparecen tres botones: **A la venta · Agotado · Oculta**.
3. Marca las que quieras, escribe tu `ADMIN_CLAVE` en la barra inferior y pulsa
   **Guardar cambios**.

| Estado | Qué ve el cliente |
|---|---|
| A la venta | Normal |
| Agotado | La pieza se ve en gris, con el sello «Agotado» y sin botón de compra. Puede pedir aviso por WhatsApp. |
| Oculta | La pieza desaparece del catálogo por completo |

El modo marca queda activo en ese navegador hasta que pulses **Salir**. La clave
no se guarda: se pide cada vez que guardas cambios, y se verifica en el servidor.
Aunque alguien active el modo marca, sin la clave no puede cambiar nada.

Además, el servidor rechaza el cobro de cualquier pieza agotada u oculta, aunque
alguien la tuviera en la bolsa desde antes.
