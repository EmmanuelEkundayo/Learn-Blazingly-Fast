import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './auth.js';
import { optionalAuth, requireAuth } from './middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));

const DATA_DIR = path.join(__dirname, 'data');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');
const PROGRESS_DIR = path.join(DATA_DIR, 'progress');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}
if (!fs.existsSync(PROGRESS_DIR)) {
  fs.mkdirSync(PROGRESS_DIR);
}

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3001')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions, please slow down.' }
});

function readJSON(file) {
  if (!fs.existsSync(file)) return [];
  try {
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
    return false;
  }
}

function sanitizeString(value, maxLength = 200) {
  return typeof value === 'string'
    ? value.trim().slice(0, maxLength)
    : '';
}

function sanitizeInt(value, max) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.min(n, max);
}

const REVIEWS_ADMIN_TOKEN = process.env.REVIEWS_ADMIN_TOKEN || 'lbf-admin-dev-token';

function requireReviewAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.adminToken;
  if (typeof token !== 'string' || token !== REVIEWS_ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
  next();
}

function reviewId(review) {
  return typeof review.id === 'string' ? review.id : review.submitted_at;
}

app.use('/api/v1/auth', authRoutes);

app.use('/api/v1', apiLimiter);

app.get('/api/v1/reviews', (req, res) => {
  const reviews = readJSON(REVIEWS_FILE);
  const approved = reviews.filter(r => r.approved !== false);
  const anon = approved.map(r => ({
    id: reviewId(r),
    first_name: r.name ? String(r.name).split(' ')[0] : 'Anonymous',
    occupation: r.occupation || 'Learner',
    review_text: r.review_text,
    concepts_seen_count: r.concepts_seen_count || 10,
    submitted_at: r.submitted_at
  }));
  res.json(anon);
});

