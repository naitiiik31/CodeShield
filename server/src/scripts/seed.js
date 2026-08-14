import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { config } from '../config/index.js';
import { connectDatabase } from '../config/database.js';
import { User } from '../models/User.js';
import { Assignment } from '../models/Assignment.js';
import { Submission } from '../models/Submission.js';
import { SimilarityResult } from '../models/SimilarityResult.js';
import { InvertedIndex } from '../models/InvertedIndex.js';
import { BoilerplateFingerprint } from '../models/BoilerplateFingerprint.js';
import { generateFingerprints } from '../services/fingerprint/index.js';
import { findCandidatePairs } from '../services/similarity/candidateGenerator.js';
import { jaccardSimilarity } from '../services/similarity/jaccard.js';
import {
  detectBoilerplate,
  calculateAdjustedSimilarity,
} from '../services/boilerplate/detector.js';
import { mapMatchedRegions } from '../services/explanation/regionMapper.js';
import {
  generateExplanation,
  determineRiskLevel,
} from '../services/explanation/generator.js';
import { tokenize } from '../services/tokenizer/index.js';

const STARTER_CODE = `# Starter code provided by professor
def read_input():
    n = int(input())
    arr = []
    for i in range(n):
        arr.append(int(input()))
    return arr

def print_result(result):
    print(result)
`;

const SUBMISSIONS_ASSIGNMENT_1 = [
  {
    name: 'Original bubble sort',
    code: `${STARTER_CODE}
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

data = read_input()
result = bubble_sort(data)
print_result(result)
`,
  },
  {
    name: 'Renamed variable copy',
    code: `${STARTER_CODE}
def sort_array(numbers):
    length = len(numbers)
    for idx in range(length):
        for jdx in range(0, length - idx - 1):
            if numbers[jdx] > numbers[jdx + 1]:
                numbers[jdx], numbers[jdx + 1] = numbers[jdx + 1], numbers[jdx]
    return numbers

values = read_input()
output = sort_array(values)
print_result(output)
`,
  },
  {
    name: 'Reformatted copy with different comments',
    code: `${STARTER_CODE}
# My sorting solution
def my_sort(lst):
    size = len(lst)
    # outer loop
    for x in range(size):
        # inner comparison loop
        for y in range(0, size - x - 1):
            if lst[y] > lst[y + 1]:
                lst[y], lst[y + 1] = lst[y + 1], lst[y]
    return lst

items = read_input()
answer = my_sort(items)
print_result(answer)
`,
  },
  {
    name: 'Selection sort (different algorithm)',
    code: `${STARTER_CODE}
def selection_sort(arr):
    n = len(arr)
    for i in range(n):
        min_idx = i
        for j in range(i + 1, n):
            if arr[j] < arr[min_idx]:
                min_idx = j
        arr[i], arr[min_idx] = arr[min_idx], arr[i]
    return arr

data = read_input()
result = selection_sort(data)
print_result(result)
`,
  },
  {
    name: 'Insertion sort (different algorithm)',
    code: `${STARTER_CODE}
def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and key < arr[j]:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr

data = read_input()
result = insertion_sort(data)
print_result(result)
`,
  },
  {
    name: 'Merge sort (completely different)',
    code: `${STARTER_CODE}
def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result

data = read_input()
result = merge_sort(data)
print_result(result)
`,
  },
  {
    name: 'Quick sort (completely different)',
    code: `${STARTER_CODE}
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

data = read_input()
result = quicksort(data)
print_result(result)
`,
  },
  {
    name: 'Partial copy with modification',
    code: `${STARTER_CODE}
def optimized_bubble(arr):
    n = len(arr)
    for i in range(n):
        swapped = False
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break
    return arr

data = read_input()
result = optimized_bubble(data)
print_result(result)
`,
  },
];

const SUBMISSIONS_ASSIGNMENT_2 = [
  {
    name: 'Binary search original',
    code: `def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1
`,
  },
  {
    name: 'Binary search renamed',
    code: `def search(numbers, key):
    left = 0
    right = len(numbers) - 1
    while left <= right:
        center = (left + right) // 2
        if numbers[center] == key:
            return center
        elif numbers[center] < key:
            left = center + 1
        else:
            right = center - 1
    return -1
`,
  },
  {
    name: 'Linear search (different)',
    code: `def linear_search(arr, target):
    for i in range(len(arr)):
        if arr[i] == target:
            return i
    return -1
`,
  },
];

