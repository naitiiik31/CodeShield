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
import { findCandidatePairs } from '../services/similarity/candidateGenerator.js';
import { tokenize } from '../services/tokenizer/index.js';
import { determineRiskLevel } from '../services/explanation/generator.js';
import { computeCodeDiff } from '../services/diff/diffEngine.js';
import { detectClusters } from '../services/similarity/clusterDetector.js';
import { inMemoryResults, inMemorySubmissions } from '../services/inMemoryStore.js';

export function processInMemoryAnalysis(assignmentId) {
  const subs = inMemorySubmissions.filter(
    (s) =>
      s.assignmentId?._id?.toString() === assignmentId ||
      s.assignmentId?.toString() === assignmentId ||
      s.assignmentId === assignmentId
  );

  const latestMap = new Map();
  subs.sort((a, b) => (b.version || 1) - (a.version || 1));
  for (const s of subs) {
    const key = s.studentIdentifier || s.studentUserId;
    if (!latestMap.has(key)) {
      latestMap.set(key, s);
    }
  }

  const latestSubmissions = Array.from(latestMap.values());
  if (latestSubmissions.length < 2) return;

  for (const s of latestSubmissions) {
    if (!s.fingerprints || s.fingerprints.length === 0) {
      const res = generateFingerprints(s.code || '', s.language || 'python');
      s.fingerprints = res.fingerprints.map((fp) => ({
        hash: fp.hash,
        position: fp.position,
        startLine: fp.startLine,
        endLine: fp.endLine,
      }));
      s.tokens = res.tokenTypes;
      s.status = 'fingerprinted';
    }
  }

  for (let i = inMemoryResults.length - 1; i >= 0; i--) {
    if (inMemoryResults[i].assignmentId?.toString() === assignmentId) {
      inMemoryResults.splice(i, 1);
    }
  }

  const subData = latestSubmissions.map((s) => ({ id: s._id.toString(), fingerprints: (s.fingerprints || []).map((f) => f.hash) }));
  const candidateResult = findCandidatePairs(subData);
  const pairs = candidateResult.pairs || [];
  const subMap = new Map(latestSubmissions.map((s) => [s._id.toString(), s]));

  for (const p of pairs) {
    const sA = subMap.get(p.submissionA);
    const sB = subMap.get(p.submissionB);
    if (!sA || !sB) continue;

    const fpA = (sA.fingerprints || []).map((f) => f.hash);
    const fpB = (sB.fingerprints || []).map((f) => f.hash);

    const jaccard = jaccardSimilarity(fpA, fpB);
    const riskLevel = determineRiskLevel(jaccard.score, 0.5);

    const tokensA = tokenize(sA.code || '', sA.language || 'python');
    const tokensB = tokenize(sB.code || '', sB.language || 'python');

    const matchedRegions = mapMatchedRegions(jaccard.intersection, sA.fingerprints || [], sB.fingerprints || [], tokensA, tokensB, 5);
    const explanation = generateExplanation({
      rawScore: jaccard.score,
      adjustedScore: jaccard.score,
      boilerplateOverlap: 0,
      matchedRegions,
      nonBoilerplateMatches: jaccard.intersection,
      tokensA,
      tokensB,
      totalFingerprintsA: fpA.length,
      totalFingerprintsB: fpB.length,
    });

    inMemoryResults.push({
      _id: '65r' + Date.now().toString(16).padStart(21, '0'),
      assignmentId,
      submissionA: sA._id,
      submissionB: sB._id,
      studentIdentifierA: sA.studentIdentifier,
      studentNameA: sA.studentName || sA.studentIdentifier,
      studentIdentifierB: sB.studentIdentifier,
      studentNameB: sB.studentName || sB.studentIdentifier,
      rawScore: jaccard.score,
      adjustedScore: jaccard.score,
      matchedHashes: jaccard.intersection,
      matchedRegions,
      boilerplateOverlap: 0,
      explanation,
      riskLevel,
      createdAt: new Date(),
    });
  }
}

