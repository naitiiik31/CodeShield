import { generateFingerprints } from '../services/fingerprint/index.js';
import { findCandidatePairs } from '../services/similarity/candidateGenerator.js';

function generateSampleSubmission(id, type) {
  if (type === 'bubble') {
    return `# Submission ${id}
def bubble_sort_${id}(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr
`;
  } else if (type === 'select') {
    return `# Submission ${id}
def selection_sort_${id}(items):
    size = len(items)
    for idx in range(size):
        min_pos = idx
        for jdx in range(idx + 1, size):
            if items[jdx] < items[min_pos]:
                min_pos = jdx
        items[idx], items[min_pos] = items[min_pos], items[idx]
    return items
`;
  } else if (type === 'merge') {
    return `# Submission ${id}
def merge_sort_${id}(data):
    if len(data) <= 1:
        return data
    mid = len(data) // 2
    left = merge_sort_${id}(data[:mid])
    right = merge_sort_${id}(data[mid:])
    return left + right
`;
  } else {
    return `# Submission ${id}
def unique_func_${id}(x, y):
    val_${id} = x * ${id} + y
    return val_${id}
`;
  }
}

function runBenchmark() {
  console.log('⚡ Running CodeGuard Algorithmic Benchmarks...\n');

  const submissionCounts = [10, 50, 100, 200];
  console.log('--- 1. Fingerprint Generation Performance ---');
  for (const n of submissionCounts) {
    const start = performance.now();
    for (let i = 0; i < n; i++) {
      const code = generateSampleSubmission(i, i % 3 === 0 ? 'bubble' : i % 3 === 1 ? 'select' : 'merge');
      generateFingerprints(code, 'python');
    }
    const elapsed = performance.now() - start;
    console.log(`  ${n} submissions fingerprinted in ${elapsed.toFixed(2)} ms (${(elapsed / n).toFixed(2)} ms/sub)`);
  }

  console.log('\n--- 2. Scalability Benchmark: Naive O(N²) vs Inverted Index ---');
  for (const n of submissionCounts) {
    const submissions = [];
    for (let i = 0; i < n; i++) {
      const code = generateSampleSubmission(i, i % 5 === 0 ? 'bubble' : i % 5 === 1 ? 'select' : 'random');
      const fpResult = generateFingerprints(code, 'python');
      submissions.push({
        id: `sub_${i}`,
        fingerprints: fpResult.fingerprints.map((f) => f.hash),
      });
    }

    const startInverted = performance.now();
    const { naivePairCount, candidatePairCount } = findCandidatePairs(submissions);
    const elapsedInverted = performance.now() - startInverted;

    const reductionPct = (((naivePairCount - candidatePairCount) / naivePairCount) * 100).toFixed(1);

    console.log(`  N = ${n} submissions:`);
    console.log(`    - Naive candidate pairs: ${naivePairCount}`);
    console.log(`    - Inverted index candidates: ${candidatePairCount} (${reductionPct}% candidate reduction)`);
    console.log(`    - Candidate generation time: ${elapsedInverted.toFixed(2)} ms`);
  }

  console.log('\n✅ Benchmark finished successfully.');
}

runBenchmark();
