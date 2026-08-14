import mongoose from 'mongoose';
import { Assignment } from '../models/Assignment.js';
import { Submission } from '../models/Submission.js';
import { SimilarityResult } from '../models/SimilarityResult.js';
import { generateFingerprints } from '../services/fingerprint/index.js';
import { jaccardSimilarity } from '../services/similarity/jaccard.js';
import { mapMatchedRegions } from '../services/explanation/regionMapper.js';
import { generateExplanation } from '../services/explanation/generator.js';
import { getAnalysisQueue } from '../queues/index.js';
import { processAssignmentAnalysis } from '../workers/analysisWorker.js';
import { inMemoryResults, inMemorySubmissions } from '../services/inMemoryStore.js';

export async function triggerAnalysis(req, res) {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const assignment = await Assignment.findById(id);
      if (!assignment) {
        res.status(404).json({ error: 'Assignment not found' });
        return;
      }

      assignment.analysisStatus = 'queued';
      await assignment.save();

      let queued = false;
      const queue = getAnalysisQueue();
      try {
        if (queue) {
          await queue.add('analysis-job', { assignmentId: id });
          queued = true;
        }
      } catch (queueErr) {
        console.warn('BullMQ Redis offline for analysis, using async setImmediate fallback...');
      }

      if (!queued) {
        setImmediate(() => {
          processAssignmentAnalysis(id).catch((err) => {
            console.error(`Async analysis error for assignment ${id}:`, err);
          });
        });
      }

      res.json({ message: 'Analysis queued successfully', status: 'queued' });
      return;
    }

    res.json({ message: 'Analysis completed', status: 'completed' });
  } catch (error) {
    console.error('Trigger analysis error:', error);
    res.status(500).json({ error: 'Failed to trigger analysis' });
  }
}

