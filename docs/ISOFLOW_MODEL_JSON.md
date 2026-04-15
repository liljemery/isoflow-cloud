# Formato JSON del modelo Isoflow (export / import)

Este documento describe el objeto **`model`** que Isoflow persiste y que la API acepta en `POST/PATCH /projects` (campo `model`). Úsalo para que otra IA o herramienta **genere o transforme** diagramas compatibles.

---

## Rol del JSON

- Representa un **proyecto de diagrama isométrico**: catálogo de iconos, colores, ítems reutilizables y **vistas** (`views`), cada una con su propio lienzo (nodos, conectores, rectángulos, cajas de texto).
- Los **IDs** son strings opacos (UUID recomendado); deben ser **únicos** dentro de su colección y las **referencias** deben resolverse (p. ej. un `icon` en un `item` debe existir en `icons`).

---

## Objeto raíz (`Model`)

| Campo | Tipo | Obligatorio | Notas |
|--------|------|-------------|--------|
| `title` | `string` | Sí | Máx. 200 caracteres (nombre del diagrama/proyecto; alineado con el título del proyecto en la API). |
| `version` | `string` | No | Máx. 10 caracteres si se envía. |
| `description` | `string` | No | Texto libre. |
| `icons` | `Icon[]` | Sí | Puede ser `[]`; si usas nodos con icono, debe existir la definición aquí. |
| `colors` | `Color[]` | Sí | Al menos un color por defecto suele incluir `id: "__DEFAULT__"`. |
| `items` | `ModelItem[]` | Sí | Catálogo de “tipos de nodo” reutilizables. |
| `views` | `View[]` | Sí | Al menos una vista para un diagrama usable. |

---

## `Icon`

```json
{
  "id": "string-unico",
  "name": "string",
  "url": "https://... o ruta a SVG/PNG",
  "collection": "string-opcional",
  "isIsometric": true
}
```

- `url`: URL accesible del recurso (en isopacks suele ser URL pública).
- `isIsometric`: opcional; por defecto en muchos assets es `true`.

---

## Iconos: catálogo, referencias y buenas prácticas (para IAs)

### Qué es `icons` en el modelo

- `icons` es el **catálogo** de definiciones de imagen: cada entrada describe **un** recurso (`url`) con un **`id` estable**.
- Los nodos **no** incrustan la URL en la vista: referencian el icono por **`ModelItem.icon` → debe existir un objeto en `icons[]` con ese mismo `id`**.
- Un mismo icono puede usarse en **varios** `ModelItem` distintos (mismo `icons[].id` referenciado desde varios items) o un item por varias instancias en el lienzo (varios `ViewItem` con el mismo `id` que el `ModelItem` si comparten definición — ver abajo).

### Flujo completo: del catálogo al lienzo

1. **`icons[]`** — Lista de `{ id, name, url, ... }`. Aquí vive la “biblioteca” de gráficos.
2. **`items[]` (`ModelItem`)** — Cada nodo lógico tiene `id`, `name`, y opcionalmente **`icon`: string** = uno de los `icons[].id`.
3. **`views[].items[]` (`ViewItem`)** — Cada aparición en el canvas tiene `tile` {x,y}. El **`id` del `ViewItem` debe ser igual al `id` del `ModelItem`** que representa (Isoflow resuelve el nodo con ese id para pintar icono, etiqueta, etc.).

Regla práctica para generar JSON:

- Por cada nodo que quieras en el diagrama: crea un `ModelItem` con `id` único y `icon` apuntando a un `icons[].id`.
- En la vista, añade un `ViewItem` con **el mismo `id`** que ese `ModelItem`, más `tile`.

### Campos del objeto `Icon` (cómo rellenarlos)

| Campo | Uso |
|--------|-----|
| `id` | Identificador único global en el modelo (UUID recomendado). Es lo que se pone en `ModelItem.icon`. |
| `name` | Etiqueta humana (p. ej. `server`, `load-balancer`). |
| `url` | Dirección **HTTPS** de un **SVG o PNG** accesible por el navegador (CORS permitido si el host es otro dominio). |
| `collection` | Opcional. Agrupa iconos en la UI (p. ej. `isoflow`, `aws`). En isopacks viene rellenado al aplanar colecciones. |
| `isIsometric` | Opcional. `true` para assets dibujados en perspectiva isométrica (la mayoría de isopacks). |

