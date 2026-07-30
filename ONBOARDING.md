# Onboarding de un tenant nuevo — guía para frontend

Este documento es para quien construya la pantalla de onboarding: el flujo
que ve un cliente de Monkey **después** de que un `MONKEY_ADMIN` le crea su
tenant desde `/clients` y le entrega un `api_key`. No es una interfaz nueva
de "Monkey Admin" — es la aplicación que usará el cliente final para activar
su cuenta y configurar su tenant.

## Contexto rápido

- Cuando `MONKEY_ADMIN` crea un cliente (`POST /clients`), Monkey le
  aprovisiona una base de datos física propia y le entrega **solo un
  `api_key`** (string tipo `"a0vQ4NptodQ.ZtWY7xlyZy02BZsCklhUpPTAh7IqtVLq"`).
  No le entrega usuario ni contraseña — eso lo define el propio cliente en el
  onboarding.
- El `api_key` es el "código de invitación" del tenant. Sirve para dos cosas:
  1. **Una sola vez**: crear el primer usuario administrador (`CLIENT_ADMIN`)
     del tenant — el paso 1 del onboarding.
  2. **Siempre después**: identificar a qué tenant pertenece cada intento de
     login normal (`POST /auth/login`), junto con usuario/contraseña. El
     `api_key` NO se gasta ni se invalida — sigue haciendo falta en cada
     login futuro de cualquier usuario de ese tenant.
- Todo lo que el cliente crea (usuarios, templates, riesgos, causas,
  controles) vive **únicamente en la base de datos física de su propio
  tenant** — aislado de todos los demás.

## Flujo recomendado (3 pasos)

```
1. Activar cuenta          →  POST /onboarding/admin      (api_key + datos que el cliente elige)
   (sin sesión todavía)        → devuelve sesión ya logueada (cookies)

2. Datos de la empresa      →  PATCH /onboarding/company-profile   (ya con sesión)
   (opcional pero recomendado)

3. Elegir framework          →  GET /templates/master (ver biblioteca)
                              →  POST /templates/master/:id/adopt  (clonar uno)
                              →  o  POST /templates                (crear el suyo desde cero)
```

Después del paso 1 el usuario **ya queda logueado** (mismas cookies
`access_token`/`refresh_token` httpOnly que usa el login normal) — no hace
falta pedirle que inicie sesión de nuevo para los pasos 2 y 3.

---

## Paso 1 — Activar cuenta (crear el admin del tenant)

**`POST /onboarding/admin`** — sin `AuthGuard`, porque todavía no existe
ningún usuario con quien loguearse. El `api_key` en el body es la única
credencial que se valida.

Request body:
```json
{
  "api_key": "a0vQ4NptodQ.ZtWY7xlyZy02BZsCklhUpPTAh7IqtVLq",
  "email": "admin@clienteejemplo.com",
  "username": "admin-cliente",
  "password": "MinimoOchoCaracteres",
  "name": "Nombre",        // opcional
  "last_name": "Apellido"  // opcional
}
```

Respuesta (201) — y además setea las cookies de sesión, igual que
`POST /auth/login`:
```json
{
  "message": "Usuario administrador creado exitosamente.",
  "statusCode": 201,
  "data": {
    "user": {
      "id": "...",
      "email": "admin@clienteejemplo.com",
      "username": "admin-cliente",
      "name": "Nombre",
      "last_name": "Apellido",
      "role": "CLIENT_ADMIN",
      "client_id": "...",
      "is_active": true
    }
  }
}
```

**Importante**: este endpoint solo funciona **una vez por tenant**. Si ya
existe algún usuario en ese tenant (aunque no sea el admin, cualquier
usuario), responde `409 Conflict`:
```json
{ "statusCode": 409, "message": "Este tenant ya tiene un administrador creado." }
```
Si el `api_key` es inválido o no existe, responde `401 Unauthorized` con
`"Credenciales inválidas"` — trátalo igual que un error de login normal.

