/**
 * Precios oficiales — fuente de verdad para el cobro.
 *
 * El navegador envía qué piezas quiere comprar, NUNCA cuánto cuestan: si
 * confiáramos en el precio que manda el cliente, cualquiera podría editar la
 * página desde su computador y pagar $1.000 por un pantalón.
 *
 * Si cambias un precio, cámbialo también en el array `P` de index.html.
 * Este archivo es el que manda a la hora de cobrar.
 */

export const CATALOGO = {
  // Camisetas básicas
  cb1: { n: "Camiseta Peso Pesado 240 g", precio: 89000 },
  cb2: { n: "Camiseta Pima Cuello Redondo", precio: 95000 },
  cb3: { n: "Camiseta Cuello Alto Estructurado", precio: 99000 },
  cb4: { n: "Camiseta Bolsillo Ribeteado", precio: 92000 },

  // Polos
  po1: { n: "Polo Piqué Clásico", precio: 139000 },
  po2: { n: "Polo Punto Milano", precio: 159000 },
  po3: { n: "Polo Manga Larga Tejido", precio: 169000 },
  po4: { n: "Polo Cuello Camisero", precio: 149000 },

  // Quarter-zip
  qz1: { n: "Quarter-Zip Merino", precio: 229000 },
  qz2: { n: "Quarter-Zip Algodón Peinado", precio: 199000 },
  qz3: { n: "Quarter-Zip Cuello Alto", precio: 219000 },
  qz4: { n: "Quarter-Zip Tejido de Ochos", precio: 249000 },

  // Chinos
  ch1: { n: "Chino Clásico Tiro Medio", precio: 159000 },
  ch2: { n: "Chino Gabardina Tiro Alto", precio: 179000 },
  ch3: { n: "Chino Slim Tiro Medio", precio: 165000 },
  ch4: { n: "Chino con Pinzas Frontales", precio: 189000 },

  // Pantalones de vestir
  pv1: { n: "Pantalón de Vestir con Pinzas", precio: 219000 },
  pv2: { n: "Pantalón de Vestir Liso", precio: 199000 },
  pv3: { n: "Pantalón Lana Fría con Pinzas", precio: 259000 },
  pv4: { n: "Pantalón de Vestir Slim", precio: 209000 },

  // Accesorios
  ac1: { n: "Anillo Sello Acero", precio: 79000 },
  ac2: { n: "Anillo Banda Pulida", precio: 69000 },
  ac3: { n: "Collar Cadena Veneciana", precio: 119000 },
  ac4: { n: "Collar Placa Grabada", precio: 129000 },
  ac5: { n: "Reloj Automático Esfera Marfil", precio: 459000 },
  ac6: { n: "Reloj Correa de Cuero Cognac", precio: 389000 },
  ac7: { n: "Cinturón Cuero Grano Fino", precio: 129000 },
  ac8: { n: "Billetera Cuero Vegetal", precio: 149000 }
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
