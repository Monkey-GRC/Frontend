# Endpoints API — Monkey Backend

Base URL: `http://localhost:3001/v1`

Autenticación: cookies `httpOnly` (`access_token` y `refresh_token`). No se requieren headers de autorización manuales.

---

## Auth

| Método | Endpoint            | Descripción                                                      | Auth requerida |
| ------ | ------------------- | ---------------------------------------------------------------- | -------------- |
| POST   | `/v1/auth/login`    | Inicia sesión. Devuelve cookies `access_token` y `refresh_token` | No             |
| POST   | `/v1/auth/refresh`  | Renueva el `access_token` usando el `refresh_token` de la cookie | No             |
| DELETE | `/v1/auth/logout`   | Cierra sesión y limpia las cookies                               | Sí             |
| GET    | `/v1/auth/validate` | Valida el token actual y devuelve info del usuario               | Sí             |

---

## Risks

| Método | Endpoint        | Descripción             | Auth requerida |
| ------ | --------------- | ----------------------- | -------------- |
| POST   | `/v1/risks`     | Crea un nuevo riesgo    | Sí             |
| GET    | `/v1/risks`     | Lista todos los riesgos | Sí             |
| PATCH  | `/v1/risks/:id` | Actualiza un riesgo     | Sí             |
| DELETE | `/v1/risks/:id` | Elimina un riesgo       | Sí             |

---

## Controls

| Método | Endpoint           | Descripción               | Auth requerida |
| ------ | ------------------ | ------------------------- | -------------- |
| POST   | `/v1/controls`     | Crea un nuevo control     | Sí             |
| GET    | `/v1/controls`     | Lista todos los controles | Sí             |
| PATCH  | `/v1/controls/:id` | Actualiza un control      | Sí             |
| DELETE | `/v1/controls/:id` | Elimina un control        | Sí             |

### Campos del modelo Control

| Campo             | Tipo                            | Descripción                                                                 |
| ----------------- | ------------------------------- | --------------------------------------------------------------------------- |
| `id`              | `string (uuid)`                 | Identificador único                                                         |
| `name`            | `string`                        | Nombre del control                                                          |
| `description`     | `string \| null`                | Descripción opcional                                                        |
| `objective`       | `string \| null`                | Objetivo del control                                                        |
| `type`            | `MANUAL \| AUTOMATIC \| HYBRID` | Tipo de ejecución del control                                               |
| `code`            | `string`                        | Código único generado automáticamente (ej. `CTR-209477`)                    |
| `created_at`      | `DateTime`                      | Fecha de creación                                                           |
| `updated_at`      | `DateTime`                      | Fecha de última modificación                                                |
| `created_by_user` | `object`                        | Usuario que creó el control (`id`, `name`, `last_name`, `role`, `username`) |
| `updated_by_user` | `object`                        | Usuario que modificó el control                                             |

### Campos requeridos al crear (`POST /v1/controls`)

| Campo         | Tipo                            | Requerido              |
| ------------- | ------------------------------- | ---------------------- |
| `name`        | `string` (máx. 150 caracteres)  | Sí                     |
| `description` | `string` (máx. 500 caracteres)  | No                     |
| `objective`   | `string` (máx. 500 caracteres)  | No                     |
| `type`        | `MANUAL \| AUTOMATIC \| HYBRID` | No (default: `MANUAL`) |

---

## Reasons

| Método | Endpoint | Descripción   | Auth requerida |
| ------ | -------- | ------------- | -------------- |
| —      | —        | En desarrollo | —              |

---

## Notas

- Todos los endpoints protegidos requieren una cookie `access_token` válida.
- El `access_token` expira en **3 horas**.
- El `refresh_token` expira en **7 días**.
- Los códigos únicos se generan automáticamente: `RGS-XXXXXX` para riesgos, `CTR-XXXXXX` para controles.
