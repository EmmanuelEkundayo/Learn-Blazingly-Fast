const apiSecurity = {
  id: 'api-security',
  title: 'API Security',
  color: 'red',
  category: 'Backend',
  description: 'Authentication, JWT, OAuth2, CORS, vulnerabilities, and security headers',
  sections: [
    {
      title: 'Authentication vs Authorization',
      items: [
        { label: 'Authentication: verify identity (who are you?)', language: 'text', code: `Authentication answers: "Who are you?"
Steps: receive credentials, verify against store, issue session/token
Examples: username+password, OAuth login, API key, biometric
Happens first - you cannot authorize an unknown identity` },
        { label: 'Authorization: check permissions (what can you do?)', language: 'text', code: `Authorization answers: "What are you allowed to do?"
Steps: identify the user, look up their role/permissions, allow or deny
Examples: admin can DELETE, viewer can only GET
Happens after authentication` },
        { label: 'Common auth patterns compared', language: 'text', code: `Session/Cookie  - server stores state, client sends session ID
JWT             - stateless, client stores signed token
API Key         - long-lived secret for service-to-service
OAuth2          - delegated access, user grants app permission
mTLS            - mutual TLS, both client and server present certs` },
        { label: 'Principle of least privilege', language: 'text', code: `Grant only the minimum permissions needed to do the job.

Examples:
- Read-only DB user for analytics service
- Scoped API keys (read:orders not admin)
- Short-lived tokens over long-lived ones
- Separate service accounts per microservice` },
        { label: 'AuthN before AuthZ middleware order (Express)', language: 'javascript', code: `app.use(authenticate)   // verify token first
app.use(authorize)      // then check permissions

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  req.user = jwt.verify(token, process.env.JWT_SECRET)
  next()
}

function authorize(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: 'Forbidden' })
    next()
  }
}`, note: '401 Unauthorized means not authenticated; 403 Forbidden means not authorized' },
        { label: 'Session vs JWT tradeoffs', language: 'text', code: `Sessions:
  + Easy to invalidate immediately (delete from store)
  + Smaller data sent per request
  - Requires shared session store (Redis) for horizontal scale

JWT:
  + Stateless - no DB lookup per request
  + Works across services / microservices
  - Cannot invalidate before expiry without a denylist` },
      ]
    },
    {
      title: 'JWT (JSON Web Tokens)',
      items: [
        { label: 'JWT structure: header.payload.signature', language: 'text', code: `eyJhbGciOiJIUzI1NiJ9   <- header  (base64url: {"alg":"HS256"})
.
eyJ1c2VySWQiOiIxMjMifQ  <- payload (base64url: {"userId":"123"})
.
SflKxwRJSMeKKF2QT4fwpM  <- signature (HMAC of header+payload with secret)

The payload is base64 encoded, NOT encrypted.
Anyone can decode it. Never store passwords or PII in the payload.` },
        { label: 'Sign a JWT (Node.js)', language: 'javascript', code: `const jwt = require('jsonwebtoken')

const accessToken = jwt.sign(
  { userId: user.id, role: user.role },  // payload
  process.env.JWT_SECRET,                // secret
  { expiresIn: '15m' }                   // short-lived
)

const refreshToken = jwt.sign(
  { userId: user.id },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
)`, note: 'Store refresh token in httpOnly cookie, send access token in response body' },
        { label: 'Verify a JWT and handle errors', language: 'javascript', code: `function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw new Error('Token expired')
    if (err.name === 'JsonWebTokenError') throw new Error('Invalid token')
    throw err
  }
}` },
        { label: 'Access token + refresh token flow', language: 'text', code: `1. User logs in - server returns:
   - access token  (15m, in response body)
   - refresh token (7d, in httpOnly cookie)

2. Client sends access token in Authorization header:
   Authorization: Bearer <access_token>

3. Access token expires - client calls /auth/refresh
   Server reads httpOnly cookie, verifies refresh token,
   issues new access token

4. Logout - server invalidates refresh token in DB` },
        { label: 'Store refresh token in httpOnly cookie', language: 'javascript', code: `res.cookie('refreshToken', refreshToken, {
  httpOnly: true,   // not accessible via JS
  secure: true,     // HTTPS only
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days in ms
})`, note: 'httpOnly prevents XSS from stealing the token; sameSite prevents CSRF' },
        { label: 'JWKS endpoint for RS256 public key verification', language: 'javascript', code: `// Server exposes public keys at /.well-known/jwks.json
// Consumers verify tokens without sharing the private key

const jwksClient = require('jwks-rsa')
const client = jwksClient({ jwksUri: 'https://auth.example.com/.well-known/jwks.json' })

jwt.verify(token, getKey, { algorithms: ['RS256'] }, callback)

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    callback(null, key.getPublicKey())
  })
}`, note: 'RS256 uses asymmetric keys - private key to sign, public key to verify' },
        { label: 'JWT security checklist', language: 'text', code: `- Use HS256 or RS256, never "none" algorithm
- Always verify the signature before trusting the payload
- Set short expiry on access tokens (15m)
- Rotate JWT secrets periodically
- Validate iss (issuer) and aud (audience) claims
- Never log JWTs in plain text` },
      ]
    },
    {
      title: 'OAuth2 Flows',
      items: [
        { label: 'Authorization Code flow - for user-facing apps', language: 'text', code: `1. App redirects user to provider:
   GET https://provider.com/auth
     ?response_type=code
     &client_id=CLIENT_ID
     &redirect_uri=https://yourapp.com/callback
     &scope=read:profile
     &state=random_csrf_token

2. User logs in at provider, grants permission
3. Provider redirects to: /callback?code=AUTH_CODE&state=...
4. Server verifies state, exchanges code for tokens:
   POST https://provider.com/token
     { code, client_id, client_secret, redirect_uri }
5. Provider returns access_token + refresh_token` },
        { label: 'PKCE extension for SPAs and mobile apps', language: 'javascript', code: `// 1. Generate code verifier (random, 43-128 chars)
const codeVerifier = base64url(crypto.randomBytes(32))

// 2. Derive code challenge
const codeChallenge = base64url(
  crypto.createHash('sha256').update(codeVerifier).digest()
)

// 3. Include code_challenge in auth request
const authUrl = \`https://provider.com/auth
  ?response_type=code
  &code_challenge=\${codeChallenge}
  &code_challenge_method=S256\`

// 4. Send code_verifier (not challenge) when exchanging code for token`, note: 'PKCE replaces client_secret for public clients that cannot safely store secrets' },
        { label: 'Client Credentials flow - service to service (M2M)', language: 'javascript', code: `// No user involved - server authenticates as itself
const response = await fetch('https://auth.example.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    scope: 'read:orders write:inventory'
  })
})
const { access_token } = await response.json()`, note: 'Use for background jobs, cron tasks, or API calls between your own services' },
        { label: 'Implicit flow - deprecated, do not use', language: 'text', code: `The Implicit flow returned tokens directly in the URL fragment.
This is deprecated because:
- Tokens leak in browser history, referrer headers, and logs
- No refresh tokens
- No client authentication

Use Authorization Code + PKCE instead for all public clients.` },
        { label: 'OAuth2 scopes - limiting access', language: 'text', code: `Scopes define what the token is allowed to do.

Examples:
  read:profile    - read user profile only
  write:posts     - create and update posts
  admin           - full access (avoid granting broadly)

Request minimum scopes needed.
Users see requested scopes on the consent screen.
Your server validates scope before each operation.` },
        { label: 'state parameter - CSRF protection', language: 'javascript', code: `// Before redirecting to provider, generate and store state
const state = crypto.randomBytes(16).toString('hex')
req.session.oauthState = state

// In callback, verify state matches
app.get('/callback', (req, res) => {
  if (req.query.state !== req.session.oauthState) {
    return res.status(400).json({ error: 'State mismatch - possible CSRF' })
  }
  // proceed with code exchange
})` },
      ]
    },
    {
      title: 'API Keys',
      items: [
        { label: 'Generate a cryptographically secure API key', language: 'javascript', code: `const crypto = require('crypto')

// 32 bytes = 256 bits of entropy, base64url encoded
function generateApiKey() {
  return crypto.randomBytes(32).toString('base64url')
}
// Example output: "Zt3mKpL9Xv2wQnRsHjY8cDfA1bG5eI0u"`, note: 'Never use Math.random() or UUIDs for security-sensitive keys' },
        { label: 'Hash the API key before storing in the database', language: 'javascript', code: `const bcrypt = require('bcrypt')

// On creation: hash and store, return plain key once to user
async function createApiKey(userId) {
  const plainKey = generateApiKey()
  const hash = await bcrypt.hash(plainKey, 12)
  await db.apiKeys.insert({ userId, hash, createdAt: new Date() })
  return plainKey  // shown to user once, never stored again
}

// On request: find by prefix, verify hash
async function verifyApiKey(plainKey) {
  const record = await db.apiKeys.findByPrefix(plainKey.slice(0, 8))
  return record && bcrypt.compare(plainKey, record.hash)
}`, note: 'Store only the hash; the user is responsible for saving their key' },
        { label: 'Send API key in X-API-Key header (not query param)', language: 'bash', code: `# Correct: key in header (does not appear in server logs)
curl -H "X-API-Key: your_api_key_here" https://api.example.com/v1/data

# Wrong: key in query string (logged in access logs, browser history)
curl "https://api.example.com/v1/data?api_key=your_key"` },
        { label: 'Scope API keys to specific permissions', language: 'javascript', code: `// Store scopes with the key
const keyRecord = {
  hash: hashedKey,
  scopes: ['read:orders', 'read:products'],  // not 'write' or 'admin'
  userId: 'user_123',
  expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)  // 90 days
}

// Middleware checks scope
function requireScope(scope) {
  return (req, res, next) => {
    if (!req.apiKey.scopes.includes(scope))
      return res.status(403).json({ error: \`Missing scope: \${scope}\` })
    next()
  }
}` },
        { label: 'Key rotation and revocation', language: 'javascript', code: `// Soft delete: mark as revoked, keep for audit log
async function revokeApiKey(keyId, userId) {
  await db.apiKeys.update(keyId, {
    revokedAt: new Date(),
    revokedBy: userId
  })
  // Optionally: clear from cache immediately
  await cache.del(\`apikey:\${keyId}\`)
}

// Rotation: create new key, invalidate old one
async function rotateApiKey(oldKeyId, userId) {
  const newKey = await createApiKey(userId)
  await revokeApiKey(oldKeyId, userId)
  return newKey
}`, note: 'Revoke compromised keys immediately; rotate all keys on a schedule (e.g., 90 days)' },
        { label: 'Rate limit per API key', language: 'javascript', code: `const rateLimit = require('express-rate-limit')
const RedisStore = require('rate-limit-redis')

const apiKeyLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,
  keyGenerator: (req) => req.apiKey.id,  // limit per key, not per IP
  store: new RedisStore({ client: redisClient }),
  handler: (req, res) => res.status(429).json({
    error: 'Rate limit exceeded',
    retryAfter: res.getHeader('Retry-After')
  })
})` },
      ]
    },
    {
      title: 'HTTPS and TLS',
      items: [
        { label: 'TLS 1.3 minimum - enforce in Nginx', language: 'bash', code: `# /etc/nginx/nginx.conf
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;  # TLS 1.3 handles this automatically
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

# Verify with:
openssl s_client -connect example.com:443 -tls1_2
nmap --script ssl-enum-ciphers -p 443 example.com`, note: 'TLS 1.0 and 1.1 are deprecated; TLS 1.3 is significantly faster with 1 RTT handshake' },
        { label: 'HSTS - Strict-Transport-Security header', language: 'bash', code: `# Tell browsers to always use HTTPS for this domain
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

# Nginx config
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# After setting this header, submit domain to:
# https://hstspreload.org (browsers hard-code HTTPS for your domain)`, note: 'Start with a small max-age like 300 seconds, test, then increase to 31536000 (1 year)' },
        { label: 'Redirect all HTTP to HTTPS in Nginx', language: 'bash', code: `server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name example.com www.example.com;
    # ... ssl config
}` },
        { label: 'Free TLS certificate with Let\'s Encrypt (Certbot)', language: 'bash', code: `# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain and install certificate
sudo certbot --nginx -d example.com -d www.example.com

# Auto-renewal is set up automatically; test with:
sudo certbot renew --dry-run

# Certificates expire every 90 days; certbot renews 30 days before expiry` },
        { label: 'SAN certificate for multiple domains', language: 'bash', code: `# Subject Alternative Names allow one cert for multiple domains
# Let's Encrypt with multiple -d flags
sudo certbot certonly --nginx \
  -d example.com \
  -d www.example.com \
  -d api.example.com \
  -d app.example.com

# Verify SAN entries:
openssl x509 -in cert.pem -text -noout | grep -A1 "Subject Alternative"` },
        { label: 'Check for mixed content issues', language: 'javascript', code: `// Browser Console: look for "Mixed Content" warnings
// Mixed content: HTTPS page loads HTTP resource (image, script, etc.)

// Content Security Policy to block mixed content:
Content-Security-Policy: upgrade-insecure-requests

// Or report only:
Content-Security-Policy-Report-Only: block-all-mixed-content; report-uri /csp-report`, note: 'Mixed content allows MITM attacks to intercept the insecure sub-resource' },
      ]
    },
    {
      title: 'CORS (Cross-Origin Resource Sharing)',
      items: [
        { label: 'What CORS does and when it applies', language: 'text', code: `CORS is a browser security feature. It does NOT protect server-to-server requests.

A "cross-origin" request: different protocol, domain, or port.
  Origin A: https://app.example.com
  Origin B: https://api.example.com  <- cross-origin

The browser sends the request but blocks the response
unless the server returns the correct CORS headers.` },
        { label: 'Basic CORS headers in Express', language: 'javascript', code: `const cors = require('cors')

app.use(cors({
  origin: 'https://app.example.com',  // specific origin, not '*'
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,  // allow cookies and auth headers
  maxAge: 86400       // preflight result cached for 24h
}))`, note: 'Never use wildcard * with credentials: true - browsers reject this combination' },
        { label: 'Access-Control-Allow-Origin: specific origin for credentialed requests', language: 'javascript', code: `// Wrong: wildcard with credentials does not work
res.header('Access-Control-Allow-Origin', '*')
res.header('Access-Control-Allow-Credentials', 'true')  // browsers will block this

// Correct: reflect the specific allowed origin
const allowedOrigins = ['https://app.example.com', 'https://admin.example.com']
const origin = req.headers.origin
if (allowedOrigins.includes(origin)) {
  res.header('Access-Control-Allow-Origin', origin)
  res.header('Vary', 'Origin')  // tells CDN to cache per-origin
}` },
        { label: 'Preflight OPTIONS request', language: 'text', code: `Browser sends OPTIONS request before non-simple requests.
Non-simple = uses PUT/DELETE/PATCH, or custom headers, or JSON content-type.

OPTIONS /api/data HTTP/1.1
Origin: https://app.example.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type, Authorization

Server must respond with 200 or 204 and:
  Access-Control-Allow-Origin: https://app.example.com
  Access-Control-Allow-Methods: POST, GET, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization` },
        { label: 'Handle preflight in Express without a library', language: 'javascript', code: `app.options('*', (req, res) => {
  const origin = req.headers.origin
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    res.header('Access-Control-Allow-Credentials', 'true')
    res.header('Access-Control-Max-Age', '86400')
  }
  res.sendStatus(204)
})` },
        { label: 'Exposing custom response headers to the browser', language: 'javascript', code: `// By default, only "safe" headers are accessible in JS:
// Cache-Control, Content-Language, Content-Type, Expires, Last-Modified, Pragma

// To expose custom headers like X-Request-ID or X-RateLimit-Remaining:
res.header('Access-Control-Expose-Headers', 'X-Request-ID, X-RateLimit-Remaining')`, note: 'Without this, response.headers.get("X-Request-ID") returns null in the browser' },
      ]
    },
    {
      title: 'Common Vulnerabilities',
      items: [
        { label: 'SQL Injection - use parameterized queries', language: 'javascript', code: `// Vulnerable: string concatenation
const query = "SELECT * FROM users WHERE id = " + req.params.id
// Attacker sends: id=1 OR 1=1 -- (dumps all users)

// Safe: parameterized query (pg)
const { rows } = await pool.query(
  'SELECT * FROM users WHERE id = $1',
  [req.params.id]
)

// Safe: ORM (Prisma)
const user = await prisma.user.findUnique({ where: { id: req.params.id } })`, note: 'Parameterized queries prevent injection because data is never interpreted as SQL' },
        { label: 'XSS (Cross-Site Scripting) - sanitize and escape output', language: 'javascript', code: `// Stored XSS: attacker saves <script>...</script> in DB, served to other users
// Reflected XSS: malicious input echoed back in response
// DOM XSS: client-side JS writes attacker-controlled data to the DOM

// Server-side: escape HTML entities before rendering
const escapeHtml = (str) => str
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

// Client-side: use DOMPurify for user-generated HTML
import DOMPurify from 'dompurify'
element.innerHTML = DOMPurify.sanitize(userContent)`, note: 'React escapes JSX values by default; avoid dangerouslySetInnerHTML with unvalidated input' },
        { label: 'CSRF - SameSite cookie + CSRF token', language: 'javascript', code: `// SameSite=Strict or Lax prevents cookie from being sent cross-origin
res.cookie('sessionId', id, { sameSite: 'strict', httpOnly: true, secure: true })

// For extra protection on state-changing routes: CSRF token
const csrf = require('csurf')
app.use(csrf())

app.get('/form', (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() })
})
// Form includes: <input type="hidden" name="_csrf" value="<%= csrfToken %>">` },
        { label: 'SSRF - validate and allowlist outbound URLs', language: 'javascript', code: `// Vulnerable: server fetches user-supplied URL
app.post('/fetch', async (req, res) => {
  const data = await fetch(req.body.url)  // attacker can request internal services
})

// Safe: validate against allowlist
const ALLOWED_HOSTS = ['api.example.com', 'cdn.example.com']

function validateUrl(urlString) {
  const url = new URL(urlString)
  if (!ALLOWED_HOSTS.includes(url.hostname)) throw new Error('Host not allowed')
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid protocol')
  return url
}`, note: 'SSRF lets attackers reach internal services like metadata APIs (169.254.169.254) or databases' },
        { label: 'IDOR - check ownership before returning resource', language: 'javascript', code: `// Vulnerable: trusts ID in URL without ownership check
app.get('/orders/:id', async (req, res) => {
  const order = await db.orders.findById(req.params.id)
  res.json(order)  // attacker changes :id to see other users' orders
})

// Safe: scope query to authenticated user
app.get('/orders/:id', authenticate, async (req, res) => {
  const order = await db.orders.findOne({
    id: req.params.id,
    userId: req.user.id  // ownership check
  })
  if (!order) return res.status(404).json({ error: 'Not found' })
  res.json(order)
})`, note: 'Always filter by authenticated user ID; use 404 (not 403) to avoid confirming resource existence' },
        { label: 'Mass Assignment - allowlist accepted fields', language: 'javascript', code: `// Vulnerable: spreading entire request body
app.post('/users', async (req, res) => {
  await db.users.create({ ...req.body })  // attacker sends { role: 'admin' }
})

// Safe: pick only allowed fields explicitly
const ALLOWED_FIELDS = ['name', 'email', 'bio']

app.post('/users', async (req, res) => {
  const data = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => ALLOWED_FIELDS.includes(k))
  )
  await db.users.create(data)
})` },
      ]
    },
    {
      title: 'Rate Limiting and Throttling',
      items: [
        { label: 'Token bucket algorithm', language: 'text', code: `Token Bucket:
- Bucket holds up to N tokens (capacity)
- Tokens are added at a fixed rate (e.g., 10 per second)
- Each request consumes one token
- If bucket is empty, request is rejected (429)
- Allows bursts up to bucket capacity

Use when: you want to allow short bursts but enforce sustained rate` },
        { label: 'Sliding window rate limiting with Redis', language: 'javascript', code: `async function slidingWindowLimit(key, limit, windowSeconds) {
  const now = Date.now()
  const windowStart = now - windowSeconds * 1000

  await redis.zremrangebyscore(key, '-inf', windowStart)   // remove old entries
  const count = await redis.zcard(key)                     // count in window
  if (count >= limit) return false                         // over limit

  await redis.zadd(key, now, now.toString())               // add current request
  await redis.expire(key, windowSeconds)
  return true
}`, note: 'Sliding window avoids the boundary spike problem of fixed windows' },
        { label: 'Rate limit headers', language: 'text', code: `Include these headers on every response so clients can self-throttle:

X-RateLimit-Limit: 100          <- requests allowed per window
X-RateLimit-Remaining: 43       <- requests left in current window
X-RateLimit-Reset: 1711929600   <- Unix timestamp when window resets
Retry-After: 30                 <- seconds until client may retry (on 429)` },
        { label: 'Rate limit by both IP and user ID', language: 'javascript', code: `const rateLimit = require('express-rate-limit')

// Unauthenticated: limit by IP
const ipLimiter = rateLimit({ windowMs: 60000, max: 30 })

// Authenticated: limit by user ID (higher limit)
const userLimiter = rateLimit({
  windowMs: 60000,
  max: 200,
  keyGenerator: (req) => req.user?.id || req.ip
})

app.use('/api/', ipLimiter)
app.use('/api/authenticated/', userLimiter)`, note: 'IP-based limits alone are bypassable with proxies; combine with user-level limits' },
        { label: 'Return 429 Too Many Requests with Retry-After', language: 'javascript', code: `app.use((req, res, next) => {
  const result = checkRateLimit(req)
  if (!result.allowed) {
    return res.status(429)
      .header('Retry-After', result.retryAfter)
      .header('X-RateLimit-Limit', result.limit)
      .header('X-RateLimit-Remaining', 0)
      .json({ error: 'Too many requests', retryAfter: result.retryAfter })
  }
  next()
})` },
        { label: 'Exponential backoff on the client side', language: 'javascript', code: `async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options)
    if (res.status !== 429) return res

    const retryAfter = res.headers.get('Retry-After') || Math.pow(2, i)
    await new Promise(r => setTimeout(r, retryAfter * 1000))
  }
  throw new Error('Rate limit retries exhausted')
}`, note: 'Add jitter (random delay) to prevent thundering herd: delay = baseDelay + Math.random() * 1000' },
      ]
    },
    {
      title: 'Input Validation and Sanitization',
      items: [
        { label: 'Allowlist vs denylist approach', language: 'text', code: `Allowlist (preferred): define exactly what IS valid, reject everything else
  - Phone: must match /^\\+?[1-9]\\d{1,14}$/
  - Status: must be one of ["active", "inactive", "pending"]
  - Filename: must match /^[a-zA-Z0-9._-]+$/

Denylist (fragile): try to block known bad patterns
  - Block "<script>" but attacker uses "<Script>" or "%3Cscript%3E"
  - Always incomplete - new attack vectors bypass it

Use allowlist validation for all user input.` },
        { label: 'Schema validation with Zod (Node.js)', language: 'javascript', code: `import { z } from 'zod'

const CreateUserSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email(),
  age: z.number().int().min(0).max(120),
  role: z.enum(['user', 'moderator']),  // never accept 'admin' from client
})

app.post('/users', (req, res) => {
  const result = CreateUserSchema.safeParse(req.body)
  if (!result.success) return res.status(422).json({ errors: result.error.issues })
  // result.data is now typed and validated
})`, note: 'Validate at the boundary: before any DB query, business logic, or external call' },
        { label: 'Parameterized queries for database calls', language: 'javascript', code: `// PostgreSQL (pg)
await pool.query('SELECT * FROM users WHERE id = $1 AND active = $2', [userId, true])

// MySQL (mysql2)
await connection.execute('SELECT * FROM users WHERE email = ?', [email])

// SQLite (better-sqlite3)
const stmt = db.prepare('SELECT * FROM posts WHERE user_id = ?')
const posts = stmt.all(userId)` },
        { label: 'Validate Content-Type and limit request body size', language: 'javascript', code: `const express = require('express')
app.use(express.json({ limit: '100kb' }))  // reject bodies over 100KB

// Enforce content-type on POST/PUT endpoints
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (!req.is('application/json')) {
      return res.status(415).json({ error: 'Unsupported Media Type' })
    }
  }
  next()
})`, note: 'Without a size limit, attackers can send multi-GB bodies to exhaust memory' },
        { label: 'Validate file upload by content, not extension', language: 'javascript', code: `const fileType = require('file-type')

app.post('/upload', upload.single('file'), async (req, res) => {
  const type = await fileType.fromBuffer(req.file.buffer)

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  if (!type || !ALLOWED_TYPES.includes(type.mime)) {
    return res.status(400).json({ error: 'Invalid file type' })
  }

  // Rename file to random name, never use original filename
  const filename = crypto.randomBytes(16).toString('hex') + '.' + type.ext
})`, note: 'Extension check is trivially bypassed by renaming evil.php to image.jpg' },
        { label: 'DOMPurify for user-generated HTML sanitization', language: 'javascript', code: `import DOMPurify from 'dompurify'

// Allow limited formatting, strip everything else
const clean = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'p', 'br'],
  ALLOWED_ATTR: ['href', 'target'],
  FORCE_HTTPS: true
})

document.getElementById('preview').innerHTML = clean`, note: 'Never set innerHTML with raw user content even if you think you\'ve validated it' },
      ]
    },
    {
      title: 'Security Headers',
      items: [
        { label: 'Content-Security-Policy (CSP)', language: 'bash', code: `# Restrict where resources can be loaded from
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.example.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'

# Start in report-only mode to find violations before enforcing:
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report`, note: 'CSP is the most effective defense against XSS; build it incrementally using report-only first' },
        { label: 'X-Frame-Options: DENY against clickjacking', language: 'bash', code: `# Prevent page from being embedded in iframes (clickjacking)
X-Frame-Options: DENY             # never allow in a frame
X-Frame-Options: SAMEORIGIN       # allow only from same origin

# Modern equivalent via CSP (preferred, more flexible):
Content-Security-Policy: frame-ancestors 'none'` },
        { label: 'X-Content-Type-Options: nosniff', language: 'bash', code: `# Stop browser from MIME-sniffing the content type
X-Content-Type-Options: nosniff

# Without this: browser may execute a .jpg file as JavaScript if it detects JS code
# With nosniff: browser strictly follows the Content-Type header you set` },
        { label: 'Referrer-Policy', language: 'bash', code: `# Control how much referrer information is sent with requests
Referrer-Policy: strict-origin-when-cross-origin

# Same-origin: sends full URL; Cross-origin: sends only origin (no path/query)
# Options from most to least permissive:
# unsafe-url, no-referrer-when-downgrade, strict-origin-when-cross-origin, same-origin, no-referrer` },
        { label: 'Permissions-Policy (formerly Feature-Policy)', language: 'bash', code: `# Disable browser features your app does not use
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()

# Allow geolocation only for same origin:
Permissions-Policy: geolocation=(self)

# Express / Helmet:
app.use(helmet.permittedCrossDomainPolicies())` },
        { label: 'Set all security headers with Helmet (Express)', language: 'javascript', code: `const helmet = require('helmet')

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.example.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}))`, note: 'Helmet is a collection of 15 middleware functions, each setting a security header' },
      ]
    },
  ]
}

export default apiSecurity
