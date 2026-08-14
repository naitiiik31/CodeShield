export function jaccardSimilarity(setA, setB) {
  const listA = setA || [];
  const listB = setB || [];

  if (listA.length === 0 && listB.length === 0) {
    return {
      score: 0,
      intersection: [],
      union: [],
      matchedCount: 0,
      sizeA: 0,
      sizeB: 0,
    };
  }

  const hashSetA = new Set(listA);
  const hashSetB = new Set(listB);

  const intersection = [];
  const union = new Set();

  for (const hash of hashSetA) {
    union.add(hash);
    if (hashSetB.has(hash)) {
      intersection.push(hash);
    }
  }
  for (const hash of hashSetB) {
    union.add(hash);
  }

  const score = union.size === 0 ? 0 : intersection.length / union.size;

  return {
    score,
    intersection,
    union: Array.from(union),
    matchedCount: intersection.length,
    sizeA: hashSetA.size,
    sizeB: hashSetB.size,
  };
}

export function containmentSimilarity(setA, setB) {
  const listA = setA || [];
  const listB = setB || [];

  if (listA.length === 0) return 0;

  const hashSetB = new Set(listB);
  let matchCount = 0;
  const seen = new Set();

  for (const hash of listA) {
    if (!seen.has(hash)) {
      seen.add(hash);
      if (hashSetB.has(hash)) {
        matchCount++;
      }
    }
  }

  return matchCount / seen.size;
}
