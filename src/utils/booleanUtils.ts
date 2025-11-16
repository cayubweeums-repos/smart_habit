/**
 * Normalizes a value to a proper boolean
 * Handles cases where booleans might be stored as strings in AsyncStorage
 * @param value - The value to normalize (can be boolean, string, null, undefined)
 * @returns A proper boolean value
 */
export function normalizeBoolean(value: any): boolean {
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  // Default to false for null, undefined, or other values
  return false;
}

/**
 * Normalizes a value to a boolean or null
 * Useful for optional boolean fields where null means "not set"
 * @param value - The value to normalize
 * @returns A boolean or null
 */
export function normalizeBooleanOrNull(value: any): boolean | null {
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  // Return null for null, undefined, or other values
  return null;
}

