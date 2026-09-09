import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'reviews.json');
const ADMIN_TOKEN = process.env.REVIEWS_ADMIN_TOKEN || 'lbf-admin-dev-token';

function readReviews() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch {
    // ignore corrupted file
  }
  return [];
}

function writeReviews(reviews) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(reviews, null, 2));
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

function reviewId(review) {
  return typeof review.id === 'string' ? review.id : review.submitted_at;
}

function requireAdmin(req, res) {
  const token = req.headers['x-admin-token'] || req.query.adminToken;
  if (typeof token !== 'string' || token !== ADMIN_TOKEN) {
    res.status(401).json({ error: 'Invalid admin token' });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  // ── Public: create a new review (pending approval) ─────────────────────
  if (method === 'POST') {
    const { name, review_text, occupation, concepts_seen_count, rating } = req.body || {};
    const cleaned = {
      name: sanitizeString(name, 100),
      occupation: sanitizeString(occupation, 100),
      review_text: sanitizeString(review_text, 2000),
      concepts_seen_count: sanitizeInt(concepts_seen_count, 9999),
      rating: Math.min(Math.max(sanitizeInt(rating, 5), 0), 5)
    };

    if (!cleaned.name || !cleaned.review_text) {
      return res.status(400).json({ error: 'name and review_text are required' });
    }

    const reviews = readReviews();
    const submitted_at = new Date().toISOString();
    const nid = `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    reviews.push({ ...cleaned, id: nid, submitted_at, approved: false });
    writeReviews(reviews);

    return res.status(201).json({
      message: 'Review saved. Awaiting approval.',
      status: 'success'
    });
  }

  // ── Public: list only approved reviews ─────────────────────────────────
  if (method === 'GET' && !id) {
    const reviews = readReviews();
    const approved = reviews.filter(r => r.approved === true);
    const publicReviews = approved.map(r => ({
      id: reviewId(r),
      first_name: r.name ? r.name.split(' ')[0] : 'Anonymous',
      occupation: r.occupation,
      review_text: r.review_text,
      submitted_at: r.submitted_at,
      concepts_seen_count: r.concepts_seen_count || 0
    }));
    return res.status(200).json(publicReviews);
  }

  // ── Admin: list all reviews (pending + approved) ───────────────────────
  if (method === 'GET' && id === 'admin') {
    if (!requireAdmin(req, res)) return;
    const reviews = readReviews();
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
    return res.status(200).json(all);
  }

  // ── Admin: approve / unapprove a review ────────────────────────────────
  if (method === 'PATCH') {
    if (!requireAdmin(req, res)) return;
    const { approved } = req.body || {};
    const reviews = readReviews();
    const target = reviews.find(r => reviewId(r) === id);
    if (!target) return res.status(404).json({ error: 'Review not found' });
    target.approved = approved === true;
    writeReviews(reviews);
    return res.status(200).json({ message: approved ? 'Review approved' : 'Review unapproved', id, approved: target.approved });
  }

  // ── Admin: delete a review ─────────────────────────────────────────────
  if (method === 'DELETE') {
    if (!requireAdmin(req, res)) return;
    const reviews = readReviews();
    const before = reviews.length;
    const remaining = reviews.filter(r => reviewId(r) !== id);
    if (remaining.length === before) return res.status(404).json({ error: 'Review not found' });
    writeReviews(remaining);
    return res.status(200).json({ message: 'Review deleted', id });
  }

  res.setHeader('Allow', ['POST', 'GET', 'PATCH', 'DELETE']);
  return res.status(405).json({ error: `Method ${method} Not Allowed` });
}
