import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { User } from '../models/User.js';
import { inMemoryUsers } from '../services/inMemoryStore.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);

    let user = null;

    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findById(decoded.userId);
      } catch {
        user = null;
      }
    }

    if (!user) {
      user = inMemoryUsers.find((u) => u._id.toString() === decoded.userId);
    }

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export const requireAuth = authenticate;

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    // Faculty / Professor role matching
    const isFacultyRole = (roles.includes('faculty') || roles.includes('professor')) && (req.user.role === 'faculty' || req.user.role === 'professor');
    if (!roles.includes(req.user.role) && !isFacultyRole) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
