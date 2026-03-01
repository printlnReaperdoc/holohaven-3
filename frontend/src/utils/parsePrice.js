/**
 * Safely parse a price value that may be a Mongoose Decimal128 object,
 * a string, a number, or null/undefined. Returns a plain number.
 */
export function parsePrice(price) {
  if (price == null) return 0;
  if (typeof price === 'object' && price.$numberDecimal) {
    return parseFloat(price.$numberDecimal);
  }
  const n = Number(price);
  return isNaN(n) ? 0 : n;
}
