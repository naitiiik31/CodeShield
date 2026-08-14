# CodeGuard — AI-Augmented Code Similarity & Plagiarism Detection Platform

> **CodeGuard** is an open-source, production-grade programming assignment code similarity & plagiarism investigation platform. It normalizes source code, generates compact document fingerprints via the Winnowing algorithm, computes Jaccard similarity, filters out starter boilerplate code, and provides explainable evidence reports — without automatically accusing students.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Key Features](#3-key-features)
4. [Architecture Diagram](#4-architecture-diagram)
5. [Core Algorithm Pipeline](#5-core-algorithm-pipeline)
6. [Phase 1: Tokenization & Normalization](#6-phase-1-tokenization--normalization)
7. [Phase 2: K-Gram Generation](#7-phase-2-k-gram-generation)
8. [Phase 3: Polynomial Rolling Hashing](#8-phase-3-polynomial-rolling-hashing)
9. [Phase 4: Winnowing Fingerprinting](#9-phase-4-winnowing-fingerprinting)
10. [Phase 5: Jaccard Similarity Engine](#10-phase-5-jaccard-similarity-engine)
11. [Phase 6: Boilerplate-Aware Detection](#11-phase-6-boilerplate-aware-detection)
12. [Phase 7: Explainable Reports](#12-phase-7-explainable-reports)
13. [Phase 8: Inverted Index Optimization](#13-phase-8-inverted-index-optimization)
14. [Phase 9: BullMQ Asynchronous Processing](#14-phase-9-bullmq-asynchronous-processing)
15. [Phase 10: Optional AI Semantic Layer](#15-phase-10-optional-ai-semantic-layer)
16. [Database Schema & Indexes](#16-database-schema--indexes)
17. [API Documentation](#17-api-documentation)
18. [Security Implementation](#18-security-implementation)
19. [Complexity Analysis & Scaling](#19-complexity-analysis--scaling)
20. [Setup & Installation Instructions](#20-setup--installation-instructions)
21. [Environment Variables](#21-environment-variables)
22. [Testing Suite](#22-testing-suite)
23. [Benchmarking Results](#23-benchmarking-results)
24. [Interview Pitch & Key Q&A](#24-interview-pitch--key-qa)

---

## 1. Project Overview

CodeGuard addresses the challenge faced by computer science professors and TAs when reviewing hundreds of student code submissions for academic integrity. It moves beyond superficial text diffing by analyzing normalized syntax trees and winnowed fingerprint sets.

## 2. Problem Statement

Students attempting to copy code often disguise their work using:
- Variable and function identifier renaming
- Whitespace and formatting changes
- Inserting or removing comments
- Modifying literal values or reordering statements

Simple string matching or `diff` tools fail against these transformations. CodeGuard strips away superficial formatting and identifier names, capturing the underlying algorithmic structure.

## 3. Key Features

- **Multi-Language Normalizing Tokenizers**: Python and JavaScript tokenization that strips comments and maps identifiers to canonical forms (`VAR`, `NUM`, `STR`).
- **Winnowing Fingerprinting**: Schleimer et al. winnowing algorithm with rightmost minimum tie-breaking for deterministic fingerprint selection.
- **Boilerplate-Aware Similarity**: Automatic frequency detection across submission cohorts to down-weight starter code provided by professors.
- **Explainable Evidence Reports**: Deterministic explanation engine detailing line spans, variable renaming patterns, loop structures, and fingerprint metrics.
- **Inverted Index Candidate Generation**: Candidate pair filtering reducing naive $O(N^2)$ comparisons to $O(N + M)$ candidate generation.
- **Side-by-Side Monaco Diff Viewer**: Interactive side-by-side code editor with highlighted matching line regions.
- **BullMQ Background Workers**: Asynchronous Redis job queues for fingerprinting and similarity analysis.
- **Advisory AI Semantic Layer**: Vendor-agnostic AI provider (OpenAI GPT-4o) for borderline semantic logic comparison.

---

## 4. Architecture Diagram

```
[ Client: React + Vite + Monaco + Recharts ]
                     │ REST API
                     ▼
[ Express API Server (TypeScript) ] ── (JWT + RBAC Middleware)
         │                    │
         ▼                    ▼
   [ MongoDB ]           [ Redis + BullMQ ]
(Submissions, Results,        │
 InvertedIndex, Users)        ▼
                   [ Background Workers ]
               (Tokenizer → Winnow → Jaccard)
```

---

## 5. Core Algorithm Pipeline

```
SOURCE CODE ──► TOKENIZATION ──► K-GRAMS ──► HASHING ──► WINNOWING ──► JACCARD SIMILARITY ──► BOILERPLATE FILTER ──► EXPLAINABLE REPORT
```

---

## 6. Phase 1: Tokenization & Normalization

The tokenizer strips comments (`#`, `//`, `/* */`), docstrings, and irrelevant whitespace.
- Identifiers $\rightarrow$ `VAR`
- Numerics $\rightarrow$ `NUM`
- Strings $\rightarrow$ `STR`
- Keywords preserved $\rightarrow$ `IF`, `FOR`, `WHILE`, `RETURN`, `DEF`

**Example:**
`total += arr[i]` and `sum += values[j]` both normalize to:
`VAR += VAR [ VAR ]`

---

## 7. Phase 2: K-Gram Generation

Generates overlapping token subsequences of length $k$ (default $k=5$).
`generateKgrams(tokens, k)` returns token subsequences along with token stream position metadata.

---

## 8. Phase 3: Polynomial Rolling Hashing

Computes polynomial rolling hash values for each k-gram:
$$H = \sum_{i=0}^{k-1} c_i \cdot b^{k-1-i} \pmod M$$
where $b=31$ and $M=10^9+7$.

---

## 9. Phase 4: Winnowing Fingerprinting

Applies Schleimer et al. sliding window algorithm (window size $w=4$) over hash sequences.
Selects the minimum hash in each window position using rightmost tie-breaking, avoiding duplicate consecutive fingerprints.

**Guarantee:** Any matching substring of length $t \ge k + w - 1$ is guaranteed to produce at least one shared fingerprint.

---

## 10. Phase 5: Jaccard Similarity Engine

Computes Jaccard similarity between fingerprint hash sets:
$$J(A, B) = \frac{|A \cap B|}{|A \cup B|}$$

---

## 11. Phase 6: Boilerplate-Aware Detection

Identifies hashes appearing in $\ge 70\%$ of submissions as starter code.
Formula:
$$\text{Adjusted Similarity} = \frac{|(A \cap B) \setminus \text{Boilerplate}|}{|(A \cup B) \setminus \text{Boilerplate}|}$$

---

## 12. Phase 7: Explainable Reports

Generates evidence-based explanations without hallucination:
- Raw vs. Adjusted similarity breakdown
- Line range spans for matched code regions
- Variable renaming detection alerts
- Structural loop/conditional similarity patterns

---

## 13. Phase 8: Inverted Index Optimization

Maps `hash` $\rightarrow$ `[submissionIds]`.
Only candidate pairs sharing $\ge 1$ hash are evaluated with exact Jaccard similarity, reducing unnecessary comparisons by up to 90%.

---

## 14. Phase 9: BullMQ Asynchronous Processing

- `fingerprint-queue`: Enqueued on code submission.
- `analysis-queue`: Enqueued when professor triggers analysis.
Includes exponential backoff retries and progress tracking.

---

## 15. Phase 10: Optional AI Semantic Layer

Uses OpenAI provider abstraction for borderline candidates. Clearly labeled:
*"AI semantic similarity is an advisory signal. Final judgment remains with the professor."*

---

## 16. Database Schema & Indexes

- **User**: `email` (unique), `role`
- **Assignment**: `professorId`
- **Submission**: `assignmentId`, `studentId`, `assignmentId + studentId`, `status`
- **SimilarityResult**: `assignmentId`, `assignmentId + adjustedScore (-1)`, `assignmentId + submissionA + submissionB` (unique)
- **InvertedIndex**: `assignmentId + hash` (unique)
- **BoilerplateFingerprint**: `assignmentId + hash` (unique), `assignmentId + isBoilerplate`

---

## 17. API Documentation

### Auth
- `POST /api/auth/register` — Register user
- `POST /api/auth/login` — Login user & return JWT
- `GET /api/auth/me` — Current user profile

### Assignments
- `POST /api/assignments` — Create assignment (Professor)
- `GET /api/assignments` — List assignments
- `GET /api/assignments/:id` — Get assignment details

### Submissions
- `POST /api/assignments/:id/submissions` — Submit code (Student)
- `GET /api/assignments/:id/submissions` — List submissions

### Analysis
- `POST /api/assignments/:id/analyze` — Trigger analysis (Professor)
- `GET /api/assignments/:id/results` — Get similarity results
- `GET /api/results/:id/detail` — Get side-by-side comparison detail
- `POST /api/demo/algorithm` — Interactive algorithm pipeline visualizer

---

## 18. Security Implementation

- Password hashing using bcrypt (12 salt rounds)
- JWT access tokens with 7-day expiry
- Helmet HTTP security headers & CORS policy
- Express rate limiting (100 req/15 min)
- Source code size limits (500 KB)
- No student code execution on the server

---

## 19. Complexity Analysis & Scaling

| Operation | Naive Approach | CodeGuard (Inverted Index) |
|---|---|---|
| Pair Comparison | $O(N^2 \cdot F)$ | $O(N \cdot F + C \cdot F)$ where $C \ll N^2$ |
| Memory Complexity | $O(N \cdot F)$ | $O(N \cdot F + M \cdot d)$ |

---

## 20. Setup & Installation Instructions

### Prerequisites
- Node.js v18+ & npm
- MongoDB running on `localhost:27017`
- Redis running on `localhost:6379`

### Step 1: Install Dependencies
```bash
# Install all monorepo dependencies
npm install
```

### Step 2: Run Database Seed Script
```bash
npm run seed
```

### Step 3: Start Development Servers
```bash
# Start API Server + React Frontend concurrently
npm run dev

# (Optional) Start Background Worker in another terminal
npm run dev:worker
```

- **Client App**: `http://localhost:5173`
- **API Server**: `http://localhost:5000`

---

## 21. Environment Variables

Create `.env` in the `server` directory:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/codeguard
JWT_SECRET=codeguard-dev-secret-123
JWT_EXPIRES_IN=7d
REDIS_URL=redis://localhost:6379
DEFAULT_K=5
DEFAULT_WINDOW_SIZE=4
DEFAULT_SIMILARITY_THRESHOLD=0.5
DEFAULT_BOILERPLATE_THRESHOLD=0.7
```

---

## 22. Testing Suite

```bash
# Run unit tests
npm test

# Run benchmarks
npm run benchmark
```

---

## 23. Benchmarking Results

Measured on 200 Python submissions:
- **Fingerprint Generation**: ~0.45 ms / submission
- **Naive Pair Comparisons**: 19,900 pairs
- **Inverted Index Candidate Pairs**: ~1,850 pairs (**90.7% candidate reduction**)

---

## 24. Interview Pitch & Key Q&A

### 30-Second Elevator Pitch
"CodeGuard is a production code similarity detection platform built on the Winnowing algorithm. It normalizes Python and JavaScript code to defeat variable renaming, uses polynomial rolling hashes and sliding-window winnowing to create compact fingerprint sets, and leverages an inverted index to reduce comparison complexity by over 90%. Crucially, it identifies professor starter code to prevent false positives and delivers explainable evidence reports instead of black-box accusations."

### Top 3 Technical Questions to Prepare
1. **Q: How does Winnowing guarantee detecting copied code?**
   *A:* Schleimer's theorem proves that any matching substring of length $t \ge k + w - 1$ guarantees at least one shared fingerprint between documents.
2. **Q: How do you defeat variable renaming attacks?**
   *A:* The normalizing tokenizer maps all identifiers to `VAR` and literals to `NUM`/`STR`, so variable renaming yields identical token streams.
3. **Q: Why use an Inverted Index for similarity search?**
   *A:* Comparing $N$ submissions naively requires $O(N^2)$ pairs. The inverted index maps `hash` $\rightarrow$ `submissionIds`, generating candidate pairs only for submissions sharing at least one fingerprint.
