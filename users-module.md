# Módulo de Usuarios

> Referencia funcional y técnica del módulo **User** (Usuarios) del backend.
> Pensado para el equipo de frontend: qué endpoints existen, qué se envía, qué se
> recibe, qué reglas de negocio aplican y qué autenticación se requiere.

---

## 1. Contexto general

El backend es una API REST construida con **NestJS + Prisma + PostgreSQL**,
organizada con **Clean Architecture** + estructura **Feature-Based**. Cada feature
(dominio de negocio) vive en `src/features/<nombre>/` con sus capas encapsuladas:

| Capa               | Responsabilidad                                               |
| ------------------ | -------------------------------------------------------------- |
| **Domain**         | Contrato abstracto de repositorio (interfaz + tipos de input). |
| **Application**    | Casos de uso (lógica de orquestación) y DTOs de entrada.       |
| **Infrastructure** | Implementación concreta con Prisma.                             |
| **Presentation**   | Controlador HTTP: recibe request, delega y arma la respuesta.  |

Este módulo **es distinto** al de los clientes finales / tenants. No crea
empresas ni usuarios dentro del tenant de un cliente. Es un módulo **más macro**:
permite que un usuario de rol `MONKEY_ADMIN` (el equipo de Monkey, dueño de la
plataforma) administre — vía CRUD — a los otros usuarios de la plataforma:
`MONKEY_ADMIN`, `CLIENT_ADMIN`, `USER` y `VIEWER`.

> La gestión que un `CLIENT_ADMIN` haga de sus propios usuarios **dentro de su
> tenant** (crear `USER`/`VIEWER` de su misma empresa) **no** es parte de este
> módulo — queda para un módulo futuro.

### Roles (`enum Role`)

```ts
enum Role {
  CLIENT_ADMIN
  USER
  VIEWER
  MONKEY_ADMIN
}
```

**Importante:** `USER` y `VIEWER` **no pertenecen a ningún tenant**. Son
usuarios de la propia plataforma administrativa de Monkey (externos al equipo
Monkey, pero sin relación con un `Client` específico) con permisos de **solo
lectura** sobre los catálogos (`reason`/`risk`/`control`/`template`) y **sin
ningún acceso** a la gestión de usuarios. El único rol que sí se relaciona con
un tenant es `CLIENT_ADMIN`.

| Rol            | Significado                                                                 | ¿Tiene `client_id`?      |
| -------------- | ---------------------------------------------------------------------------- | ------------------------- |
| `MONKEY_ADMIN` | Superadmin de la plataforma (equipo Monkey). Gestiona este módulo completo.  | **No** (siempre `null`).  |
| `CLIENT_ADMIN` | Admin de un tenant/empresa cliente específico.                              | **Sí**, obligatorio.       |
| `USER`         | Usuario de la plataforma Monkey, de solo lectura sobre los catálogos. No pertenece a ningún tenant. | **No** (siempre `null`). |
| `VIEWER`       | Igual que `USER`: solo lectura, sin tenant asociado.                          | **No** (siempre `null`).  |

---

## 2. Información base para consumir la API

| Concepto                 | Valor                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Prefijo global**       | `/v1`                                                                                                         |
| **Ruta base del módulo** | `/v1/users`                                                                                                   |
| **Autenticación**        | JWT vía **cookie** (`AuthGuard('jwt')` + `@ApiCookieAuth`). Todas las rutas requieren sesión.                |
| **Autorización**         | **Exclusivo para `MONKEY_ADMIN`.** Cualquier otro rol autenticado recibe `403 Forbidden`.                    |
| **CORS**                 | Origen permitido `http://localhost:4200`, `credentials: true`.                                                |
| **Idioma**               | Los mensajes se traducen (i18n). Enviar header `Accept-Language: es` o `en` (por defecto `es`).              |

> ⚠️ **Importante:** el frontend debe garantizar que la cookie de sesión viaje
> en cada petición (`withCredentials: true` / `credentials: 'include'`). Si el
> usuario logueado no tiene rol `MONKEY_ADMIN`, ni siquiera debería mostrarse la
> pantalla de gestión de usuarios, ya que el backend rechazará toda la sección.

### Cómo se valida la autorización

