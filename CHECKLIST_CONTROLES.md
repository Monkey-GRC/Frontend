# Checklist CIS (Wazuh) para Controles Automáticos

Documento de la implementación agregada para que, al crear un control de tipo **AUTOMATIC**, el usuario pueda elegir un sistema operativo (Ubuntu / Windows) y seleccionar uno o varios checks CIS traídos desde la base de datos de Wazuh (`prueba_wazuh`, de solo lectura).

## 1. Qué se agregó (resumen)

- **Feature nueva `checklist`**: expone el catálogo de checks CIS de Wazuh, filtrado por sistema operativo y con búsqueda opcional por texto.
- **Feature `control` extendida**: al crear un control se le puede adjuntar la lista de checks elegidos; quedan guardados asociados a ese control (snapshot propio, no depende de que Wazuh siga disponible después).
- No se migró ni se modificó la base `prueba_wazuh` en ningún momento — es de solo lectura, y solo se consultan explícitamente las columnas `check_id` y `title` (nunca `SELECT *`).

## 2. Endpoints

### 2.1 `GET /v1/checklist` — catálogo de checks CIS

Requiere autenticación (cookie/JWT), igual que el resto de la API.

**Query params:**

| Parámetro | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `os` | `"UBUNTU" \| "WINDOWS"` | Sí | Sistema operativo del checklist a traer |
| `search` | `string` | No | Filtra por texto libre sobre el título del check (`ILIKE %texto%`) |

**Ejemplo:**

```
GET /v1/checklist?os=UBUNTU
GET /v1/checklist?os=WINDOWS&search=firewall
```

**Respuesta:**

```json
{
  "statusCode": 200,
  "message": "Checklist obtenido",
  "data": [
    { "checkId": "28500", "title": "Ensure /tmp is a separate partition." },
    { "checkId": "28501", "title": "Ensure nodev option set on /tmp partition." }
  ]
}
```

No hay paginación: para Ubuntu son ~207 checks y para Windows ~482, un payload pequeño (solo `checkId` + `title`). El frontend debe mostrarlos en una lista con scroll/búsqueda propia (tipo checklist con buscador), no pedir "páginas" al backend.

### 2.2 `POST /v1/controls` — crear control (con checklist opcional)

Se agregaron dos campos **opcionales** al body existente:

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `os` | `"UBUNTU" \| "WINDOWS"` | Solo si se envía `checklist` | Mismo enum que en `GET /checklist` |
| `checklist` | `{ checkId: string; title: string }[]` | No | Los checks elegidos por el usuario. Se recomienda enviar exactamente los objetos `{ checkId, title }` que devolvió `GET /v1/checklist`, sin transformarlos |

**Ejemplo de body (control automático con checklist):**

```json
{
  "name": "Endurecimiento del sistema de archivos",
  "type": "AUTOMATIC",
  "os": "UBUNTU",
  "checklist": [
    { "checkId": "28500", "title": "Ensure /tmp is a separate partition." },
    { "checkId": "28504", "title": "Ensure separate partition exists for /var." }
  ]
}
```

Si `type` es `MANUAL` o `HYBRID` (o simplemente no se seleccionan checks), `os` y `checklist` se pueden omitir por completo.

### 2.3 `GET /v1/controls` — ahora incluye los checks guardados

Cada control en `data` trae un array `checks` con lo que se guardó al crearlo:

```json
{
  "id": "…",
  "name": "Endurecimiento del sistema de archivos",
  "type": "AUTOMATIC",
  "checks": [
    { "id": "…", "check_id": "28500", "title": "Ensure /tmp is a separate partition.", "os": "UBUNTU" }
  ]
}
```

## 3. Flujo esperado en el frontend

1. Usuario abre "Crear control" y selecciona **tipo = Automático**.
2. Se muestra un selector de sistema operativo: **Ubuntu** o **Windows**.
3. Al elegir el SO, el frontend llama `GET /v1/checklist?os=<SO_ELEGIDO>` y muestra la lista completa en un componente con buscador (input de texto que puede filtrar localmente, o volver a llamar al endpoint con `search=` si se prefiere filtrar en el backend).
4. El usuario marca los checks que apliquen a ese control (normalmente unos pocos, no todos).
5. Al enviar el formulario, el `POST /v1/controls` se manda con `type: "AUTOMATIC"`, `os: "<SO_ELEGIDO>"` y `checklist: [...]` con los objetos `{ checkId, title }` tal cual vinieron del catálogo.
6. Si el usuario cambia a tipo Manual/Híbrido antes de enviar, simplemente no se incluyen `os` ni `checklist` en el body.

## 4. Notas técnicas para quien despliegue esto

- Nueva variable de entorno requerida: `WAZUH_DATABASE_URL` (conexión de solo lectura a la base de checks CIS). Ver `.env`.
- Nueva variable `SHADOW_DATABASE_URL` (requerida por Prisma para generar migraciones en desarrollo; no afecta producción salvo que se corran migraciones ahí).
- Nueva tabla propia `mnk_control_checks` (migración `20260714061410_add_control_checklist`) — vive en la base de datos de la aplicación, no en la de Wazuh.
- Se detectó y corrigió una migración (`20260701140406_add_control_feature`) que estaba aplicada en la base local pero nunca se había comiteado; ya quedó regularizada.
