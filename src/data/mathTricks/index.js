const mathTricks = [
  {
    id: 'collatz-conjecture',
    slug: 'collatz-conjecture',
    title: 'The Collatz Conjecture',
    tagline: 'Pick any number. Halve evens, triple-plus-one odds. You always reach 1.',
    category: 'Number Theory',
    difficulty: 'beginner',
    visualization_type: 'animated',
    wow_factor: 'Despite its simple rules, this conjecture has stumped mathematicians for 85 years. Paul Erdős said "Mathematics is not yet ready for such problems."',
    explanation: `The Collatz conjecture, posed in 1937, asks whether a deceptively simple process always terminates.\n\nStarting from any positive integer n: if n is even, divide by 2. If n is odd, multiply by 3 and add 1. Repeat.\n\nThe conjecture claims you always eventually reach 1. No one has found a counterexample, but no one has proved it either.\n\nThe animation shows trajectories for starting values 2 through 13. Watch the dramatic peaks — the number 27 takes 111 steps and climbs to 9,232 before collapsing back to 1.`,
    tags: ['collatz', 'sequences', 'conjecture', 'number theory', 'iteration'],
    python_code: `import matplotlib.pyplot as plt
import numpy as np
import io, base64

def collatz(n):
    seq = [n]
    while n != 1:
        n = n // 2 if n % 2 == 0 else 3 * n + 1
        seq.append(n)
    return seq

def emit(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=70, bbox_inches='tight', facecolor='#0f1117')
    buf.seek(0)
    print('IMG:' + base64.b64encode(buf.read()).decode())
    plt.close(fig)

cmap = plt.cm.plasma
for frame in range(8):
    n_max = frame + 4
    fig, ax = plt.subplots(figsize=(5, 3.5), facecolor='#0f1117')
    ax.set_facecolor('#0f1117')
    colors = [cmap(i / max(n_max - 2, 1)) for i in range(n_max - 1)]
    for i, n in enumerate(range(2, n_max + 1)):
        ax.plot(collatz(n), color=colors[i], alpha=0.75, linewidth=1.3)
    ax.set_title(f'Collatz Sequences — start 2 to {n_max}', color='white', fontsize=10, pad=6)
    ax.set_xlabel('Steps', color='#9ca3af', fontsize=8)
    ax.set_ylabel('Value', color='#9ca3af', fontsize=8)
    ax.tick_params(colors='#6b7280', labelsize=7)
    for sp in ax.spines.values():
        sp.set_edgecolor('#374151')
    ax.grid(True, color='#1f2937', linewidth=0.4, alpha=0.8)
    fig.tight_layout()
    emit(fig)`,
  },

  {
    id: 'ulam-spiral',
    slug: 'ulam-spiral',
    title: 'The Ulam Spiral',
    tagline: 'Write integers in a spiral. Highlight the primes. Diagonal lines appear — mysteriously.',
    category: 'Number Theory',
    difficulty: 'intermediate',
    visualization_type: 'static',
    wow_factor: 'When Stanislaw Ulam doodled during a boring meeting in 1963, he discovered that prime numbers prefer diagonals — a concrete pattern that remains partially unexplained.',
    explanation: `In 1963, mathematician Stanislaw Ulam wrote integers in a clockwise spiral on graph paper, then circled all the primes.\n\nThe result was astonishing: the primes do not scatter randomly. They tend to fall on diagonal lines, suggesting that certain quadratic polynomials generate disproportionately many primes.\n\nFor example, Euler's polynomial n² + n + 41 generates primes for n = 0, 1, 2, ..., 39. This shows up as a prominent diagonal in the spiral.\n\nThe Ulam spiral remains a visual mystery — a concrete pattern without a complete theoretical explanation.`,
    tags: ['ulam', 'primes', 'spiral', 'number theory', 'pattern'],
    python_code: `import matplotlib.pyplot as plt
import numpy as np
import io, base64

N = 101
half = N // 2

def sieve(limit):
    is_p = bytearray(limit + 1)
    if limit >= 2:
        is_p[2] = 1
    for i in range(3, limit + 1, 2):
        is_p[i] = 1
    for i in range(3, int(limit**0.5) + 1, 2):
        if is_p[i]:
            for j in range(i*i, limit + 1, 2*i):
                is_p[j] = 0
    return is_p

primes = sieve(N * N)
grid = np.zeros((N, N), dtype=np.float32)

x, y = half, half
dirs = [(1, 0), (0, -1), (-1, 0), (0, 1)]
d, steps, turns = 0, 0, 0
seg_len = 1
grid[y, x] = float(primes[1])
num = 2
while num <= N * N:
    dx, dy = dirs[d]
    x += dx; y += dy
    if 0 <= x < N and 0 <= y < N:
        grid[y, x] = float(primes[num])
    num += 1
    steps += 1
    if steps == seg_len:
        steps = 0
        d = (d + 1) % 4
        turns += 1
        if turns % 2 == 0:
            seg_len += 1

fig, ax = plt.subplots(figsize=(6, 6), facecolor='#0f1117')
ax.imshow(grid, cmap='plasma', interpolation='nearest', origin='upper')
ax.set_title('Ulam Spiral — Primes align on diagonals', color='white', fontsize=11, pad=8)
ax.axis('off')
buf = io.BytesIO()
fig.savefig(buf, format='png', dpi=90, bbox_inches='tight', facecolor='#0f1117')
buf.seek(0)
print('IMG:' + base64.b64encode(buf.read()).decode())
plt.close(fig)`,
  },

  {
    id: 'eulers-formula',
    slug: 'eulers-formula',
    title: "Euler's Formula",
    tagline: "e^(iπ) + 1 = 0. Five fundamental constants. One equation.",
    category: 'Number Theory',
    difficulty: 'beginner',
    visualization_type: 'static',
    wow_factor: "Richard Feynman called Euler's identity \"the most remarkable formula in mathematics.\" It connects e, i, π, 1, and 0 — transcendental numbers, imaginary numbers, and integers — in a single shockingly elegant equation.",
    explanation: `Euler's formula states that e^(iθ) = cos(θ) + i·sin(θ) for any real number θ.\n\nWhen θ = π, we get the famous identity: e^(iπ) = −1, or equivalently e^(iπ) + 1 = 0.\n\nThis means raising the transcendental number e to an imaginary multiple of π gives exactly −1 — a connection between exponential growth, circles, and pure integers that seems almost miraculous.\n\nGeometrically, e^(iθ) traces the unit circle in the complex plane as θ varies, connecting trigonometry, complex analysis, and number theory in one compact expression.`,
    tags: ['euler', 'complex numbers', 'identity', 'e', 'pi', 'unit circle'],
    python_code: `import matplotlib.pyplot as plt
import numpy as np
import io, base64

fig, ax = plt.subplots(figsize=(6, 6), facecolor='#0f1117')
ax.set_facecolor('#0f1117')
ax.set_aspect('equal')

theta = np.linspace(0, 2 * np.pi, 300)
ax.plot(np.cos(theta), np.sin(theta), color='#374151', linewidth=1.5, alpha=0.5)

arc = np.linspace(0, np.pi, 200)
ax.plot(np.cos(arc), np.sin(arc), color='#8b5cf6', linewidth=2.5)

ax.axhline(0, color='#4b5563', linewidth=0.8)
ax.axvline(0, color='#4b5563', linewidth=0.8)

ax.annotate('', xy=(-1, 0), xytext=(0, 0),
    arrowprops=dict(arrowstyle='->', color='#f59e0b', lw=2.5))

ax.plot(0, 1, 'o', color='#34d399', markersize=9)
ax.text(0.1, 1.08, 'e^{i*pi/2} = i', color='#34d399', fontsize=9)

ax.plot(-1, 0, 'o', color='#f87171', markersize=11)
ax.text(-1.72, 0.15, "e^{i*pi} = -1", color='#f87171', fontsize=11, fontweight='bold')

ax.plot(1, 0, 'o', color='#60a5fa', markersize=9)
ax.text(1.05, 0.12, 'e^{0} = 1', color='#60a5fa', fontsize=9)

ax.set_xlim(-1.9, 1.9)
ax.set_ylim(-1.6, 1.6)
ax.set_title("Euler's Formula: e^{i*theta} = cos(theta) + i*sin(theta)", color='white', fontsize=11, pad=10)
ax.tick_params(colors='#6b7280', labelsize=8)
for sp in ax.spines.values():
    sp.set_edgecolor('#374151')
ax.grid(True, color='#1f2937', linewidth=0.5, alpha=0.5)

ax.text(0, -1.3, 'e^{i*pi} + 1 = 0', ha='center', color='#fde68a', fontsize=16, fontweight='bold',
    bbox=dict(boxstyle='round,pad=0.5', facecolor='#1c1c22', edgecolor='#4b5563'))

buf = io.BytesIO()
fig.savefig(buf, format='png', dpi=90, bbox_inches='tight', facecolor='#0f1117')
buf.seek(0)
print('IMG:' + base64.b64encode(buf.read()).decode())
plt.close(fig)`,
  },

  {
    id: 'sierpinski-triangle',
    slug: 'sierpinski-triangle',
    title: 'The Sierpiński Triangle',
    tagline: 'Pick a random vertex. Move halfway there. Repeat. A fractal emerges from pure chaos.',
    category: 'Geometry & Fractals',
    difficulty: 'beginner',
    visualization_type: 'animated',
    wow_factor: 'The "chaos game" — a purely random process — reliably produces a perfect fractal with infinite self-similarity. Order born from randomness.',
    explanation: `The Sierpiński triangle is a fractal with a remarkable property: any part of it looks like the whole.\n\nThe chaos game generates it through a surprisingly random process:\n1. Place three vertices of an equilateral triangle\n2. Start at any point inside\n3. Randomly choose one of the three vertices\n4. Move halfway to that vertex and plot the point\n5. Repeat forever\n\nNo matter how randomly you choose vertices, the points never land in the "missing" center triangles — they always form the fractal pattern.\n\nThis works because the chaos game is an iterated function system, and the Sierpiński triangle is its attractor.`,
    tags: ['sierpinski', 'fractal', 'chaos game', 'self-similarity', 'geometry'],
    python_code: `import matplotlib.pyplot as plt
import numpy as np
import io, base64

rng = np.random.default_rng(42)
vertices = np.array([[0.0, 0.0], [1.0, 0.0], [0.5, np.sqrt(3) / 2]])
FRAMES = 8
PER_FRAME = 700
total = FRAMES * PER_FRAME

choices = rng.integers(0, 3, size=total)
pts = np.empty((total + 1, 2))
pts[0] = [0.5, 0.3]
for k in range(total):
    pts[k + 1] = (pts[k] + vertices[choices[k]]) / 2

def emit(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=70, bbox_inches='tight', facecolor='#0f1117')
    buf.seek(0)
    print('IMG:' + base64.b64encode(buf.read()).decode())
    plt.close(fig)

for frame in range(FRAMES):
    n = (frame + 1) * PER_FRAME
    p = pts[:n]
    fig, ax = plt.subplots(figsize=(4.5, 4.5), facecolor='#0f1117')
    ax.set_facecolor('#0f1117')
    ax.scatter(p[:, 0], p[:, 1], s=0.25, c='#8b5cf6', alpha=0.5, linewidths=0)
    ax.set_aspect('equal')
    ax.axis('off')
    ax.set_title(f'Sierpinski Triangle — {n:,} points', color='white', fontsize=10, pad=6)
    emit(fig)`,
  },

  {
    id: 'mandelbrot-set',
    slug: 'mandelbrot-set',
    title: 'The Mandelbrot Set',
    tagline: 'An infinitely complex boundary defined by a single rule: z → z² + c.',
    category: 'Geometry & Fractals',
    difficulty: 'advanced',
    visualization_type: 'interactive',
    wow_factor: 'The Mandelbrot set has infinite complexity at every scale — zooming in forever reveals new spirals, bulbs, and mini-Mandelbrot sets. It is the most famous fractal in mathematics.',
    explanation: `The Mandelbrot set is defined by a simple iteration: starting with z = 0, repeatedly apply z → z² + c for a complex number c.\n\nA point c belongs to the Mandelbrot set if this iteration never "escapes" to infinity (|z| > 2). Points outside escape quickly; points inside never do.\n\nThe boundary between escaping and non-escaping is where the fractal lives — infinitely intricate, with tendrils and spirals at every scale.\n\nColoring works by counting how many iterations it takes to escape: slow-to-escape points are bright, non-escaping points are dark. More iterations reveal finer boundary detail.`,
    tags: ['mandelbrot', 'fractal', 'complex numbers', 'iteration', 'chaos'],
    interactive_config: {
      sliders: [
        { id: 'max_iter', label: 'Iterations', min: 10, max: 100, step: 10, default: 40 },
      ],
    },
    python_code: `import matplotlib.pyplot as plt
import numpy as np
import io, base64

xmin, xmax = -2.5, 1.0
ymin, ymax = -1.25, 1.25
W, H = 250, 200

x = np.linspace(xmin, xmax, W)
y = np.linspace(ymin, ymax, H)
C = x[np.newaxis, :] + 1j * y[:, np.newaxis]
Z = np.zeros_like(C)
M = np.zeros(C.shape, dtype=np.float32)

for i in range(max_iter):
    mask = np.abs(Z) <= 2
    Z[mask] = Z[mask] ** 2 + C[mask]
    M[mask] += 1

fig, ax = plt.subplots(figsize=(6, 5), facecolor='#0f1117')
ax.imshow(M, extent=[xmin, xmax, ymin, ymax], cmap='inferno', origin='lower', aspect='auto')
ax.set_title(f'Mandelbrot Set ({max_iter} iterations)', color='white', fontsize=11, pad=8)
ax.set_xlabel('Re(c)', color='#9ca3af', fontsize=9)
ax.set_ylabel('Im(c)', color='#9ca3af', fontsize=9)
ax.tick_params(colors='#6b7280', labelsize=8)
for sp in ax.spines.values():
    sp.set_edgecolor('#374151')
buf = io.BytesIO()
fig.savefig(buf, format='png', dpi=75, bbox_inches='tight', facecolor='#0f1117')
buf.seek(0)
print('IMG:' + base64.b64encode(buf.read()).decode())
plt.close(fig)`,
  },

  {
    id: 'spiral-of-theodorus',
    slug: 'spiral-of-theodorus',
    title: 'Spiral of Theodorus',
    tagline: 'Stack right triangles. Each hypotenuse becomes the next leg. The square roots spiral out.',
    category: 'Geometry & Fractals',
    difficulty: 'beginner',
    visualization_type: 'static',
    wow_factor: 'Each triangle hypotenuse has length exactly √n. Theodorus stopped at √17 — because the 17th triangle would overlap the first, a remarkable geometric coincidence.',
    explanation: `The Spiral of Theodorus (also called the square root spiral) is built by a simple rule:\n\nStart with a right isosceles triangle with legs of length 1 (hypotenuse = √2). Attach a new right triangle using the previous hypotenuse as one leg and a unit length as the other.\n\nThe nth hypotenuse has length √(n+1), giving a geometric construction for √2, √3, √4, √5, ...\n\nThe ancient Greek mathematician Theodorus of Cyrene used this spiral to prove that √2, √3, √5, ..., √17 are irrational — stopping at 17 because the spiral would overlap at the 18th triangle.`,
    tags: ['theodorus', 'square roots', 'spiral', 'geometry', 'irrational numbers'],
    python_code: `import matplotlib.pyplot as plt
import numpy as np
import io, base64

fig, ax = plt.subplots(figsize=(6, 6), facecolor='#0f1117')
ax.set_facecolor('#0f1117')
ax.set_aspect('equal')

cmap = plt.cm.plasma
n_tri = 17
x, y, angle, hyp = 0.0, 0.0, 0.0, 1.0

for i in range(n_tri):
    x1 = x + hyp * np.cos(angle)
    y1 = y + hyp * np.sin(angle)
    new_angle = angle + np.arctan2(1.0, hyp)
    new_hyp = np.sqrt(hyp ** 2 + 1)
    x2 = x + new_hyp * np.cos(new_angle)
    y2 = y + new_hyp * np.sin(new_angle)
    color = cmap(i / n_tri)
    tri = plt.Polygon(
        [[x, y], [x1, y1], [x2, y2]],
        fill=True,
        facecolor=(*color[:3], 0.2),
        edgecolor=color,
        linewidth=1.3,
    )
    ax.add_patch(tri)
    cx = (x + x1 + x2) / 3
    cy = (y + y1 + y2) / 3
    ax.text(cx, cy, f'sqrt({i + 2})', ha='center', va='center',
        fontsize=5.5, color='white', alpha=0.85)
    hyp = new_hyp
    angle = new_angle

ax.autoscale()
ax.axis('off')
ax.set_title('Spiral of Theodorus — sqrt(2) through sqrt(18)', color='white', fontsize=11, pad=8)
buf = io.BytesIO()
fig.savefig(buf, format='png', dpi=90, bbox_inches='tight', facecolor='#0f1117')
buf.seek(0)
print('IMG:' + base64.b64encode(buf.read()).decode())
plt.close(fig)`,
  },

  {
    id: 'birthday-paradox',
    slug: 'birthday-paradox',
    title: 'The Birthday Paradox',
    tagline: "In a room of just 23 people, there's a 50% chance two share a birthday.",
    category: 'Probability & Statistics',
    difficulty: 'beginner',
    visualization_type: 'static',
    wow_factor: 'With 70 people, the probability reaches 99.9%. Our intuition is terribly calibrated for coincidences — we dramatically underestimate how likely "collisions" are in large spaces.',
    explanation: `The Birthday Paradox asks: how many people do you need before there is a 50% chance two of them share a birthday?\n\nIntuition says "around 183" (half of 365). The math says 23.\n\nThe key insight: we are not asking if anyone shares your birthday. We are asking if any pair shares a birthday. With 23 people there are 253 pairs, each with a 1/365 ≈ 0.27% chance of matching.\n\nFormally: P(at least one match) = 1 − (365/365)(364/365)(363/365)...\n\nThis has real applications in cryptography — the birthday attack on hash functions exploits exactly this phenomenon.`,
    tags: ['birthday', 'probability', 'paradox', 'coincidence', 'statistics'],
    python_code: `import matplotlib.pyplot as plt
import numpy as np
import io, base64

n_vals = np.arange(1, 81)
probs = []
p_none = 1.0
for n in n_vals:
    p_none *= (365 - (n - 1)) / 365
    probs.append(1 - p_none)
probs = np.array(probs)

fig, ax = plt.subplots(figsize=(7, 4), facecolor='#0f1117')
ax.set_facecolor('#0f1117')
ax.plot(n_vals, probs, color='#8b5cf6', linewidth=2.5)
ax.fill_between(n_vals, probs, alpha=0.12, color='#8b5cf6')
ax.axhline(0.5, color='#f59e0b', linewidth=1.5, linestyle='--', alpha=0.8)
ax.axvline(23, color='#f87171', linewidth=1.5, linestyle=':', alpha=0.8)
ax.plot(23, probs[22], 'o', color='#f87171', markersize=8)
ax.set_xlim(0, 80)
ax.set_ylim(0, 1.05)
ax.set_title('Birthday Paradox — Probability of a Shared Birthday', color='white', fontsize=11, pad=8)
ax.set_xlabel('Number of People', color='#9ca3af', fontsize=9)
ax.set_ylabel('Probability', color='#9ca3af', fontsize=9)
ax.tick_params(colors='#6b7280', labelsize=8)
for sp in ax.spines.values():
    sp.set_edgecolor('#374151')
ax.grid(True, color='#1f2937', linewidth=0.5, alpha=0.5)
ax.annotate('23 people: 50.7% chance', xy=(23, probs[22]), xytext=(38, 0.35),
    color='#f87171', fontsize=9,
    arrowprops=dict(arrowstyle='->', color='#f87171', lw=1.2))
ax.text(55, 0.06, '50% threshold', color='#f59e0b', fontsize=8, alpha=0.8)
fig.tight_layout()
buf = io.BytesIO()
fig.savefig(buf, format='png', dpi=90, bbox_inches='tight', facecolor='#0f1117')
buf.seek(0)
print('IMG:' + base64.b64encode(buf.read()).decode())
plt.close(fig)`,
  },

  {
    id: 'random-walk',
    slug: 'random-walk',
    title: '2D Random Walk',
    tagline: 'Step randomly in any direction. Repeat. Where do you end up?',
    category: 'Probability & Statistics',
    difficulty: 'beginner',
    visualization_type: 'animated',
    wow_factor: "A drunk person taking random steps will eventually return home — with probability 1. But in 3D, they probably never return. This connects probability, physics, and the stock market.",
    explanation: `A random walk is a path consisting of a sequence of random steps. In 2D, at each step we move one unit in a random direction (up, down, left, right).\n\nThe expected distance from the start after n steps is √n — the walker drifts further, but slowly.\n\nRandom walks model many real phenomena: Brownian motion of molecules, stock price movements, polymer chains, and the spread of diseases.\n\nA remarkable theorem (Pólya, 1921): a random walk in 1D or 2D returns to the origin with probability 1. In 3D or higher dimensions, it wanders off forever with positive probability.`,
    tags: ['random walk', 'probability', 'brownian motion', 'stochastic', 'simulation'],
    python_code: `import matplotlib.pyplot as plt
import numpy as np
import io, base64

rng = np.random.default_rng(7)
FRAMES = 10
SPF = 150
N = 4
total = FRAMES * SPF

unit_dirs = np.array([[1, 0], [-1, 0], [0, 1], [0, -1]])
choices = rng.integers(0, 4, size=(N, total))
steps = unit_dirs[choices]
xs = np.hstack([np.zeros((N, 1)), np.cumsum(steps[:, :, 0], axis=1)])
ys = np.hstack([np.zeros((N, 1)), np.cumsum(steps[:, :, 1], axis=1)])

palette = ['#8b5cf6', '#f59e0b', '#34d399', '#f87171']

def emit(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=70, bbox_inches='tight', facecolor='#0f1117')
    buf.seek(0)
    print('IMG:' + base64.b64encode(buf.read()).decode())
    plt.close(fig)

for frame in range(8):
    n = (frame + 1) * SPF
    fig, ax = plt.subplots(figsize=(5, 5), facecolor='#0f1117')
    ax.set_facecolor('#0f1117')
    for i in range(N):
        ax.plot(xs[i, :n + 1], ys[i, :n + 1], color=palette[i], alpha=0.65, linewidth=0.9)
        ax.plot(xs[i, n], ys[i, n], 'o', color=palette[i], markersize=5)
    ax.plot(0, 0, 'w+', markersize=10, markeredgewidth=2)
    ax.set_aspect('equal')
    ax.set_title(f'2D Random Walk — {n} steps', color='white', fontsize=10, pad=6)
    ax.tick_params(colors='#6b7280', labelsize=7)
    for sp in ax.spines.values():
        sp.set_edgecolor('#374151')
    ax.grid(True, color='#1f2937', linewidth=0.4, alpha=0.5)
    emit(fig)`,
  },

  {
    id: 'galton-board',
    slug: 'galton-board',
    title: 'The Galton Board',
    tagline: 'Drop thousands of balls through a peg grid. The bell curve emerges.',
    category: 'Probability & Statistics',
    difficulty: 'intermediate',
    visualization_type: 'animated',
    wow_factor: 'No matter how the pegs are arranged, the Central Limit Theorem guarantees the histogram converges to a perfect bell curve. The normal distribution is inevitable.',
    explanation: `The Galton Board (invented by Francis Galton in the 1870s) demonstrates the Central Limit Theorem physically.\n\nBalls are dropped from the top and bounce randomly left or right off each peg. After passing through n rows, each ball's position follows a binomial distribution.\n\nAs the number of balls grows, the histogram of landing positions converges to the normal distribution — not by design, but by mathematical inevitability.\n\nThis is the Central Limit Theorem: the sum of many independent random outcomes always converges to a normal distribution, regardless of the underlying distribution.`,
    tags: ['galton', 'normal distribution', 'central limit theorem', 'binomial', 'statistics'],
    python_code: `import matplotlib.pyplot as plt
import numpy as np
import io, base64

rng = np.random.default_rng(99)
ROWS = 14
FRAMES = 8
BPF = 80
total = FRAMES * BPF

outcomes = rng.integers(0, 2, size=(total, ROWS)).sum(axis=1)
mu = ROWS / 2
sigma = np.sqrt(ROWS * 0.25)

def normal_pdf(x, m, s):
    return np.exp(-0.5 * ((x - m) / s) ** 2) / (s * np.sqrt(2 * np.pi))

def emit(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=70, bbox_inches='tight', facecolor='#0f1117')
    buf.seek(0)
    print('IMG:' + base64.b64encode(buf.read()).decode())
    plt.close(fig)

for frame in range(FRAMES):
    n = (frame + 1) * BPF
    fig, ax = plt.subplots(figsize=(6, 4), facecolor='#0f1117')
    ax.set_facecolor('#0f1117')
    ax.hist(outcomes[:n], bins=np.arange(ROWS + 2) - 0.5,
        color='#8b5cf6', alpha=0.75, edgecolor='#0f1117', linewidth=0.5, density=True)
    x = np.linspace(-0.5, ROWS + 0.5, 300)
    ax.plot(x, normal_pdf(x, mu, sigma), color='#f59e0b', linewidth=2.2, label='Normal curve')
    ax.set_title(f'Galton Board — {n} balls', color='white', fontsize=10, pad=6)
    ax.set_xlabel('Bin', color='#9ca3af', fontsize=8)
    ax.set_ylabel('Density', color='#9ca3af', fontsize=8)
    ax.tick_params(colors='#6b7280', labelsize=7)
    for sp in ax.spines.values():
        sp.set_edgecolor('#374151')
    ax.legend(fontsize=8, facecolor='#1c1c22', edgecolor='#374151', labelcolor='#9ca3af')
    ax.grid(True, color='#1f2937', linewidth=0.4, alpha=0.5, axis='y')
    emit(fig)`,
  },

  {
    id: 'central-limit-theorem',
    slug: 'central-limit-theorem',
    title: 'Central Limit Theorem',
    tagline: 'Average enough samples from ANY distribution. The result is always normal.',
    category: 'Probability & Statistics',
    difficulty: 'intermediate',
    visualization_type: 'interactive',
    wow_factor: 'The CLT is arguably the most important theorem in statistics. It explains why the normal distribution appears everywhere in nature — height, measurement errors, test scores — despite the underlying processes being far from normal.',
    explanation: `The Central Limit Theorem states: the distribution of sample means approaches a normal distribution as sample size n increases — regardless of the population's shape.\n\nHere we sample from a Uniform[0,1] distribution (flat, not bell-shaped). Despite this, when we compute averages of n samples repeatedly, the distribution of those averages becomes increasingly bell-shaped.\n\nWith n=1, we see the flat uniform distribution. As n grows, the bell curve sharpens and centers on 0.5 (the true mean).\n\nThis theorem justifies using the normal distribution in countless applications and underpins hypothesis testing, confidence intervals, and modern statistics.`,
    tags: ['CLT', 'central limit theorem', 'normal distribution', 'statistics', 'sampling'],
    interactive_config: {
      sliders: [
        { id: 'sample_size', label: 'Sample Size (n)', min: 1, max: 50, step: 1, default: 5 },
      ],
    },
    python_code: `import matplotlib.pyplot as plt
import numpy as np
import io, base64

rng = np.random.default_rng(0)
N_SAMPLES = 3000
n = max(int(sample_size), 1)

raw = rng.uniform(0, 1, size=(N_SAMPLES, n))
means = raw.mean(axis=1)
mu = 0.5
sigma = 1.0 / np.sqrt(12 * n)

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(8, 4), facecolor='#0f1117')

ax1.set_facecolor('#0f1117')
ax1.hist(rng.uniform(0, 1, 2000), bins=20, color='#374151',
    edgecolor='#0f1117', density=True, alpha=0.85)
ax1.axhline(1, color='#f59e0b', linewidth=2, linestyle='--')
ax1.set_title('Population (Uniform[0,1])', color='white', fontsize=10)
ax1.set_xlabel('Value', color='#9ca3af', fontsize=8)
ax1.tick_params(colors='#6b7280', labelsize=7)
for sp in ax1.spines.values():
    sp.set_edgecolor('#374151')

ax2.set_facecolor('#0f1117')
ax2.hist(means, bins=50, color='#8b5cf6', edgecolor='#0f1117', density=True, alpha=0.8)
x = np.linspace(means.min() - 0.05, means.max() + 0.05, 300)
normal = np.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * np.sqrt(2 * np.pi))
ax2.plot(x, normal, color='#f59e0b', linewidth=2.2)
ax2.set_title(f'Sample Means (n={n})', color='white', fontsize=10)
ax2.set_xlabel('Mean', color='#9ca3af', fontsize=8)
ax2.tick_params(colors='#6b7280', labelsize=7)
for sp in ax2.spines.values():
    sp.set_edgecolor('#374151')

fig.suptitle('Central Limit Theorem', color='white', fontsize=11, fontweight='bold')
fig.tight_layout()
buf = io.BytesIO()
fig.savefig(buf, format='png', dpi=90, bbox_inches='tight', facecolor='#0f1117')
buf.seek(0)
print('IMG:' + base64.b64encode(buf.read()).decode())
plt.close(fig)`,
  },

  {
    id: 'matrix-transformation',
    slug: 'matrix-transformation',
    title: '2D Rotation Matrix',
    tagline: 'A 2×2 matrix rotates every point in the plane. Visualize the transformation.',
    category: 'Linear Algebra',
    difficulty: 'beginner',
    visualization_type: 'interactive',
    wow_factor: 'Every rotation, reflection, and scaling in 2D is captured by a tiny 2×2 matrix. The same principle generalizes to 3D graphics, robotics, quantum mechanics, and neural network weights.',
    explanation: `A 2D rotation matrix by angle θ is:\n\n  R = [[cos θ,  −sin θ],\n       [sin θ,   cos θ]]\n\nMultiplying any point [x, y] by R rotates it counterclockwise by θ around the origin.\n\nThe visualization shows the unit circle and a grid of points before and after applying the rotation. The red and green arrows show where the standard basis vectors land.\n\nKey insight: the columns of any transformation matrix are exactly where the standard basis vectors (e₁ and e₂) land. This geometric intuition makes matrix multiplication concrete and visual.`,
    tags: ['rotation', 'matrix', 'linear algebra', 'transformation', 'basis vectors'],
    interactive_config: {
      sliders: [
        { id: 'angle_deg', label: 'Rotation Angle (degrees)', min: 0, max: 360, step: 5, default: 45 },
      ],
    },
    python_code: `import matplotlib.pyplot as plt
import numpy as np
import io, base64

a = np.radians(angle_deg)
R = np.array([[np.cos(a), -np.sin(a)],
              [np.sin(a),  np.cos(a)]])

theta = np.linspace(0, 2 * np.pi, 100)
circle = np.vstack([np.cos(theta), np.sin(theta)])
rotated_circle = R @ circle

t = np.linspace(-1, 1, 5)
xx, yy = np.meshgrid(t, t)
pts = np.vstack([xx.ravel(), yy.ravel()])
rpts = R @ pts

fig, axes = plt.subplots(1, 2, figsize=(8, 4), facecolor='#0f1117')
panels = [
    (circle,         pts,  'Original'),
    (rotated_circle, rpts, f'Rotated {angle_deg} deg'),
]

for ax, (c, v, title) in zip(axes, panels):
    ax.set_facecolor('#0f1117')
    ax.plot(c[0], c[1], color='#8b5cf6', linewidth=1.8, alpha=0.7)
    ax.scatter(v[0], v[1], c='#f59e0b', s=18, zorder=5, alpha=0.85)
    ax.axhline(0, color='#4b5563', linewidth=0.7)
    ax.axvline(0, color='#4b5563', linewidth=0.7)
    e1 = R @ np.array([1.0, 0.0]) if 'Rot' in title else np.array([1.0, 0.0])
    e2 = R @ np.array([0.0, 1.0]) if 'Rot' in title else np.array([0.0, 1.0])
    ax.annotate('', xy=e1, xytext=(0, 0),
        arrowprops=dict(arrowstyle='->', color='#f87171', lw=2.5))
    ax.annotate('', xy=e2, xytext=(0, 0),
        arrowprops=dict(arrowstyle='->', color='#34d399', lw=2.5))
    ax.set_xlim(-1.6, 1.6)
    ax.set_ylim(-1.6, 1.6)
    ax.set_aspect('equal')
    ax.set_title(title, color='white', fontsize=10)
    ax.tick_params(colors='#6b7280', labelsize=7)
    for sp in ax.spines.values():
        sp.set_edgecolor('#374151')
    ax.grid(True, color='#1f2937', linewidth=0.4, alpha=0.4)

fig.suptitle('2D Rotation Matrix', color='white', fontsize=11, fontweight='bold')
fig.tight_layout()
buf = io.BytesIO()
fig.savefig(buf, format='png', dpi=90, bbox_inches='tight', facecolor='#0f1117')
buf.seek(0)
print('IMG:' + base64.b64encode(buf.read()).decode())
plt.close(fig)`,
  },

  {
    id: 'fourier-series',
    slug: 'fourier-series',
    title: 'Fourier Series',
    tagline: 'Any periodic signal is a sum of sine waves. Add more waves, get closer to the truth.',
    category: 'Calculus',
    difficulty: 'intermediate',
    visualization_type: 'interactive',
    wow_factor: 'The Fourier series underlies MP3 compression, MRI machines, image processing, and quantum mechanics. Decomposing signals into frequencies was so radical it was initially rejected by the French Academy of Sciences.',
    explanation: `A Fourier series decomposes a periodic function into a sum of sines and cosines.\n\nFor a square wave, the series is:\n  f(x) = (4/π) × Σ sin((2k−1)x) / (2k−1)\n\nWith 1 term, we get a sine wave. Each additional term adds a higher-frequency component that "fills in" the sharp corners of the square wave.\n\nWith many terms, the approximation is nearly perfect — except near the discontinuities, where a persistent overshoot remains. This is the Gibbs phenomenon: the approximation always overshoots by ~9% near a jump, no matter how many terms you add.\n\nJoseph Fourier's insight (1822) that arbitrary functions can be decomposed into frequencies was revolutionary.`,
    tags: ['fourier', 'series', 'sine waves', 'signal processing', 'calculus', 'gibbs'],
    interactive_config: {
      sliders: [
        { id: 'n_terms', label: 'Number of Terms', min: 1, max: 25, step: 1, default: 5 },
      ],
    },
    python_code: `import matplotlib.pyplot as plt
import numpy as np
import io, base64

x = np.linspace(-np.pi, np.pi, 600)
approx = np.zeros_like(x)
for k in range(1, n_terms + 1):
    approx += (4.0 / np.pi) * np.sin((2 * k - 1) * x) / (2 * k - 1)

square = np.sign(np.sin(x))
square[square == 0] = 1.0

fig, ax = plt.subplots(figsize=(7, 4), facecolor='#0f1117')
ax.set_facecolor('#0f1117')
ax.plot(x, square, color='#4b5563', linewidth=1.5, linestyle='--', label='Square wave', alpha=0.8)
term_label = f'{n_terms} term' + ('s' if n_terms != 1 else '')
ax.plot(x, approx, color='#8b5cf6', linewidth=2.2, label=term_label)
ax.axhline(0, color='#374151', linewidth=0.7)
ax.set_ylim(-1.7, 1.7)
ax.set_title('Fourier Series — Square Wave Approximation', color='white', fontsize=11, pad=8)
ax.set_xlabel('x', color='#9ca3af', fontsize=9)
ax.set_ylabel('f(x)', color='#9ca3af', fontsize=9)
ax.tick_params(colors='#6b7280', labelsize=8)
for sp in ax.spines.values():
    sp.set_edgecolor('#374151')
ax.legend(fontsize=9, facecolor='#1c1c22', edgecolor='#374151', labelcolor='#9ca3af')
ax.grid(True, color='#1f2937', linewidth=0.4, alpha=0.5)
if n_terms >= 10:
    ax.text(0, 1.55, 'Gibbs phenomenon near discontinuities',
        ha='center', color='#f59e0b', fontsize=8, alpha=0.9)
fig.tight_layout()
buf = io.BytesIO()
fig.savefig(buf, format='png', dpi=90, bbox_inches='tight', facecolor='#0f1117')
buf.seek(0)
print('IMG:' + base64.b64encode(buf.read()).decode())
plt.close(fig)`,
  },

  {
    id: 'newtons-fractal',
    slug: 'newtons-fractal',
    title: "Newton's Method Fractal",
    tagline: "Apply Newton's root-finding to z³ = 1. The boundary between roots is fractal.",
    category: 'Calculus',
    difficulty: 'advanced',
    visualization_type: 'static',
    wow_factor: "Newton's method — a standard numerical algorithm — creates a fractal boundary where no prediction is possible. Any region near the boundary contains points converging to all three roots.",
    explanation: `Newton's method finds roots of f(z) = 0 by iterating:\n  z_{n+1} = z_n − f(z_n) / f'(z_n)\n\nFor f(z) = z³ − 1, the three roots are the cube roots of unity:\n  1,  e^(2πi/3),  e^(4πi/3)\n\nThe fractal arises from the question: starting at a point in the complex plane, which root does Newton's method converge to?\n\nFar from the boundaries, the answer is clear. Near the boundaries, the behavior is chaotic — infinitely intricate spirals of all three "basins of attraction" intertwine.\n\nThe boundaries form a genuine fractal: zooming in always reveals all three colors interleaved.`,
    tags: ['newton', 'fractal', 'complex analysis', 'roots', 'iteration', 'chaos'],
    python_code: `import matplotlib.pyplot as plt
import numpy as np
import io, base64

W, H = 350, 350
x = np.linspace(-2, 2, W)
y = np.linspace(-2, 2, H)
Z = (x[np.newaxis, :] + 1j * y[:, np.newaxis]).astype(np.complex128)
z = Z.copy()

for _ in range(35):
    z2 = z ** 2
    denom = 3.0 * z2
    denom = np.where(np.abs(denom) < 1e-12, 1e-12 + 0j, denom)
    z = z - (z * z2 - 1.0) / denom

roots = np.array([1.0 + 0j,
                  -0.5 + np.sqrt(3.0) / 2.0 * 1j,
                  -0.5 - np.sqrt(3.0) / 2.0 * 1j])
rgb = np.array([[0.54, 0.36, 0.96],
                [0.96, 0.62, 0.20],
                [0.20, 0.83, 0.60]])

dists = np.abs(z[:, :, np.newaxis] - roots[np.newaxis, np.newaxis, :])
basin = np.argmin(dists, axis=2)
min_dist = dists[np.arange(H)[:, None], np.arange(W)[None, :], basin]
shade = np.clip(1.0 - min_dist * 3.0, 0.1, 1.0)
img = np.clip(rgb[basin] * shade[:, :, np.newaxis], 0, 1)

fig, ax = plt.subplots(figsize=(6, 6), facecolor='#0f1117')
ax.imshow(img, extent=[-2, 2, -2, 2], origin='lower', aspect='equal')
ax.set_title("Newton's Fractal — z^3 = 1 (basins of attraction)", color='white', fontsize=10, pad=8)
ax.set_xlabel('Re(z)', color='#9ca3af', fontsize=9)
ax.set_ylabel('Im(z)', color='#9ca3af', fontsize=9)
ax.tick_params(colors='#6b7280', labelsize=8)
for sp in ax.spines.values():
    sp.set_edgecolor('#374151')
buf = io.BytesIO()
fig.savefig(buf, format='png', dpi=90, bbox_inches='tight', facecolor='#0f1117')
buf.seek(0)
print('IMG:' + base64.b64encode(buf.read()).decode())
plt.close(fig)`,
  },
]

export default mathTricks
