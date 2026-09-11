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
 * If sizeStock has stock > 0 for this size, returns true.
 * If sizeStock is specified for the product and this size has 0 or is absent, returns false.
 */
export const isSizeUsableAndInStock = (
  product: { category?: string; name?: string; stock?: number; sizeStock?: Record<string, number | string>; sizes?: string[] } | null | undefined,
  size: string
): boolean => {
  if (!product) return false;

  const totalStock = typeof product.stock === 'number' ? product.stock : Number(product.stock) || 0;
  if (totalStock <= 0) return false;

  const rawSizeStock = product.sizeStock;

  // If there's an explicit stock count for this size
  if (rawSizeStock && typeof rawSizeStock === 'object' && Object.keys(rawSizeStock).length > 0) {
    if (rawSizeStock[size] !== undefined && rawSizeStock[size] !== null) {
      const num = Number(rawSizeStock[size]);
      return !isNaN(num) && num > 0;
    }
    // Size is explicitly not in stock (0 or omitted in stock breakdown)
    return false;
  }

  return totalStock > 0;
};
