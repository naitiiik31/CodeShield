import { describe, it, expect } from 'vitest';
import { generateKgrams } from '../kgram.js';
import { hashKgram, hashAllKgrams } from '../hash.js';
import { winnow } from '../winnow.js';
import { generateFingerprints } from '../index.js';

describe('K-gram Generator', () => {
  it('should generate correct k-grams', () => {
    const tokens = ['A', 'B', 'C', 'D', 'E', 'F'];
    const kgrams = generateKgrams(tokens, 4);
    expect(kgrams).toHaveLength(3);
    expect(kgrams[0].tokens).toEqual(['A', 'B', 'C', 'D']);
    expect(kgrams[1].tokens).toEqual(['B', 'C', 'D', 'E']);
    expect(kgrams[2].tokens).toEqual(['C', 'D', 'E', 'F']);
  });

  it('should set correct positions', () => {
    const kgrams = generateKgrams(['A', 'B', 'C', 'D'], 2);
    expect(kgrams[0].position).toBe(0);
    expect(kgrams[1].position).toBe(1);
    expect(kgrams[2].position).toBe(2);
  });

  it('should return empty for k > token count', () => {
    const kgrams = generateKgrams(['A', 'B'], 5);
    expect(kgrams).toHaveLength(0);
  });

  it('should return empty for empty input', () => {
    const kgrams = generateKgrams([], 3);
    expect(kgrams).toHaveLength(0);
  });

  it('should throw for k <= 0', () => {
    expect(() => generateKgrams(['A'], 0)).toThrow();
    expect(() => generateKgrams(['A'], -1)).toThrow();
  });
});

describe('Hashing', () => {
  it('should produce deterministic hashes', () => {
    const kgram = { tokens: ['VAR', '+', 'NUM'], position: 0 };
    const hash1 = hashKgram(kgram);
    const hash2 = hashKgram(kgram);
    expect(hash1.hash).toBe(hash2.hash);
  });

  it('should produce different hashes for different k-grams', () => {
    const hash1 = hashKgram({ tokens: ['VAR', '+', 'NUM'], position: 0 });
    const hash2 = hashKgram({ tokens: ['VAR', '-', 'NUM'], position: 0 });
    expect(hash1.hash).not.toBe(hash2.hash);
  });
});

describe('Winnowing Algorithm', () => {
  it('should produce fingerprints from hashes', () => {
    const hashes = [
      { hash: 77, position: 0, startToken: 0, endToken: 3 },
      { hash: 74, position: 1, startToken: 1, endToken: 4 },
      { hash: 42, position: 2, startToken: 2, endToken: 5 },
      { hash: 17, position: 3, startToken: 3, endToken: 6 },
      { hash: 98, position: 4, startToken: 4, endToken: 7 },
      { hash: 21, position: 5, startToken: 5, endToken: 8 },
      { hash: 83, position: 6, startToken: 6, endToken: 9 },
    ];
    const fps = winnow(hashes, 4);
    expect(fps.length).toBeGreaterThan(0);
    for (const fp of fps) {
      expect(hashes.some((h) => h.hash === fp.hash)).toBe(true);
    }
  });
});

describe('Full Fingerprint Pipeline', () => {
  it('should produce fingerprints for Python code', () => {
    const code = `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
`;
    const result = generateFingerprints(code, 'python');
    expect(result.tokens.length).toBeGreaterThan(0);
    expect(result.fingerprints.length).toBeGreaterThan(0);
  });

  it('should produce fingerprints for JavaScript code', () => {
    const code = `
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
`;
    const result = generateFingerprints(code, 'javascript');
    expect(result.tokens.length).toBeGreaterThan(0);
    expect(result.fingerprints.length).toBeGreaterThan(0);
  });

  it('should produce similar fingerprints for renamed-variable copies', () => {
    const codeA = `
def calculate(numbers):
    total = 0
    for item in numbers:
        total += item
    return total
`;
    const codeB = `
def compute(values):
    result = 0
    for element in values:
        result += element
    return result
`;
    const fpA = generateFingerprints(codeA, 'python');
    const fpB = generateFingerprints(codeB, 'python');

    expect(fpA.tokenTypes).toEqual(fpB.tokenTypes);

    const hashesA = fpA.fingerprints.map((f) => f.hash).sort();
    const hashesB = fpB.fingerprints.map((f) => f.hash).sort();
    expect(hashesA).toEqual(hashesB);
  });
});
