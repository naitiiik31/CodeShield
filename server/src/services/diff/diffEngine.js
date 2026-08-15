import { tokenize } from '../tokenizer/index.js';

/**
 * Myers Shortest Edit Script (SES) Algorithm Implementation.
 * Computes exact diff operations (equal, delete, insert) between two sequences.
 *
 * @param {Array} a - Source sequence
 * @param {Array} b - Target sequence
 * @param {Function} [equalsFn] - Custom equality comparator
 * @returns {Array<{type: 'equal'|'delete'|'insert', itemA?: any, itemB?: any, indexA?: number, indexB?: number}>}
 */
export function myersDiff(a, b, equalsFn = (x, y) => x === y) {
  const N = a.length;
  const M = b.length;

  if (N === 0 && M === 0) return [];

  // Prefix optimization
  let prefixCount = 0;
  while (prefixCount < N && prefixCount < M && equalsFn(a[prefixCount], b[prefixCount])) {
    prefixCount++;
  }

  // Suffix optimization
  let suffixCount = 0;
  while (
    suffixCount < N - prefixCount &&
    suffixCount < M - prefixCount &&
    equalsFn(a[N - 1 - suffixCount], b[M - 1 - suffixCount])
  ) {
    suffixCount++;
  }

  const midA = a.slice(prefixCount, N - suffixCount);
  const midB = b.slice(prefixCount, M - suffixCount);

  const edits = [];

  // Add equal prefix
  for (let i = 0; i < prefixCount; i++) {
    edits.push({ type: 'equal', itemA: a[i], itemB: b[i], indexA: i, indexB: i });
  }

  // Compute middle diff using Myers
  if (midA.length > 0 || midB.length > 0) {
    const midEdits = computeMyersMiddle(midA, midB, equalsFn, prefixCount);
    edits.push(...midEdits);
  }

  // Add equal suffix
  for (let i = 0; i < suffixCount; i++) {
    const idxA = N - suffixCount + i;
    const idxB = M - suffixCount + i;
    edits.push({ type: 'equal', itemA: a[idxA], itemB: b[idxB], indexA: idxA, indexB: idxB });
  }

  return edits;
}

function computeMyersMiddle(a, b, equalsFn, offset) {
  const N = a.length;
  const M = b.length;
  const MAX = N + M;

  if (N === 0) {
    return b.map((item, idx) => ({ type: 'insert', itemB: item, indexB: offset + idx }));
  }
  if (M === 0) {
    return a.map((item, idx) => ({ type: 'delete', itemA: item, indexA: offset + idx }));
  }

  const v = new Int32Array(2 * MAX + 1);
  const trace = [];
  v[MAX + 1] = 0;

  for (let d = 0; d <= MAX; d++) {
    const vCopy = new Int32Array(v);
    trace.push(vCopy);

    for (let k = -d; k <= d; k += 2) {
      let x;
      if (k === -d || (k !== d && v[MAX + k - 1] < v[MAX + k + 1])) {
        x = v[MAX + k + 1];
      } else {
        x = v[MAX + k - 1] + 1;
      }
      let y = x - k;

      while (x < N && y < M && equalsFn(a[x], b[y])) {
        x++;
        y++;
      }

      v[MAX + k] = x;

      if (x >= N && y >= M) {
        return backtrackMyers(trace, a, b, equalsFn, offset);
      }
    }
  }

  return fallbackLineDiff(a, b, equalsFn, offset);
}

