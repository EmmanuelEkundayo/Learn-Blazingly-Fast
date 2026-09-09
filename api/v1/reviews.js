import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'dummy-reviews.json');

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

export default async function handler(req, res) {
  if (req.method === 'POST') {
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
    reviews.push({ ...cleaned, submitted_at: new Date().toISOString() });
    writeReviews(reviews);

    return res.status(201).json({
      message: 'Review saved.',
      status: 'success'
    });
  }

  if (req.method === 'GET') {
    const reviews = readReviews();
    const publicReviews = reviews.map(r => ({
      first_name: r.name ? r.name.split(' ')[0] : 'Anonymous',
      occupation: r.occupation,
      review_text: r.review_text,
      submitted_at: r.submitted_at,
      concepts_seen_count: r.concepts_seen_count || 0
    }));
    return res.status(200).json(publicReviews);
  }

  res.setHeader('Allow', ['POST', 'GET']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}