1. `AuthGuard('jwt')` valida la cookie `access_token` y adjunta `req.user` (con
   `id`, `email`, `role`, `client_id`, `is_active`) tomado del payload del JWT.
2. `RolesGuard` (nuevo, en `src/common/guards/roles.guard.ts`) revisa que
   `req.user.role` esté dentro de los roles requeridos por el decorator
   `@Roles(Role.MONKEY_ADMIN)` puesto en el controller. Si no coincide, lanza
   `403 Forbidden` antes de ejecutar cualquier lógica del endpoint.

---

## 3. Formato de respuesta

Todas las respuestas usan el wrapper genérico `ResponseDto`:

```jsonc
{
  "statusCode": 200,     // Código HTTP
  "message": "…",        // Mensaje traducido (i18n)
  "data": { … }          // Payload (presente en create/read/update; ausente en delete)
}
```

En caso de error se devuelve una `HttpException` con el `statusCode` y mensaje
correspondiente (ver sección 7).

---

## 4. Modelo de datos (entidad User expuesta por la API)

Tabla en base de datos: `mnk_users`. **El campo `password` nunca se expone** —
el `select` de Prisma en el repositorio lo excluye explícitamente en todas las
respuestas.

| Campo         | Tipo                       | Descripción                                                          |
| ------------- | -------------------------- | ----------------------------------------------------------------------- |
| `id`          | `string (uuid)`             | Identificador único.                                                    |
| `email`       | `string`                    | Único. Se normaliza a minúsculas en el backend.                        |
| `username`    | `string`                    | Único.                                                                   |
| `name`        | `string \| null`            | Nombre.                                                                  |
| `last_name`   | `string \| null`            | Apellido.                                                               |
| `role`        | `Role`                      | `CLIENT_ADMIN` \| `USER` \| `VIEWER` \| `MONKEY_ADMIN`.                 |
| `client_id`   | `string (uuid) \| null`     | Tenant al que pertenece. Solo tiene valor si `role = CLIENT_ADMIN`; `null` para `MONKEY_ADMIN`, `USER` y `VIEWER`. |
| `client`      | `object \| null`            | Datos básicos del tenant (ver forma abajo). `null` si no tiene tenant.  |
| `is_active`   | `boolean`                   | `true` = activo. `false` = usuario "eliminado" (soft delete).           |
| `created_at`  | `DateTime`                  | Fecha de creación.                                                       |
| `updated_at`  | `DateTime`                  | Fecha de última actualización.                                           |

**Forma de `client`** (proyección incluida al listar/leer un usuario):

```jsonc
{
  "id": "uuid",
  "name": "string",
  "tax_id": "string"
}
```

---

## 5. Regla de negocio clave: rol ⇄ tenant

Esta regla se valida en el backend (en los casos de uso), **no** solo es una
convención de UI — el frontend debe replicarla para dar buen feedback antes de
enviar la petición, pero el backend la exige igual:

- Si `role = CLIENT_ADMIN` → **`client_id` es obligatorio**. Si falta (en
  creación) o se intenta limpiar sin cambiar el rol a otro que no sea
  `CLIENT_ADMIN` (en actualización), el backend responde `400` con
  `TENANT_REQUIRED`.
- Si `role` es `MONKEY_ADMIN`, `USER` o `VIEWER` → **no se debe enviar
  `client_id`** (o debe venir vacío/omitido). Si se envía uno, el backend
  responde `400` con `TENANT_NOT_ALLOWED`.

En la práctica, para el formulario de frontend:

- Si el admin selecciona rol `CLIENT_ADMIN` → mostrar y exigir el selector de
  cliente (tenant).
- Si selecciona `MONKEY_ADMIN`, `USER` o `VIEWER` → ocultar/deshabilitar ese
  selector; hoy solo `CLIENT_ADMIN` se relaciona con un tenant.

> ⚠️ Ver también sección 12: como todavía no existe un módulo para crear
> `Client` (tenants), **hoy no es posible crear un `CLIENT_ADMIN` real** en un
> ambiente limpio — no hay ningún `client_id` válido al cual apuntar. Por
> ahora, en la práctica, solo tiene sentido exponer en el frontend la creación
> de `MONKEY_ADMIN`, `USER` y `VIEWER` (ninguno de los tres pide tenant).

