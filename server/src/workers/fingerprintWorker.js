import { Worker } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { Submission } from '../models/Submission.js';
import { InvertedIndex } from '../models/InvertedIndex.js';
import { generateFingerprints } from '../services/fingerprint/index.js';
import { config } from '../config/index.js';

export async function processSubmissionFingerprint(submissionId) {
  const submission = await Submission.findById(submissionId);
  if (!submission) {
    throw new Error(`Submission not found: ${submissionId}`);
  }

  submission.status = 'processing';
  await submission.save();

  try {
    const result = generateFingerprints(submission.code, submission.language, {
      k: config.defaultK,
      windowSize: config.defaultWindowSize,
    });

    submission.tokens = result.tokenTypes;
    submission.fingerprints = result.fingerprints.map((fp) => ({
      hash: fp.hash,
      position: fp.position,
      startLine: fp.startLine,
      endLine: fp.endLine,
    }));
    submission.status = 'fingerprinted';
    await submission.save();

    for (const fp of result.fingerprints) {
      await InvertedIndex.findOneAndUpdate(
        {
          assignmentId: submission.assignmentId,
          hash: fp.hash,
        },
        {
          $addToSet: { submissionIds: submission._id },
        },
        { upsert: true }
      );
    }

    console.log(
      `[Fingerprinted] submission ${submissionId} (${submission.studentIdentifier}): ${result.fingerprints.length} fingerprints, ${result.tokenTypes.length} tokens`
    );

    return {
      submissionId,
      fingerprintCount: result.fingerprints.length,
      tokenCount: result.tokenTypes.length,
    };
  } catch (error) {
    submission.status = 'failed';
    submission.processingError = error.message;
    await submission.save();
    throw error;
  }
}

export function createFingerprintWorker() {
  const worker = new Worker(
    'fingerprint-queue',
    async (job) => {
      const { submissionId } = job.data;
      console.log(`Processing fingerprint job for submission: ${submissionId}`);
      return await processSubmissionFingerprint(submissionId);
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log(`Fingerprint job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Fingerprint job ${job?.id} failed:`, err.message);
  });

  return worker;
}
