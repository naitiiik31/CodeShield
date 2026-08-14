export function detectBoilerplate(submissions, threshold = 0.8, starterCodeHashes = null) {
  const totalSubmissions = submissions ? submissions.length : 0;
  const boilerplateHashes = new Set(starterCodeHashes || []);
  const hashCounts = new Map();

  for (const sub of submissions || []) {
    const seen = new Set();
    const fps = sub.fingerprints || [];
    for (const hash of fps) {
      if (!seen.has(hash)) {
        seen.add(hash);
        hashCounts.set(hash, (hashCounts.get(hash) || 0) + 1);
      }
    }
  }

  const hashFrequencies = new Map();
  // Require at least 3 distinct submissions AND threshold proportion (e.g. 80%)
  const minSubmissionsRequired = Math.max(3, Math.ceil(totalSubmissions * threshold));

  for (const [hash, count] of hashCounts) {
    const frequency = totalSubmissions > 0 ? count / totalSubmissions : 0;
    hashFrequencies.set(hash, frequency);

    if (totalSubmissions >= 3 && count >= minSubmissionsRequired) {
      boilerplateHashes.add(hash);
    }
  }

  return {
    boilerplateHashes,
    hashFrequencies,
    totalHashes: hashCounts.size,
    boilerplateCount: boilerplateHashes.size,
  };
}

export function calculateAdjustedSimilarity(fingerprintsA, fingerprintsB, boilerplateHashes) {
  const setA = new Set(fingerprintsA || []);
  const setB = new Set(fingerprintsB || []);
  const bpSet = boilerplateHashes || new Set();

  const rawIntersection = new Set();
  const rawUnion = new Set();

  for (const h of setA) {
    rawUnion.add(h);
    if (setB.has(h)) rawIntersection.add(h);
  }
  for (const h of setB) rawUnion.add(h);

  const rawScore = rawUnion.size === 0 ? 0 : rawIntersection.size / rawUnion.size;

  const boilerplateMatches = [];
  const nonBoilerplateMatches = [];

  for (const h of rawIntersection) {
    if (bpSet.has(h)) {
      boilerplateMatches.push(h);
    } else {
      nonBoilerplateMatches.push(h);
    }
  }

  const cleanA = new Set();
  const cleanB = new Set();
  for (const h of setA) {
    if (!bpSet.has(h)) cleanA.add(h);
  }
  for (const h of setB) {
    if (!bpSet.has(h)) cleanB.add(h);
  }

  const cleanUnion = new Set();
  let cleanIntersectionCount = 0;
  for (const h of cleanA) {
    cleanUnion.add(h);
    if (cleanB.has(h)) cleanIntersectionCount++;
  }
  for (const h of cleanB) cleanUnion.add(h);

  const adjustedScore = cleanUnion.size === 0 ? 0 : cleanIntersectionCount / cleanUnion.size;
  const boilerplateOverlap = rawUnion.size === 0 ? 0 : boilerplateMatches.length / rawUnion.size;

  return {
    rawScore,
    adjustedScore,
    boilerplateOverlap,
    nonBoilerplateMatches,
    boilerplateMatches,
  };
}
