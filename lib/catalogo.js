/**
 * Precios oficiales — fuente de verdad para el cobro.
 *
 * El navegador envía qué piezas quiere comprar, NUNCA cuánto cuestan: si
 * confiáramos en el precio que manda el cliente, cualquiera podría editar la
 * página desde su computador y pagar $1.000 por un pantalón.
 *
 * CADA VEZ QUE AÑADAS UNA PRENDA hay que añadirla también aquí, con el mismo
 * `id` que en el array `P` de index.html. Si falta, el cobro la rechaza.
 */

export const CATALOGO = {
  // ---- Camisetas básicas ----
  ost01: { n: "Organic Stretch Slim Tee", precio: 129900 },
  kvt02: { n: "Knit Viscose Essential Tee", precio: 229900 },

  // ---- Polos ----
  ocp03: { n: "Organic Open Collar Knit Polo", precio: 319900 },
  ozp04: { n: "Organic Zipper Knit Polo", precio: 319900 },

  // ---- Quarter-zip ----
  iqz05: { n: "Interlock Quarter-Zip Pullover", precio: 319900 },
  ehq06: { n: "Essential High-Neck Quarter-Zip", precio: 319900 },
  opk07: { n: "Organic Pearl-Knit Perkins Quarter-Zip", precio: 359900 }
};

/**
 * Reconstruye el pedido usando los precios del servidor.
 * Devuelve { lineas, subtotal } o lanza si algo no cuadra.
 */
export function reconstruirPedido(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("El pedido está vacío");
  }
  if (items.length > 40) {
    throw new Error("Demasiadas piezas en el pedido");
  }

  let subtotal = 0;
  const lineas = items.map((i) => {
    const ficha = CATALOGO[i.id];
    if (!ficha) throw new Error(`Pieza desconocida: ${i.id}`);

    const q = Math.min(Math.max(parseInt(i.q, 10) || 1, 1), 20);
    subtotal += ficha.precio * q;

    return {
      id: i.id,
      nombre: ficha.n,
      precio: ficha.precio,
      cantidad: q,
      color: String(i.color || "").slice(0, 40),
      talla: String(i.talla || "").slice(0, 20)
    };
  });

  return { lineas, subtotal };
}
