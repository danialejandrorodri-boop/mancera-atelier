# Plantilla de tienda — manual de reutilización

Este documento permite recrear una tienda como la de Mancera Atelier para otro
cliente en pocas horas, sin volver a resolver los mismos problemas.

La tienda es **una sola página** con backend propio. No usa WordPress, Shopify
ni framework alguno: HTML, CSS y JavaScript escritos a mano, más funciones de
servidor en Vercel. Eso la hace muy rápida, gratuita de alojar y sin cuotas
mensuales de plataforma.

---

## 1. Qué hace la tienda, funcionalidad por funcionalidad

| Bloque | Qué resuelve |
|---|---|
| Catálogo filtrable | Secciones, subcategorías, filtros dinámicos por talla, corte y color |
| Ficha de producto | Galería con flechas, selector de color y talla, composición, cuidados y medidas |
| Outfits armados | Carrusel de looks completos; talla independiente por pieza |
| Bolsa de compra | Persistente, con cupones validados en servidor |
| Checkout | Formulario de envío completo + pasarela + cierre por WhatsApp |
| Códigos de descuento | Único por persona con vencimiento, y maestro fijo |
| Correos automáticos | Bienvenida, dos recordatorios de carrito, confirmación y boletín |
| Modo marca | Marcar piezas agotadas u ocultas sin tocar código |
| Ficha de márgenes | Costo, precio y margen real por pieza, protegido con clave |
| Marco legal | Datos personales, retracto, reversión de pago, garantía y términos |

---

## 2. Arquitectura

```
index.html          Toda la tienda: estilos, catálogo, carrito, checkout, legal
api/                Funciones de servidor — MÁXIMO 12 en el plan gratuito
  suscribir.js          Registro + código de bienvenida + correo 1
  validar-codigo.js     Valida cupones
  crear-preferencia.js  Arma el cobro en la pasarela
  webhook-*.js          Recibe la confirmación del pago
  guardar-carrito.js    Guarda la bolsa para los recordatorios
  marcar-compra.js      Marca al cliente como comprador
  disponibilidad.js     GET público / POST protegido
  margenes.js           Ficha interna de costos
  estado.js             Diagnóstico: qué está configurado y qué falta
  cron.js               Las tres tareas programadas en un solo archivo
lib/
  catalogo.js       PRECIOS OFICIALES — la fuente de verdad del cobro
  costos.js         Costo de adquisición y márgenes (nunca llega al navegador)
  descuentos.js     Reglas de los cupones
  almacen.js        Base de datos (Upstash Redis)
  resend.js         Envío de correos y contactos
  mercadopago.js    Cliente de la pasarela
  correos.js        Plantillas HTML de los correos
  recordatorios.js  Lógica de carrito abandonado
  comun.js          Validación, límite por IP, protección de endpoints
img/
  hero.jpg          Portada
  productos/        Fotos, nombradas codigo-color-numero.jpg
```

### La regla de oro

**Los precios se cobran desde `lib/catalogo.js`, no desde el navegador.** El
cliente solo dice *qué* quiere; el servidor decide *cuánto* cuesta. Sin esto,
cualquiera edita la página y paga lo que quiera. Al cambiar un precio hay que
cambiarlo en los **dos** sitios: `index.html` (lo que se muestra) y
`lib/catalogo.js` (lo que se cobra).

---

## 3. Qué se cambia en cada proyecto nuevo

**Cambia siempre:**

- **Paleta** — las variables al inicio del CSS (`--marfil`, `--botanico`, etc.)
- **Tipografía** — las variables `--serif` y `--sans`
- **Catálogo** — el array `P` de `index.html` y `lib/catalogo.js`
- **Secciones y filtros** — los arrays `SECCIONES` y la función `defFiltros()`
- **Ilustraciones de respaldo** — los símbolos SVG del sprite
- **Textos legales** — si el país no es Colombia, cambia toda la base legal
- **`CONFIG`** — WhatsApp, costo de envío, moneda

**No se toca casi nunca:** pagos, correos, cupones, disponibilidad, carrito,
checkout, recordatorios. Esa es la parte que cuesta semanas y ya está resuelta.

---

## 4. Orden de montaje

Este orden importa: saltárselo genera los errores que ya sufrimos.

1. **GitHub** — repositorio vacío, sin README
2. **Subir el código** — `git init`, `commit`, `push`
3. **Vercel** — importar el repositorio *desde la web*, no por API
   (así se instala el permiso de GitHub, que por API se omite)
4. **Dominio** — comprarlo en Vercel y conectarlo al proyecto
5. **Base de datos** — Storage → Marketplace → Upstash → Redis → Connect
6. **Variables de entorno** — todas, y después **Redeploy**
7. **Resend** — verificar el dominio con sus tres registros DNS
8. **Pasarela** — credenciales de producción y webhook apuntando al dominio final
9. **Tareas programadas** — cron-job.org apuntando a `/api/cron?tarea=…`
10. **Comprobar** — abrir `/api/estado`: debe decir «Todo listo para vender»

---

## 5. Variables de entorno

