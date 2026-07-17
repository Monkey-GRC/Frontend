# Templates: Riesgo → Causa → Control → Checklist

Documentación para el frontend de la pantalla de **Templates**, donde se selecciona un riesgo, se le asignan causas (Reason) y a cada causa se le asignan los controles (con su checklist CIS/Wazuh) que la mitigan.

## 1. Modelo mental

```
Template ("SOC 2", "ISO 27001"...)
  └─ Risk (riesgo) — pertenece a un template vía templateId
       └─ Reason/Causa  ←→ M:N →  Risk
            └─ Control   ←→ M:N →  Reason
                 └─ ControlCheck (checklist CIS/Wazuh, ver sección 6)
```

- Un **Template** agrupa uno o varios **Risk**.
- Un **Risk** puede tener varias **Reason** (causas) — y una misma causa puede estar vinculada a más de un riesgo.
- Una **Reason** puede tener varios **Control** — y un mismo control puede mitigar más de una causa.
- Todo lo construido hasta ahora es **global** (no hay todavía multi-cliente ni "adoptar un template para un cliente" — eso queda para una fase futura). Por ahora, todo lo que crees es visible para cualquier usuario autenticado.

Todos los endpoints requieren sesión iniciada (cookie `access_token`, igual que el resto de la API) y responden siempre con el envoltorio estándar:
```json
{ "statusCode": 200, "message": "...", "data": { } }
```

## 2. Template — `/v1/templates`

| Método | Ruta | Body / Query | Descripción |
|---|---|---|---|
| POST | `/v1/templates` | `CreateTemplateDto` | Crea un template |
| GET | `/v1/templates` | — | Lista todos los templates |
| GET | `/v1/templates/:id` | — | Detalle de un template **con sus `risks[]`** |
| PATCH | `/v1/templates/:id` | `Partial<CreateTemplateDto>` | Actualiza |
| DELETE | `/v1/templates/:id` | — | Elimina |

**`CreateTemplateDto`:**
```ts
{
  name: string;          // requerido, máx 150
  slug: string;          // requerido, único, solo minúsculas/números/guiones (ej: "soc-2")
  description?: string;  // opcional, máx 500
  objective?: string;    // opcional, máx 500
  scope?: string;        // opcional, máx 500
}
```

**Ejemplo `GET /v1/templates/:id`:**
```json
{
  "statusCode": 200,
  "message": "Template obtenido exitosamente.",
  "data": {
    "id": "2c338f57-...",
    "name": "SOC 2",
    "code": "TPL-112648",
    "description": "Framework SOC 2",
    "objective": null,
    "scope": null,
    "slug": "soc-2",
    "created_at": "...",
    "updated_at": "...",
    "risks": [
      { "id": "efb8ab89-...", "name": "Acceso no autorizado", "code": "RGS-112648", "level": "HIGH" }
    ]
  }
}
```
El detalle de cada riesgo (sus causas y controles) se obtiene navegando a `GET /v1/risks/:id` con el `id` de cada elemento de `risks[]` — este endpoint no trae el árbol completo anidado para no sobrecargar la respuesta.

## 3. Risk — `/v1/risks`

Ya existía el CRUD; se agregó `templateId` (opcional) y el detalle individual.

| Método | Ruta | Novedad |
|---|---|---|
| POST | `/v1/risks` | Acepta `templateId?: string` en el body para asociar el riesgo a un template al crearlo |
| PATCH | `/v1/risks/:id` | Acepta `templateId?: string` para mover el riesgo a otro template (o quitarlo si se envía vacío, según valide el frontend) |
| GET | `/v1/risks/:id` | **Nuevo.** Devuelve el riesgo con su `template` y sus `reasons[]` (causas ya vinculadas) |

**Ejemplo `POST /v1/risks`:**
```json
{
  "name": "Acceso no autorizado",
  "impact": 4,
  "probability": 3,
  "templateId": "2c338f57-dc3c-4d9d-8886-00fa516ace0b"
}
```

**Ejemplo `GET /v1/risks/:id`:**
```json
{
  "statusCode": 200,
  "message": "Riesgo obtenido exitosamente.",
  "data": {
    "id": "efb8ab89-...",
    "name": "Acceso no autorizado",
    "code": "RGS-112648",
    "impact": 4,
    "probability": 3,
    "level": "HIGH",
    "template": { "id": "2c338f57-...", "name": "SOC 2", "code": "TPL-112648" },
    "reasons": [
      { "reason": { "id": "8ea84262-...", "name": "Falta de MFA", "code": "RSN-112648" } }
    ]
  }
}
```
Nota: `reasons` viene como un array de `{ reason: {...} }` (por la tabla puente interna), no como objetos planos — el frontend debe leer `item.reason.id`, `item.reason.name`, etc.

## 4. Reason (Causa) — `/v1/reasons`

