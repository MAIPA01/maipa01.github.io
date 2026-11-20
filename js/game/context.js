/* =========================================================
   Game context "G": configuration (data/game.json with defaults)
   and the shared state. Every module gets the same G object and
   adds its own functions to it — e.g. installPlayer(G) adds
   G.updatePlayer, G.spawn… — so modules can call each other
   without long import chains.
   ========================================================= */

const DEFAULT_PHYSICS = {
  gravity: 2200, moveSpeed: 340, jumpVelocity: 820, doubleJump: true, maxFallSpeed: 1100,
  wallSlideSpeed: 140, climbSpeed: 170, climbStamina: 4, wallJumpPush: 360, elementWalls: false,
};
const DEFAULT_CAR = {
  enabled: true, secretAt: '.band-1',
  size: { w: 32, h: 16 }, hitbox: { x: 1, y: 3, w: 30, h: 13 },
  wheelSize: 8, wheelFrames: 4, wheelAnchors: [[4, 8], [22, 8]],
  speed: 430, speedUp: 14, maxSpeed: 1150, gravity: 2600, jumpVelocity: 900, slamSpeed: 1700, rampVelocity: 1350,
  bodies: [], wheels: [], upgrades: [], obstacles: [],
};
/** Fallback texts — the real ones come from data/i18n/<lang>.json → "game". */
const DEFAULT_TEXTS = {
  start: 'PLAY MODE', startTouch: 'PLAY MODE', open: 'E', won: 'GG! {time}', time: 'time', best: 'best',
  newRecord: 'NEW RECORD!', pick: 'CHOOSE YOUR CHARACTER', pickHint: '← → / ENTER', openProject: 'E', back: 'E', pickHere: 'E: {name}',
};

export function createContext(cfg = {}, opts = {}) {
  const S = cfg.pixelScale || 4;
  const phys = { ...DEFAULT_PHYSICS, ...(cfg.physics || {}) };
  const G = {
    cfg, opts, S, phys,
    PL: cfg.player || {},
    C: cfg.collectible || {},
    CAR: { ...DEFAULT_CAR, ...(cfg.car || {}) },
    /** current UI texts (language can change while playing) */
    T: () => ({ ...DEFAULT_TEXTS, ...(opts.texts ? opts.texts() : {}) }),
    /** {"en": …, "pl": …} → text in the current language */
    tr: opts.tr || ((v) => (v && typeof v === 'object' ? v.en ?? Object.values(v)[0] : v ?? '')),
    pageKey: opts.pageKey || location.pathname,
    platformSel: (cfg.platforms || ['.project-card']).join(','),
    coinSel: (cfg.coinsOn || []).join(','),
    interactMap: Object.entries(cfg.interact || {}),

    /* ---------- shared state ---------- */
    active: false,
    mode: 'free',            // free | challenge | car
    t: 0, frame: 0,          // seconds since start, frame counter
    platforms: [], walls: [], coins: [], particles: [],
    input: { left: false, right: false, up: false, down: false },
    jumpBuffer: 0, coyote: 0, dropTimer: 0, dropEl: null,
    player: {
      x: 0, y: 0, vx: 0, vy: 0, w: 11 * S, h: 16 * S, facing: 1, ground: null, jumps: 0,
      anim: 'idle', animT: 0, wall: null, climbing: false, stamina: phys.climbStamina, lockT: 0, emote: 0,
    },
    run: { start: null, time: 0, done: false },   // challenge timer
    menu: null,              // 'picker' | 'garage' | null — menus pause the game
  };
  G.releaseAll = () => { Object.keys(G.input).forEach((k) => { G.input[k] = false; }); };
  G.docWidth = () => document.documentElement.clientWidth;
  return G;
}