async function seed() {
  console.log('🌱 Seeding CodeGuard database...\n');

  await connectDatabase();

  await User.deleteMany({});
  await Assignment.deleteMany({});
  await Submission.deleteMany({});
  await SimilarityResult.deleteMany({});
  await InvertedIndex.deleteMany({});
  await BoilerplateFingerprint.deleteMany({});
  console.log('  Cleared existing data');

  const passwordHash = await bcrypt.hash('password123', 12);

  const professor = await User.create({
    name: 'Dr. Sarah Chen',
    email: 'professor@codeguard.dev',
    passwordHash,
    role: 'professor',
  });

  const students = await User.create([
    { name: 'Alice Johnson', email: 'alice@student.dev', passwordHash, role: 'student' },
    { name: 'Bob Smith', email: 'bob@student.dev', passwordHash, role: 'student' },
    { name: 'Charlie Brown', email: 'charlie@student.dev', passwordHash, role: 'student' },
    { name: 'Diana Prince', email: 'diana@student.dev', passwordHash, role: 'student' },
    { name: 'Eve Davis', email: 'eve@student.dev', passwordHash, role: 'student' },
    { name: 'Frank Miller', email: 'frank@student.dev', passwordHash, role: 'student' },
    { name: 'Grace Lee', email: 'grace@student.dev', passwordHash, role: 'student' },
    { name: 'Henry Wilson', email: 'henry@student.dev', passwordHash, role: 'student' },
  ]);

  console.log(`  Created 1 professor and ${students.length} students`);

  const assignment1 = await Assignment.create({
    title: 'Sorting Algorithm Implementation',
    description: 'Implement a sorting algorithm to sort an array of integers in ascending order. You must use the provided read_input() and print_result() functions.',
    professorId: professor._id,
    languageAllowed: 'python',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    similarityThreshold: 0.5,
    boilerplateSettings: {
      enabled: true,
      threshold: 0.7,
      starterCode: STARTER_CODE,
    },
  });

  const assignment2 = await Assignment.create({
    title: 'Search Algorithm',
    description: 'Implement a search algorithm that finds a target value in a sorted array and returns its index, or -1 if not found.',
    professorId: professor._id,
    languageAllowed: 'python',
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    similarityThreshold: 0.5,
    boilerplateSettings: { enabled: true, threshold: 0.7 },
  });

  console.log('  Created 2 assignments');

  console.log('\n  Processing submissions for Assignment 1...');
  const subs1 = [];
  for (let i = 0; i < SUBMISSIONS_ASSIGNMENT_1.length; i++) {
    const subData = SUBMISSIONS_ASSIGNMENT_1[i];
    const student = students[i % students.length];
    const sub = await Submission.create({
      assignmentId: assignment1._id,
      studentId: student._id,
      code: subData.code,
      language: 'python',
      fileName: `${subData.name.replace(/\s+/g, '_').toLowerCase()}.py`,
      version: 1,
      status: 'submitted',
    });

    const result = generateFingerprints(subData.code, 'python', {
      k: config.defaultK,
      windowSize: config.defaultWindowSize,
    });

    sub.tokens = result.tokenTypes;
    sub.fingerprints = result.fingerprints.map((fp) => ({
      hash: fp.hash,
      position: fp.position,
      startLine: fp.startLine,
      endLine: fp.endLine,
    }));
    sub.status = 'fingerprinted';
    await sub.save();

    for (const fp of result.fingerprints) {
      await InvertedIndex.findOneAndUpdate(
        { assignmentId: assignment1._id, hash: fp.hash },
        { $addToSet: { submissionIds: sub._id } },
        { upsert: true }
      );
    }

    console.log(`    [${i + 1}/${SUBMISSIONS_ASSIGNMENT_1.length}] ${subData.name}: ${result.fingerprints.length} fingerprints`);
    subs1.push(sub);
  }

  console.log('\n  Processing submissions for Assignment 2...');
  const subs2 = [];
  for (let i = 0; i < SUBMISSIONS_ASSIGNMENT_2.length; i++) {
    const subData = SUBMISSIONS_ASSIGNMENT_2[i];
    const student = students[i % students.length];
    const sub = await Submission.create({
      assignmentId: assignment2._id,
      studentId: student._id,
      code: subData.code,
      language: 'python',
      fileName: `${subData.name.replace(/\s+/g, '_').toLowerCase()}.py`,
      version: 1,
      status: 'submitted',
    });

    const result = generateFingerprints(subData.code, 'python', {
      k: config.defaultK,
      windowSize: config.defaultWindowSize,
    });

    sub.tokens = result.tokenTypes;
    sub.fingerprints = result.fingerprints.map((fp) => ({
      hash: fp.hash,
      position: fp.position,
      startLine: fp.startLine,
      endLine: fp.endLine,
    }));
    sub.status = 'fingerprinted';
    await sub.save();

    for (const fp of result.fingerprints) {
      await InvertedIndex.findOneAndUpdate(
        { assignmentId: assignment2._id, hash: fp.hash },
        { $addToSet: { submissionIds: sub._id } },
        { upsert: true }
      );
    }

    console.log(`    [${i + 1}/${SUBMISSIONS_ASSIGNMENT_2.length}] ${subData.name}: ${result.fingerprints.length} fingerprints`);
    subs2.push(sub);
  }

  console.log('\n  Running similarity analysis for Assignment 1...');
  await runAnalysis(assignment1, subs1);

  console.log('\n  Running similarity analysis for Assignment 2...');
  await runAnalysis(assignment2, subs2);

  console.log('\n✅ Seed complete!');
  console.log('\n📋 Login credentials:');
  console.log('  Professor: professor@codeguard.dev / password123');
  console.log('  Student:   alice@student.dev / password123');
  console.log('             bob@student.dev / password123');
  console.log('             (all students use password123)');

  await mongoose.disconnect();
  process.exit(0);
}

