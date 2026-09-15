/**
 * Utility to sanitize objects for Firestore.
 * Firestore throws errors when values are `undefined` or `NaN`.
 * This utility deeply strips `undefined` keys and cleans numbers.
 */

export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }

  if (typeof data !== 'object') {
    if (typeof data === 'number' && isNaN(data)) {
      return 0 as any;
    }
    return data;
  }

  if (data instanceof Date) {
    return data.getTime() as any;
  }

  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item)) as any;
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      result[key] = sanitizeForFirestore(value);
    }
  }

  return result as T;
}