CRUD ya existente + lo nuevo agregado ahora: detalle individual y los 4 endpoints de vínculo. **Reason es el punto único de escritura de las relaciones** — no existen endpoints equivalentes en `/risks` o `/controls` para vincular, todo se hace desde `/reasons`.

| Método | Ruta | Body | Descripción |
|---|---|---|---|
| POST | `/v1/reasons` | `{ name, description? }` | Crea una causa |
| GET | `/v1/reasons` | — | Lista todas |
| GET | `/v1/reasons/:id` | — | **Nuevo.** Detalle con `risks[]` y `controls[]` (cada control trae su `checks[]`) |
| PATCH | `/v1/reasons/:id` | `{ name?, description? }` | Actualiza |
| DELETE | `/v1/reasons/:id` | — | Elimina |
| POST | `/v1/reasons/:id/risks` | `{ riskIds: string[] }` | **Nuevo.** Vincula uno o varios riesgos a la causa |
| DELETE | `/v1/reasons/:id/risks/:riskId` | — | **Nuevo.** Desvincula un riesgo |
| POST | `/v1/reasons/:id/controls` | `{ controlIds: string[] }` | **Nuevo.** Vincula uno o varios controles a la causa |
| DELETE | `/v1/reasons/:id/controls/:controlId` | — | **Nuevo.** Desvincula un control |

Vincular es idempotente (si ya estaba vinculado, no falla ni duplica).

**Ejemplo `GET /v1/reasons/:id`:**
```json
{
  "statusCode": 200,
  "message": "Razón obtenida exitosamente.",
  "data": {
    "id": "8ea84262-...",
    "name": "Falta de MFA",
    "code": "RSN-112648",
    "risks": [
      { "risk": { "id": "efb8ab89-...", "name": "Acceso no autorizado", "code": "RGS-112648", "level": "HIGH" } }
    ],
    "controls": [
      {
        "control": {
          "id": "15a0955f-...",
          "name": "Habilitar MFA",
          "code": "CTR-152243",
          "type": "AUTOMATIC",
          "checks": [
            { "id": "...", "check_id": "28500", "title": "Ensure /tmp is a separate partition.", "os": "UBUNTU" }
          ]
        }
      }
    ]
  }
}
```

**Ejemplo vincular:**
```
POST /v1/reasons/8ea84262-.../risks
{ "riskIds": ["efb8ab89-..."] }

POST /v1/reasons/8ea84262-.../controls
{ "controlIds": ["15a0955f-..."] }
```

## 5. Control — `/v1/controls`

Ya existía el CRUD completo (con `checklist`, ver sección 6). Lo único nuevo en esta tanda:

| Método | Ruta | Novedad |
|---|---|---|
| GET | `/v1/controls/:id` | **Nuevo.** Devuelve el control con `checks[]` y `reasons[]` (las causas que ya lo tienen vinculado) |

## 6. Recordatorio: checklist CIS/Wazuh al crear un Control

Esto ya estaba implementado antes de esta tanda, pero es clave para el flujo de "Template":

- `GET /v1/checklist?os=UBUNTU|WINDOWS&search=texto` → catálogo de checks `{ checkId, title }` para elegir.
- Al crear el control: `POST /v1/controls` con `type: "AUTOMATIC"`, `os: "UBUNTU"|"WINDOWS"` y `checklist: [{ checkId, title }]` (los objetos tal cual vinieron del catálogo).

## 7. Flujo recomendado para la pantalla "Templates"

1. Crear (o seleccionar) un **Template**: `POST /v1/templates` (o listar con `GET /v1/templates`).
2. Dentro del template, crear un **Risk** con `templateId` del template actual: `POST /v1/risks`.
3. Crear o reutilizar una **Reason** (causa): `POST /v1/reasons` (o buscarla en `GET /v1/reasons` si ya existe una causa reutilizable, ej. "Falta de capacitación").
4. Vincular la causa al riesgo: `POST /v1/reasons/:id/risks` con `{ riskIds: [riskId] }`.
5. Crear o reutilizar un **Control** para esa causa (con su checklist, sección 6): `POST /v1/controls`.
6. Vincular el control a la causa: `POST /v1/reasons/:id/controls` con `{ controlIds: [controlId] }`.
7. Para revisar el árbol completo: `GET /v1/templates/:id` → por cada riesgo, `GET /v1/risks/:id` → por cada causa vinculada, `GET /v1/reasons/:id` trae ya las causas con sus controles y checklist.

## 8. Qué NO está implementado todavía (fuera de alcance por ahora)

- No hay multi-cliente: no existe `client_id` en Risk/Reason/Control ni feature `Client`. Todo lo que se crea es global.
- No existe "adoptar un template para un cliente" (clonado del árbol completo). Eso es una fase futura, separada intencionalmente de esta entrega.
