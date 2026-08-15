import { connectDatabase } from '../config/database.js';
import { createFingerprintWorker } from './fingerprintWorker.js';
import { createAnalysisWorker } from './analysisWorker.js';

async function startWorkers() {
  console.log('Starting CodeGuard workers...');

  await connectDatabase();

  const fpWorker = createFingerprintWorker();
  const analysisWorker = createAnalysisWorker();

  console.log('Workers started:');
  console.log('  - Fingerprint worker (fingerprint-queue)');
  console.log('  - Analysis worker (analysis-queue)');

  const shutdown = async () => {
    console.log('\nShutting down workers...');
    await fpWorker.close();
    await analysisWorker.close();
    console.log('Workers stopped.');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startWorkers().catch((err) => {
  console.error('Failed to start workers:', err);
  process.exit(1);
});