export async function triggerAnalysis(req, res) {
  try {
    const { id } = req.params;

    if (req.user?.role === 'student') {
      res.status(403).json({ error: 'Access denied: Students are not permitted to run analysis' });
      return;
    }

    if (mongoose.connection.readyState === 1) {
      const assignment = await Assignment.findById(id);
      if (!assignment) {
        res.status(404).json({ error: 'Assignment not found' });
        return;
      }

      if (assignment.professorId && req.user._id && assignment.professorId.toString() !== req.user._id.toString()) {
        res.status(403).json({ error: 'Access denied: You do not own this assignment' });
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

    // In-memory fallback mode
    processInMemoryAnalysis(id);
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
        analysisStats: assignment?.analysisStats || null,
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
    if (req.user?.role === 'student') {
      res.status(403).json({ error: 'Access denied: Students are not permitted to view similarity results' });
      return;
    }

    let rawResults = [];
    let totalSubmissionsCount = 0;

    if (mongoose.connection.readyState === 1) {
      const assignment = await Assignment.findById(req.params.id);
      if (!assignment) {
        res.status(404).json({ error: 'Assignment not found' });
        return;
      }

      if (assignment.professorId && req.user._id && assignment.professorId.toString() !== req.user._id.toString()) {
        res.status(403).json({ error: 'Access denied: You do not own this assignment' });
        return;
      }

      rawResults = await SimilarityResult.find({ assignmentId: req.params.id })
        .sort({ rawScore: -1, adjustedScore: -1 });
      const uniqueStudents = await Submission.distinct('studentIdentifier', { assignmentId: req.params.id });
      totalSubmissionsCount = uniqueStudents.length;
    } else {
      const subs = inMemorySubmissions.filter(
        (s) =>
          s.assignmentId?._id?.toString() === req.params.id ||
          s.assignmentId?.toString() === req.params.id ||
          s.assignmentId === req.params.id
      );
      const uniqueStudents = new Set(subs.map((s) => s.studentIdentifier || s.studentUserId));
      totalSubmissionsCount = uniqueStudents.size;
      rawResults = inMemoryResults
        .filter(
          (r) =>
            r.assignmentId?._id?.toString() === req.params.id ||
            r.assignmentId?.toString() === req.params.id ||
            r.assignmentId === req.params.id
        )
        .sort((a, b) => (b.rawScore || 0) - (a.rawScore || 0));
    }

    const scores = rawResults.map((r) => r.rawScore || 0);
    const avgSimilarity = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highRiskCount = rawResults.filter((r) => (r.rawScore || 0) >= 0.7).length;
    const mediumRiskCount = rawResults.filter((r) => (r.rawScore || 0) >= 0.4 && (r.rawScore || 0) < 0.7).length;

    const distribution = {
      '0-20': scores.filter((s) => s < 0.2).length,
      '20-40': scores.filter((s) => s >= 0.2 && s < 0.4).length,
      '40-60': scores.filter((s) => s >= 0.4 && s < 0.6).length,
      '60-80': scores.filter((s) => s >= 0.6 && s < 0.8).length,
      '80-100': scores.filter((s) => s >= 0.8).length,
    };

    let currentRank = 1;
    const formattedResults = rawResults.map((r, index) => {
      const obj = typeof r.toJSON === 'function' ? r.toJSON() : r;
      if (index > 0) {
        const prev = rawResults[index - 1];
        const prevScore = Math.round((prev.rawScore || 0) * 1000);
        const currScore = Math.round((obj.rawScore || 0) * 1000);
        if (currScore < prevScore) {
          currentRank = index + 1;
        }
      }
      return {
        ...obj,
        rank: currentRank,
        studentA: { name: obj.studentNameA || obj.studentIdentifierA, email: obj.studentIdentifierA },
        studentB: { name: obj.studentNameB || obj.studentIdentifierB, email: obj.studentIdentifierB },
      };
    });

    res.json({
      results: formattedResults,
      analytics: {
        totalSubmissions: totalSubmissionsCount,
        totalPairs: rawResults.length,
        averageSimilarity: avgSimilarity,
        highRiskPairs: highRiskCount,
        mediumRiskPairs: mediumRiskCount,
        distribution,
        threshold: 0.5,
      },
    });
  } catch (error) {
    console.error('Fetch results error:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
}

export async function getResultDetail(req, res) {
  try {
    if (req.user?.role === 'student') {
      res.status(403).json({ error: 'Access denied: Students are not permitted to view detailed comparison reports' });
      return;
    }

    if (mongoose.connection.readyState === 1) {
      const result = await SimilarityResult.findById(req.params.id);

      if (result) {
        const assignment = await Assignment.findById(result.assignmentId);
        if (assignment && assignment.professorId && req.user._id && assignment.professorId.toString() !== req.user._id.toString()) {
          res.status(403).json({ error: 'Access denied: You do not own this assignment' });
          return;
        }
        const submissionA = await Submission.findById(result.submissionA);
        const submissionB = await Submission.findById(result.submissionB);
        const codeA = submissionA?.code || '';
        const codeB = submissionB?.code || '';
        const language = submissionA?.language || assignment?.languageAllowed || 'python';

        let diffData = null;
        if (codeA && codeB) {
          diffData = computeCodeDiff(codeA, codeB, language);
        }

        res.json({
          ...result.toJSON(),
          studentA: { name: result.studentNameA || result.studentIdentifierA, email: result.studentIdentifierA },
          studentB: { name: result.studentNameB || result.studentIdentifierB, email: result.studentIdentifierB },
          codeA,
          codeB,
          fileNameA: submissionA?.fileName || 'submission_a',
          fileNameB: submissionB?.fileName || 'submission_b',
          language,
          diff: diffData,
        });
        return;
      }
    }

    const result = inMemoryResults.find((r) => r._id.toString() === req.params.id) || inMemoryResults[0];
    const subA = inMemorySubmissions.find((s) => s._id.toString() === result.submissionA) || inMemorySubmissions[0];
    const subB = inMemorySubmissions.find((s) => s._id.toString() === result.submissionB) || inMemorySubmissions[1];

    const codeA = subA?.code || '';
    const codeB = subB?.code || '';
    const language = subA?.language || 'python';
    let diffData = null;
    if (codeA && codeB) {
      diffData = computeCodeDiff(codeA, codeB, language);
    }

    res.json({
      ...result,
      codeA,
      codeB,
      fileNameA: subA?.fileName || 'submission_a',
      fileNameB: subB?.fileName || 'submission_b',
      language,
      diff: diffData,
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

export async function getAssignmentClusters(req, res) {
  try {
    const { id } = req.params;

    if (req.user?.role === 'student') {
      res.status(403).json({ error: 'Access denied: Students are not permitted to view plagiarism clusters' });
      return;
    }

    let rawResults = [];
    const submissionsById = new Map();
    let threshold = 0.5;

    if (mongoose.connection.readyState === 1) {
      const assignment = await Assignment.findById(id);
      if (!assignment) {
        res.status(404).json({ error: 'Assignment not found' });
        return;
      }

      if (assignment.professorId && req.user._id && assignment.professorId.toString() !== req.user._id.toString()) {
        res.status(403).json({ error: 'Access denied: You do not own this assignment' });
        return;
      }

      threshold = assignment.similarityThreshold || 0.5;
      rawResults = await SimilarityResult.find({ assignmentId: id }).sort({ rawScore: -1, adjustedScore: -1 });

      const submissions = await Submission.find({ assignmentId: id });
      for (const sub of submissions) {
        submissionsById.set(sub._id.toString(), {
          id: sub._id.toString(),
          studentIdentifier: sub.studentIdentifier,
          studentName: sub.studentName || sub.studentIdentifier,
          submittedAt: sub.submittedAt || sub.createdAt,
        });
      }
    } else {
      rawResults = inMemoryResults.filter(
        (r) =>
          r.assignmentId?._id?.toString() === id ||
          r.assignmentId?.toString() === id ||
          r.assignmentId === id
      );

      const subs = inMemorySubmissions.filter(
        (s) =>
          s.assignmentId?._id?.toString() === id ||
          s.assignmentId?.toString() === id ||
          s.assignmentId === id
      );

      for (const sub of subs) {
        submissionsById.set(sub._id.toString(), {
          id: sub._id.toString(),
          studentIdentifier: sub.studentIdentifier || sub.studentUserId,
          studentName: sub.studentName || sub.studentIdentifier || sub.studentUserId,
          submittedAt: sub.submittedAt || sub.createdAt,
        });
      }
    }

    const clusters = detectClusters(rawResults, submissionsById, threshold);

    res.json({ clusters });
  } catch (error) {
    console.error('Fetch assignment clusters error:', error);
    res.status(500).json({ error: 'Failed to fetch assignment clusters' });
  }
}

