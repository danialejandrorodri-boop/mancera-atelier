/**
 * FICHA OPERATIVA INTERNA — no se envía nunca al navegador.
 *
 * Este archivo vive solo en el servidor. El nombre de la tienda de origen y el
 * costo de adquisición no aparecen en `index.html` ni en ninguna respuesta
 * pública: solo se consultan desde /api/margenes, que exige la clave de
 * administración.
 *
 * Al cambiar un precio de venta, actualiza también `lib/catalogo.js`
 * (que es el que cobra) y el array `P` de index.html (que es el que muestra).
 */

import { CATALOGO } from "./catalogo.js";

export const OPERACION = {
  ost01: {
    alias: "camiseta basica",
    busqueda: "CAMISETA SLIM FIT BÁSICA /01",
    costo: 75900
  },
  kvt02: {
    alias: "basica premium",
    busqueda: "CAMISETA PUNTO REGULAR FIT BÁSICO",
    costo: 159900
  },
  ocp03: {
    alias: "polo basica",
    busqueda: "POLO PUNTO REGULAR FIT ESTRUCTURA",
    costo: 219000
  },
  ozp04: {
    alias: "polo cremallera",
    busqueda: "POLO PUNTO REGULAR FIT CREMALLERA",
    costo: 219000
  },
  iqz05: {
    alias: "",
    busqueda: "SUDADERA POLO INTERLOCK CREMALLERA",
    costo: 219000
  },
  ehq06: {
    alias: "",
    busqueda: "SUDADERA CUELLO CREMALLERA BÁSICA",
    costo: 219000
  },
  opk07: {
    alias: "",
    busqueda: "JERSEY PUNTO PERLADO CUELLO CREMALLERA",
    costo: 249000
  }
};

/* Comisión aproximada de la pasarela sobre el total cobrado.
   Ajusta este número con el porcentaje real de tu contrato. */
export const COMISION_PASARELA = 0.0415; // 3,49 % + IVA, redondeado

/**
 * Calcula el margen de cada pieza.
 *
 * `bruto` es lo que queda tras pagar la prenda.
 * `neto` descuenta además la comisión de la pasarela: es lo que de verdad
 * entra a caja en un pago por adelantado.
 */
export function calcularMargenes({ envioContraentrega = 15000 } = {}) {
  const filas = Object.entries(OPERACION).map(([id, op]) => {
    const ficha = CATALOGO[id];
    if (!ficha) return null;

    const pvp = ficha.precio;
    const bruto = pvp - op.costo;
    const comision = Math.round(pvp * COMISION_PASARELA);
    const neto = bruto - comision;

    return {
      id,
      nombre: ficha.n,
      alias: op.alias || null,
      busqueda: op.busqueda,
      costo: op.costo,
      pvp,
      margen_bruto: bruto,
      margen_bruto_pct: +((bruto / pvp) * 100).toFixed(1),
      comision_pasarela: comision,
      margen_neto: neto,
      margen_neto_pct: +((neto / pvp) * 100).toFixed(1),
      /* Si el cliente paga contra entrega, el envío sale de tu bolsillo
         solo cuando lo asumes tú; hoy lo paga el cliente, así que se
         muestra aparte como referencia. */
      neto_si_asumes_envio: neto - envioContraentrega
    };
  }).filter(Boolean);

  const totales = filas.reduce((t, f) => ({
    costo: t.costo + f.costo,
    pvp: t.pvp + f.pvp,
    neto: t.neto + f.margen_neto
  }), { costo: 0, pvp: 0, neto: 0 });

  return {
    filas: filas.sort((a, b) => a.margen_neto_pct - b.margen_neto_pct),
    resumen: {
      margen_neto_promedio_pct: +((totales.neto / totales.pvp) * 100).toFixed(1),
      inversion_para_un_surtido: totales.costo,
      venta_de_un_surtido: totales.pvp
    }
  };
}
