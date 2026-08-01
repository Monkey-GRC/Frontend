# Onboarding de un tenant nuevo — guía para frontend

Este documento es para quien construya la pantalla de onboarding: el flujo
que ve un cliente de Monkey **después** de que un `MONKEY_ADMIN` le crea su
tenant desde `/clients` y le entrega un **código de onboarding**. No es una
interfaz nueva de "Monkey Admin" — es la aplicación que usará el cliente
final para activar su cuenta, elegir su framework de cumplimiento y
configurar su tenant.

## Contexto rápido (cambió por completo respecto a la versión anterior de este documento)

- Cuando `MONKEY_ADMIN` crea un cliente (`POST /clients`), Monkey **NO**
  aprovisiona todavía ninguna base de datos física — solo guarda los datos
  de la empresa y genera un **`onboarding_code`** de un solo uso, que
  expira **a los 7 días**. No se crea ningún usuario ni credencial de acceso
  en ese momento.
- La base de datos física del tenant, el usuario `CLIENT_ADMIN` y las
  credenciales de acceso a la API (`mnk-client-identifier` /
  `mnk-client-key`) se crean **todas juntas, al final**, en un solo paso
  atómico: `POST /onboarding/complete`. Si algo falla en ese paso (crear el
  usuario, clonar el template elegido, etc.), todo se revierte — la base de
  datos aprovisionada se elimina y el `onboarding_code` sigue siendo válido
  para reintentar.
- A partir de que el onboarding se completa, **todas** las peticiones a la
  API (no solo el login) deben llevar dos headers:
  - `mnk-client-identifier`
  - `mnk-client-key`

  Esto reemplaza por completo al viejo `api_key` que se mandaba solo en el
  body del login. Es un modelo tipo AWS access-key/secret-key: se generan
  una única vez al terminar el onboarding, se muestran una única vez en la
  respuesta, y de ahí en adelante hay que guardarlos (ej. `localStorage`) y
  mandarlos como headers en cada llamada — incluido el login normal
  (`POST /auth/login`) de cualquier usuario de ese tenant.
- Todo lo que el cliente crea (usuarios, templates, riesgos, causas,
  controles) vive **únicamente en la base de datos física de su propio
  tenant** — aislado de todos los demás.

## Flujo recomendado (3 pasos, todo antes de tener sesión)

```
1. Elegir framework     →  GET /onboarding/master-templates?onboarding_code=...
   (sin sesión, sin DB)     (ver la biblioteca y escoger un template_id)

2. Completar datos       →  POST /onboarding/complete
   y activar cuenta          (onboarding_code + template_id + datos que el
                               cliente elige — aquí es donde se crea TODO:
                               DB, usuario admin, y las keys de acceso)
                            → devuelve sesión ya logueada (cookies) +
                              mnk-client-identifier + mnk-client-key

3. Guardar las keys       →  guardarlas (localStorage) y mandarlas como
                               headers en cada request siguiente, incluido
                               cualquier login futuro
```

No existen ya los pasos separados "crear admin" → "elegir template" que
tenía la versión anterior de este flujo: **todo pasa en un único
`POST /onboarding/complete`**, porque la base de datos del tenant no existe
antes de ese llamado y clonar un template requiere que ya exista.

---

## Paso 1 — Elegir framework (catálogo de plantillas maestras)

**`GET /onboarding/master-templates?onboarding_code=...`** — sin
`AuthGuard`, protegido con el propio `onboarding_code` como query param (no
hay sesión ni tenant todavía). Valida que el código exista, no esté
expirado y no se haya usado ya — mismos errores que el paso 2 (ver abajo).

