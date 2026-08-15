/**
 * Almacén de datos sobre Upstash Redis (API REST).
 *
 * Claves que usa el sistema:
 *   lead:{email}      → registro de suscripción. Sin vencimiento: es la prueba
 *                       de la autorización que exige la Ley 1581 de 2012.
 *   codigo:{CODIGO}   → código de bienvenida. Vence solo con el TTL.
 *   comprador:{email} → marca de "ya compró". Quema el código de primera compra.
 *   carrito:{email}   → bolsa sin finalizar. Se borra sola a los 7 días.
 *   carritos          → índice ordenado por fecha, para los recordatorios.
 */

/**
 * Vercel bautiza estas variables de forma distinta según cómo conectes la
 * base: "Upstash for Redis" usa UPSTASH_*, el antiguo Vercel KV usa KV_*,
 * y algunas integraciones usan REDIS_*. Aceptamos todas para que la tienda
 * funcione sin tener que adivinar cuál te tocó.
 */
const NOMBRES_URL = ["UPSTASH_REDIS_REST_URL", "KV_REST_API_URL", "REDIS_REST_URL"];
const NOMBRES_TOKEN = ["UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_TOKEN", "REDIS_REST_TOKEN"];

const primero = (nombres) => {
  for (const n of nombres) if (process.env[n]) return { nombre: n, valor: process.env[n] };
  return null;
};

const urlHallada = primero(NOMBRES_URL);
const tokenHallado = primero(NOMBRES_TOKEN);

const URL_BASE = urlHallada?.valor;
const TOKEN = tokenHallado?.valor;

/** Para el diagnóstico: qué nombres encontró, sin revelar los valores. */
export const configAlmacen = {
  urlDesde: urlHallada?.nombre || null,
  tokenDesde: tokenHallado?.nombre || null,
  listo: Boolean(URL_BASE && TOKEN)
};

async function cmd(...args) {
  if (!URL_BASE || !TOKEN) {
    throw new Error(
      "La base de datos no está configurada. Falta " +
      (!URL_BASE ? NOMBRES_URL.join(" o ") : "") +
      (!URL_BASE && !TOKEN ? " y " : "") +
      (!TOKEN ? NOMBRES_TOKEN.join(" o ") : "")
    );
  }
  const r = await fetch(URL_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(args.map(String))
  });
  const j = await r.json();
  if (j.error) throw new Error("Redis: " + j.error);
  return j.result;
}

export const kv = {
  async leer(clave) {
    const v = await cmd("GET", clave);
    if (!v) return null;
    try { return JSON.parse(v); } catch { return v; }
  },

  async escribir(clave, valor, ttlSegundos) {
    const s = JSON.stringify(valor);
    return ttlSegundos
      ? cmd("SET", clave, s, "EX", ttlSegundos)
      : cmd("SET", clave, s);
  },

  borrar: (clave) => cmd("DEL", clave),
  existe: async (clave) => (await cmd("EXISTS", clave)) === 1,

  // índice ordenado de carritos pendientes
  indexar: (indice, puntaje, miembro) => cmd("ZADD", indice, puntaje, miembro),
  desindexar: (indice, miembro) => cmd("ZREM", indice, miembro),
  rango: (indice, desde, hasta) => cmd("ZRANGEBYSCORE", indice, desde, hasta)
};

export const CLAVES = {
  lead: (email) => `lead:${email.toLowerCase()}`,
  codigo: (c) => `codigo:${c.toUpperCase()}`,
  comprador: (email) => `comprador:${email.toLowerCase()}`,
  carrito: (email) => `carrito:${email.toLowerCase()}`,
  indiceCarritos: "carritos"
};

/**
 * Genera un código único e irrepetible del tipo MANCERA-A8K2.
 * El alfabeto omite 0/O/1/I para que nadie se equivoque al teclearlo.
 */
export async function generarCodigoUnico() {
  const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let intento = 0; intento < 8; intento++) {
    let sufijo = "";
    for (let i = 0; i < 4; i++) {
      sufijo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
    }
    const codigo = `MANCERA-${sufijo}`;
    if (!(await kv.existe(CLAVES.codigo(codigo)))) return codigo;
  }
  // Colisión ocho veces seguidas es prácticamente imposible; por si acaso,
  // se alarga el sufijo con la marca de tiempo.
  return `MANCERA-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}
