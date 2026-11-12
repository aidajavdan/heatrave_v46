const app = new PIXI.Application();
await app.init({ resizeTo: window, background: "#07000f", antialias: true });

document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.appendChild(app.canvas);

const HEAT_STOPS = [
  0x3627a3, 0x5a2dff, 0x8a22d0, 0xd0208a,
  0xff2a50, 0xff8c1a, 0xffd21f
];

function heat(v) {
  const pos = Math.max(0, Math.min(1, v)) * (HEAT_STOPS.length - 1);
  const i = Math.floor(pos);
  const f = pos - i;
  const a = HEAT_STOPS[i];
  const b = HEAT_STOPS[Math.min(i + 1, HEAT_STOPS.length - 1)];

  const mix = s => Math.round(
    ((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * f
  );

  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

const lasers = new PIXI.Graphics();
const equalizer = new PIXI.Graphics();
const glow = new PIXI.Graphics();
const dots = new PIXI.Graphics();
const sparks = new PIXI.Graphics();

glow.filters = [new PIXI.BlurFilter({ strength: 8 })];

for (const layer of [lasers, equalizer, glow, dots, sparks]) {
  layer.blendMode = "add";
  app.stage.addChild(layer);
}

const mouse = { x: -9999, y: -9999, speed: 0 };
let last = { x: 0, y: 0 };
const particles = [];

function spawn(x, y, opts) {
  particles.push({
    x, y,
    vx: opts.vx,
    vy: opts.vy,
    gravity: opts.gravity,
    life: opts.life,
    maxLife: opts.life,
    size: opts.size,
    maxAlpha: opts.maxAlpha,
    color: heat(0.55 + Math.random() * 0.45)
  });
}

window.addEventListener("pointermove", e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});



app.ticker.add(ticker => {
  const t = performance.now();
  const w = app.screen.width, h = app.screen.height;

  const dx = mouse.x - last.x, dy = mouse.y - last.y;
  mouse.speed += (Math.min(Math.hypot(dx, dy), 60) - mouse.speed) * 0.1;
  last = { x: mouse.x, y: mouse.y };

  // Lasers
  lasers.clear();
  const beamLength = Math.hypot(w, h);
  const beamColors = [heat(0.2), heat(0.4), heat(0.8)];

  for (let side = 0; side < 2; side++) {
    const originX = side === 0 ? 0 : w;
    const dir = side === 0 ? 1 : -1;

    for (let b = 0; b < 3; b++) {
      const a = dir * (0.55 + Math.sin(t * 0.0006 + b * 1.7 + side * 2.3) * 0.5);

      for (const { spread, alpha } of [
        { spread: 0.075, alpha: 0.035 },
        { spread: 0.045, alpha: 0.05 },
        { spread: 0.02, alpha: 0.08 }
      ]) {
        const a1 = a - spread, a2 = a + spread;

        lasers.poly([
          originX, 0,
          originX + Math.sin(a1) * beamLength, Math.cos(a1) * beamLength,
          originX + Math.sin(a2) * beamLength, Math.cos(a2) * beamLength
        ]).fill({ color: beamColors[b], alpha });
      }
    }

    for (const [radius, alpha] of [[34, 0.05], [20, 0.1], [9, 0.35]]) {
      lasers.circle(originX, 0, radius).fill({ color: 0xffffff, alpha });
    }
  }

  // Equalizer
  equalizer.clear();
  const barWidth = 18, barGap = 10;
  const maxBar = h * 0.12;
  const barCount = Math.ceil(w / (barWidth + barGap));

  for (let b = 0; b < barCount; b++) {
    const level =
      (Math.sin(t * 0.004 + b * 0.7) * 0.5 + 0.5) *
      (Math.sin(t * 0.0023 + b * 1.9) * 0.5 + 0.5);

    const barH = 4 + level * maxBar;

    equalizer.rect(b * (barWidth + barGap), h - barH, barWidth, barH)
      .fill({ color: heat(Math.sqrt(level)), alpha: 0.16 });
  }

  // Dot grid
  glow.clear();
  dots.clear();

  const step = 30;

  for (let x = 0; x < w; x += step) {
    for (let y = 0; y < h; y += step) {
      const distance = Math.hypot(x - mouse.x, y - mouse.y);
      const wave = Math.sin(x * 0.02 + y * 0.015 + t * 0.004) * 0.5 + 0.5;
      const nearT = Math.max(0, 10 - distance / 25) / 10;

      const radius = Math.min(
        1.2 + wave * 1.6 + nearT * 10 * (1 + mouse.speed / 40),
        step / 2 - 2
      );

      const color = heat(0.05 + wave * 0.3 + nearT * (0.6 + mouse.speed / 150));

      glow.circle(x, y, Math.min(radius * 2.2, step / 2))
        .fill({ color, alpha: 0.3 - nearT * 0.22 });

      dots.circle(x, y, radius)
        .fill({ color, alpha: 1 - nearT * 0.4 });
    }
  }

  // Particles
  sparks.clear();

  for (let p = particles.length - 1; p >= 0; p--) {
    const s = particles[p];

    s.vy += s.gravity * ticker.deltaTime;
    s.vx *= 0.985;
    s.x += s.vx * ticker.deltaTime;
    s.y += s.vy * ticker.deltaTime;
    s.life -= ticker.deltaTime;

    if (s.life <= 0) {
      particles.splice(p, 1);
      continue;
    }

    sparks.circle(s.x, s.y, s.size)
      .fill({ color: s.color, alpha: s.life / s.maxLife * s.maxAlpha });
  }
});

