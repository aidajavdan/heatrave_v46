const HEAT_STOPS = [0x3627a3, 0x5a2dff, 0x8a22d0, 0xd0208a, 0xff2a50, 0xff8c1a, 0xffd21f];
const app = new PIXI.Application();
const lasers = new PIXI.Graphics(), 
glow = new PIXI.Graphics(), dots = new PIXI.Graphics(), sparks = new PIXI.Graphics();
glow.filters = [new PIXI.BlurFilter({ strength: 5 })];

// Initiates the PIXIJS application and puts it on the page 
await app.init({ resizeTo: window, background: "#07000f", antialias: true });
document.body.appendChild(app.canvas);

function heat(v) {
  // Makes a gradient between HEAT_STOP colors and return a value between 0-1
  const pos = Math.max(0, Math.min(1, v)) * (HEAT_STOPS.length - 1);
  const i = Math.floor(pos);
  const a = HEAT_STOPS[i];
  const b = HEAT_STOPS[Math.min(i + 1, HEAT_STOPS.length - 1)];
  const mix = s => Math.round(
    ((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * (pos - i)
  );

  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

// Overlapping layers are additive 
for (const layer of [lasers, glow, dots, sparks]) {
  layer.blendMode = "add";
  app.stage.addChild(layer);
}

// Follows mouse movements 
const mouse = { x: -9999, y: -9999, speed: 0 };
window.addEventListener("pointermove", e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
app.ticker.add(() => {
  let last = { x: 0, y: 0 };
  const t = performance.now();
  const w = app.screen.width, h = app.screen.height;
  const dx = mouse.x - last.x, dy = mouse.y - last.y;

  mouse.speed += (Math.min(Math.hypot(dx, dy), 60) - mouse.speed) * 0.1;
  last = { x: mouse.x, y: mouse.y };

  // Lasers
  lasers.clear();
  const beamLength = Math.hypot(w, h);
  const beamColors = [heat(0.2), heat(0.4), heat(0.8)];
  
  // creates lasers on both sides of the page and sets the position and angle of them
  for (let side = 0; side < 2; side++) {
    const originX = side === 0 ? 0 : w;
    const dir = side === 0 ? 1 : -1;

    //three lasers on each side that uses sin to move  
    for (let b = 0; b < 3; b++) {
      const a = dir * (0.55 + Math.sin(t * 0.0006 + b * 1.7 + side * 2.3) * 0.5);

      for (const { spread, alpha } of [
        { spread: 0.075, alpha: 0.035 },
        { spread: 0.045, alpha: 0.05 },
        { spread: 0.02, alpha: 0.08 }
      ]) {
        const a1 = a - spread, a2 = a + spread;

        //creates the shape of the lasers 
        lasers.poly([
          originX, 0,
          originX + Math.sin(a1) * beamLength, Math.cos(a1) * beamLength,
          originX + Math.sin(a2) * beamLength, Math.cos(a2) * beamLength
        ]).fill({ color: beamColors[b], alpha });
      }
    }
  }

  // Dot grid
  glow.clear();
  dots.clear();
  const step = 27;

  // Creates a grid of circles that responds to mouse movements and makes circles change colors and becomes bigger in size
  for (let x = 0; x < w; x += step) {
    for (let y = 0; y < h; y += step) {
      const distance = Math.hypot(x - mouse.x, y - mouse.y);
      const wave = Math.sin(x * 0.02 + y * 0.015 + t * 0.004) * 0.5 + 0.5;
      const nearT = Math.max(0, 10 - distance / 17) / 10;
      const radius = Math.min(1.2 + wave * 1.6 + nearT * 7 * (1 + mouse.speed / 40),step / 2 - 2);
      const color = heat(0.05 + wave * 0.3 + nearT * (0.6 + mouse.speed / 150));

      glow.circle(x, y, Math.min(radius * 2.2, step / 2)).fill({ color, alpha: 0.3 - nearT * 0.22 });
      dots.circle(x, y, radius).fill({ color, alpha: 1 - nearT * 0.4 });
    }
  }
});