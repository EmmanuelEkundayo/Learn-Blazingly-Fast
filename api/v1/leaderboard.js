import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'leaderboard.json');
const MAX_ENTRIES = 200;

function readLeaderboard() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      return Array.isArray(raw) ? raw : [];
    }
  } catch {
    // ignore corrupted file
  }
  return [];
}

function writeLeaderboard(entries) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2));
  } catch {
    // ignore write errors
  }
}

function sanitizeString(value, maxLength = 200) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function sanitizeInt(value, max) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.min(n, max);
}

function cleanEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase().slice(0, 320) : '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function getAction(req) {
  const q = req.query || {};
  if (q.submit !== undefined) return 'submit';
  if (q['opt-out'] !== undefined) return 'opt-out';
  const segments = (req.url || '').split('?')[0].replace(/\/+$/, '').split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (last === 'submit') return 'submit';
  if (last === 'opt-out') return 'opt-out';
  return 'list';
}

function sortedPublic(entries) {
  return entries
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
}

export default async function handler(req, res) {
  const { method } = req;
  const action = getAction(req);

  // ── POST /api/v1/leaderboard/submit — upsert an opt-in entry ────────────
  if (method === 'POST' && action === 'submit') {
    const { name, email, occupation, concepts_passed, domains_completed, streak, opted_in } = req.body || {};
    if (!opted_in) return res.status(400).json({ error: 'User did not opt in' });

    const cleanName = sanitizeString(name, 100);
    const cleanEmailAddress = cleanEmail(email);
    const cleanOccupation = sanitizeString(occupation, 100);

    if (!cleanName || !cleanEmailAddress) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    let leaderboard = readLeaderboard();
    const entryIndex = leaderboard.findIndex(e => e.email === cleanEmailAddress);

    const entry = {
      name: cleanName.split(' ')[0],
      email: cleanEmailAddress,
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

    leaderboard = leaderboard.sort((a, b) => b.concepts_passed - a.concepts_passed).slice(0, MAX_ENTRIES);
    writeLeaderboard(leaderboard);

    return res.status(200).json({ message: 'Stats updated', status: 'success' });
  }

  // ── POST /api/v1/leaderboard/opt-out — remove an entry by email ─────────
  if (method === 'POST' && action === 'opt-out') {
    const cleanEmailAddress = cleanEmail((req.body || {}).email);
    if (!cleanEmailAddress) return res.status(400).json({ error: 'email is required' });

    const remaining = readLeaderboard().filter(e => e.email !== cleanEmailAddress);
    writeLeaderboard(remaining);
    return res.status(200).json({ message: 'Removed from leaderboard' });
  }

  // ── GET /api/v1/leaderboard — public top-50 listing ─────────────────────
  if (method === 'GET') {
    return res.status(200).json(sortedPublic(readLeaderboard()));
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${method} Not Allowed` });
}