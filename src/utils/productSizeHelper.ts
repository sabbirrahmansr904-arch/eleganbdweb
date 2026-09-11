/**
 * Product Size Helpers for Elegan BD
 * Ensures pants always use numeric waist sizes 28-40 (28, 30, 32, 34, 36, 38, 40)
 * and never letter sizes like M, L, XL.
 */

export const STANDARD_PANT_SIZES = ['28', '30', '32', '34', '36', '38', '40'];

/**
 * Checks if a product or category/name indicates a pant/trouser/chino/jeans item
 */
export const isPantProduct = (
  product?: { category?: string; name?: string; tags?: string[] } | null
): boolean => {
  if (!product) return false;
  const cat = (product.category || '').toLowerCase();
  const name = (product.name || '').toLowerCase();
  
  const pantKeywords = [
    'pant',
    'pants',
    'chino',
    'chinos',
    'trouser',
    'trousers',
    'jeans',
    'denim',
    'gabardine',
    'palazzo',
    'formal pant',
    'casual pant',
    'bottoms'
  ];

  return (
    pantKeywords.some(kw => cat.includes(kw)) ||
    pantKeywords.some(kw => name.includes(kw))
  );
};

/**
 * Returns the sanitized, usable sizes list for any product.
 * For pants, filters out any non-numeric / letter sizes like M, L, XL,
 * and defaults to ['28', '30', '32', '34', '36', '38', '40'].
 */
export const getCleanProductSizes = (
  product?: { category?: string; name?: string; sizes?: string[]; sizeStock?: Record<string, number> } | null
): string[] => {
  if (!product) return [];

  const isBag = (product.category || '').toLowerCase().includes('bag');
  if (isBag) return ['QN'];

  const rawSizes = Array.isArray(product.sizes) ? product.sizes.filter(Boolean) : [];

  if (isPantProduct(product)) {
    // For pants: only accept numeric waist sizes (between 26 and 44) and reject letter sizes like M, L, XL
    const validNumericSizes = rawSizes.filter(s => {
      const trimmed = String(s).trim();
      const num = parseInt(trimmed, 10);
      return !isNaN(num) && num >= 26 && num <= 44 && !/[a-zA-Z]/.test(trimmed);
    });

    if (validNumericSizes.length > 0) {
      // Sort numerically ascending
      return Array.from(new Set(validNumericSizes)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    }

    // Default standard usable waist sizes for all pants: 28 to 40
    return [...STANDARD_PANT_SIZES];
  }

  // Non-pant clothing
  const nonPantSizes = rawSizes.filter(Boolean);
  if (nonPantSizes.length > 0) return nonPantSizes;
  return ['M', 'L', 'XL', 'XXL'];
};

/**
 * Checks if a specific size is available / in-stock / usable for the user to select.
 * Guarantees that pant sizes 28-40 are usable when the product is in stock.
 */
export const isSizeUsableAndInStock = (
  product: { category?: string; name?: string; stock?: number; sizeStock?: Record<string, number> } | null | undefined,
  size: string
): boolean => {
  if (!product) return false;

  const totalStock = typeof product.stock === 'number' ? product.stock : 10;
  if (totalStock <= 0) return false;

  const rawSizeStock = product.sizeStock;

  // If there's an explicit stock count for this size
  if (rawSizeStock && typeof rawSizeStock[size] === 'number') {
    return rawSizeStock[size] > 0;
  }

  // If it's a pant, and sizeStock didn't have this numeric size (e.g. was stored with M/L/XL or not set),
  // make all standard pant sizes (28-40) usable as long as the product is in stock!
  if (isPantProduct(product)) {
    const hasExplicitPantStockKey = rawSizeStock && Object.keys(rawSizeStock).some(k => {
      const n = parseInt(k, 10);
      return !isNaN(n) && n >= 26 && n <= 44 && (rawSizeStock[k] || 0) > 0;
    });

    // If no explicit numeric stock entries exist (only letter sizes or empty), then all 28-40 sizes are usable
    if (!hasExplicitPantStockKey) {
      return totalStock > 0;
    }
  }

  if (!rawSizeStock || Object.keys(rawSizeStock).length === 0) {
    return totalStock > 0;
  }

  return (rawSizeStock[size] || 0) > 0;
};
