import { tokenize } from '../tokenizer/index.js';
import { generateKgrams } from './kgram.js';
import { hashAllKgrams } from './hash.js';
import { winnow } from './winnow.js';

export function generateFingerprints(code, language = 'auto', options = {}) {
  const k = options.k || 5;
  const windowSize = options.windowSize || 4;

  const tokens = tokenize(code, language);

  if (tokens.length === 0) {
    return {
      fingerprints: [],
      tokenTypes: [],
      tokens: [],
      kgramCount: 0,
      hashCount: 0,
    };
  }

  const tokenTypes = tokens.map((t) => t.type);

  const kgrams = generateKgrams(tokenTypes, k);

  if (kgrams.length === 0) {
    return {
      fingerprints: [],
      tokenTypes,
      tokens,
      kgramCount: 0,
      hashCount: 0,
    };
  }

  const hashes = hashAllKgrams(kgrams);

  const fingerprints = winnow(hashes, windowSize);

  const enrichedFingerprints = fingerprints.map((fp) => {
    const startTokenIdx = fp.position;
    const endTokenIdx = Math.min(fp.position + k - 1, tokens.length - 1);
    return {
      ...fp,
      startLine: tokens[startTokenIdx]?.line,
      endLine: tokens[endTokenIdx]?.line,
    };
  });

  return {
    fingerprints: enrichedFingerprints,
    tokenTypes,
    tokens,
    kgramCount: kgrams.length,
    hashCount: hashes.length,
  };
}

export { generateKgrams } from './kgram.js';
export { hashKgram, hashAllKgrams } from './hash.js';
export { winnow } from './winnow.js';
