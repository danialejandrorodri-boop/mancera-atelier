# Dónde va cada imagen

Esta carpeta es la única que toca la tienda para cargar fotos. No hace falta
tocar código para que aparezcan: basta con dejar el archivo con el nombre
correcto.

```
img/
  hero.jpg              ← la foto grande del inicio
  productos/
    ost01-negro-1.jpg   ← foto principal, color Negro Azabache
    ost01-negro-2.jpg   ← segunda foto (se ve al pasar el cursor)
    ost01-marfil-1.jpg
    ost01-marfil-2.jpg
```

## Cómo se llama cada archivo

`<código de la prenda>-<color>-<número>.jpg`

- **Código de la prenda:** el `id` que le pusimos en el catálogo. La primera
  camiseta es `ost01`.
- **Color:** en minúscula y sin tildes ni espacios — `negro`, `marfil`,
  `marino`, `melange`, `khaki`, `marengo`, `cognac`.
- **Número:** el orden en que se muestran. El `1` es la foto principal, la que
  sale en el catálogo.

## Recomendaciones de formato

| Imagen | Proporción | Tamaño ideal | Peso máximo |
|---|---|---|---|
| Portada (`hero.jpg`) | Vertical 4:5 | 1600 × 2000 px | 400 KB |
| Producto | Vertical 4:5 | 1200 × 1500 px | 250 KB |

- Formato **.jpg** (o `.webp` si sabes convertirlo: pesa la mitad).
- Todas las fotos de producto con **el mismo fondo y la misma distancia**: es
  lo que hace que un catálogo se vea profesional.
- Si una foto pesa mucho, pásala por [squoosh.app](https://squoosh.app) antes de
  subirla. Una página lenta pierde ventas.

## Qué pasa si falta una foto

Nada se rompe. Mientras el archivo no exista, la tienda muestra la ilustración
de línea de la prenda sobre su color real. En cuanto subes la foto con el
nombre correcto, aparece sola.