---

## 6. Endpoints

Todos bajo la ruta base `/v1/users`, requieren sesión JWT (cookie) **y** rol
`MONKEY_ADMIN`.

### 6.1 Crear usuario

```
POST /v1/users
```

**Body (`CreateUserDto`):**

| Campo       | Tipo               | Reglas                                                    | Requerido |
| ----------- | ------------------- | ---------------------------------------------------------- | --------- |
| `email`     | `string`             | Formato email válido.                                       | ✅        |
| `username`  | `string`             | No vacío, máx. 50 caracteres.                               | ✅        |
| `password`  | `string`             | Mín. 8 caracteres. El admin define la contraseña inicial.  | ✅        |
| `name`      | `string`             | Máx. 100 caracteres.                                        | ❌        |
| `last_name` | `string`             | Máx. 100 caracteres.                                        | ❌        |
| `role`      | `Role` (enum)        | `CLIENT_ADMIN` \| `USER` \| `VIEWER` \| `MONKEY_ADMIN`.     | ✅        |
| `client_id` | `string (uuid)`      | **Obligatorio únicamente si `role = CLIENT_ADMIN`**; no debe enviarse para los demás roles (ver sección 5). | ⚠️ condicional |

Ejemplo — creando un `USER` (sin tenant):

```json
{
  "email": "ana.perez@monkey360.com",
  "username": "ana.perez",
  "password": "Segura123",
  "name": "Ana",
  "last_name": "Pérez",
  "role": "USER"
}
```

Ejemplo — creando un `CLIENT_ADMIN` (requiere `client_id` de un tenant existente):

```json
{
  "email": "carlos.gomez@empresa.com",
  "username": "carlos.gomez",
  "password": "Segura123",
  "name": "Carlos",
  "last_name": "Gómez",
  "role": "CLIENT_ADMIN",
  "client_id": "b2f1c2a0-1234-4a5b-9c3d-abc123456789"
}
```

**Respuesta `201`** (ejemplo con el `USER` de arriba, sin tenant):

```json
{
  "statusCode": 201,
  "message": "Usuario creado exitosamente.",
  "data": {
    "id": "9f0e...",
    "email": "ana.perez@monkey360.com",
    "username": "ana.perez",
    "name": "Ana",
    "last_name": "Pérez",
    "role": "USER",
    "client_id": null,
    "client": null,
    "is_active": true,
    "created_at": "2026-07-22T10:00:00.000Z",
    "updated_at": "2026-07-22T10:00:00.000Z"
  }
}
```

**Errores posibles:**

| Caso                                                  | Status | Body `message`        |
| ------------------------------------------------------ | ------ | ---------------------- |
| `role` distinto de `CLIENT_ADMIN` con `client_id` enviado | `400`  | `TENANT_NOT_ALLOWED`   |
| `role = CLIENT_ADMIN` sin `client_id`                   | `400`  | `TENANT_REQUIRED`      |
| `email` o `username` ya existen                         | `409`  | `DUPLICATE`            |
| Body inválido (falta campo, formato, etc.)              | `400`  | Detalle de `class-validator` |
| Rol del usuario logueado ≠ `MONKEY_ADMIN`               | `403`  | `FORBIDDEN`            |

---

### 6.2 Listar todos los usuarios

```
GET /v1/users
```

**Respuesta `200`:**

```json
{
  "statusCode": 200,
  "message": "Usuarios obtenidos exitosamente.",
  "data": [
    {
      "id": "9f0e...",
      "email": "ana.perez@empresa.com",
      "username": "ana.perez",
      "name": "Ana",
      "last_name": "Pérez",
      "role": "CLIENT_ADMIN",
      "client_id": "b2f1c2a0-...",
      "client": { "id": "b2f1c2a0-...", "name": "Empresa Demo", "tax_id": "900123456-7" },
      "is_active": true,
      "created_at": "2026-07-22T10:00:00.000Z",
      "updated_at": "2026-07-22T10:00:00.000Z"
    }
  ]
}
```

