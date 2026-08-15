import { describe, it, expect } from 'vitest';
import {
  buildInvertedIndex,
  generateCandidatePairsFromIndex,
  generateAllUniquePairs,
  findCandidatePairs,
} from '../candidateGenerator.js';

describe('Candidate Generator (Inverted Index)', () => {
  it('TEST 1: 2 submissions with overlapping fingerprints produce 1 candidate pair', () => {
    const submissions = [
      { id: 'subA', fingerprints: [101, 102, 103] },
      { id: 'subB', fingerprints: [102, 103, 104] },
    ];

    const result = findCandidatePairs(submissions);
    expect(result.naivePairCount).toBe(1);
    expect(result.candidatePairCount).toBe(1);
    expect(result.pairs.length).toBe(1);
    expect(result.pairs[0].submissionA).toBe('subA');
    expect(result.pairs[0].submissionB).toBe('subB');
    expect(result.pairs[0].sharedHashCount).toBe(2);
  });

  it('TEST 2: 2 submissions with no overlapping fingerprints produce 0 candidate pairs (no fake pair)', () => {
    const submissions = [
      { id: 'subA', fingerprints: [101, 102] },
      { id: 'subB', fingerprints: [201, 202] },
    ];

    const result = findCandidatePairs(submissions);
    expect(result.naivePairCount).toBe(1);
    expect(result.candidatePairCount).toBe(0);
    expect(result.pairs.length).toBe(0);
    expect(result.reductionPercentage).toBe('100.0');
  });

  it('TEST 3: 3 submissions maximum possible pairs is 3', () => {
    const submissions = [
      { id: 'subA', fingerprints: [100, 200] },
      { id: 'subB', fingerprints: [100, 300] },
      { id: 'subC', fingerprints: [100, 400] },
    ];

    const result = findCandidatePairs(submissions);
    expect(result.naivePairCount).toBe(3);
    expect(result.candidatePairCount).toBeLessThanOrEqual(3);
    expect(result.pairs.length).toBe(3); // all share fingerprint 100
  });

  it('TEST 4: 10 submissions maximum possible pairs is 45 and candidate count <= possible pairs', () => {
    const submissions = Array.from({ length: 10 }, (_, i) => ({
      id: `sub${i}`,
      fingerprints: [10 + i, 999], // all share 999
    }));

    const result = findCandidatePairs(submissions);
    expect(result.naivePairCount).toBe(45);
    expect(result.candidatePairCount).toBe(45);
    expect(result.candidatePairCount).toBeLessThanOrEqual(45);
  });

  it('TEST 5: Pair deduplication: A-B and B-A become ONE deterministic candidate pair', () => {
    const index = new Map([
      [101, ['subB', 'subA']],
      [102, ['subA', 'subB']],
    ]);

    const pairs = generateCandidatePairsFromIndex(index);
    expect(pairs.length).toBe(1);
    expect(pairs[0].submissionA).toBe('subA');
    expect(pairs[0].submissionB).toBe('subB');
    expect(pairs[0].sharedHashCount).toBe(2);
  });

  it('TEST 6: Self comparisons A:A are excluded', () => {
    const index = new Map([
      [101, ['subA', 'subA']],
    ]);

    const pairs = generateCandidatePairsFromIndex(index);
    expect(pairs.length).toBe(0);
  });

  it('TEST 7: Handles duplicate fingerprints in single submission gracefully', () => {
    const submissions = [
      { id: 'subA', fingerprints: [100, 100, 100] },
      { id: 'subB', fingerprints: [100, 100] },
    ];

    const index = buildInvertedIndex(submissions);
    expect(index.get(100)).toEqual(['subA', 'subB']);

    const pairs = generateCandidatePairsFromIndex(index);
    expect(pairs.length).toBe(1);
    expect(pairs[0].sharedHashCount).toBe(1);
  });

  it('TEST 8: Zero fingerprints returns zero candidates', () => {
    const submissions = [
      { id: 'subA', fingerprints: [] },
      { id: 'subB', fingerprints: [] },
    ];

    const result = findCandidatePairs(submissions);
    expect(result.naivePairCount).toBe(1);
    expect(result.candidatePairCount).toBe(0);
    expect(result.pairs).toEqual([]);
  });

  it('TEST 9: Candidate generator error handling when invalid input passed', () => {
    expect(() => buildInvertedIndex(null)).not.toThrow();
    const res = findCandidatePairs(null);
    expect(res.pairs).toEqual([]);
  });
});
