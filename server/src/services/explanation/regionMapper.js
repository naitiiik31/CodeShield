export function mapMatchedRegions(
  matchedHashes,
  fingerprintsA,
  fingerprintsB,
  tokensA,
  tokensB,
  k
) {
  if (!matchedHashes || matchedHashes.length === 0) return [];

  const matchedSet = new Set(matchedHashes);

  const positionsA = buildHashPositions(fingerprintsA, tokensA, k, matchedSet);
  const positionsB = buildHashPositions(fingerprintsB, tokensB, k, matchedSet);

  const rawRegions = [];

  for (const hash of matchedHashes) {
    const posA = positionsA.get(hash);
    const posB = positionsB.get(hash);
    if (posA && posB) {
      rawRegions.push({
        startLineA: posA.startLine,
        endLineA: posA.endLine,
        startLineB: posB.startLine,
        endLineB: posB.endLine,
        fingerprintCount: 1,
      });
    }
  }

  return mergeRegions(rawRegions);
}

function buildHashPositions(fingerprints, tokens, k, matchedSet) {
  const positions = new Map();
  const fps = fingerprints || [];
  const tokList = tokens || [];

  for (const fp of fps) {
    if (!matchedSet.has(fp.hash)) continue;
    if (positions.has(fp.hash)) continue;

    const startIdx = fp.position;
    const endIdx = Math.min(fp.position + k - 1, tokList.length - 1);

    const startLine = tokList[startIdx]?.line || 1;
    const endLine = tokList[endIdx]?.line || startLine;

    positions.set(fp.hash, { startLine, endLine });
  }

  return positions;
}

function mergeRegions(regions) {
  if (!regions || regions.length === 0) return [];

  regions.sort((a, b) => a.startLineA - b.startLineA || a.startLineB - b.startLineB);

  const merged = [{ ...regions[0] }];

  for (let i = 1; i < regions.length; i++) {
    const current = regions[i];
    const last = merged[merged.length - 1];

    if (
      current.startLineA <= last.endLineA + 2 &&
      current.startLineB <= last.endLineB + 2
    ) {
      last.endLineA = Math.max(last.endLineA, current.endLineA);
      last.endLineB = Math.max(last.endLineB, current.endLineB);
      last.fingerprintCount += current.fingerprintCount;
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}