function backtrackMyers(trace, a, b, equalsFn, offset) {
  let x = a.length;
  let y = b.length;
  const edits = [];

  for (let d = trace.length - 1; d > 0; d--) {
    const v = trace[d];
    const k = x - y;
    const MAX = a.length + b.length;

    let prevK;
    if (k === -d || (k !== d && v[MAX + k - 1] < v[MAX + k + 1])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }

    const prevX = v[MAX + prevK];
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      edits.push({
        type: 'equal',
        itemA: a[x - 1],
        itemB: b[y - 1],
        indexA: offset + x - 1,
        indexB: offset + y - 1,
      });
      x--;
      y--;
    }

    if (d > 0) {
      if (x === prevX) {
        edits.push({ type: 'insert', itemB: b[y - 1], indexB: offset + y - 1 });
        y--;
      } else if (y === prevY) {
        edits.push({ type: 'delete', itemA: a[x - 1], indexA: offset + x - 1 });
        x--;
      }
    }
  }

  while (x > 0 && y > 0 && equalsFn(a[x - 1], b[y - 1])) {
    edits.push({
      type: 'equal',
      itemA: a[x - 1],
      itemB: b[y - 1],
      indexA: offset + x - 1,
      indexB: offset + y - 1,
    });
    x--;
    y--;
  }
  while (x > 0) {
    edits.push({ type: 'delete', itemA: a[x - 1], indexA: offset + x - 1 });
    x--;
  }
  while (y > 0) {
    edits.push({ type: 'insert', itemB: b[y - 1], indexB: offset + y - 1 });
    y--;
  }

  return edits.reverse();
}

function fallbackLineDiff(a, b, equalsFn, offset) {
  const edits = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (equalsFn(a[i], b[j])) {
      edits.push({ type: 'equal', itemA: a[i], itemB: b[j], indexA: offset + i, indexB: offset + j });
      i++;
      j++;
    } else {
      edits.push({ type: 'delete', itemA: a[i], indexA: offset + i });
      edits.push({ type: 'insert', itemB: b[j], indexB: offset + j });
      i++;
      j++;
    }
  }
  while (i < a.length) {
    edits.push({ type: 'delete', itemA: a[i], indexA: offset + i });
    i++;
  }
  while (j < b.length) {
    edits.push({ type: 'insert', itemB: b[j], indexB: offset + j });
    j++;
  }
  return edits;
}

/**
 * Tokenize a single line or snippet into tokens with character offsets and line/col metadata.
 */
export function getTokenMetadata(code, language = 'auto') {
  if (!code || typeof code !== 'string') return [];
  const rawTokens = tokenize(code, language);
  const lines = code.split('\n');

  let currentOffset = 0;
  const lineOffsets = [0];
  for (let i = 0; i < lines.length - 1; i++) {
    currentOffset += lines[i].length + 1; // +1 for \n
    lineOffsets.push(currentOffset);
  }

  return rawTokens.map((t, idx) => {
    const lineIdx = (t.line || 1) - 1;
    const colIdx = t.column || 0;
    const baseOffset = lineOffsets[lineIdx] !== undefined ? lineOffsets[lineIdx] : 0;
    const startOffset = baseOffset + colIdx;
    const endOffset = startOffset + (t.original ? t.original.length : 0);

    return {
      tokenIndex: idx,
      type: t.type,
      value: t.original,
      normalizedValue: t.type,
      line: t.line || 1,
      column: colIdx,
      startOffset,
      endOffset,
    };
  });
}

/**
 * Main Code Diff Generator using Myers Algorithm.
 * Computes line-level and token-level diffs with original source code position mapping.
 *
 * @param {string} codeA - Source code for submission A
 * @param {string} codeB - Source code for submission B
 * @param {string} [language='auto'] - Programming language identifier
 * @param {Object} [options]
 * @returns {Object} Complete diff result object
 */
