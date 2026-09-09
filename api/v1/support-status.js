import fs from 'fs';
import path from 'path';

const REQUEST_FILE = path.join(process.cwd(), 'data', 'support-status.json');

function readEmails() {
  try {
    if (fs.existsSync(REQUEST_FILE)) {
      const raw = JSON.parse(fs.readFileSync(REQUEST_FILE, 'utf8'));
      return Array.isArray(raw) ? raw : [];
    }
  } catch {
    // ignore corrupted file
  }
  return [];
}

function writeEmails(emails) {
  try {
    fs.mkdirSync(path.dirname(REQUEST_FILE), { recursive: true });
    fs.writeFileSync(REQUEST_FILE, JSON.stringify(emails, null, 2));
  } catch {
    // ignore write errors
  }
}

function sanitizeEmail(value, maxLength = 320) {
  const email = typeof value === 'string' ? value.trim().toLowerCase().slice(0, maxLength) : '';
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email) ? email : '';
}

export function markEmailCompleted(email) {
  const clean = sanitizeEmail(email);
  if (!clean) return;
  const emails = readEmails();
  if (!emails.includes(clean)) {
    emails.push(clean);
    writeEmails(emails);
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { email } = req.query;
    const clean = sanitizeEmail(email);
    if (!clean) {
      return res.status(400).json({ error: 'A valid email parameter is required' });
    }

    const emails = readEmails();
    return res.status(200).json({
      completed: emails.includes(clean)
    });
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}