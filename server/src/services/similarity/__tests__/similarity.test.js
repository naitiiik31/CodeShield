import { describe, it, expect } from 'vitest';
import { jaccardSimilarity, containmentSimilarity } from '../jaccard.js';
import { buildInvertedIndex, findCandidatePairs } from '../candidateGenerator.js';

describe('Jaccard Similarity', () => {
  it('should return 1 for identical sets', () => {
    const result = jaccardSimilarity([1, 2, 3], [1, 2, 3]);
    expect(result.score).toBe(1);
    expect(result.matchedCount).toBe(3);
  });

  it('should return 0 for disjoint sets', () => {
    const result = jaccardSimilarity([1, 2, 3], [4, 5, 6]);
    expect(result.score).toBe(0);
    expect(result.matchedCount).toBe(0);
  });

  it('should calculate partial overlap correctly', () => {
    const result = jaccardSimilarity([1, 2, 3, 4], [3, 4, 5, 6]);
    expect(result.score).toBeCloseTo(2 / 6);
    expect(result.matchedCount).toBe(2);
  });
});

describe('Containment Similarity', () => {
  it('should return 1 when A is fully contained in B', () => {
    expect(containmentSimilarity([1, 2], [1, 2, 3, 4])).toBe(1);
  });
});

describe('Inverted Index & Candidate Generator', () => {
  it('should build correct inverted index and candidates for N*(N-1)/2 unique pairs', () => {
    const submissions = [
      { id: 'A', fingerprints: [1, 2, 3] },
      { id: 'B', fingerprints: [2, 3, 4] },
      { id: 'C', fingerprints: [5, 6, 7] },
    ];
    const { naivePairCount, candidatePairCount, pairs } = findCandidatePairs(submissions);

    expect(naivePairCount).toBe(3);
    expect(candidatePairCount).toBe(3);
    expect(pairs[0].submissionA).toBe('A');
    expect(pairs[0].submissionB).toBe('B');
    expect(pairs[1].submissionA).toBe('A');
    expect(pairs[1].submissionB).toBe('C');
    expect(pairs[2].submissionA).toBe('B');
    expect(pairs[2].submissionB).toBe('C');
  });
});