> No hay paginación ni filtros actualmente: devuelve **todos** los usuarios
> (incluyendo los inactivos, `is_active: false`). Si el frontend necesita
> distinguir "eliminados", debe filtrar por `is_active` en la UI.

---

### 6.3 Obtener un usuario

```
GET /v1/users/:id
```

`:id` = uuid del usuario.

**Respuesta `200`:** mismo objeto que en el listado (ver 6.2), dentro de `data`
(objeto, no array).

**Error:** si el `id` no existe → `404` con `NOT_FOUND`.

---

### 6.4 Actualizar usuario

```
PATCH /v1/users/:id
```

**Body (`UpdateUserDto`)** — todos los campos son opcionales, solo se
actualiza lo que se envíe:

| Campo       | Tipo                     | Notas                                                                                     |
| ----------- | ------------------------- | -------------------------------------------------------------------------------------------- |
| `email`     | `string`                   | Formato email válido.                                                                        |
| `username`  | `string`                   | Máx. 50 caracteres.                                                                           |
| `password`  | `string`                   | Mín. 8 caracteres. Si se envía, **resetea la contraseña** (rehash).                          |
| `name`      | `string`                   | Máx. 100 caracteres.                                                                          |
| `last_name` | `string`                   | Máx. 100 caracteres.                                                                          |
| `role`      | `Role` (enum)              | Cambiar de rol aplica la misma regla rol⇄tenant de la sección 5.                             |
| `client_id` | `string (uuid) \| null`    | Cambiar de tenant. Si se cambia `role` a `CLIENT_ADMIN`, `client_id` debe enviarse en el mismo body. Enviar `null` **solo** si en el mismo body `role` pasa a `MONKEY_ADMIN`, `USER` o `VIEWER`. |
| `is_active` | `boolean`                  | Permite **reactivar** un usuario desactivado (`true`), o desactivarlo manualmente (`false`). |

Ejemplo — resetear contraseña y reactivar:

```json
{
  "password": "NuevaClave2026",
  "is_active": true
}
```

Ejemplo — mover a otro tenant:

```json
{
  "client_id": "3aa211a0-9999-4b1b-8888-abc987654321"
}
```

**Respuesta `200`:**

```json
{
  "statusCode": 200,
  "message": "Usuario actualizado exitosamente.",
  "data": { "...": "objeto usuario actualizado, misma forma que 6.2" }
}
```

**Errores posibles:** los mismos que en creación (`TENANT_NOT_ALLOWED`,
`TENANT_REQUIRED`, `DUPLICATE` si el nuevo email/username ya existe, `403` si
no es `MONKEY_ADMIN`).

---

### 6.5 Eliminar usuario (soft delete)

```
DELETE /v1/users/:id
```

**Respuesta `200`:**

```json
{
  "statusCode": 200,
  "message": "Usuario eliminado exitosamente."
}
```

> ⚠️ **No es un borrado físico.** Internamente solo cambia `is_active` a
> `false` — el registro sigue existiendo en base de datos. Se hizo así a
> propósito: el usuario puede tener contenido creado/actualizado (razones,
> riesgos, controles, plantillas) que referencia su `id`, y esas relaciones
> están configuradas para **no** permitir el borrado físico si tiene actividad
> asociada. Para "reactivar" un usuario eliminado, usar `PATCH /v1/users/:id`
> con `{ "is_active": true }`.

---

## 7. Resumen rápido de endpoints

| Método   | Ruta             | Descripción                  | Body              | Devuelve `data` |
| -------- | ---------------- | ------------------------------ | ------------------ | ---------------- |
| `POST`   | `/v1/users`       | Crear usuario                  | `CreateUserDto`     | Sí (objeto)      |
| `GET`    | `/v1/users`       | Listar usuarios                | —                   | Sí (array)       |
| `GET`    | `/v1/users/:id`   | Obtener un usuario             | —                   | Sí (objeto)      |
| `PATCH`  | `/v1/users/:id`   | Actualizar usuario             | `UpdateUserDto`     | Sí (objeto)      |
| `DELETE` | `/v1/users/:id`   | Eliminar usuario (soft delete) | —                   | No               |

Todos requieren rol `MONKEY_ADMIN` del usuario autenticado.

---

## 8. Mensajes (i18n)

