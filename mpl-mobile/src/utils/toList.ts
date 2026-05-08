/** Normalize API body to an array (matches web `toList`). */
export function toList(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data != null && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data as Record<string, unknown>[];
    if (Array.isArray(o.players)) return o.players as Record<string, unknown>[];
    if (Array.isArray(o.items)) return o.items as Record<string, unknown>[];
    if (Array.isArray(o.result)) return o.result as Record<string, unknown>[];
    if (Array.isArray(o.matches)) return o.matches as Record<string, unknown>[];
    if (Array.isArray(o.seasons)) return o.seasons as Record<string, unknown>[];
    if (Array.isArray(o.teams)) return o.teams as Record<string, unknown>[];
    if (Array.isArray(o.standings)) return o.standings as Record<string, unknown>[];
    if (Array.isArray(o.fixtures)) return o.fixtures as Record<string, unknown>[];
    const arr = Object.values(o).find((v) => Array.isArray(v));
    return (arr as Record<string, unknown>[]) || [];
  }
  return [];
}