async function runAnalysis(assignment, submissions) {
  const subData = submissions.map((s) => ({
    id: s._id.toString(),
    fingerprints: s.fingerprints.map((fp) => fp.hash),
  }));

  const boilerplate = detectBoilerplate(
    subData,
    assignment.boilerplateSettings?.threshold || 0.7
  );

  console.log(`    Boilerplate hashes: ${boilerplate.boilerplateCount}/${boilerplate.totalHashes}`);

  for (const [hash, frequency] of boilerplate.hashFrequencies) {
    await BoilerplateFingerprint.findOneAndUpdate(
      { assignmentId: assignment._id, hash },
      {
        occurrenceCount: Math.round(frequency * submissions.length),
        totalSubmissions: submissions.length,
        frequency,
        isBoilerplate: boilerplate.boilerplateHashes.has(hash),
      },
      { upsert: true }
    );
  }

  const { pairs, naivePairCount, candidatePairCount } = findCandidatePairs(subData);
  console.log(`    Naive pairs: ${naivePairCount}, Candidates: ${candidatePairCount}`);

  const submissionMap = new Map(submissions.map((s) => [s._id.toString(), s]));

  for (const pair of pairs) {
    const subA = submissionMap.get(pair.submissionA);
    const subB = submissionMap.get(pair.submissionB);
    const fpA = subA.fingerprints.map((fp) => fp.hash);
    const fpB = subB.fingerprints.map((fp) => fp.hash);

    const adjusted = assignment.boilerplateSettings?.enabled
      ? calculateAdjustedSimilarity(fpA, fpB, boilerplate.boilerplateHashes)
      : (() => {
          const j = jaccardSimilarity(fpA, fpB);
          return {
            rawScore: j.score,
            adjustedScore: j.score,
            boilerplateOverlap: 0,
            nonBoilerplateMatches: j.intersection,
            boilerplateMatches: [],
          };
        })();

    const tokensA = tokenize(subA.code, 'python');
    const tokensB = tokenize(subB.code, 'python');

    const matchedRegions = mapMatchedRegions(
      adjusted.nonBoilerplateMatches,
      subA.fingerprints,
      subB.fingerprints,
      tokensA,
      tokensB,
      config.defaultK
    );

    const explanation = generateExplanation({
      rawScore: adjusted.rawScore,
      adjustedScore: adjusted.adjustedScore,
      boilerplateOverlap: adjusted.boilerplateOverlap,
      matchedRegions,
      nonBoilerplateMatches: adjusted.nonBoilerplateMatches,
      tokensA,
      tokensB,
      totalFingerprintsA: fpA.length,
      totalFingerprintsB: fpB.length,
    });

    const riskLevel = determineRiskLevel(adjusted.adjustedScore, assignment.similarityThreshold);

    await SimilarityResult.create({
      assignmentId: assignment._id,
      submissionA: subA._id,
      submissionB: subB._id,
      studentA: subA.studentId,
      studentB: subB.studentId,
      rawScore: adjusted.rawScore,
      adjustedScore: adjusted.adjustedScore,
      matchedHashes: adjusted.nonBoilerplateMatches,
      matchedRegions,
      boilerplateOverlap: adjusted.boilerplateOverlap,
      explanation,
      riskLevel,
    });
  }

  assignment.analysisStatus = 'completed';
  await assignment.save();

  const results = await SimilarityResult.find({ assignmentId: assignment._id }).sort({ adjustedScore: -1 });
  console.log(`    Results: ${results.length} pairs`);
  for (const r of results.slice(0, 5)) {
    const sA = submissionMap.get(r.submissionA.toString());
    const sB = submissionMap.get(r.submissionB.toString());
    console.log(`      ${sA?.fileName} ↔ ${sB?.fileName}: raw=${(r.rawScore * 100).toFixed(1)}% adj=${(r.adjustedScore * 100).toFixed(1)}% [${r.riskLevel.toUpperCase()}]`);
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