| Variable | De dónde sale |
|---|---|
| `MP_ACCESS_TOKEN` | Panel de la pasarela, credenciales de producción |
| `RESEND_API_KEY` | resend.com/api-keys |
| `CORREO_REMITENTE` | `Marca <hola@dominio.com>` |
| `CORREO_RESPUESTA` | Correo de atención |
| `RESEND_SEGMENT_ID` | Segmento de Resend |
| `RESEND_TOPIC_ID` | Topic para el boletín |
| `UPSTASH_REDIS_REST_URL` | La inyecta Vercel al conectar la base |
| `UPSTASH_REDIS_REST_TOKEN` | Ídem |
| `CODIGO_MAESTRO` | El cupón fijo de la marca |
| `DESCUENTO_MAESTRO` | `0.20` |
| `DESCUENTO_BIENVENIDA` | `0.10` |
| `DIAS_VIGENCIA_BIENVENIDA` | `5` |
| `CRON_SECRET` | Cadena aleatoria larga |
| `ADMIN_CLAVE` | Clave del modo marca |
| `SITIO_URL` | Dominio final, sin barra al final |

> El código acepta también `KV_REST_API_URL` y `KV_REST_API_TOKEN`, porque
> Vercel bautiza esas variables de forma distinta según cómo conectes la base.

---

## 6. Trampas ya sufridas — leer antes de empezar

**El plan gratuito de Vercel permite 12 funciones.** Cada archivo en `api/` gasta
una. Si necesitas otra, consolida en un archivo existente con un parámetro
(como hicimos con `cron.js`), no crees uno nuevo.

**`vercel.json` no admite comentarios ni campos inventados.** Es JSON con esquema
estricto: una clave desconocida tumba la construcción entera.

**Las cabeceras de caché se aplican también a los 404.** Si pones un año con
`immutable` y alguien pide una foto que aún no subiste, ese «no existe» queda
grabado un año y la imagen no aparecerá jamás. Usa una hora, y añade
`?v=N` a las direcciones para forzar recargas.

**Declara el idioma con `<html lang="es">`.** Sin eso, Chrome traduce la página
y convierte las tallas S/M/XL en «SÍ/METRO/SG».

**Las tareas programadas del plan gratuito solo corren una vez al día.** Para
recordatorios de carrito hace falta cron-job.org o similar.

**`window.open` se bloquea dentro de iframes y vistas previas.** Los botones de
WhatsApp deben ser enlaces `<a>` reales con la dirección ya escrita, no botones
manejados por JavaScript.

**`scrollBy` con desplazamiento suave se cancela** al combinarlo con
`scroll-snap`. Navega entre tarjetas y deja un respaldo instantáneo.

**`requestAnimationFrame` no corre en pestañas de fondo.** No dependas de él
para el estado inicial de un carrusel.

**Resend tiene lista de bloqueo.** Si un correo no llega y el estado dice
`suppressed`, la dirección está bloqueada; hay que quitarla a mano.

**Resend solo envía a tu propio correo hasta verificar un dominio.** No hay
forma gratuita de saltarse esto.

---

## 7. Qué pedirle al cliente

### Cuentas y accesos

El cliente crea las cuentas **a su nombre** —para que el negocio sea suyo— y
concede acceso o pega las credenciales en Vercel él mismo. Nunca se piden
contraseñas.

- GitHub, Vercel, Resend, cuenta de la pasarela, WhatsApp Business
- Dominio propio (unos 12 USD al año). **Sin dominio no hay correos.**

### Por cada producto

| Dato | Para qué |
|---|---|
| Nombre comercial | Ficha y catálogo |
| Precio de venta | Lo que ve el cliente |
| **Costo de adquisición** | Calcular el margen real |
| Colores disponibles | Selector y filtro |
| Tallas | Selector y filtro |
| Corte o tipo | Filtros |
| Composición | Ficha |
| Instrucciones de cuidado | Ficha |
| Medidas por talla | Reduce cambios y devoluciones |
| Descripción breve | Ficha |
| Fotos | Dos por color: frente y espalda |

### Fotos: cómo pedirlas

- **Proporción 4:5 vertical**, mínimo 1200 × 1500 px, menos de 250 KB
- Mismo fondo y misma distancia en todas
- Nombradas `codigo-color-numero.jpg` — ejemplo: `q3-azul-1.jpg`
- **Deben ser del cliente.** Fotos de otra marca son infracción de derechos de
  autor, aunque se les cambie el fondo o se recorte al modelo.

### Datos del negocio

- Razón social, NIT o identificación fiscal, dirección, teléfono
- Política de envíos: plazos y costos
- Política de cambios: plazo y quién paga el transporte
- Correo de atención y correo de protección de datos

---

## 8. Tiempos realistas

| Fase | Tiempo |
|---|---|
| Adaptar diseño y estructura | 1 día |
| Cargar catálogo (10–15 productos con datos completos) | 1 día |
| Conectar cuentas y desplegar | medio día |
| Pruebas de pago y correos | medio día |

**El cuello de botella nunca es el código: son las fotos y los datos de
producto.** Si el cliente los entrega completos y bien nombrados, todo va
rápido. Si llegan a cuentagotas, el proyecto se alarga semanas.
