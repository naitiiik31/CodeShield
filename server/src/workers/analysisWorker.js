import { Worker } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { Assignment } from '../models/Assignment.js';
import { Submission } from '../models/Submission.js';
import { SimilarityResult } from '../models/SimilarityResult.js';
import { BoilerplateFingerprint } from '../models/BoilerplateFingerprint.js';
import { findCandidatePairs, generateAllUniquePairs } from '../services/similarity/candidateGenerator.js';
import { jaccardSimilarity } from '../services/similarity/jaccard.js';
import {
  detectBoilerplate,
  calculateAdjustedSimilarity,
} from '../services/boilerplate/detector.js';
import { generateFingerprints } from '../services/fingerprint/index.js';
import { mapMatchedRegions } from '../services/explanation/regionMapper.js';
import {
  generateExplanation,
  determineRiskLevel,
} from '../services/explanation/generator.js';
import { tokenize } from '../services/tokenizer/index.js';
import { createAIProvider } from '../services/ai/index.js';

export async function processAssignmentAnalysis(assignmentId, updateProgress = () => {}) {
  console.log(`Processing analysis job for assignment: ${assignmentId}`);

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new Error(`Assignment not found: ${assignmentId}`);
  }

  assignment.analysisStatus = 'processing';
  await assignment.save();

  try {
    let allSubmissions = await Submission.find({
      assignmentId,
    }).sort({ version: -1, submittedAt: -1 });

    // Auto-fingerprint any pending/un-fingerprinted submissions before analysis
    for (const sub of allSubmissions) {
      if (sub.status !== 'fingerprinted' || !sub.fingerprints || sub.fingerprints.length === 0) {
        console.log(`[Analysis] Auto-fingerprinting pending submission ${sub._id} (${sub.studentIdentifier})...`);
        try {
          await processSubmissionFingerprint(sub._id.toString());
        } catch (fpErr) {
          console.error(`[Analysis] Auto-fingerprint error for ${sub._id}:`, fpErr);
        }
      }
    }

    // Re-fetch fingerprinted submissions
    allSubmissions = await Submission.find({
      assignmentId,
      status: 'fingerprinted',
    }).sort({ version: -1, submittedAt: -1 });

    const latestMap = new Map();
    for (const sub of allSubmissions) {
      if (!latestMap.has(sub.studentIdentifier)) {
        latestMap.set(sub.studentIdentifier, sub);
      }
    }

    const submissions = Array.from(latestMap.values());

    if (submissions.length < 2) {
      assignment.analysisStatus = 'completed';
      await assignment.save();
      return { message: 'Not enough submissions to compare' };
    }

    const subData = submissions.map((s) => ({
      id: s._id.toString(),
      fingerprints: s.fingerprints.map((fp) => fp.hash),
    }));

    let starterCodeHashes = null;
    if (assignment.boilerplateSettings?.starterCode) {
      const starterRes = generateFingerprints(
        assignment.boilerplateSettings.starterCode,
        assignment.languageAllowed || 'python'
      );
      starterCodeHashes = new Set(starterRes.fingerprints.map((fp) => fp.hash));
    }

    const boilerplate = detectBoilerplate(
      subData,
      assignment.boilerplateSettings?.threshold || 0.7,
      starterCodeHashes
    );

    for (const [hash, frequency] of boilerplate.hashFrequencies) {
      await BoilerplateFingerprint.findOneAndUpdate(
        { assignmentId, hash },
        {
          occurrenceCount: Math.round(frequency * submissions.length),
          totalSubmissions: submissions.length,
          frequency,
          isBoilerplate: boilerplate.boilerplateHashes.has(hash),
        },
        { upsert: true }
      );
    }

    const pairs = generateAllUniquePairs(subData);
    const naivePairCount = pairs.length;
    const candidatePairCount = pairs.length;

    console.log(
      `  Naive pairs: ${naivePairCount}, Unique pairs to analyze: ${candidatePairCount}`
    );

    await SimilarityResult.deleteMany({ assignmentId });

    const aiProvider = createAIProvider();
    const submissionMap = new Map(submissions.map((s) => [s._id.toString(), s]));

    let processedCount = 0;
    for (const pair of pairs) {
      const subA = submissionMap.get(pair.submissionA);
      const subB = submissionMap.get(pair.submissionB);
      if (!subA || !subB) continue;

      const fpA = subA.fingerprints.map((fp) => fp.hash);
      const fpB = subB.fingerprints.map((fp) => fp.hash);

      const jaccard = jaccardSimilarity(fpA, fpB);

      const adjusted = assignment.boilerplateSettings?.enabled
        ? calculateAdjustedSimilarity(fpA, fpB, boilerplate.boilerplateHashes)
        : {
            rawScore: jaccard.score,
            adjustedScore: jaccard.score,
            boilerplateOverlap: 0,
            nonBoilerplateMatches: jaccard.intersection,
            boilerplateMatches: [],
          };

      const tokensA = tokenize(subA.code, subA.language);
      const tokensB = tokenize(subB.code, subB.language);

      const matchedRegions = mapMatchedRegions(
        adjusted.nonBoilerplateMatches,
        subA.fingerprints,
        subB.fingerprints,
        tokensA,
        tokensB,
        5
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

      const riskLevel = determineRiskLevel(
        adjusted.rawScore,
        assignment.similarityThreshold
      );

      let semanticScore;
      let aiExplanation;

      if (
        aiProvider.isAvailable() &&
        adjusted.adjustedScore >= assignment.similarityThreshold * 0.7
      ) {
        const aiResult = await aiProvider.analyzeSemanticSimilarity(
          subA.code,
          subB.code,
          {
            rawScore: adjusted.rawScore,
            adjustedScore: adjusted.adjustedScore,
            matchedRegions: matchedRegions.length,
          }
        );
        if (aiResult.semanticScore >= 0) {
          semanticScore = aiResult.semanticScore;
          aiExplanation = aiResult.explanation;
        }
      }

      await SimilarityResult.create({
        assignmentId,
        submissionA: subA._id,
        submissionB: subB._id,
        studentIdentifierA: subA.studentIdentifier,
        studentNameA: subA.studentName || subA.studentIdentifier,
        studentIdentifierB: subB.studentIdentifier,
        studentNameB: subB.studentName || subB.studentIdentifier,
        rawScore: adjusted.rawScore,
        adjustedScore: adjusted.adjustedScore,
        matchedHashes: adjusted.nonBoilerplateMatches,
        matchedRegions,
        boilerplateOverlap: adjusted.boilerplateOverlap,
        explanation,
        semanticScore,
        aiExplanation,
        riskLevel,
      });

      processedCount++;
      await updateProgress(
        Math.round((processedCount / pairs.length) * 100)
      );
    }

    assignment.analysisStatus = 'completed';
    await assignment.save();

    console.log(
      `Analysis complete for assignment ${assignmentId}: ${processedCount} pairs analyzed`
    );

    return {
      assignmentId,
      pairsAnalyzed: processedCount,
      naivePairCount,
      candidatePairCount,
    };
  } catch (error) {
    assignment.analysisStatus = 'failed';
    assignment.analysisError = error.message;
    await assignment.save();
    throw error;
  }
}

export function createAnalysisWorker() {
  const worker = new Worker(
    'analysis-queue',
    async (job) => {
      const { assignmentId } = job.data;
      return await processAssignmentAnalysis(assignmentId, (progress) => job.updateProgress(progress));
    },
    {
      connection: getRedisConnection(),
      concurrency: 2,
    }
  );

  worker.on('completed', (job) => {
    console.log(`Analysis job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Analysis job ${job?.id} failed:`, err.message);
  });

  return worker;
}
