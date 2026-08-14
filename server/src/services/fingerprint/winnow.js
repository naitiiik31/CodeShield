export function winnow(hashes, windowSize) {
  if (windowSize <= 0) {
    throw new Error(`Window size must be positive, got ${windowSize}`);
  }

  if (!hashes || hashes.length === 0) {
    return [];
  }

  if (hashes.length <= windowSize) {
    const min = selectRightmostMinimum(hashes, 0, hashes.length - 1);
    return [{ hash: min.hash, position: min.position }];
  }

  const fingerprints = [];
  let previousMinIdx = -1;

  for (let i = 0; i <= hashes.length - windowSize; i++) {
    const windowEnd = i + windowSize - 1;

    const min = selectRightmostMinimum(hashes, i, windowEnd);
    const minIdx = findRightmostMinIndex(hashes, i, windowEnd);

    if (minIdx !== previousMinIdx) {
      fingerprints.push({
        hash: min.hash,
        position: min.position,
      });
      previousMinIdx = minIdx;
    }
  }

  return fingerprints;
}

function selectRightmostMinimum(hashes, start, end) {
  let minHash = hashes[start];
  for (let i = start + 1; i <= end; i++) {
    if (hashes[i].hash <= minHash.hash) {
      minHash = hashes[i];
    }
  }
  return minHash;
}

function findRightmostMinIndex(hashes, start, end) {
  let minIdx = start;
  for (let i = start + 1; i <= end; i++) {
    if (hashes[i].hash <= hashes[minIdx].hash) {
      minIdx = i;
    }
  }
  return minIdx;
}