Después de esto, para volver a entrar en sesiones futuras se usa el login
normal que ya existe en `AuthService`/`POST /auth/login`, pero **con
`api_key` incluido en el body** (ver `LoginDto` en
`src/app/features/auth/`) — ya está soportado, no hace falta tocar nada ahí.

---

## Paso 2 — Perfil de la empresa (opcional, recomendado)

Requiere sesión (las cookies que ya quedaron del paso 1). Guarda una sola
fila por tenant — se puede llamar varias veces, siempre actualiza la misma.

**`GET /onboarding/company-profile`** → `data` viene `null` si aún no se ha
guardado nada.

**`PATCH /onboarding/company-profile`**:
```json
{
  "business_type": "SAAS",
  "server_count": 5
}
```
`business_type` es un enum: `E_COMMERCE | FINTECH | SAAS | HEALTHTECH | OTHER`
(todos opcionales — se puede mandar solo uno de los dos campos).

Respuesta: la fila guardada, con `id`, `business_type`, `server_count`,
`created_at`, `updated_at`.

---

## Paso 3 — Elegir framework

Todo esto ya funciona **usando exactamente los mismos servicios Angular que
ya existen** en `src/app/features/grc-framework/` (`TemplateService`,
`RiskService`, etc.) — no hace falta reinventar las llamadas HTTP, el
backend enruta automáticamente a la base de datos del tenant logueado.

- **`GET /templates/master`** — biblioteca de templates maestros de
  `MONKEY_ADMIN` (ISO 27001, SOC 2, etc.), solo lectura. Mismo shape que
  `GET /templates` de siempre.
- **`POST /templates/master/:id/adopt`** — clona ese template maestro
  completo (con sus riesgos, causas, controles y checks) hacia la base del
  tenant. Devuelve el template ya clonado (`data`), con `source_template_id`
  apuntando al original. A partir de ahí es un template normal del tenant —
  se edita con los mismos endpoints de siempre (`PATCH /templates/:id`,
  vincular/desvincular riesgos, etc.), sin afectar nunca el maestro.
- **`POST /templates`** — crear un template completamente desde cero (ya
  existe, es lo mismo que usa hoy la pantalla de `MONKEY_ADMIN`). Después se
  le agregan riesgos/causas/controles con los flujos que ya están
  construidos en `template-builder`.

**No hace falta construir pantallas nuevas para riesgos/causas/controles/templates**
— las que ya existen en `src/app/features/grc-framework/` funcionan igual
para una sesión de tenant que para `MONKEY_ADMIN`, sin ningún cambio. Lo
único nuevo que hay que construir es: la pantalla de "activar cuenta" (paso
1), la de "datos de la empresa" (paso 2), y quizás una pantalla que
presente la biblioteca de `GET /templates/master` con un botón "usar este
template" (paso 3) — el resto ya está.

---

## Dónde mirar como referencia

La feature `src/app/features/clients/` (recién creada, para que
`MONKEY_ADMIN` cree tenants) sigue el patrón estándar del repo — service con
`FormGroup` propio, `app-dialog` compartido, `ToastService` para
éxito/error. Es el ejemplo más reciente y más parecido a lo que hay que
construir aquí (un formulario simple que llama un endpoint nuevo y muestra
el resultado).

## Reglas de negocio a respetar (no son solo detalles de implementación)

- El admin del tenant **elige su propio usuario/contraseña** en el
  onboarding — `MONKEY_ADMIN` nunca los define ni los conoce.
- El `api_key` se le muestra a `MONKEY_ADMIN` **una sola vez** al crear el
  tenant (ya implementado en `/clients`) — asegúrate de que la pantalla de
  onboarding dependa de que el cliente lo tenga a mano (se lo entrega
  `MONKEY_ADMIN` por fuera de la plataforma, no hay forma de recuperarlo
  después).
- Un tenant solo puede "activar cuenta" una vez. Si el cliente ya tiene
  admin y vuelve a la pantalla de onboarding con el mismo `api_key`, debe
  ver un mensaje claro (viene el 409 ya con mensaje amigable) que lo dirija
  al login normal en vez de reintentar el formulario de activación.
