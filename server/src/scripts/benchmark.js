import { generateFingerprints } from '../services/fingerprint/index.js';
import { findCandidatePairs } from '../services/similarity/candidateGenerator.js';

function generateClusterSubmission(id, clusterId) {
  if (clusterId === 0) {
    return `def bubble_sort_v${id}(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr
`;
  } else if (clusterId === 1) {
    return `def quick_sort_v${id}(items):
    if len(items) <= 1:
        return items
    pivot = items[len(items) // 2]
    left = [x for x in items if x < pivot]
    middle = [x for x in items if x == pivot]
    right = [x for x in items if x > pivot]
    return quick_sort_v${id}(left) + middle + quick_sort_v${id}(right)
`;
  } else if (clusterId === 2) {
    return `def matrix_multiply_v${id}(A, B):
    result = [[0 for _ in range(len(B[0]))] for _ in range(len(A))]
    for i in range(len(A)):
        for j in range(len(B[0])):
            for k in range(len(B)):
                result[i][j] += A[i][k] * B[k][j]
    return result
`;
  } else {
    return `def custom_math_calculator_group_${clusterId}_sub_${id}(val_x, val_y):
    temp_${id} = val_x * ${id} + val_y * ${clusterId}
    factor_${id} = temp_${id} ** 2 - ${id * 3}
    return factor_${id} / (${id + 1})
`;
  }
}

function runBenchmark() {
  console.log('Running CodeGuard Algorithmic Benchmarks...\n');

  const submissionCounts = [10, 50, 100, 500, 1000];
  console.log('--- 1. Fingerprint Generation Performance ---');
  for (const n of submissionCounts) {
    const start = performance.now();
    for (let i = 0; i < n; i++) {
      const code = generateClusterSubmission(i, i % 10);
      generateFingerprints(code, 'python');
    }
    const elapsed = performance.now() - start;
    console.log(`  ${n} submissions fingerprinted in ${elapsed.toFixed(2)} ms (${(elapsed / n).toFixed(2)} ms/sub)`);
  }

  console.log('\n--- 2. Scalability Benchmark: Naive O(N²) vs Inverted Index Candidate Reduction ---');
  for (const n of submissionCounts) {
    const submissions = [];
    for (let i = 0; i < n; i++) {
      // 10 distinct algorithmic clusters (only submissions in the same cluster share fingerprints)
      const code = generateClusterSubmission(i, i % 10);
      const fpResult = generateFingerprints(code, 'python');
      submissions.push({
        id: `sub_${i}`,
        fingerprints: fpResult.fingerprints.map((f) => f.hash),
      });
    }

    const startInverted = performance.now();
    const { naivePairCount, candidatePairCount, reductionPercentage } = findCandidatePairs(submissions);
    const elapsedInverted = performance.now() - startInverted;

    console.log(`  N = ${n} submissions:`);
    console.log(`    - Naive candidate pairs: ${naivePairCount}`);
    console.log(`    - Inverted index candidates: ${candidatePairCount} (${reductionPercentage}% candidate reduction)`);
    console.log(`    - Candidate generation time: ${elapsedInverted.toFixed(2)} ms`);
  }

  console.log('\nBenchmark finished successfully.');
}

runBenchmark();
