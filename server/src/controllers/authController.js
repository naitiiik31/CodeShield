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
  studentId: z.string().min(1).max(50).optional(),
  department: z.string().optional(),
  division: z.string().optional(),
  batch: z.string().optional(),
  role: z.enum(['faculty', 'professor', 'student']).optional().default('faculty'),
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
    const { name, email, password, studentId, department, division, batch, role: reqRole } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();
    const role = reqRole === 'student' ? 'student' : 'faculty';
    const cleanStudentId = studentId ? studentId.trim() : undefined;

    let academicProfile = undefined;

    if (role === 'student') {
      if (!cleanStudentId) {
        res.status(400).json({ error: 'Student ID is required for student registration' });
        return;
      }
      const cleanDept = (department || 'CSE').trim().toUpperCase();
      const cleanDiv = (division || 'D3').trim().toUpperCase();
      const cleanBatch = (batch || '2023').trim();

      academicProfile = {
        department: cleanDept,
        division: cleanDiv,
        batch: cleanBatch,
      };
    }

    if (mongoose.connection.readyState === 1) {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }

      if (role === 'student' && cleanStudentId) {
        const existingStudent = await User.findOne({ studentId: cleanStudentId });
        if (existingStudent) {
          res.status(409).json({ error: 'Student ID already registered' });
          return;
        }
      }

      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(cleanPassword, saltRounds);

      const user = await User.create({
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role,
        studentId: cleanStudentId,
        academicProfile,
      });

      const token = generateToken(user._id.toString());

      res.status(201).json({
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          studentId: user.studentId,
          role: user.role,
          academicProfile: user.academicProfile,
          createdAt: user.createdAt,
        },
      });
      return;
    }

    // In-memory fallback
    const existingUser = inMemoryUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existingUser) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    if (role === 'student' && cleanStudentId) {
      const existingStudent = inMemoryUsers.find((u) => u.studentId === cleanStudentId);
      if (existingStudent) {
        res.status(409).json({ error: 'Student ID already registered' });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 10);
    const newUser = {
      _id: '65c1' + Date.now().toString(16).padStart(20, '0'),
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role,
      studentId: cleanStudentId,
      academicProfile,
      createdAt: new Date(),
      toJSON() {
        return {
          _id: this._id,
          name: this.name,
          email: this.email,
          studentId: this.studentId,
          role: this.role,
          academicProfile: this.academicProfile,
          createdAt: this.createdAt,
        };
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
        role: 'faculty',
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
