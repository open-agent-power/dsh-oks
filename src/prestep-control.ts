/** Product-level gate for the user-facing automatic knowledge toggle. */
export function isPrestepRecallEnabled(config: { prestep_enabled?: boolean }): boolean {
  return config.prestep_enabled !== false
}