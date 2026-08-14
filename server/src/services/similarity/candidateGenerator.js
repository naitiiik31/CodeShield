export function buildInvertedIndex(submissions) {
  const index = new Map();

  for (const sub of submissions || []) {
    const seen = new Set();
    const fps = sub.fingerprints || [];
    for (const hash of fps) {
      if (seen.has(hash)) continue;
      seen.add(hash);

      if (!index.has(hash)) {
        index.set(hash, []);
      }
      index.get(hash).push(sub.id);
    }
  }

  return index;
}

export function generateAllUniquePairs(submissions) {
  const list = submissions || [];
  const pairs = [];

  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const subA = list[i];
      const subB = list[j];
      pairs.push({
        submissionA: subA.id || subA._id?.toString(),
        submissionB: subB.id || subB._id?.toString(),
      });
    }
  }

  return pairs;
}

export function findCandidatePairs(submissions) {
  const list = submissions || [];
  const naivePairCount = (list.length * (list.length - 1)) / 2;
  const index = buildInvertedIndex(list);
  const pairs = generateAllUniquePairs(list);

  return {
    pairs,
    index,
    naivePairCount,
    candidatePairCount: pairs.length,
  };
}