export function computeCodeDiff(codeA, codeB, language = 'auto', options = {}) {
  const strA = typeof codeA === 'string' ? codeA : '';
  const strB = typeof codeB === 'string' ? codeB : '';

  const linesA = strA.split('\n');
  const linesB = strB.split('\n');

  const isLargeFile =
    linesA.length + linesB.length > 2000 ||
    strA.length + strB.length > 100000 ||
    options.disableTokenDiff === true;

  const lineEdits = myersDiff(linesA, linesB, (lA, lB) => lA.trim() === lB.trim());

  const rawOps = [];
  let currentOp = null;

  for (const edit of lineEdits) {
    if (!currentOp || currentOp.type !== edit.type) {
      if (currentOp) rawOps.push(currentOp);
      currentOp = {
        type: edit.type,
        linesA: [],
        linesB: [],
        indicesA: [],
        indicesB: [],
      };
    }

    if (edit.type === 'equal') {
      currentOp.linesA.push(edit.itemA);
      currentOp.linesB.push(edit.itemB);
      currentOp.indicesA.push(edit.indexA);
      currentOp.indicesB.push(edit.indexB);
    } else if (edit.type === 'delete') {
      currentOp.linesA.push(edit.itemA);
      currentOp.indicesA.push(edit.indexA);
    } else if (edit.type === 'insert') {
      currentOp.linesB.push(edit.itemB);
      currentOp.indicesB.push(edit.indexB);
    }
  }
  if (currentOp) rawOps.push(currentOp);

  const mergedOps = [];
  for (let i = 0; i < rawOps.length; i++) {
    const curr = rawOps[i];
    const next = rawOps[i + 1];

    if (curr.type === 'delete' && next && next.type === 'insert') {
      mergedOps.push({
        type: 'modify',
        linesA: curr.linesA,
        linesB: next.linesB,
        indicesA: curr.indicesA,
        indicesB: next.indicesB,
      });
      i++;
    } else {
      mergedOps.push(curr);
    }
  }

  let insertionsCount = 0;
  let deletionsCount = 0;
  let modificationsCount = 0;

  const formattedOps = mergedOps.map((op) => {
    const startLineA = op.indicesA.length > 0 ? op.indicesA[0] + 1 : null;
    const endLineA = op.indicesA.length > 0 ? op.indicesA[op.indicesA.length - 1] + 1 : null;
    const startLineB = op.indicesB.length > 0 ? op.indicesB[0] + 1 : null;
    const endLineB = op.indicesB.length > 0 ? op.indicesB[op.indicesB.length - 1] + 1 : null;

    const opObj = {
      type: op.type,
      sourceA: startLineA ? { startLine: startLineA, endLine: endLineA, text: op.linesA.join('\n') } : null,
      sourceB: startLineB ? { startLine: startLineB, endLine: endLineB, text: op.linesB.join('\n') } : null,
    };

    if (op.type === 'insert') insertionsCount += op.linesB.length;
    if (op.type === 'delete') deletionsCount += op.linesA.length;
    if (op.type === 'modify') modificationsCount += Math.max(op.linesA.length, op.linesB.length);

    if (op.type === 'modify' && !isLargeFile && op.linesA.length <= 100 && op.linesB.length <= 100) {
      const tokensA = getTokenMetadata(op.linesA.join('\n'), language);
      const tokensB = getTokenMetadata(op.linesB.join('\n'), language);

      if (tokensA.length > 0 && tokensB.length > 0) {
        const tokenEdits = myersDiff(
          tokensA,
          tokensB,
          (tA, tB) => tA.value === tB.value || (tA.type === tB.type && tA.type !== 'VAR')
        );

        opObj.tokenDiff = tokenEdits.map((tEdit) => ({
          type: tEdit.type,
          tokenA: tEdit.itemA || null,
          tokenB: tEdit.itemB || null,
        }));
      }
    }

    return opObj;
  });

  const matchingRegions = [];
  for (const op of formattedOps) {
    if (op.type === 'equal' && op.sourceA && op.sourceB) {
      matchingRegions.push({
        startLineA: op.sourceA.startLine,
        endLineA: op.sourceA.endLine,
        startLineB: op.sourceB.startLine,
        endLineB: op.sourceB.endLine,
        matchedLines: op.sourceA.endLine - op.sourceA.startLine + 1,
      });
    }
  }

  return {
    algorithm: 'myers',
    granularity: isLargeFile ? 'line' : 'line+token',
    matchingRegionsCount: matchingRegions.length,
    matchingRegions,
    stats: {
      matchingRegions: matchingRegions.length,
      insertions: insertionsCount,
      deletions: deletionsCount,
      modifications: modificationsCount,
    },
    operations: formattedOps,
  };
}
