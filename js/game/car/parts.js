/* =========================================================
   Car parts from data/game.json → "car" (all images in assets/game/car/):
     bodies/<id>.png      body without wheels (size.w × size.h px)
     wheels/<id>.png      wheel animation: wheelFrames frames of wheelSize px, side by side
     obstacles/<id>.png   obstacles (frames side by side when "frames" > 1)
     upgrades/<id>.png    tuning icons for the garage
   The car = body + 2 wheels drawn at wheelAnchors (top-left corner of
   each wheel in body pixels). The first item with weight 0 is free.
   ========================================================= */
import { loadImageOrNull } from '../util.js';

export async function installCarParts(G) {
  const { CAR, S } = G;
  const load = async (list, key) => Promise.all((list || []).map(async (it) => ({ ...it, img: await loadImageOrNull(it[key]) })));
  const [bodies, wheels, obstacles, upgrades] = CAR.enabled
    ? await Promise.all([load(CAR.bodies, 'sprite'), load(CAR.wheels, 'sprite'), load(CAR.obstacles, 'sprite'), load(CAR.upgrades, 'icon')])
    : [[], [], [], []];
  G.carParts = {
    bodies: bodies.filter((b) => b.img),
    wheels: wheels.filter((w) => w.img),
    obstacles: obstacles.filter((o) => o.img),
    upgrades,
  };
  G.carReady = () => CAR.enabled && G.carParts.bodies.length > 0;

  const defaultOf = (list) => (list.find((i) => !i.weight) || list[0])?.id;
  /** equipped body / wheels (falls back to the free ones) */
  G.carEquip = () => {
    const { equip } = G.progress();
    const pick = (list, id) => list.find((i) => i.id === id) || list.find((i) => i.id === defaultOf(list));
    return { body: pick(G.carParts.bodies, equip.body), wheels: pick(G.carParts.wheels, equip.wheels) };
  };
  G.carDefaults = () => ({ body: defaultOf(G.carParts.bodies), wheels: defaultOf(G.carParts.wheels) });

  const anchors = CAR.wheelAnchors || [[4, 8], [22, 8]];
  const ws = CAR.wheelSize || 8;
  /** rear wheel contact point (body pixels) — the car tilts around it */
  G.carPivot = () => [anchors[0][0] + ws / 2, anchors[0][1] + ws];
  G.carWheelbase = () => (anchors[anchors.length - 1][0] - anchors[0][0]) * S;

  /**
   * Draws the car with its top-left corner at (x, y).
   * wheelPos: distance driven in px (wheel animation), tilt: radians (positive = nose up),
   * bodyDy: suspension offset of the body in px, scale: pixel scale.
   */
  G.drawCar = (c, x, y, { body, wheels, wheelPos = 0, tilt = 0, bodyDy = 0, scale = S } = {}) => {
    const [px, py] = G.carPivot();
    c.save();
    c.translate(x + px * scale, y + py * scale);
    c.rotate(-tilt);
    c.translate(-px * scale, -py * scale);
    if (body?.img) c.drawImage(body.img, 0, 0, body.img.width, body.img.height, 0, Math.round(bodyDy), body.img.width * scale, body.img.height * scale);
    if (wheels?.img) {
      const frames = CAR.wheelFrames || Math.max(1, Math.floor(wheels.img.width / ws));
      const circumference = Math.PI * ws * scale;
      const fr = Math.floor((wheelPos / circumference) * frames) % frames;
      anchors.forEach(([ax, ay]) => c.drawImage(wheels.img, fr * ws, 0, ws, ws, ax * scale, ay * scale, ws * scale, ws * scale));
    }
    c.restore();
  };

  /** rotates a point given in body pixels the same way drawCar does → page px */
  G.carPoint = (x, y, lx, ly, tilt) => {
    const [px, py] = G.carPivot();
    const dx = (lx - px) * S, dy = (ly - py) * S, a = -tilt;
    return [x + px * S + dx * Math.cos(a) - dy * Math.sin(a), y + py * S + dx * Math.sin(a) + dy * Math.cos(a)];
  };
}
