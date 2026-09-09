export default async function handler(req, res) {
  const { title, domain, category } = req.query

  if (!title) {
    return res.status(400).json({ error: 'title query param required' })
  }

  const DOMAIN_COLORS = {
    DSA: '#3b82f6',
    ML: '#f59e0b',
    Frontend: '#8b5cf6',
    Backend: '#10b981',
    'Software Engineering': '#f43f5e',
  }

  const color = DOMAIN_COLORS[domain] || '#3b82f6'
  const decodedTitle = decodeURIComponent(title).slice(0, 60)
  const decodedDomain = domain ? decodeURIComponent(domain) : ''
  const decodedCategory = category ? decodeURIComponent(category) : ''

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0d0d0f"/>
      <stop offset="100%" style="stop-color:#141418"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${color}"/>
      <stop offset="100%" style="stop-color:${color}88"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>

  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1c1c22" stroke-width="1"/>
  </pattern>
  <rect width="1200" height="630" fill="url(#grid)" opacity="0.5"/>

  <rect x="80" y="200" width="6" height="120" rx="3" fill="url(#accent)"/>

  <text x="110" y="250" font-family="Inter, system-ui, sans-serif" font-size="52" font-weight="800" fill="white">${escapeXml(decodedTitle)}</text>

  ${decodedDomain ? `<rect x="110" y="290" width="${decodedDomain.length * 12 + 24}" height="32" rx="8" fill="${color}22" stroke="${color}" stroke-width="1"/>
  <text x="122" y="312" font-family="Inter, system-ui, sans-serif" font-size="14" font-weight="700" fill="${color}">${escapeXml(decodedDomain)}</text>` : ''}

  ${decodedCategory ? `<text x="${(decodedDomain.length * 12 + 48) + 120}" y="312" font-family="Inter, system-ui, sans-serif" font-size="14" font-weight="500" fill="#6b7280">${escapeXml(decodedCategory)}</text>` : ''}

  <text x="80" y="560" font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="700" fill="#4b5563">Learn Blazingly Fast</text>
  <text x="80" y="585" font-family="Inter, system-ui, sans-serif" font-size="13" fill="#374151">learnblazinglyfast.tech</text>

  <circle cx="1050" cy="150" r="180" fill="${color}" opacity="0.05"/>
  <circle cx="1100" cy="200" r="120" fill="${color}" opacity="0.08"/>
</svg>`.trim()

  res.setHeader('Content-Type', 'image/svg+xml')
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800')
  res.send(svg)
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
