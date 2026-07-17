# Módulo de Reason — Documentación para Frontend

> Referencia funcional y técnica del módulo **Reason** (Razones) del backend.
> Pensado para el equipo de frontend: qué endpoints existen, qué se envía, qué se
> recibe y qué autenticación se requiere.

---

## 1. Contexto general

El backend es una API REST construida con **NestJS + Prisma + PostgreSQL**,
organizada con **Clean Architecture** + estructura **Feature-Based**. Cada feature
(dominio de negocio) vive en `src/features/<nombre>/` con sus capas encapsuladas:

| Capa               | Responsabilidad                                               |
| ------------------ | ------------------------------------------------------------- |
| **Domain**         | Entidades e interfaces de repositorio (contratos).            |
| **Application**    | Casos de uso (lógica de orquestación) y DTOs de entrada.      |
| **Infrastructure** | Implementación concreta con Prisma.                           |
| **Presentation**   | Controlador HTTP: recibe request, delega y arma la respuesta. |

`Reason` representa una **razón/motivo** catalogable dentro del sistema (con un
nombre, una descripción opcional y un código legible autogenerado).

---

## 2. Información base para consumir la API

| Concepto                 | Valor                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| **Prefijo global**       | `/v1`                                                                                         |
| **Ruta base del módulo** | `/v1/reasons`                                                                                 |
| **Autenticación**        | JWT vía **cookie** (`AuthGuard('jwt')` + `@ApiCookieAuth`). Todas las rutas están protegidas. |
| **CORS**                 | Origen permitido `http://localhost:4200`, `credentials: true`.                                |
| **Idioma**               | Los mensajes se traducen (i18n). Enviar header `Accept-Language: es` o `en`.                  |

> ⚠️ **Importante:** el usuario que ejecuta la acción se toma del token
> (`req.user.id`), **no** se envía en el body. El frontend solo debe garantizar
> que la cookie de sesión viaje en cada petición (`withCredentials: true`).

---

## 3. Formato de respuesta

Todas las respuestas usan el wrapper genérico `ResponseDto`:

```jsonc
{
  "statusCode": 200,     // Código HTTP
  "message": "…",        // Mensaje traducido (i18n)
  "data": { … }          // Payload (opcional; solo en lecturas)
}
```

En caso de error se devuelve una `HttpException` con `statusCode 500` y el mensaje
de error traducido correspondiente (ver sección 7).

---

## 4. Modelo de datos (entidad Reason)

Tabla en base de datos: `mnk_reasons`.

| Campo             | Tipo             | Descripción                                                                                              |
| ----------------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| `id`              | `string (uuid)`  | Identificador único.                                                                                     |
| `name`            | `string`         | Nombre de la razón. **Requerido.**                                                                       |
| `description`     | `string \| null` | Descripción. Opcional.                                                                                   |
| `code`            | `string`         | Código legible autogenerado, formato `RSN-XXXXXX` (6 dígitos ofuscados a partir de la secuencia). Único. |
| `seq`             | `number`         | Secuencia interna autoincremental (uso interno; base del `code`).                                        |
| `created_at`      | `DateTime`       | Fecha de creación.                                                                                       |
| `updated_at`      | `DateTime`       | Fecha de última actualización.                                                                           |
| `created_by_user` | `object \| null` | Usuario que la creó (ver forma abajo).                                                                   |
| `updated_by_user` | `object \| null` | Usuario que la actualizó por última vez.                                                                 |

**Forma de `created_by_user`** (proyección al listar):

```jsonc
{
  "id": "uuid",
  "name": "string",
  "last_name": "string",
  "role": "string",
  "username": "string",
}
```

> `code` se genera automáticamente en el backend al crear. El frontend **no** lo
> envía ni lo calcula.

---

## 5. Endpoints

Todos bajo la ruta base `/v1/reasons` y requieren sesión JWT (cookie).

### 5.1 Crear razón

```
POST /v1/reasons
```

**Body (`CreateReasonDto`):**

| Campo         | Tipo     | Reglas                        | Requerido |
| ------------- | -------- | ----------------------------- | --------- |
| `name`        | `string` | No vacío, máx. 150 caracteres | ✅        |
| `description` | `string` | Máx. 500 caracteres           | ❌        |

```json
{
  "name": "Cambio de proveedor",
  "description": "Motivo utilizado cuando se sustituye un proveedor."
}
```

**Respuesta `201`:**

```json
{
  "statusCode": 201,
  "message": "Razón creada exitosamente."
}
```

> No devuelve el objeto creado. Si el frontend necesita mostrarlo, debe volver a
> consultar el listado (`GET /v1/reasons`).

---

### 5.2 Listar todas las razones

```
GET /v1/reasons
```

**Respuesta `200`:**