export async function getAnalysisStatus(req, res) {
  try {
    const { id } = req.params;
    if (mongoose.connection.readyState === 1) {
      const assignment = await Assignment.findById(id);
      const totalSubmissions = await Submission.countDocuments({ assignmentId: id });
      const fingerprintedSubmissions = await Submission.countDocuments({ assignmentId: id, status: 'fingerprinted' });
      const resultCount = await SimilarityResult.countDocuments({ assignmentId: id });

      res.json({
        status: assignment?.analysisStatus || 'idle',
        error: assignment?.analysisError || null,
        totalSubmissions,
        fingerprintedSubmissions,
        resultCount,
      });
      return;
    }

    res.json({
      status: 'completed',
      error: null,
      totalSubmissions: inMemorySubmissions.length,
      fingerprintedSubmissions: inMemorySubmissions.length,
      resultCount: inMemoryResults.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
}

export async function getResults(req, res) {
  try {
    if (mongoose.connection.readyState === 1) {
      const results = await SimilarityResult.find({ assignmentId: req.params.id })
        .sort({ adjustedScore: -1 });

      if (results.length > 0) {
        const scores = results.map((r) => r.adjustedScore);
        const avgSimilarity = scores.reduce((a, b) => a + b, 0) / scores.length;
        const highRiskCount = results.filter((r) => r.riskLevel === 'high').length;
        const mediumRiskCount = results.filter((r) => r.riskLevel === 'medium').length;

        const distribution = {
          '0-20': scores.filter((s) => s < 0.2).length,
          '20-40': scores.filter((s) => s >= 0.2 && s < 0.4).length,
          '40-60': scores.filter((s) => s >= 0.4 && s < 0.6).length,
          '60-80': scores.filter((s) => s >= 0.6 && s < 0.8).length,
          '80-100': scores.filter((s) => s >= 0.8).length,
        };

        const formattedResults = results.map((r) => ({
          ...r.toJSON(),
          studentA: { name: r.studentNameA || r.studentIdentifierA, email: r.studentIdentifierA },
          studentB: { name: r.studentNameB || r.studentIdentifierB, email: r.studentIdentifierB },
        }));

        res.json({
          results: formattedResults,
          analytics: {
            totalSubmissions: results.length,
            totalPairs: results.length,
            averageSimilarity: avgSimilarity,
            highRiskPairs: highRiskCount,
            mediumRiskPairs: mediumRiskCount,
            distribution,
            threshold: 0.5,
          },
        });
        return;
      }
    }

    const scores = inMemoryResults.map((r) => r.adjustedScore);
    const avgSimilarity = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highRiskCount = inMemoryResults.filter((r) => r.riskLevel === 'high').length;
    const mediumRiskCount = inMemoryResults.filter((r) => r.riskLevel === 'medium').length;

    res.json({
      results: inMemoryResults,
      analytics: {
        totalSubmissions: inMemorySubmissions.length,
        totalPairs: inMemoryResults.length,
        averageSimilarity: avgSimilarity,
        highRiskPairs: highRiskCount,
        mediumRiskPairs: mediumRiskCount,
        distribution: { '0-20': 0, '20-40': 0, '40-60': 0, '60-80': 0, '80-100': inMemoryResults.length },
        threshold: 0.5,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch results' });
  }
}

export async function getResultDetail(req, res) {
  try {
    if (mongoose.connection.readyState === 1) {
      const result = await SimilarityResult.findById(req.params.id);

      if (result) {
        const submissionA = await Submission.findById(result.submissionA);
        const submissionB = await Submission.findById(result.submissionB);
        res.json({
          ...result.toJSON(),
          studentA: { name: result.studentNameA || result.studentIdentifierA, email: result.studentIdentifierA },
          studentB: { name: result.studentNameB || result.studentIdentifierB, email: result.studentIdentifierB },
          codeA: submissionA?.code || '',
          codeB: submissionB?.code || '',
          fileNameA: submissionA?.fileName || 'submission_a',
          fileNameB: submissionB?.fileName || 'submission_b',
          language: submissionA?.language || 'python',
        });
        return;
      }
    }

    const result = inMemoryResults.find((r) => r._id.toString() === req.params.id) || inMemoryResults[0];
    const subA = inMemorySubmissions.find((s) => s._id.toString() === result.submissionA) || inMemorySubmissions[0];
    const subB = inMemorySubmissions.find((s) => s._id.toString() === result.submissionB) || inMemorySubmissions[1];

    res.json({
      ...result,
      codeA: subA.code,
      codeB: subB.code,
      fileNameA: subA.fileName,
      fileNameB: subB.fileName,
      language: subA.language,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch result detail' });
  }
}

export async function algorithmDemo(req, res) {
  try {
    const { codeA, codeB, language = 'auto', k = 5, windowSize = 4 } = req.body;
    if (!codeA || !codeB) {
      res.status(400).json({ error: 'Both codeA and codeB are required' });
      return;
    }

    const resultA = generateFingerprints(codeA, language, { k, windowSize });
    const resultB = generateFingerprints(codeB, language, { k, windowSize });

    const fpHashesA = resultA.fingerprints.map((fp) => fp.hash);
    const fpHashesB = resultB.fingerprints.map((fp) => fp.hash);

    const jaccard = jaccardSimilarity(fpHashesA, fpHashesB);
    const matchedRegions = mapMatchedRegions(jaccard.intersection, resultA.fingerprints, resultB.fingerprints, resultA.tokens, resultB.tokens, k);
    const explanation = generateExplanation({
      rawScore: jaccard.score,
      adjustedScore: jaccard.score,
      boilerplateOverlap: 0,
      matchedRegions,
      nonBoilerplateMatches: jaccard.intersection,
      tokensA: resultA.tokens,
      tokensB: resultB.tokens,
      totalFingerprintsA: fpHashesA.length,
      totalFingerprintsB: fpHashesB.length,
    });

    res.json({
      submissionA: {
        tokens: resultA.tokens.map((t) => ({ type: t.type, original: t.original, line: t.line })),
        tokenTypes: resultA.tokenTypes,
        kgramCount: resultA.kgramCount,
        fingerprints: resultA.fingerprints,
        fingerprintCount: resultA.fingerprints.length,
      },
      submissionB: {
        tokens: resultB.tokens.map((t) => ({ type: t.type, original: t.original, line: t.line })),
        tokenTypes: resultB.tokenTypes,
        kgramCount: resultB.kgramCount,
        fingerprints: resultB.fingerprints,
        fingerprintCount: resultB.fingerprints.length,
      },
      similarity: {
        rawScore: jaccard.score,
        matchedCount: jaccard.matchedCount,
        sizeA: jaccard.sizeA,
        sizeB: jaccard.sizeB,
        intersection: jaccard.intersection,
      },
      matchedRegions,
      explanation,
      parameters: { k, windowSize, language },
    });
  } catch (error) {
    res.status(500).json({ error: 'Algorithm demo failed: ' + error.message });
  }
}
