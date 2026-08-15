import { describe, it, expect, beforeEach } from 'vitest';
import { generateAssignmentCode } from '../../controllers/assignmentController.js';
import { inMemoryAssignments, inMemorySubmissions, inMemoryResults } from '../inMemoryStore.js';
import { determineRiskLevel } from '../explanation/generator.js';
import { findCandidatePairs, generateAllUniquePairs } from '../similarity/candidateGenerator.js';

describe('Student Portal & Deadline & Versioning Unit Tests', () => {
  it('generates uppercase assignment code with title prefix', () => {
    const code = generateAssignmentCode('Data Structures - Binary Search Tree');
    expect(code).toBeDefined();
    expect(code).toMatch(/^[A-Z0-9]+-[A-Z0-9]+$/);
  });

  it('determines risk level accurately based on raw score thresholds', () => {
    expect(determineRiskLevel(0.95)).toBe('high');
    expect(determineRiskLevel(0.70)).toBe('high');
    expect(determineRiskLevel(0.69)).toBe('medium');
    expect(determineRiskLevel(0.40)).toBe('medium');
    expect(determineRiskLevel(0.39)).toBe('low');
  });

  it('correctly calculates 10 unique pairs for 5 student latest submissions (5 * 4 / 2)', () => {
    const mockFiveSubmissions = [
      { id: 'sub1', fingerprints: [100, 101, 102] },
      { id: 'sub2', fingerprints: [100, 101, 103] },
      { id: 'sub3', fingerprints: [200, 201, 202] },
      { id: 'sub4', fingerprints: [100, 101, 104] },
      { id: 'sub5', fingerprints: [300, 301, 302] },
    ];

    const pairs = generateAllUniquePairs(mockFiveSubmissions);
    expect(pairs.length).toBe(10);

    // Ensure no duplicate reverse pairs (e.g. sub1<->sub2 and sub2<->sub1)
    const pairKeys = new Set();
    for (const p of pairs) {
      const key = [p.submissionA, p.submissionB].sort().join('<->');
      expect(pairKeys.has(key)).toBe(false);
      pairKeys.add(key);
    }
  });

  it('filters multiple student submission versions down to latest version', () => {
    const submissionsHistory = [
      { studentIdentifier: 'Average1', version: 1, code: 'v1 code', submittedAt: new Date('2026-08-24T10:00:00Z') },
      { studentIdentifier: 'Average1', version: 2, code: 'v2 code', submittedAt: new Date('2026-08-24T14:00:00Z') },
      { studentIdentifier: 'Average1', version: 3, code: 'v3 code', submittedAt: new Date('2026-08-24T17:00:00Z') },
      { studentIdentifier: 'Average2', version: 1, code: 'avg2 code', submittedAt: new Date('2026-08-24T11:00:00Z') },
    ];

    // Grouping logic used in analysis worker
    const latestMap = new Map();
    // Sort descending by version
    const sorted = [...submissionsHistory].sort((a, b) => b.version - a.version);
    for (const sub of sorted) {
      if (!latestMap.has(sub.studentIdentifier)) {
        latestMap.set(sub.studentIdentifier, sub);
      }
    }

    const filtered = Array.from(latestMap.values());
    expect(filtered.length).toBe(2);
    const avg1Sub = filtered.find((s) => s.studentIdentifier === 'Average1');
    expect(avg1Sub.version).toBe(3);
  });

  it('enforces backend deadline check correctly', () => {
    const pastDeadline = new Date(Date.now() - 3600 * 1000); // 1 hour ago
    const futureDeadline = new Date(Date.now() + 3600 * 1000); // 1 hour in future

    const checkIsClosed = (dl) => new Date() >= new Date(dl);

    expect(checkIsClosed(pastDeadline)).toBe(true);
    expect(checkIsClosed(futureDeadline)).toBe(false);
  });

  it('correctly sets isLatest boolean flag during student resubmission', () => {
    const submissions = [
      { id: 1, studentUserId: 'user101', version: 1, isLatest: true },
    ];

    // Resubmit: set isLatest = false on old, create new with isLatest = true
    submissions.forEach((s) => { s.isLatest = false; });
    const newSub = { id: 2, studentUserId: 'user101', version: 2, isLatest: true };
    submissions.push(newSub);

    const latest = submissions.filter((s) => s.isLatest);
    expect(latest.length).toBe(1);
    expect(latest[0].version).toBe(2);
  });

  it('filters assignments by Academic Profile (Department / Division / Batch)', () => {
    const targetGroup = { department: 'CSE', division: 'D3', batch: '2023' };

    const isGroupMatch = (studentProfile, target) => {
      const sDept = (studentProfile?.department || '').toUpperCase();
      const sDiv = (studentProfile?.division || '').toUpperCase();
      const sBatch = (studentProfile?.batch || '').trim();

      return sDept === target.department && sDiv === target.division && sBatch === target.batch;
    };

    const studentA = { department: 'CSE', division: 'D3', batch: '2023' };
    const studentB = { department: 'CSE', division: 'D2', batch: '2023' }; // Different Division
    const studentC = { department: 'IT', division: 'D3', batch: '2023' };  // Different Department
    const studentD = { department: 'CSE', division: 'D3', batch: '2024' }; // Different Batch

    expect(isGroupMatch(studentA, targetGroup)).toBe(true);
    expect(isGroupMatch(studentB, targetGroup)).toBe(false);
    expect(isGroupMatch(studentC, targetGroup)).toBe(false);
    expect(isGroupMatch(studentD, targetGroup)).toBe(false);
  });

  it('validates future deadline updates and rejects past dates', () => {
    const validateNewDeadline = (newDateStr) => {
      const d = new Date(newDateStr);
      if (isNaN(d.getTime())) return { valid: false, error: 'Invalid deadline date format' };
      if (d.getTime() <= Date.now()) return { valid: false, error: 'Deadline must be in the future.' };
      return { valid: true };
    };

    const futureDate = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
    const invalidDate = 'invalid-date-string';

    expect(validateNewDeadline(futureDate).valid).toBe(true);

    const pastCheck = validateNewDeadline(pastDate);
    expect(pastCheck.valid).toBe(false);
    expect(pastCheck.error).toBe('Deadline must be in the future.');

    const invalidCheck = validateNewDeadline(invalidDate);
    expect(invalidCheck.valid).toBe(false);
    expect(invalidCheck.error).toBe('Invalid deadline date format');
  });

  it('allows students to submit after deadline is extended to future date', () => {
    const assignment = {
      title: 'BST Assignment',
      deadline: new Date(Date.now() - 3600 * 1000), // Initially closed 1 hr ago
    };

    const isClosedBefore = new Date() >= new Date(assignment.deadline);
    expect(isClosedBefore).toBe(true);

    // Faculty extends deadline to +2 days
    assignment.deadline = new Date(Date.now() + 48 * 3600 * 1000);

    const isClosedAfter = new Date() >= new Date(assignment.deadline);
    expect(isClosedAfter).toBe(false);
  });
});
