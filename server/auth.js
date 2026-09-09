import { Router } from 'express';
import bcrypt from 'bcrypt';
import { Store } from './store.js';
import { signToken, requireAuth, COOKIE_NAME } from './middleware.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const users = new Store(path.join(__dirname, 'data', 'users.json'));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function sanitizeUser(user) {
  return { name: user.name, email: user.email };
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ error: 'Name must be 2-100 characters' });
    }
    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = users.findById(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = users.upsert(cleanEmail, {
      name: name.trim(),
      email: cleanEmail,
      password: hashed,
      created_at: new Date().toISOString(),
    });

    const token = signToken({ name: user.name, email: user.email });
    res.cookie(COOKIE_NAME, token, cookieOptions());
    res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = users.findById(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({ name: user.name, email: user.email });
    res.cookie(COOKIE_NAME, token, cookieOptions());
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  res.json({ message: 'Logged out' });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: { name: req.user.name, email: req.user.email } });
});

router.put('/profile', requireAuth, (req, res) => {
  const { name } = req.body || {};
  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
    return res.status(400).json({ error: 'Name must be 2-100 characters' });
  }

  const user = users.findById(req.user.email);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const updated = users.upsert(req.user.email, {
    ...user,
    name: name.trim(),
  });

  const token = signToken({ name: updated.name, email: updated.email });
  res.cookie(COOKIE_NAME, token, cookieOptions());
  res.json({ user: sanitizeUser(updated) });
});

export default router;
