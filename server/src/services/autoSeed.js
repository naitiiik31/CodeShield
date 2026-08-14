import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { Assignment } from '../models/Assignment.js';
import { Submission } from '../models/Submission.js';
import { SimilarityResult } from '../models/SimilarityResult.js';
import { InvertedIndex } from '../models/InvertedIndex.js';
import { generateFingerprints } from './fingerprint/index.js';
import { findCandidatePairs } from './similarity/candidateGenerator.js';
import { detectBoilerplate, calculateAdjustedSimilarity } from './boilerplate/detector.js';
import { mapMatchedRegions } from './explanation/regionMapper.js';
import { generateExplanation, determineRiskLevel } from './explanation/generator.js';
import { tokenize } from './tokenizer/index.js';
import { config } from '../config/index.js';

const STARTER_CODE = `# Starter template provided by professor
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
    studentIdentifier: 'Average1',
    studentName: 'Average1',
    fileName: 'Average1.py',
    code: `${STARTER_CODE}
def calculateAverage(arr):
    total = 0
    for i in range(len(arr)):
        total += arr[i]
    return total / len(arr)

data = read_input()
result = calculateAverage(data)
print_result(result)
`,
  },
  {
    studentIdentifier: 'Average2',
    studentName: 'Average2',
    fileName: 'Average2.py',
    code: `${STARTER_CODE}
def calculateAverage(numbers):
    sum = 0
    idx = 0
    for idx in range(len(numbers)):
        sum += numbers[idx]
    return sum / len(numbers)

values = read_input()
output = calculateAverage(values)
print_result(output)
`,
  },
  {
    studentIdentifier: 'Average3',
    studentName: 'Average3',
    fileName: 'Average3.py',
    code: `${STARTER_CODE}
def find_median_value(items):
    sorted_items = sorted(items)
    n = len(sorted_items)
    if n % 2 == 1:
        return sorted_items[n // 2]
    else:
        return (sorted_items[n // 2 - 1] + sorted_items[n // 2]) / 2

items = read_input()
answer = find_median_value(items)
print_result(answer)
`,
  },
  {
    studentIdentifier: 'Average4',
    studentName: 'Average4',
    fileName: 'Average4.py',
    code: `${STARTER_CODE}
def compute_standard_deviation(vals):
    if not vals:
        return 0
    avg = sum(vals) / len(vals)
    variance = sum((x - avg) ** 2 for x in vals) / len(vals)
    return variance ** 0.5

data = read_input()
res = compute_standard_deviation(data)
print_result(res)
`,
  },
];

export async function ensureDemoDataSeeded() {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('✅ Database already populated with Faculty accounts.');
      return;
    }

    console.log('🌱 Database is empty. Auto-seeding Faculty demo data...');

    const passwordHash = await bcrypt.hash('password123', 10);

    const faculty = await User.create({
      name: 'Dr. Sarah Chen',
      email: 'professor@codeguard.dev',
      passwordHash,
      role: 'faculty',
    });

    const assignment1 = await Assignment.create({
      title: 'CS101: Average & Array Computation',
      description: 'Implement average calculation in Python. Standard I/O functions provided in starter code.',
      professorId: faculty._id,
      languageAllowed: 'python',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      similarityThreshold: 0.5,
      boilerplateSettings: {
        enabled: true,
        threshold: 0.8,
        starterCode: STARTER_CODE,
      },
    });

    const subs1 = [];
    for (let i = 0; i < SUBMISSIONS_ASSIGNMENT_1.length; i++) {
      const subData = SUBMISSIONS_ASSIGNMENT_1[i];
      const sub = await Submission.create({
        assignmentId: assignment1._id,
        studentIdentifier: subData.studentIdentifier,
        studentName: subData.studentName,
        code: subData.code,
        language: 'python',
        fileName: subData.fileName,
        version: 1,
        status: 'queued',
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

      subs1.push(sub);
    }

    const subData = subs1.map((s) => ({
      id: s._id.toString(),
      fingerprints: s.fingerprints.map((fp) => fp.hash),
    }));

    const starterRes = generateFingerprints(STARTER_CODE, 'python');
    const starterCodeHashes = new Set(starterRes.fingerprints.map((fp) => fp.hash));
    const boilerplate = detectBoilerplate(subData, 0.8, starterCodeHashes);

    const { pairs } = findCandidatePairs(subData);
    const submissionMap = new Map(subs1.map((s) => [s._id.toString(), s]));

    for (const pair of pairs) {
      const subA = submissionMap.get(pair.submissionA);
      const subB = submissionMap.get(pair.submissionB);
      const fpA = subA.fingerprints.map((fp) => fp.hash);
      const fpB = subB.fingerprints.map((fp) => fp.hash);

      const adjusted = calculateAdjustedSimilarity(fpA, fpB, boilerplate.boilerplateHashes);
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

      const riskLevel = determineRiskLevel(adjusted.adjustedScore, 0.5);

      await SimilarityResult.create({
        assignmentId: assignment1._id,
        submissionA: subA._id,
        submissionB: subB._id,
        studentIdentifierA: subA.studentIdentifier,
        studentNameA: subA.studentName,
        studentIdentifierB: subB.studentIdentifier,
        studentNameB: subB.studentName,
        rawScore: adjusted.rawScore,
        adjustedScore: adjusted.adjustedScore,
        matchedHashes: adjusted.nonBoilerplateMatches,
        matchedRegions,
        boilerplateOverlap: adjusted.boilerplateOverlap,
        explanation,
        riskLevel,
      });
    }

    assignment1.analysisStatus = 'completed';
    assignment1.submissionCount = subs1.length;
    await assignment1.save();

    console.log('🎉 Demo Faculty data auto-seeded successfully!');
    console.log('   Faculty: professor@codeguard.dev / password123');
  } catch (err) {
    console.error('⚠️ Auto-seeding failed:', err);
  }
}
