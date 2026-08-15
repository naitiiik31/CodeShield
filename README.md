<div align="center">

# CodeShield

**Code similarity and plagiarism detection platform for programming assignments**
CodeShield is a full-stack code plagiarism detection platform for programming assignments. Faculty can create assignments, students submit code, and CodeShield identifies suspicious similarities even when students rename variables, modify formatting, or copy only parts of a solution.
Built on tokenization, k-gram hashing, and the Winnowing algorithm — the same class of technique used by MOSS — to detect copied code even after variable renaming, formatting changes, or comment removal.

`React` · `Node.js` · `Express` · `MongoDB` · `Redis` · `BullMQ` · `JWT`

</div>

---

## Table of contents

1. [Why this exists](#why-this-exists)
2. [How it works](#how-it-works)
3. [Key features](#key-features)
4. [Architecture](#architecture)
5. [Tech stack](#tech-stack)
6. [Project structure](#project-structure)
7. [Getting started](#getting-started)
8. [Environment variables](#environment-variables)
9. [API overview](#api-overview)
10. [Testing](#testing)
11. [Scaling notes](#scaling-notes)
12. [Roadmap](#roadmap)
13. [Author](#author)

---

## Why this exists

Professors reviewing dozens or hundreds of programming assignments can't realistically eyeball every submission for copied code, and naive text diffing misses the most common disguises: renamed variables, reformatted whitespace, stripped comments, or reordered statements.

CodeShield normalizes source code down to its structural skeleton before comparing it, so two submissions that look different on the surface but share the same underlying logic still get flagged — while giving professors evidence they can actually act on, not a black-box accusation.

## How it works

```
Source code
    │
    ▼
Tokenization           strip comments/whitespace, normalize identifiers → VAR, NUM, STR
    │
    ▼
K-grams                 sliding window over the token stream
    │
    ▼
Polynomial rolling hash  hash each k-gram
    │
    ▼
Winnowing                select local-minimum hashes → compact fingerprint set
    │
    ▼
Jaccard similarity        |A ∩ B| / |A ∪ B| between fingerprint sets
    │
    ▼
Boilerplate filter        down-weight hashes shared by most of the class (starter code)
    │
    ▼
Ranked, explainable results
```

**Example — why renaming doesn't defeat it:**

```
total += arr[i]      →  VAR += VAR [ VAR ]
sum   += values[j]    →  VAR += VAR [ VAR ]
```

Both lines normalize to an identical token sequence, so structurally identical code is caught regardless of what the variables are called.

## Key features

- **Multi-language tokenization** — Python, JavaScript, Java, C++, C, and C# via a pluggable tokenizer interface, with automatic language detection from file extension or content
- **Winnowing fingerprinting** — Schleimer et al.'s sliding-window algorithm with deterministic tie-breaking; any matching substring of length `t ≥ k + w − 1` is guaranteed to produce at least one shared fingerprint
- **Boilerplate-aware scoring** — automatically detects and discounts hashes that appear across most of the cohort (professor-provided starter code), so shared boilerplate doesn't inflate similarity scores
- **Inverted-index candidate generation** — maps `hash → [submissionIds]` so only submissions that actually share a fingerprint get compared, cutting naive O(N²) pairwise comparison down dramatically at scale
- **Explainable evidence reports** — matched line-range regions, raw vs. boilerplate-adjusted similarity, and risk-level classification, so professors see *why* a pair was flagged
- **Two real roles with JWT auth** — students self-register, join assignments via an assignment code, and submit/resubmit their own work; faculty create assignments, monitor submissions, and review results
- **Resubmission versioning** — every resubmission is tracked with a version number and an `isLatest` flag; only the latest version per student is used in comparisons
- **Side-by-side comparison view** — highlighted matching regions between any two flagged submissions
- **Interactive algorithm demo page** — a live, click-through visualization of the tokenize → k-gram → hash → winnow pipeline for demoing the core logic
- **Asynchronous background processing** — fingerprint generation and full-assignment analysis run as BullMQ/Redis jobs with retry and exponential backoff, so the API never blocks on heavy computation
- **In-memory fallback mode** — the app runs and demos correctly even without MongoDB/Redis connected, backed by a seeded in-memory store

## Architecture

```
┌─────────────────────────┐
│  React client (Vite)    │
│  faculty + student UI   │
└────────────┬─────────────┘
             │ REST API (JWT)
             ▼
┌─────────────────────────┐
│  Express API server     │
│  auth · assignments ·   │
│  submissions · analysis │
└──────┬──────────┬────────┘
       │          │
       ▼          ▼
┌───────────┐  ┌─────────────────┐
│ MongoDB    │  │ Redis + BullMQ  │
│ users,     │  │ fingerprint-    │
│ assignments,│  │ queue,          │
│ submissions,│  │ analysis-queue  │
│ results    │  └────────┬────────┘
└───────────┘            │
                          ▼
              ┌─────────────────────────┐
              │  Background workers      │
              │  tokenize → kgram →      │
              │  hash → winnow → Jaccard │
              └─────────────────────────┘
```

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React, Vite, React Router |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Auth | JWT, bcrypt |
| Queue / background jobs | Redis, BullMQ |
| Validation | Zod |
| Testing | Vitest, Supertest, mongodb-memory-server |
| Security | Helmet, express-rate-limit |

## Project structure

```
codeshield/
├── client/                     React frontend
│   └── src/
│       ├── pages/               landing, login, register, faculty & student dashboards,
│       │                        results, comparison view, algorithm demo
│       ├── components/          modals, navbar, protected routes
│       └── context/              auth context
├── server/                     Express API
│   └── src/
│       ├── controllers/         auth, assignments, submissions, analysis, student
│       ├── models/               User, Assignment, Submission, Enrollment,
│       │                        SimilarityResult, InvertedIndex, BoilerplateFingerprint
│       ├── services/
│       │   ├── tokenizer/        one tokenizer per language + language detector
│       │   ├── fingerprint/      k-gram, hash, winnow
│       │   ├── similarity/       Jaccard, inverted-index candidate generation
│       │   ├── boilerplate/      starter-code detection
│       │   └── explanation/      matched-region mapping, risk classification
│       ├── workers/               BullMQ fingerprint & analysis workers
│       ├── queues/                queue definitions
│       ├── middleware/            JWT auth, role guards, validation, error handling
│       └── scripts/                seed & benchmark scripts
└── package.json                 npm workspaces root
```

## Getting started

### Prerequisites

- Node.js v18+
- MongoDB running locally (or update `MONGO_URI`)
- Redis running locally (or update `REDIS_URL`) — optional, the app falls back to synchronous in-process processing if Redis is unavailable

### Install and run

```bash
# install all workspace dependencies
npm install

# seed demo data (creates a demo faculty account and sample assignment)
npm run seed

# start API + client together
npm run dev

# optional: start the background worker in a separate terminal
npm run dev:worker
```

- Client: `http://localhost:5173`
- API: `http://localhost:5000`

## Environment variables

Create a `.env` file inside `server/`:

```env
PORT=5000
NODE_ENV=development

MONGO_URI=mongodb://localhost:27017/codeshield
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=7d

REDIS_URL=redis://localhost:6379

DEFAULT_K=5
DEFAULT_WINDOW_SIZE=4
DEFAULT_SIMILARITY_THRESHOLD=0.5
DEFAULT_BOILERPLATE_THRESHOLD=0.7

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
MAX_CODE_SIZE_KB=500
```

## API overview

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register (faculty or student) |
| POST | `/api/auth/login` | — | Log in, receive JWT |
| GET | `/api/auth/me` | any | Current user profile |
| POST | `/api/assignments` | faculty | Create assignment |
| GET | `/api/assignments/:id` | faculty | Assignment detail |
| GET | `/api/student/assignment/:code` | student | Look up assignment by join code |
| POST | `/api/student/join` | student | Join an assignment |
| GET | `/api/student/dashboard` | student | Enrolled assignments + submission status |
| POST | `/api/student/assignments/:id/submit` | student | Submit or resubmit code |
| GET | `/api/student/assignments/:id/status` | student | Submission version history |
| POST | `/api/assignments/:id/analyze` | faculty | Trigger similarity analysis |
| GET | `/api/assignments/:id/results` | faculty | Ranked suspicious pairs |
| GET | `/api/results/:id/detail` | faculty | Side-by-side matched-region comparison |

## Testing

```bash
npm run test --workspace=server
```

50 unit tests covering the tokenizer (per language), fingerprint generation, Jaccard similarity, explanation/risk-level logic, and versioning/candidate-pair math — no database required, using pure-function tests plus `mongodb-memory-server` where persistence is involved.

```bash
npm run benchmark --workspace=server
```

Benchmarks fingerprint generation time and inverted-index candidate-pair reduction versus naive O(N²) comparison on a synthetic submission set.

## Scaling notes

Naive pairwise comparison is `O(N²)` — fine for a class of 60–200 students, expensive at real scale. CodeShield builds an inverted index (`hash → submissionIds`) so only submissions sharing at least one fingerprint are ever compared with exact Jaccard similarity, turning the expensive step into roughly `O(N + C)` where `C` is the (much smaller) candidate-pair count. Fingerprinting and analysis also run as separate BullMQ jobs, so submission traffic and the heavier full-assignment analysis never block each other or the API.

## Roadmap

- [ ] Plagiarism cluster detection — group mutually similar submissions via Union-Find instead of surfacing only pairwise matches
- [ ] LCS/diff-based matched-region highlighting (currently fingerprint-position based)
- [ ] Exportable evidence report (PDF) per suspicious cluster

## Author

Built as a portfolio project to explore applying classic string/hashing algorithms (k-grams, rolling hashes, winnowing, inverted indexing) to a real, full-stack product problem.