app.post('/api/v1/reviews', writeLimiter, requireAuth, (req, res) => {
  const { name, occupation, review_text, concepts_seen_count, rating, concepts_seen } = req.body || {};

  const cleaned = {
    name: sanitizeString(name, 100),
    occupation: sanitizeString(occupation, 100),
    review_text: sanitizeString(review_text, 2000),
    concepts_seen_count: sanitizeInt(concepts_seen_count, 9999),
    rating: Math.min(Math.max(sanitizeInt(rating, 5), 0), 5)
  };

  if (Array.isArray(concepts_seen)) {
    cleaned.concepts_seen = concepts_seen
      .filter(c => typeof c === 'string')
      .slice(0, 50)
      .map(c => c.trim().slice(0, 100))
      .filter(Boolean);
  }

  if (!cleaned.name || !cleaned.review_text || !cleaned.name.length || !cleaned.review_text.length) {
    return res.status(400).json({ error: 'name and review_text are required' });
  }

  const reviews = readJSON(REVIEWS_FILE);
  const submitted_at = new Date().toISOString();
  const id = `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  reviews.push({ ...cleaned, id, submitted_at, approved: false });
  if (writeJSON(REVIEWS_FILE, reviews)) {
    res.status(201).json({ message: 'Review saved. Awaiting approval.' });
  } else {
    res.status(500).json({ error: 'Failed to save review' });
  }
});

app.get('/api/v1/reviews/admin', requireReviewAdmin, (req, res) => {
  const reviews = readJSON(REVIEWS_FILE);
  const all = reviews.map(r => ({
    id: reviewId(r),
    name: r.name,
    occupation: r.occupation || 'Learner',
    review_text: r.review_text,
    concepts_seen_count: r.concepts_seen_count || 0,
    rating: r.rating || 0,
    approved: r.approved === true,
    submitted_at: r.submitted_at
  }));
  res.json(all);
});

app.patch('/api/v1/reviews/:id', requireReviewAdmin, (req, res) => {
  const { id } = req.params;
  const { approved } = req.body || {};
  const reviews = readJSON(REVIEWS_FILE);
  const target = reviews.find(r => reviewId(r) === id);
  if (!target) return res.status(404).json({ error: 'Review not found' });
  target.approved = approved === true;
  if (writeJSON(REVIEWS_FILE, reviews)) {
    res.json({ message: approved ? 'Review approved' : 'Review unapproved', id, approved: target.approved });
  } else {
    res.status(500).json({ error: 'Failed to update review' });
  }
});

app.delete('/api/v1/reviews/:id', requireReviewAdmin, (req, res) => {
  const { id } = req.params;
  let reviews = readJSON(REVIEWS_FILE);
  const before = reviews.length;
  reviews = reviews.filter(r => reviewId(r) !== id);
  if (reviews.length === before) return res.status(404).json({ error: 'Review not found' });
  if (writeJSON(REVIEWS_FILE, reviews)) {
    res.json({ message: 'Review deleted', id });
  } else {
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

app.get('/api/v1/support-status', (req, res) => {
  const { email } = req.query;
  if (!email || typeof email !== 'string' || email.length > 320) {
    return res.status(400).json({ error: 'email query param is required' });
  }
  const reviews = readJSON(REVIEWS_FILE);
  const completed = reviews.some(r => r.email === email);
  res.json({ completed });
});

app.post('/api/v1/leaderboard/submit', writeLimiter, optionalAuth, (req, res) => {
  const { name, email, occupation, concepts_passed, domains_completed, streak, opted_in } = req.body || {};
  if (!opted_in) return res.status(400).json({ error: 'User did not opt in' });

  const cleanName = sanitizeString(name, 100);
  const cleanEmail = sanitizeString(email, 320);
  const cleanOccupation = sanitizeString(occupation, 100);

  if (!cleanName || !cleanEmail) {
    return res.status(400).json({ error: 'name and email are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  let leaderboard = readJSON(LEADERBOARD_FILE);
  const entryIndex = leaderboard.findIndex(e => e.email === cleanEmail);

  const entry = {
    name: cleanName.split(' ')[0],
    email: cleanEmail,
    occupation: cleanOccupation || 'Learner',
    concepts_passed: sanitizeInt(concepts_passed, 10000),
    domains_completed: sanitizeInt(domains_completed, 100),
    streak: sanitizeInt(streak, 10000),
    last_updated: new Date().toISOString()
  };

  if (entryIndex >= 0) {
    leaderboard[entryIndex] = entry;
  } else {
    leaderboard.push(entry);
  }

  if (writeJSON(LEADERBOARD_FILE, leaderboard)) {
    res.status(200).json({ message: 'Stats updated' });
  } else {
    res.status(500).json({ error: 'Failed to update leaderboard' });
  }
});

app.get('/api/v1/leaderboard', (req, res) => {
  const leaderboard = readJSON(LEADERBOARD_FILE);
  const sorted = leaderboard
    .sort((a, b) => b.concepts_passed - a.concepts_passed)
    .slice(0, 50)
    .map((e, i) => ({
      rank: i + 1,
      name: e.name,
      occupation: e.occupation,
      concepts_passed: e.concepts_passed,
      domains_completed: e.domains_completed,
      streak: e.streak
    }));
  res.json(sorted);
});

app.post('/api/v1/leaderboard/opt-out', writeLimiter, (req, res) => {
  const { email } = req.body || {};
  const cleanEmail = sanitizeString(email, 320);
  if (!cleanEmail) return res.status(400).json({ error: 'email is required' });

  let leaderboard = readJSON(LEADERBOARD_FILE);
  leaderboard = leaderboard.filter(e => e.email !== cleanEmail);
  if (writeJSON(LEADERBOARD_FILE, leaderboard)) {
    res.json({ message: 'Removed from leaderboard' });
  } else {
    res.status(500).json({ error: 'Failed to remove' });
  }
});

function sanitizeEmail(email) {
  return typeof email === 'string'
    ? email.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '').slice(0, 320)
    : '';
}

function getProgressFile(email) {
  const safe = sanitizeEmail(email);
  if (!safe || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safe)) return null;
  return path.join(PROGRESS_DIR, `${safe.replace(/@/g, '_at_').replace(/\./g, '_dot_')}.json`);
}

app.get('/api/v1/progress', requireAuth, (req, res) => {
  const file = getProgressFile(req.user.email);
  if (!file) return res.status(400).json({ error: 'Invalid email' });
  const data = readJSON(file);
  res.json(data && typeof data === 'object' && !Array.isArray(data) ? data : {});
});

app.put('/api/v1/progress', requireAuth, writeLimiter, (req, res) => {
  const file = getProgressFile(req.user.email);
  if (!file) return res.status(400).json({ error: 'Invalid email' });
  const payload = req.body || {};
  const safe = {
    progress: payload.progress && typeof payload.progress === 'object' && !Array.isArray(payload.progress) ? payload.progress : {},
    interacted_concepts: Array.isArray(payload.interacted_concepts) ? payload.interacted_concepts.slice(0, 500) : [],
    completion_dates: payload.completion_dates && typeof payload.completion_dates === 'object' && !Array.isArray(payload.completion_dates) ? payload.completion_dates : {},
    streak: payload.streak && typeof payload.streak === 'object' ? { count: sanitizeInt(payload.streak.count, 10000), last_date: payload.streak.last_date || null } : { count: 0, last_date: null },
    leaderboard_opted_in: typeof payload.leaderboard_opted_in === 'boolean' ? payload.leaderboard_opted_in : null,
    active_roadmap_slug: typeof payload.active_roadmap_slug === 'string' ? payload.active_roadmap_slug.slice(0, 200) : null,
  };
  if (writeJSON(file, safe)) {
    res.json({ message: 'Progress saved' });
  } else {
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});