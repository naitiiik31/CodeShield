import bcrypt from 'bcrypt';
import { generateFingerprints } from './fingerprint/index.js';
import { jaccardSimilarity } from './similarity/jaccard.js';
import { calculateAdjustedSimilarity } from './boilerplate/detector.js';
import { mapMatchedRegions } from './explanation/regionMapper.js';
import { generateExplanation, determineRiskLevel } from './explanation/generator.js';
import { tokenize } from './tokenizer/index.js';

const DEMO_PASSWORD_HASH = bcrypt.hashSync('password123', 10);

export const inMemoryUsers = [
  {
    _id: '65c100000000000000000001',
    name: 'Dr. Sarah Chen',
    email: 'professor@codeguard.dev',
    passwordHash: DEMO_PASSWORD_HASH,
    role: 'faculty',
    createdAt: new Date(),
    toJSON() {
      return { _id: this._id, name: this.name, email: this.email, role: this.role, createdAt: this.createdAt };
    },
  },
];

export const inMemoryEnrollments = [];

export const STARTER_CODE = `# Starter code provided by professor
def read_input():
    n = int(input())
    arr = []
    for i in range(n):
        arr.append(int(input()))
    return arr

def print_result(result):
    print(result)
`;

export const CODE_A = `${STARTER_CODE}
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
`;

export const CODE_B = `${STARTER_CODE}
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
`;

export const inMemoryAssignments = [
  {
    _id: '65c200000000000000000001',
    title: 'Sorting Algorithm Implementation',
    description: 'Implement a sorting algorithm to sort an array of integers in ascending order.',
    professorId: '65c100000000000000000001',
    assignmentCode: 'BST-7K42',
    targetGroup: { department: 'CSE', division: 'D3', batch: '2023' },
    languageAllowed: 'python',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    similarityThreshold: 0.5,
    boilerplateSettings: { enabled: true, threshold: 0.7, starterCode: STARTER_CODE },
    analysisStatus: 'completed',
    submissionCount: 2,
    createdAt: new Date(),
    toJSON() { return this; },
  },
];

export const inMemorySubmissions = [
  {
    _id: '65c300000000000000000001',
    assignmentId: { _id: '65c200000000000000000001', title: 'Sorting Algorithm Implementation', languageAllowed: 'python' },
    studentIdentifier: 'Average1',
    studentName: 'Average1',
    code: CODE_A,
    language: 'python',
    fileName: 'Average1.py',
    version: 1,
    status: 'fingerprinted',
    submittedAt: new Date(),
    toJSON() { return this; },
  },
  {
    _id: '65c300000000000000000002',
    assignmentId: { _id: '65c200000000000000000001', title: 'Sorting Algorithm Implementation', languageAllowed: 'python' },
    studentIdentifier: 'Average2',
    studentName: 'Average2',
    code: CODE_B,
    language: 'python',
    fileName: 'Average2.py',
    version: 1,
    status: 'fingerprinted',
    submittedAt: new Date(),
    toJSON() { return this; },
  },
];

const fpA = generateFingerprints(CODE_A, 'python');
const fpB = generateFingerprints(CODE_B, 'python');

const hashesA = fpA.fingerprints.map((f) => f.hash);
const hashesB = fpB.fingerprints.map((f) => f.hash);

const jaccard = jaccardSimilarity(hashesA, hashesB);
const adjusted = calculateAdjustedSimilarity(hashesA, hashesB, new Set());

const tokensA = tokenize(CODE_A, 'python');
const tokensB = tokenize(CODE_B, 'python');

const matchedRegions = mapMatchedRegions(adjusted.nonBoilerplateMatches, fpA.fingerprints, fpB.fingerprints, tokensA, tokensB, 5);
const explanation = generateExplanation({
  rawScore: adjusted.rawScore,
  adjustedScore: adjusted.adjustedScore,
  boilerplateOverlap: adjusted.boilerplateOverlap,
  matchedRegions,
  nonBoilerplateMatches: adjusted.nonBoilerplateMatches,
  tokensA,
  tokensB,
  totalFingerprintsA: hashesA.length,
  totalFingerprintsB: hashesB.length,
});

export const inMemoryResults = [
  {
    _id: '65c400000000000000000001',
    assignmentId: '65c200000000000000000001',
    submissionA: '65c300000000000000000001',
    submissionB: '65c300000000000000000002',
    studentA: 'Average1',
    studentB: 'Average2',
    rawScore: jaccard.score,
    adjustedScore: adjusted.adjustedScore,
    matchedHashes: adjusted.nonBoilerplateMatches,
    matchedRegions,
    boilerplateOverlap: adjusted.boilerplateOverlap,
    explanation,
    riskLevel: determineRiskLevel(adjusted.adjustedScore, 0.5),
    createdAt: new Date(),
    toJSON() { return this; },
  },
];
