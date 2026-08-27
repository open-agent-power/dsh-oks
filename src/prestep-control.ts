/** Product-level gate for every plugin-owned recall path. */
export function isOksRecallEnabled(config: { recall_enabled?: boolean }): boolean {
  return config.recall_enabled !== false
}

/** Product-level gate for the user-facing automatic knowledge toggle. */
export function isPrestepRecallEnabled(config: { recall_enabled?: boolean, prestep_enabled?: boolean }): boolean {
  return isOksRecallEnabled(config) && config.prestep_enabled !== false
}
