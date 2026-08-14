/**
 * K-gram Generator
 * Generates overlapping k-grams (subsequences of length k) from a token sequence.
 */

export function generateKgrams(tokenTypes, k) {
  if (k <= 0) {
    throw new Error(`k must be positive, got ${k}`);
  }

  if (!tokenTypes || tokenTypes.length === 0 || k > tokenTypes.length) {
    return [];
  }

  const kgrams = [];
  const count = tokenTypes.length - k + 1;

  for (let i = 0; i < count; i++) {
    kgrams.push({
      tokens: tokenTypes.slice(i, i + k),
      position: i,
    });
  }

  return kgrams;
}