```json
{
  "statusCode": 200,
  "message": "Razones obtenidas exitosamente.",
  "data": [
    {
      "id": "1c9e...",
      "name": "Cambio de proveedor",
      "code": "RSN-483920",
      "description": "Motivo utilizado cuando…",
      "created_by_user": {
        "id": "…",
        "name": "Hector",
        "last_name": "Rios",
        "role": "ADMIN",
        "username": "hrios"
      },
      "updated_by_user": null,
      "created_at": "2026-07-01T12:00:00.000Z",
      "updated_at": "2026-07-01T12:00:00.000Z"
    }
  ]
}
```

> No hay paginación ni filtros actualmente: devuelve todas las razones.

---

### 5.3 Actualizar razón

```
PATCH /v1/reasons/:id
```

`:id` = uuid de la razón.

**Body (`UpdateReasonDto`)** — todos los campos son opcionales (partial de
`CreateReasonDto`, mismas reglas de validación). Solo se actualiza lo que se envíe:

```json
{
  "name": "Cambio de proveedor (revisado)"
}
```

**Respuesta `200`:**

```json
{
  "statusCode": 200,
  "message": "Razón actualizada exitosamente."
}
```

> El backend registra automáticamente el usuario que actualizó (`updated_by_user`).

---

### 5.4 Eliminar razón

```
DELETE /v1/reasons/:id
```

**Respuesta `200`:**

```json
{
  "statusCode": 200,
  "message": "Razón eliminada exitosamente."
}
```

> Es un borrado físico (hard delete).

---

## 6. Resumen rápido de endpoints

| Método   | Ruta              | Descripción      | Body              | Devuelve `data` |
| -------- | ----------------- | ---------------- | ----------------- | --------------- |
| `POST`   | `/v1/reasons`     | Crear razón      | `CreateReasonDto` | No              |
| `GET`    | `/v1/reasons`     | Listar razones   | —                 | Sí (array)      |
| `PATCH`  | `/v1/reasons/:id` | Actualizar razón | `UpdateReasonDto` | No              |
| `DELETE` | `/v1/reasons/:id` | Eliminar razón   | —                 | No              |

---

## 7. Mensajes (i18n)

Los mensajes se resuelven según el `Accept-Language`. Ejemplos (es / en):

| Clave           | Español                         | English                         |
| --------------- | ------------------------------- | ------------------------------- |
| `CREATED`       | Razón creada exitosamente.      | Reason created successfully.    |
| `UPDATED`       | Razón actualizada exitosamente. | Reason updated successfully.    |
| `DELETED`       | Razón eliminada exitosamente.   | Reason deleted successfully.    |
| `READ.ALL`      | Razones obtenidas exitosamente. | Reasons retrieved successfully. |
| `CREATE_FAILED` | Error al crear la razón.        | Error creating reason.          |
| `UPDATE_FAILED` | Error al actualizar la razón.   | Error updating reason.          |
| `DELETE_FAILED` | Error al eliminar la razón.     | Error deleting reason.          |
| `NOT_FOUND`     | Razón no encontrada.            | Reason not found.               |

---

## 8. Validaciones a tener en cuenta en el frontend

- `name`: obligatorio en creación, no vacío, **máx. 150 caracteres**.
- `description`: opcional, **máx. 500 caracteres**.
- En actualización, ambos campos son opcionales pero conservan las mismas reglas.
- Enviar siempre la cookie de sesión (`withCredentials: true`); sin ella la
  respuesta será `401 Unauthorized`.

---

## 9. Estructura interna del módulo (referencia técnica)

```
src/features/reason/
├── domain/
│   ├── entities/reason.entity.ts              # Entidad de dominio
│   └── repositories/reason.repository.ts      # Contrato abstracto + tipos de input
├── application/
│   ├── dtos/
│   │   ├── create-reason.dto.ts               # Validación de creación
│   │   └── update-reason.dto.ts               # PartialType de create
│   └── use-case/
│       ├── create-reason.use-case.ts
│       ├── get-all-reasons.use-case.ts
│       ├── update-reason.use-case.ts
│       └── delete-reason.use-case.ts
├── infrastructure/
│   └── repositories/reason.prisma.repository.ts  # Implementación con Prisma
├── presentation/
│   └── reason.controller.ts                   # Rutas HTTP (/v1/reasons)
└── reason.module.ts                           # Wiring del módulo
```

**Flujo de una petición:**

```
Controller → UseCase → ReasonRepository (contrato) → ReasonPrismaRepository → DB
```

El controlador inyecta el id del usuario autenticado desde el token y delega a los
casos de uso; estos hablan con la interfaz de repositorio, y la implementación
Prisma resuelve la persistencia (incluida la generación del `code` en una
transacción al crear).
