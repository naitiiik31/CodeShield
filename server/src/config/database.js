import mongoose from 'mongoose';
import { config } from './index.js';

export async function connectDatabase() {
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log('MongoDB connected successfully to ' + config.mongoUri);
  } catch (error) {
    console.warn('Standard MongoDB not found on ' + config.mongoUri + '. Starting MongoMemoryServer fallback...');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log('Connected to In-Memory MongoDB at ' + mongoUri);
    } catch (memError) {
      console.error('Failed to start MongoDB fallback:', memError);
      throw error;
    }
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });
}
