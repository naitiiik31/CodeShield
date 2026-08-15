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

  it('should handle empty sets gracefully without NaN', () => {
    const result = jaccardSimilarity([], []);
    expect(result.score).toBe(0);
    expect(isNaN(result.score)).toBe(false);
  });
});

describe('Containment Similarity', () => {
  it('should return 1 when A is fully contained in B', () => {
    expect(containmentSimilarity([1, 2], [1, 2, 3, 4])).toBe(1);
  });
});

describe('Inverted Index & Candidate Generator Reduction', () => {
  it('should build inverted index and perform candidate pair reduction', () => {
    const submissions = [
      { id: 'A', fingerprints: [1, 2, 3] },
      { id: 'B', fingerprints: [2, 3, 4] },
      { id: 'C', fingerprints: [100, 101, 102] },
    ];
    const { naivePairCount, candidatePairCount, pairs } = findCandidatePairs(submissions);

    expect(naivePairCount).toBe(3); // 3*(3-1)/2
    expect(candidatePairCount).toBe(1); // Only A-B share fingerprints (2,3)
    expect(candidatePairCount).toBeLessThan(naivePairCount);
    expect(pairs[0].submissionA).toBe('A');
    expect(pairs[0].submissionB).toBe('B');
  });

  it('should correctly include all pairs sharing fingerprints without duplicates', () => {
    const submissions = [
      { id: 'A', fingerprints: [1, 2] },
      { id: 'B', fingerprints: [2, 3] },
      { id: 'C', fingerprints: [3, 4] },
    ];
    const { naivePairCount, candidatePairCount, pairs } = findCandidatePairs(submissions);

    expect(naivePairCount).toBe(3);
    expect(candidatePairCount).toBe(2); // A-B (hash 2) and B-C (hash 3)
    const pairKeys = pairs.map((p) => `${p.submissionA}::${p.submissionB}`);
    expect(pairKeys).toContain('A::B');
    expect(pairKeys).toContain('B::C');
    expect(pairKeys).not.toContain('A::C');
  });
});