Los mensajes se resuelven según el header `Accept-Language`. Ejemplos (es / en):

| Clave                | Español                                              | English                                             |
| --------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| `CREATED`             | Usuario creado exitosamente.                            | User created successfully.                              |
| `UPDATED`             | Usuario actualizado exitosamente.                       | User updated successfully.                              |
| `DELETED`             | Usuario eliminado exitosamente.                         | User deleted successfully.                              |
| `READ.ALL`            | Usuarios obtenidos exitosamente.                        | Users retrieved successfully.                           |
| `READ.ONE`            | Usuario obtenido exitosamente.                          | User retrieved successfully.                            |
| `CREATE_FAILED`       | Error al crear el usuario.                              | Error creating user.                                    |
| `UPDATE_FAILED`       | Error al actualizar el usuario.                         | Error updating user.                                    |
| `DELETE_FAILED`       | Error al eliminar el usuario.                           | Error deleting user.                                    |
| `READ_FAILED`         | Error al obtener los usuarios.                          | Error fetching users.                                   |
| `NOT_FOUND`           | Usuario no encontrado.                                  | User not found.                                         |
| `DUPLICATE`           | El correo o nombre de usuario ya está en uso.           | Email or username is already taken.                     |
| `TENANT_REQUIRED`     | El rol CLIENT_ADMIN requiere un cliente (tenant) asignado. | The CLIENT_ADMIN role requires an assigned client (tenant). |
| `TENANT_NOT_ALLOWED`  | Solo CLIENT_ADMIN puede tener un cliente (tenant) asignado. | Only CLIENT_ADMIN can have an assigned client (tenant). |
| `error.FORBIDDEN`     | Prohibido                                               | Forbidden                                               |
| `error.UNAUTHORIZED`  | No autorizado                                           | Unauthorized                                            |

---

## 9. Validaciones a tener en cuenta en el frontend

- `email`: formato válido, único a nivel de sistema (no por tenant).
- `username`: no vacío, máx. 50 caracteres, único a nivel de sistema.
- `password`: mín. 8 caracteres, tanto en creación como en el reset opcional de
  actualización.
- `name` / `last_name`: opcionales, máx. 100 caracteres cada uno.
- `role`: debe ser uno de los 4 valores del enum exacto (`CLIENT_ADMIN`,
  `USER`, `VIEWER`, `MONKEY_ADMIN`).
- `client_id`: uuid válido; **obligatorio únicamente si `role = CLIENT_ADMIN`**;
  no debe enviarse para `MONKEY_ADMIN`, `USER` ni `VIEWER` (ver sección 5 —
  regla validada también en el backend).
- Enviar siempre la cookie de sesión (`withCredentials: true`); sin ella la
  respuesta será `401 Unauthorized`.
- Si el usuario logueado no es `MONKEY_ADMIN`, cualquier request a `/v1/users`
  devuelve `403 Forbidden` — el frontend debería directamente no exponer esta
  sección de la UI a otros roles.
- El campo `password` **nunca** viene en las respuestas (ni en creación, ni en
  listados, ni en updates) — no intentar leerlo de `data`.

---

## 10. Estructura interna del módulo (referencia técnica)

```
src/features/user/
├── domain/
│   └── repositories/user.repository.ts        # Contrato abstracto + tipos de input
├── application/
│   ├── dtos/
│   │   ├── create-user.dto.ts                  # Validación de creación
│   │   └── update-user.dto.ts                  # Partial de create + client_id nullable + is_active
│   └── use-case/
│       ├── create-user.use-case.ts             # Hashea password + valida regla rol⇄tenant
│       ├── update-user.use-case.ts             # Idem, + rehash opcional de password
│       ├── get-all-users.use-case.ts
│       ├── get-one-user.use-case.ts
│       └── delete-user.use-case.ts             # Soft delete (is_active = false)
├── infrastructure/
│   └── repositories/user.prisma.repository.ts  # Implementación con Prisma (excluye password del select)
├── presentation/
│   └── user.controller.ts                      # Rutas HTTP (/v1/users), guardas de auth/rol
└── user.module.ts                              # Wiring del módulo

src/common/
├── decorators/roles.decorator.ts               # @Roles(...roles) — nuevo, reutilizable
└── guards/roles.guard.ts                       # RolesGuard — nuevo, reutilizable
```

