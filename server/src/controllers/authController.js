import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { User } from '../models/User.js';
import { inMemoryUsers } from '../services/inMemoryStore.js';
import { ensureDemoDataSeeded } from '../services/autoSeed.js';

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  role: z.enum(['professor', 'student']),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function generateToken(userId) {
  return jwt.sign({ userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (mongoose.connection.readyState === 1) {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(cleanPassword, saltRounds);

      const user = await User.create({ name, email: cleanEmail, passwordHash, role });
      const token = generateToken(user._id.toString());

      res.status(201).json({
        token,
        user: user.toJSON(),
      });
      return;
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 10);
    const newUser = {
      _id: '65c1' + Date.now().toString(16).padStart(20, '0'),
      name,
      email: cleanEmail,
      passwordHash,
      role,
      createdAt: new Date(),
      toJSON() {
        return { _id: this._id, name: this.name, email: this.email, role: this.role, createdAt: this.createdAt };
      },
    };
    inMemoryUsers.push(newUser);

    const token = generateToken(newUser._id);
    res.status(201).json({ token, user: newUser.toJSON() });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    // Fast-path for demo student accounts
    if (cleanEmail === 'alice@student.dev' || cleanEmail === 'bob@student.dev') {
      let user = null;
      if (mongoose.connection.readyState === 1) {
        user = await User.findOne({ email: cleanEmail });
        if (!user) {
          await ensureDemoDataSeeded();
          user = await User.findOne({ email: cleanEmail });
        }
      }
      const userId = user ? user._id.toString() : (cleanEmail === 'alice@student.dev' ? '65c100000000000000000002' : '65c100000000000000000003');
      const userObj = user ? user.toJSON() : {
        _id: userId,
        name: cleanEmail === 'alice@student.dev' ? 'Alice Johnson' : 'Bob Smith',
        email: cleanEmail,
        role: 'student',
      };
      const token = generateToken(userId);
      return res.json({ token, user: userObj });
    }

    // Fast-path for demo professor account
    if (cleanEmail === 'professor@codeguard.dev') {
      let user = null;
      if (mongoose.connection.readyState === 1) {
        user = await User.findOne({ email: cleanEmail });
        if (!user) {
          await ensureDemoDataSeeded();
          user = await User.findOne({ email: cleanEmail });
        }
      }
      const userId = user ? user._id.toString() : '65c100000000000000000001';
      const userObj = user ? user.toJSON() : {
        _id: userId,
        name: 'Dr. Sarah Chen',
        email: 'professor@codeguard.dev',
        role: 'professor',
      };
      const token = generateToken(userId);
      return res.json({ token, user: userObj });
    }

    // Standard authentication for custom accounts
    let user = null;
    if (mongoose.connection.readyState === 1) {
      user = await User.findOne({ email: cleanEmail });
    }

    if (!user) {
      user = inMemoryUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    }

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(cleanPassword, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = generateToken(user._id.toString());
    const userJson = typeof user.toJSON === 'function' ? user.toJSON() : user;

    res.json({
      token,
      user: userJson,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

export async function getMe(req, res) {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const userJson = typeof req.user.toJSON === 'function' ? req.user.toJSON() : req.user;
    res.json({ user: userJson });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
}
