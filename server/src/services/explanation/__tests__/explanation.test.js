import { describe, it, expect } from 'vitest';
import { detectBoilerplate, calculateAdjustedSimilarity } from '../../boilerplate/detector.js';
import { generateExplanation, determineRiskLevel } from '../generator.js';

describe('Boilerplate Detection', () => {
  it('should identify common fingerprints as boilerplate when appearing across >= 80% submissions', () => {
    const submissions = [
      { id: 'A', fingerprints: [1, 2, 3, 10, 11] },
      { id: 'B', fingerprints: [1, 2, 3, 20, 21] },
      { id: 'C', fingerprints: [1, 2, 3, 30, 31] },
      { id: 'D', fingerprints: [1, 2, 4, 40, 41] },
    ];

    const result = detectBoilerplate(submissions, 0.7);

    expect(result.boilerplateHashes.has(1)).toBe(true);
    expect(result.boilerplateHashes.has(2)).toBe(true);
    expect(result.boilerplateHashes.has(10)).toBe(false);
  });

  it('should handle empty submissions', () => {
    const result = detectBoilerplate([], 0.7);
    expect(result.boilerplateCount).toBe(0);
  });
});

describe('Adjusted Similarity', () => {
  it('should lower score when boilerplate is removed', () => {
    const fpA = [1, 2, 3, 10, 11];
    const fpB = [1, 2, 3, 20, 21];
    const boilerplate = new Set([1, 2, 3]);

    const result = calculateAdjustedSimilarity(fpA, fpB, boilerplate);

    expect(result.rawScore).toBeCloseTo(3 / 7);
    expect(result.adjustedScore).toBe(0);
    expect(result.boilerplateMatches.length).toBe(3);
    expect(result.nonBoilerplateMatches.length).toBe(0);
  });
});

describe('Explanation Generator', () => {
  it('should produce explanations for high similarity', () => {
    const explanations = generateExplanation({
      rawScore: 0.85,
      adjustedScore: 0.82,
      boilerplateOverlap: 0.03,
      matchedRegions: [
        { startLineA: 1, endLineA: 10, startLineB: 1, endLineB: 10, fingerprintCount: 5 },
      ],
      nonBoilerplateMatches: [1, 2, 3, 4, 5],
      tokensA: [],
      tokensB: [],
      totalFingerprintsA: 10,
      totalFingerprintsB: 10,
    });

    expect(explanations.length).toBeGreaterThan(0);
    expect(explanations.some((e) => e.includes('82.0%'))).toBe(true);
    expect(explanations.some((e) => e.includes('matching code region'))).toBe(true);
  });
});

describe('Risk Level Determination', () => {
  it('should return high for scores well above threshold', () => {
    expect(determineRiskLevel(0.85, 0.5)).toBe('high');
  });

  it('should return medium for scores at threshold', () => {
    expect(determineRiskLevel(0.55, 0.5)).toBe('medium');
  });

  it('should return low for scores below threshold', () => {
    expect(determineRiskLevel(0.3, 0.5)).toBe('low');
  });
});