**Flujo de una petición:**

```
Controller → UseCase (valida reglas de negocio, hashea password) →
UserRepository (contrato) → UserPrismaRepository → DB
```

**Guardas aplicadas en el controller:**

```ts
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.MONKEY_ADMIN)
@Controller('users')
```

`AuthGuard('jwt')` valida la cookie de sesión; `RolesGuard` (nuevo, reutilizable
para futuros módulos como el de `CLIENT_ADMIN`) valida que el rol del token
esté en la lista de `@Roles(...)` del controller/endpoint.

---

## 11. Nota sobre auditoría (`created_by` / `updated_by`)

El modelo `User` tiene columnas `created_by` / `updated_by` (quién creó/editó
el registro), pero **no se exponen en la API** actualmente ni se piden en los
DTOs — se completan automáticamente en el backend a partir del usuario
autenticado (mecanismo global ya existente en `PrismaService`, no específico de
este módulo). El frontend no necesita enviarlos ni puede consultarlos por este
endpoint todavía.

---

## 12. Matriz de permisos por rol (todos los módulos)

El `RolesGuard`/`@Roles(...)` que se construyó para este módulo se reutilizó
para restringir también la escritura en los catálogos generales de la
plataforma. Esta es la matriz vigente **hoy**, para que el frontend sepa qué
mostrar/ocultar u ofuscar según el rol del usuario logueado (`req.user.role`
del JWT / respuesta de `/auth/login`):

| Módulo                                  | `MONKEY_ADMIN`  | `CLIENT_ADMIN` | `USER`     | `VIEWER`   |
| ---------------------------------------- | --------------- | -------------- | ---------- | ---------- |
| `/users` (crear/editar/eliminar/listar)  | ✅ Todo          | ❌ Sin acceso  | ❌ Sin acceso | ❌ Sin acceso |
| `/reasons` — leer (`GET`)                | ✅               | ✅             | ✅         | ✅         |
| `/reasons` — escribir (`POST/PATCH/DELETE`, attach/detach) | ✅ | ❌ (403) | ❌ (403) | ❌ (403) |
| `/risks` — leer (`GET`)                  | ✅               | ✅             | ✅         | ✅         |
| `/risks` — escribir (`POST/PATCH/DELETE`)| ✅               | ❌ (403)       | ❌ (403)   | ❌ (403)   |
| `/controls` — leer (`GET`)               | ✅               | ✅             | ✅         | ✅         |
| `/controls` — escribir (`POST/PATCH/DELETE`) | ✅           | ❌ (403)       | ❌ (403)   | ❌ (403)   |
| `/templates` — leer (`GET`)              | ✅               | ✅             | ✅         | ✅         |
| `/templates` — escribir (`POST/PATCH/DELETE`) | ✅          | ❌ (403)       | ❌ (403)   | ❌ (403)   |
| `/checklist` (solo lectura, no tiene escritura) | ✅        | ✅             | ✅         | ✅         |
| `/dashboard` (solo lectura)              | ✅               | ✅             | ✅         | ✅         |

> Cualquier intento de un rol no autorizado sobre un endpoint restringido
> devuelve `403 Forbidden` con el mensaje `error.FORBIDDEN` (ver sección 8),
> **antes** de ejecutar cualquier lógica — no hay side effects parciales.

**Pendiente (fuera de alcance por ahora, a implementar más adelante):**

- `CLIENT_ADMIN` podrá crear/gestionar usuarios (`USER`/`VIEWER`, y quizás
  otros `CLIENT_ADMIN`) **dentro de su propio tenant** — no vía `/users`, sino
  un módulo nuevo con alcance acotado por `client_id`.
- `CLIENT_ADMIN` podrá crear **copias propias** de templates/riesgos/causas/
  controles dentro de su tenant (los catálogos generales seguirán siendo de
  solo lectura y de gestión exclusiva de `MONKEY_ADMIN`).

Hasta que eso se implemente, en la plataforma administrativa actual **solo
`MONKEY_ADMIN` puede crear o modificar contenido** — el resto de roles
únicamente consulta.
