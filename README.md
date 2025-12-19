# San Cayetano Seguros

## Variables obligatorias (.env)
- `DJANGO_SECRET_KEY`, `ALLOWED_HOSTS`, `FRONTEND_ORIGINS`
- SMTP real: `EMAIL_BACKEND` (smtp), `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`
  asegurate que `DEFAULT_FROM_EMAIL` se use como remitente para 2FA y onboarding; si el valor es vacío los correos pueden romperse en producción.
- Mercado Pago: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_REQUIRE_WEBHOOK_SECRET` (true en prod), `MP_NOTIFICATION_URL` opcional
- Media/CDN: `MEDIA_URL` apuntando a CDN o `https://tu-dominio/media/`; `MEDIA_ROOT` si usás filesystem; `SERVE_MEDIA_FILES=false` en prod (default) o habilitarlo conscientemente
- CORS/CSRF: `FRONTEND_ORIGINS` separados por coma; en prod no se habilita `CORS_ALLOW_ALL_ORIGINS`
- Base de datos: no hace falta credenciales, el backend usa SQLite (`backend/db.sqlite3`). Si algún entorno requiere otra base, definí las variables `DB_ENGINE`, `DB_NAME`, etc., pero el flujo local se mantiene 100% con SQLite.
- Otros: `API_PAGE_SIZE`, `API_MAX_PAGE_SIZE`, `LOG_LEVEL`

## Webhook de MercadoPago
- Configurá el webhook de MP con el secreto en `X-Mp-Signature` o `Authorization: Bearer <token>`.
- En producción se exige `MP_WEBHOOK_SECRET` (o `MP_REQUIRE_WEBHOOK_SECRET=true`); sin secreto se rechaza.

## Autenticación y 2FA (staff/admin)
- El login corta con 403 si el usuario está inactivo (`is_active=False`).
- Usuarios staff requieren 2FA: el primer POST a `/api/auth/login` con credenciales válidas devuelve `require_otp=true` y envía el código al email del usuario; hay un rate limit de intentos en cache.
- El segundo POST debe incluir `otp`; si es correcto devuelve tokens JWT y datos del usuario.
- El login público (`/api/auth/login` y `/api/auth/register`) requiere emails únicos; el modelo `User.email` es `unique=True` (ejecutá migración tras desplegar).

### Login con Google (opcional)
- Si querés habilitarlo hay que activar `ENABLE_GOOGLE_LOGIN=true` en el backend y `VITE_ENABLE_GOOGLE=true` en el frontend.
- Ambos lados requieren el mismo client ID: `GOOGLE_CLIENT_ID` y `VITE_GOOGLE_CLIENT_ID` deben apuntar al OAuth client creado en Google Cloud. El backend rechazará el login si falta ese valor.
- El botón de Google en el front solo aparece si `VITE_GOOGLE_CLIENT_ID` está presente; de otro modo queda oculto por defecto.
- Asegurate de que el token devuelto por Google tenga `aud` igual al client ID, `iss` dentro de `"https://accounts.google.com"` o `"accounts.google.com"` e `email_verified=true`; el backend valida estos campos automáticamente antes de devolver tokens.

## Media/archivos
- Producción: serví media desde CDN/bucket o Nginx (location `/media/` apuntando a `MEDIA_ROOT`). Dejá `SERVE_MEDIA_FILES=false` (default) y poné `MEDIA_URL` al endpoint público del CDN.
- Solo si querés que Django sirva media en prod (no recomendado), definí `SERVE_MEDIA_FILES=true` **y** `ALLOW_SERVE_MEDIA_IN_PROD=true`.
- Límite de subida configurable vía `MEDIA_MAX_UPLOAD_MB` (default 10 MB) que aplica a `DATA_UPLOAD_MAX_MEMORY_SIZE` y `FILE_UPLOAD_MAX_MEMORY_SIZE`.

### Estrategia de media para recibos y fotos
- En producción no dejés que Django sirva archivos directamente; usá un CDN/bucket (S3, Backblaze B2, DigitalOcean Spaces) y apuntá `MEDIA_URL` al endpoint público (por ejemplo `https://cdn.sancayetano.com/media/`).
- Configurá `MEDIA_ROOT` solo si necesitás subir archivos en el filesystem local (por ejemplo en staging). Para entornos con CDN, la carpeta local puede seguir como `/home/app/backend/media` pero la URL pública queda en `MEDIA_URL`.
- Preferí un almacenamiento compatible con `django-storages` + `boto3` si usás S3. Entonces definí `DEFAULT_FILE_STORAGE` (p. ej. `storages.backends.s3boto3.S3Boto3Storage`) y las credenciales (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_STORAGE_BUCKET_NAME`, `AWS_S3_REGION_NAME`).
- Si vas a servir `MEDIA_URL` desde Django en staging/QA, habilitá `SERVE_MEDIA_FILES=true` y `ALLOW_SERVE_MEDIA_IN_PROD=true` *solo* en entornos controlados. Asegurate de que `MEDIA_ROOT` apunte al directorio que usará Django y de que el servidor web tenga permisos de lectura/escritura.
- Verificá que las URLs devueltas por los endpoints `/api/payments/*/receipts` y `/api/quotes/share/<token>` construyan rutas absolutas usando `request.build_absolute_uri`; esos links solo funcionarán si el archivo es accesible desde el URL configurado.

## Throttling / rate limiting
- Global: `anon` y `user` (configurables por env).
- Scopes específicos:
  - `login` para `/api/auth/login`
  - `reset` para `/api/auth/password/reset` y `/api/auth/password/reset/confirm`
  - `register` para `/api/auth/register`
  - `quotes` para `/api/quotes/*`
  Ajustá los límites vía `API_THROTTLE_LOGIN`, `API_THROTTLE_RESET`, `API_THROTTLE_REGISTER`, `API_THROTTLE_QUOTES`.

## Checklist de producción
Tomá `backend/.env.example` como base y completá las variables obligatorias (ver arriba). Además:
- Base de datos: este proyecto usa SQLite (`backend/db.sqlite3`) por defecto. Si realmente necesitás Postgres, agregá `DB_ENGINE`/`DB_NAME`/... y documentalo, pero las pruebas locales sólo usan el archivo.  
- JWT: `JWT_SIGNING_KEY` (o usa `DJANGO_SECRET_KEY`) para tokens válidos.
- Seguridad: `SESSION_COOKIE_SECURE=true`, `CSRF_COOKIE_SECURE=true`, `SECURE_SSL_REDIRECT=true`, `SECURE_HSTS_SECONDS` > 0 en prod.

## Flujo operativo (cotización manual → póliza → asociación)
1. El cliente completa un formulario de cotización (información del vehículo + fotos) y lo envía al WhatsApp del negocio; no hay endpoint público automatizado para inspecciones.
2. El responsable (admin) revisa ese formulario externamente y, desde el panel de administración, crea la póliza correspondiente, establece el monto y comparte con el cliente el **número de póliza** asignado.
3. El cliente se registrará y, desde la sección **Asociar póliza** (`GET /claim-policy`), ingresará apenas ese número. El backend solo valida que exista la póliza y no esté vinculada a otro usuario, sin requerir códigos adicionales.
4. Una vez asociada, el cliente puede pagar (`POST /api/payments/policies/{id}/create_preference`) y consultar recibos (`/api/payments/.../receipts`); Mercado Pago reporta a `/api/payments/webhook` con `MP_WEBHOOK_SECRET`.
5. Los admins siguen pudiendo actualizar cuotas y reenviar onboarding (`POST /api/auth/onboarding/resend`), pero ya no hay `claim_code` obligatorio para asociar una póliza.