### Isopacks (biblioteca oficial de iconos)

El ecosistema publica paquetes NPM **`@isoflow/isopacks`** con colecciones: **isoflow** (red/cloud genérico), **AWS**, **Azure**, **GCP**, **Kubernetes**. Cada colección exporta `{ id, name, icons: [...] }`; la utilidad `flattenCollections([...])` produce un **`Icon[]`** plano listo para `initialData.icons`.

- Repositorio y detalles: [github.com/markmanx/isopacks](https://github.com/markmanx/isopacks).
- Ejemplos de URL pública (patrón histórico en documentación):

  `https://isoflow-public.s3.eu-west-2.amazonaws.com/isopacks/isoflow/server.svg`

Si tu pipeline **no** puede leer el paquete NPM, puedes **copiar** del isopack los objetos `Icon` completos (mismo `id` y `url` que en el pack) para que el diagrama sea portable.

### Persistencia en este host (API + web)

- Al **guardar**, el cliente suele enviar solo iconos **referenciados** por algún `ModelItem` (payload reducido).
- Al **abrir el editor**, el host puede **fusionar** el modelo guardado con la biblioteca por defecto (`@isoflow/isopacks`) para rellenar el panel de iconos.

**Para una IA que solo produce JSON** (export estático, otro sistema, prompt): **incluye siempre en `icons` la definición completa** (al menos `id`, `name`, `url`, y si aplica `isIsometric`) **por cada `icon` referenciado en `items`**. Así el archivo es **autónomo** y válido aunque no haya fusión con isopacks.

### Errores frecuentes a evitar

- Referenciar `ModelItem.icon = "xyz"` sin ningún `{ "id": "xyz", ... }` en `icons`.
- Poner un `ViewItem.id` que **no** coincida con ningún `ModelItem.id`.
- URLs rotas, `file://`, o SVG que el navegador no pueda cargar por CORS.

### Checklist rápido (IA)

1. Enumerar todos los `icon` usados en `items[].icon`.
2. Por cada uno, añadir en `icons[]` un objeto con ese `id` y una `url` válida.
3. Asegurar que cada `ViewItem.id` ∈ `items[].id`.
4. Preferir `isIsometric: true` si el asset es isométrico.

---

## `Color`

```json
{
  "id": "string-unico",
  "value": "#RRGGBB"
}
```

- `value`: máximo 7 caracteres en el esquema (p. ej. `#a5b8f3`).

---

## `ModelItem` (definición de nodo)

```json
{
  "id": "string-unico",
  "name": "string",
  "description": "opcional",
  "icon": "id-de-icono-opcional"
}
```

- Si `icon` está presente, debe coincidir con un `icons[].id`.

---

## `View` (una vista / página del diagrama)

| Campo | Tipo | Obligatorio |
|--------|------|-------------|
| `id` | `string` | Sí |
| `name` | `string` | Sí |
| `description` | `string` | No |
| `lastUpdated` | `string` (ISO 8601 datetime) | No |
| `items` | `ViewItem[]` | Sí (puede ser `[]`) |
| `rectangles` | `Rectangle[]` | No |
| `connectors` | `Connector[]` | No |
| `textBoxes` | `TextBox[]` | No |

### `ViewItem` (instancia de nodo en el lienzo)

```json
{
  "id": "string-unico-en-el-modelo",
  "tile": { "x": 0, "y": 0 },
  "labelHeight": 80
}
```

- `tile`: coordenadas en la **rejilla isométrica** (enteros o números según el diseño).
- `labelHeight`: opcional.

### `Rectangle`

```json
{
  "id": "string",
  "color": "id-de-color-opcional",
  "from": { "x": 0, "y": 0 },
  "to": { "x": 1, "y": 1 }
}
```

### `TextBox`

```json
{
  "id": "string",
  "tile": { "x": 0, "y": 0 },
  "content": "texto",
  "fontSize": 0.6,
  "orientation": "X"
}
```

- `orientation`: solo `"X"` o `"Y"` si se incluye (proyección).

### `Connector`

Cada conector debe tener **al menos dos** entradas en `anchors` (origen y destino). Un array vacío **no** es válido y produce el error *«Connector must have at least two anchors»*.

```json
{
  "id": "string",
  "description": "opcional",
  "color": "id-de-color-opcional",
  "width": 10,
  "style": "SOLID",
  "anchors": [
    { "id": "ancla-a", "ref": { "item": "id-del-ViewItem-origen" } },
    { "id": "ancla-b", "ref": { "item": "id-del-ViewItem-destino" } }
  ]
}
```

- `style`: uno de `"SOLID"`, `"DOTTED"`, `"DASHED"` si se envía.
- Los `id` dentro de `anchors` son los de las anclas; los valores en `ref.item` deben coincidir con algún `views[].items[].id` de **esa misma vista**.

### `Anchor` (dentro de `connectors[].anchors`)

```json
{
  "id": "string",
  "ref": {
    "item": "id-view-item"
  }
}
```

- `ref` debe tener **exactamente una** clave entre: `item` (id de un `ViewItem` en la vista), `anchor` (id de otra ancla del mismo conector u otra en la vista, según el flujo del editor), o `tile` (coordenada libre). Para JSON generado por IA, lo más simple y robusto es enlazar **dos nodos** con `ref: { "item": "..." }` como en el ejemplo del conector anterior.

---

## Coherencia que debe respetar la IA

1. **Referencias**: Todo `items[].icon` debe existir en `icons[]`. Los `color` en rectángulos/conectores deben existir en `colors[]` si se usan. Cada conector listado debe tener `anchors.length >= 2` y cada `ref.item` debe existir en `views[].items[]` de esa vista.
2. **IDs únicos**: Sin duplicados entre entidades del mismo tipo donde aplica (vistas, items de vista, conectores, etc.).
3. **Vistas**: Al menos **una** `View` con `items` (aunque sea vacío) para un diagrama vacío válido en la práctica.
4. **Tamaños de string**: etiquetas cortas (`title`, `name` de vista/ítem/icono, etc.) ≤ 200 caracteres; textos largos (`description`, contenido de `textBoxes`, etc.) hasta ~100 000 caracteres.

---

## Ejemplo mínimo válido (estructura)

```json
{
  "title": "Mi diagrama",
  "version": "",
  "description": "",
  "icons": [],
  "colors": [
    { "id": "__DEFAULT__", "value": "#a5b8f3" }
  ],
  "items": [],
  "views": [
    {
      "id": "view-uuid-1",
      "name": "Vista principal",
      "items": [],
      "rectangles": [],
      "connectors": [],
      "textBoxes": []
    }
  ]
}
```

---

## Ejemplo con un nodo y un icono

```json
{
  "title": "Red simple",
  "icons": [
    {
      "id": "icon-server-1",
      "name": "server",
      "url": "https://ejemplo.com/server.svg",
      "isIsometric": true
    }
  ],
  "colors": [
    { "id": "__DEFAULT__", "value": "#a5b8f3" }
  ],
  "items": [
    {
      "id": "mi-item-1",
      "name": "Servidor",
      "icon": "icon-server-1"
    }
  ],
  "views": [
    {
      "id": "v1",
      "name": "Vista 1",
      "items": [
        {
          "id": "mi-item-1",
          "tile": { "x": 0, "y": 0 },
          "labelHeight": 80
        }
      ]
    }
  ]
}
```

*Importante:* el `id` de cada **`ViewItem`** debe coincidir con el **`id` de un `ModelItem`** del mismo modelo (así el nodo en el lienzo usa esa definición e icono).

---

## Nota para integración API / host

- El **título mostrado en la lista de proyectos** puede vivir también en la columna de base de datos; conviene mantener **`model.title`** alineado con el nombre del proyecto al guardar.
- Al cargar en el editor, el host puede enviar además qué vista está activa (`view`: id de vista); eso es del **cliente**, no del JSON mínimo del payload si solo guardas `model`.

---

## Instrucción corta para pegar a otra IA

> Genera un único JSON que cumpla el esquema `Model` de Isoflow: `title`, `icons[]`, `colors[]`, `items[]`, `views[]` con al menos una vista; cada vista con `id`, `name`, `items[]`; coordenadas `tile` como `{x,y}`; `ModelItem` referencia `icon` solo si ese id existe en `icons`; colores referenciados deben existir en `colors`. Sin comentarios en el JSON, sin texto fuera del JSON.

Puedes añadir al final: *“Si falta biblioteca de iconos, usa `icons: []` y `items` sin `icon`, o incluye URLs públicas de SVG válidas.”*
