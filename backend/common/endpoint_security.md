# Endpoint Authentication & Guardrails

## Diagnóstico
- El patrón `AllowAny + SoftJWTAuthentication` permitía que vistas públicas y privadas compartieran el mismo espacio de autenticación, lo que generaba 401 silenciosas cuando un cliente mandaba un JWT vencido y abría la puerta a que vistas sensibles dependieran de `request.user` sin querer.
- Al permitir `SoftJWTAuthentication` sin intención clara, los endpoints privados podían aceptar tokens corruptos, perdiendo seguridad y haciendo más difícil razonar sobre qué rutas eran públicas, híbridas o privadas.

## Diseño propuesto
1. `StrictJWTAuthentication` vuelve a ser la base global (`REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES`), obligando a las vistas privadas a fallar explícitamente con JWT inválidos.
2. **PublicEndpointMixin**: elimina autenticación (sin headers), expone un `PublicUserProxy` que responde `is_authenticated=False` y lanza si se intenta leer atributos sensibles de `request.user`.
3. **OptionalAuthenticationMixin**: introduce un `SoftJWTAuthentication(purpose="hybrid")` configurable mediante `should_use_optional_authentication()`. Solo proveedores híbridos lo activan y sólo para las acciones públicas deseadas.
4. `SoftJWTAuthentication` ahora pide un `purpose` validado para evitar usos accidentales; el constructor falla si alguien la instanció fuera de la mixin correspondiente.

## Flujo lógico

```
[Request arrives]
      ↓
  View defines mixin?
    ├─ PublicEndpointMixin → No auth, request.user=MFP, permissions=AllowAny
    ├─ OptionalAuthenticationMixin → should_use_optional_authentication():
    │       ├─ True → SoftJWTAuthentication(purpose="hybrid") tolera tokens invalidos
    │       └─ False → cae al autenticador global (StrictJWTAuthentication)
    └─ Ninguno → StrictJWTAuthentication + IsAuthenticated (comportamiento privado)
```

## Reglas de uso
- **Públicos**: extender `PublicEndpointMixin`. No leer `request.user`. Para FVs usar `@authentication_classes([])` y `AllowAny`.
- **Híbridos**: extender `OptionalAuthenticationMixin` e implementar `should_use_optional_authentication` (ej. `self.action in PUBLIC_ACTIONS`). `request.user` puede usarse pero sólo porque el desarrollador aceptó explícitamente token válido o `Anonymous`.
- **Privados**: no mezclar `SoftJWTAuthentication`. Dejar que la autenticación global (Strict) bloquee JWT inválidos.

## Qué está prohibido
- Instanciar `SoftJWTAuthentication` sin propósito declarado: `SoftJWTAuthentication(purpose="invalid")` fallará.
- Reutilizar `AllowAny` + `SoftJWTAuthentication` fuera de `OptionalAuthenticationMixin`.
- Leer `request.user` desde clases que heredan `PublicEndpointMixin`: la proxy lanzará un `RuntimeError`.

## Guardrails & tests
- **`test_soft_authentication_requires_known_scope`** valida que no se puedan crear autenticadores suaves mágicamente.
- **`PublicUserProxy`** responde `False` y bloquea atributos sensibles para forzar la migración de lógica a un endpoint híbrido o privado cuando sea necesario.
- Las vistas públicas siguen pasando por tests donde se envían JWT inválidos; si regresan 401, hay que revisar si heredaron un autenticador global accidental.

## Opcional pero recomendado
1. Añadir `@authentication_classes([])` en vistas FV públicas cuando no se pueda aplicar `PublicEndpointMixin`.
2. Documentar `PUBLIC_ACTIONS`/`HYBRID_ACTIONS` en viewsets para que sea evidente qué rutas usan Soft.
3. Poner `OptionalAuthenticationMixin.optional_soft_purpose = SoftJWTAuthentication.PURPOSE_PUBLIC` si alguna vista necesita tolerar tokens corruptos sin exponer user_data (sería un caso muy singular).
