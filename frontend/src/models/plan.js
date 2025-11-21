/**
 * Modelo de plan/seguro usado en el Frontend.
 * Está pensado para mapear 1:1 con lo que exponga "products" (B) cuando habiliten su API.
 *
 * Campos mínimos:
 * - id: string | number
 * - name: string
 * - slug: string corto para rutas (opcional)
 * - tagline: subtítulo corto
 * - coverages: lista de textos (lo que “incluye” el plan)
 * - badges: pequeñas marcas (“Popular”, “Recomendado”, etc.)
 * - featured: boolean para destacar en el carrusel
 * - price_hint: string corto tipo “Desde $…“ (opcional)
 */
export function normalizePlan(raw) {
  // Adaptador p/ cuando llegue desde la API de B (products):
  // acá mapeás los nombres reales de B a nuestro modelo FE.
  return {
    id: String(raw.id ?? raw.plan_id ?? raw.code ?? crypto.randomUUID()),
    name: raw.name ?? "Plan sin nombre",
    slug: raw.slug ?? (raw.name ? raw.name.toLowerCase().replace(/\s+/g, "-") : "plan"),
    tagline: raw.tagline ?? "",
    coverages: raw.coverages ?? raw.bullets ?? [],
    badges: raw.badges ?? [],
    featured: Boolean(raw.featured),
    price_hint: raw.price_hint ?? "",
  };
}
