# San Cayetano Seguros

## Webhook de MercadoPago
- Definí `MP_WEBHOOK_SECRET` en `.env` (ver `.env.example`).
- Configurá el webhook de MP para enviar el mismo valor en el header `X-Mp-Signature` o `Authorization: Bearer <token>`.
- El backend rechaza la notificación si falta la firma o no coincide con el secreto, o si `mp_preference_id` no matchea el generado al crear la preferencia.
