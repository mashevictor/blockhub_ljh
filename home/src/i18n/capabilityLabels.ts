/** Capability / module display labels — keys in capability.gen.json (`cap.{key}.*`). */

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

export function capabilityName(t: TranslateFn, key: string, fallback?: string): string {
  const fb = fallback ?? key
  if (!key) return fb
  const fromCap = t(`cap.${key}.name`)
  if (fromCap !== `cap.${key}.name`) return fromCap
  const fromMod = t(`product.mod.${key}.name`)
  if (fromMod !== `product.mod.${key}.name`) return fromMod
  return fb
}

/** Category label for a capability key (preferred) or raw Chinese category string. */
export function capabilityCategory(
  t: TranslateFn,
  opts: { key?: string; category?: string; fallback?: string },
): string {
  const { key, category, fallback } = opts
  if (key) {
    const fromCap = t(`cap.${key}.category`)
    if (fromCap !== `cap.${key}.category`) return fromCap
  }
  const fb = fallback ?? category ?? ''
  if (!category) return fb
  const fromCat = t(`home.cat.${category}`)
  if (fromCat !== `home.cat.${category}`) return fromCat
  return fb
}

/** Localize a catalog group heading using the first item's key when possible. */
export function localizeModuleGroupCat(
  t: TranslateFn,
  cat: string,
  firstKey?: string,
): string {
  if (firstKey) {
    const fromCap = t(`cap.${firstKey}.category`)
    if (fromCap !== `cap.${firstKey}.category`) return fromCap
  }
  const fromCat = t(`home.cat.${cat}`)
  if (fromCat !== `home.cat.${cat}`) return fromCat
  return cat
}