Respuesta (200):
```json
{
  "message": "Catálogo de plantillas obtenido exitosamente.",
  "statusCode": 200,
  "data": [
    {
      "id": "8143c5be-...",
      "name": "ISO 27001 Demo",
      "code": "TPL-112648",
      "description": "...",
      "objective": null,
      "scope": null,
      "slug": "iso-27001-demo",
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

Muestra este catálogo como una lista de tarjetas/opciones para que el
cliente elija una — el `id` elegido es el `template_id` que va en el paso 2.

---

## Paso 2 — Completar onboarding (crea todo de una vez)

**`POST /onboarding/complete`** — sin `AuthGuard`, sin headers de tenant
(todavía no existen). El `onboarding_code` en el body es la única prueba de
que quien llama tiene derecho a activar ese tenant.

Request body:
```json
{
  "onboarding_code": "wT11qICzB-uCpgAMbjwEfRB87QeXKU_d",
  "template_id": "8143c5be-bd84-4541-a024-edb9421c4b55",
  "email": "admin@clienteejemplo.com",
  "username": "admin-cliente",
  "password": "MinimoOchoCaracteres",
  "name": "Nombre",                 // opcional
  "last_name": "Apellido",          // opcional
  "business_type": "SAAS",          // opcional — E_COMMERCE | FINTECH | SAAS | HEALTHTECH | OTHER
  "server_count": 5                 // opcional
}
```

Qué pasa internamente, en orden (útil para explicarle a soporte si algo
falla a mitad de camino):
1. Valida el `onboarding_code` (existe, no expiró, no se usó ya).
2. Valida que el `template_id` exista en la biblioteca maestra.
3. Aprovisiona la base de datos física del tenant (rol + DB + migraciones).
4. Crea el usuario `CLIENT_ADMIN` con el email/usuario/contraseña que envió
   el cliente, y el `CompanyProfile` si mandó `business_type`/`server_count`.
5. Clona el template elegido (con sus riesgos, causas, controles y checks)
   dentro de la base recién creada — queda editable desde el minuto uno,
   sin afectar nunca al template maestro original.
6. Genera `mnk-client-identifier` y `mnk-client-key`, y los guarda
   (el segundo, hasheado) en la base central.
7. Marca el tenant como `READY` y el onboarding como completado — el
   `onboarding_code` queda invalidado, no vuelve a funcionar.
8. Emite la sesión (mismas cookies httpOnly `access_token`/`refresh_token`
   que usa el login normal).

Si algo falla entre el paso 3 y el 6, se revierte todo automáticamente
(se elimina la base de datos recién creada) y el `onboarding_code` **sigue
siendo válido** — el cliente puede reintentar el mismo `POST
/onboarding/complete` sin pedir un código nuevo.

Respuesta (201) — y además setea las cookies de sesión:
```json
{
  "message": "Onboarding completado exitosamente.",
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
    },
    "client_identifier": "i60AxzXZoGEXoV6YE4qjSg",
    "client_key": "UsGpVbjwn4IDCxtkN3yn0oT5mqmndL9_"
  }
}
```

**`client_key` se muestra una única vez, en esta respuesta.** No hay forma
de volver a consultarlo después (se guarda hasheado en la base central,
igual que una contraseña) — guárdalo de inmediato (`localStorage`, por
ejemplo `mnk_client_identifier` / `mnk_client_key`) antes de navegar a
cualquier otra pantalla.

### Errores posibles

| Status | Cuándo | Qué mostrarle al cliente |
|---|---|---|
| 401 | `onboarding_code` no existe (o ya se usó — el hash se limpia al completar) | "Código de onboarding inválido" — mismo mensaje sea cual sea la causa real, no reveles cuál |
| 409 | El tenant ya completó su onboarding antes | "Este tenant ya fue activado, inicia sesión normalmente" |
| 410 | El código expiró (pasaron más de 7 días desde que `MONKEY_ADMIN` lo creó) | "El código expiró, pide a soporte que te genere uno nuevo" — `MONKEY_ADMIN` puede regenerarlo desde `/clients` |
| 404 | `template_id` inválido (no existe en la biblioteca maestra) | No debería pasar si el paso 1 se usó para poblar la lista — validar igual por si acaso |
| 500 | Falló el aprovisionamiento de la DB o la creación del usuario | "Ocurrió un error, intenta de nuevo" — es seguro reintentar, el código sigue siendo válido |

---

## Paso 3 — Guardar y usar las credenciales de tenant en cada request

A partir de aquí, **cualquier llamada a un endpoint de tenant** (risks,
reasons, controls, templates, dashboard, login, etc.) debe llevar estos dos
headers:

```
mnk-client-identifier: i60AxzXZoGEXoV6YE4qjSg
mnk-client-key: UsGpVbjwn4IDCxtkN3yn0oT5mqmndL9_
```

Guárdalos en `localStorage` justo después del paso 2 y agrégalos con un
interceptor HTTP de Angular a **todas** las peticiones salientes — sin ellos,
cualquier endpoint tenant-scoped responde `401 Unauthorized` con "Se
requieren los headers mnk-client-identifier y mnk-client-key", aunque la
cookie de sesión siga siendo válida.

Esto también aplica al **login normal** de sesiones futuras
(`POST /auth/login`): el `identifier`/`password` van en el body igual que
siempre, pero ahora los dos headers de arriba son obligatorios para que el
backend sepa a qué base de datos de tenant dirigir la autenticación (ya no
existe el campo `api_key` en el body de login, quedó reemplazado por estos
headers).

Si el tenant se desactiva (`MONKEY_ADMIN` lo desactivó, por ejemplo por
falta de pago), estos headers empiezan a fallar con `401 Unauthorized`
("Credenciales de tenant inválidas") de inmediato, sin importar que la
sesión siga activa — trátalo como "cuenta suspendida" en la UI.

---

## Uso normal después del onboarding

Todo esto ya funciona **usando exactamente los mismos servicios Angular que
ya existen** en `src/app/features/grc-framework/` (`TemplateService`,
`RiskService`, etc.) una vez que el interceptor de headers está en su
lugar — no hace falta reinventar las llamadas HTTP, el backend enruta
automáticamente a la base de datos del tenant identificado por
`mnk-client-identifier`.

**No hace falta construir pantallas nuevas para riesgos/causas/controles/templates**
— las que ya existen en `src/app/features/grc-framework/` funcionan igual
para una sesión de tenant que para `MONKEY_ADMIN`. Lo único que hay que
construir en este frontend nuevo es: la pantalla de "elegir framework" +
"completar datos y activar cuenta" (pasos 1 y 2, que hoy se resuelven con
dos llamadas), el interceptor de headers (paso 3), y opcionalmente una
pantalla de "editar datos de la empresa" después (`GET`/`PATCH
/onboarding/company-profile`, sin cambios respecto a antes — requieren
sesión + los headers de tenant).

---

## Dónde mirar como referencia

La feature `src/app/features/clients/` (en `MONKEY_ADMIN`, para crear
tenants) sigue el patrón estándar del repo — service con `FormGroup`
propio, `app-dialog` compartido, `ToastService` para éxito/error. También
tiene el ejemplo del modal de "revelar una sola vez" (ahí se usa para el
`onboarding_code`) que es exactamente el mismo patrón que necesitas para
mostrar `client_key` una única vez al terminar el paso 2.

## Reglas de negocio a respetar (no son solo detalles de implementación)

- El admin del tenant **elige su propio usuario/contraseña** en el
  onboarding — `MONKEY_ADMIN` nunca los define ni los conoce.
- El template elegido en el paso 1 se **clona**, no se referencia — el
  cliente puede editarlo libremente (quitar/agregar riesgos, causas,
  controles) sin que eso afecte jamás la plantilla maestra original.
- `client_key` se muestra **una sola vez**, igual que `onboarding_code` se
  le mostró una sola vez a `MONKEY_ADMIN`. Si el cliente lo pierde, no hay
  forma de recuperarlo — habría que desactivar el tenant y crear uno nuevo
  (no existe hoy un endpoint de "regenerar client_key" sobre un tenant ya
  `READY`, a diferencia del `onboarding_code` que sí se puede regenerar
  mientras el tenant sigue `PENDING`).
- El `onboarding_code` solo sirve **una vez** y solo si no expiró — pero si
  el `POST /onboarding/complete` falla a mitad de camino (aprovisionamiento,
  clonado del template, etc.), el código sigue siendo válido para
  reintentar, no hace falta pedir uno nuevo salvo que el error sea
  específicamente 410 (expiración).
