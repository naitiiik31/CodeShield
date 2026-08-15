export function buildInvertedIndex(submissions) {
  const index = new Map();

  for (const sub of submissions || []) {
    const subId = sub.id || sub._id?.toString();
    if (!subId) continue;
    const seen = new Set();
    const fps = sub.fingerprints || [];
    for (const hash of fps) {
      if (seen.has(hash)) continue;
      seen.add(hash);

      if (!index.has(hash)) {
        index.set(hash, []);
      }
      index.get(hash).push(subId);
    }
  }

  return index;
}

export function generateCandidatePairsFromIndex(index) {
  const pairCounts = new Map();

  for (const [_hash, submissionIds] of index) {
    for (let i = 0; i < submissionIds.length; i++) {
      for (let j = i + 1; j < submissionIds.length; j++) {
        const subA = submissionIds[i];
        const subB = submissionIds[j];
        if (subA === subB) continue;

        const [a, b] = subA < subB ? [subA, subB] : [subB, subA];
        const key = `${a}::${b}`;
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }
  }

  const pairs = [];
  for (const [key, count] of pairCounts) {
    const [a, b] = key.split('::');
    pairs.push({
      submissionA: a,
      submissionB: b,
      sharedHashCount: count,
    });
  }

  pairs.sort((x, y) => y.sharedHashCount - x.sharedHashCount);
  return pairs;
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
        sharedHashCount: 0,
      });
    }
  }

  return pairs;
}

export function findCandidatePairs(submissions) {
  const list = submissions || [];
  const naivePairCount = (list.length * (list.length - 1)) / 2;
  const index = buildInvertedIndex(list);
  const pairs = generateCandidatePairsFromIndex(index);

  const reductionPercentage =
    naivePairCount > 0
      ? (((naivePairCount - pairs.length) / naivePairCount) * 100).toFixed(1)
      : '0.0';

  return {
    pairs,
    index,
    naivePairCount,
    candidatePairCount: pairs.length,
    reductionPercentage,
  };
}
