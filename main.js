const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");

const startBtn = document.querySelector("#start-btn");
const restartBtn = document.querySelector("#restart-btn");
const fullscreenBtn = document.querySelector("#fullscreen-btn");
const muteBtn = document.querySelector("#mute-btn");
const stageFrame = document.querySelector(".stage-frame");
const controlStrip = document.querySelector(".control-strip");
const languageLabel = document.querySelector("#language-label");
const languageSelect = document.querySelector("#language-select");
const eyebrowText = document.querySelector("#eyebrow-text");
const ledeText = document.querySelector("#lede-text");
const pageTitle = document.querySelector("title");

const BOARD_COLS = 8;
const BOARD_ROWS = 8;
const DESKTOP_LAYOUT = {
  mode: "desktop",
  canvasWidth: 960,
  canvasHeight: 720,
  cellSize: 72,
  boardX: 58,
  boardY: 112,
  panelX: 664,
  panelY: 104,
  panelW: 252,
  panelH: 568,
};
const MOBILE_LAYOUT = {
  mode: "mobile",
  canvasWidth: 720,
  canvasHeight: 1400,
  cellSize: 79,
  boardX: 44,
  boardY: 120,
  panelX: 36,
  panelY: 780,
  panelW: 648,
  panelH: 560,
};
let currentLayoutMode = "desktop";
let CELL_SIZE = DESKTOP_LAYOUT.cellSize;
let BOARD_X = DESKTOP_LAYOUT.boardX;
let BOARD_Y = DESKTOP_LAYOUT.boardY;
let BOARD_WIDTH = BOARD_COLS * CELL_SIZE;
let BOARD_HEIGHT = BOARD_ROWS * CELL_SIZE;
let PANEL_X = DESKTOP_LAYOUT.panelX;
let PANEL_Y = DESKTOP_LAYOUT.panelY;
let PANEL_W = DESKTOP_LAYOUT.panelW;
let PANEL_H = DESKTOP_LAYOUT.panelH;
const ROUND_TIME_MS = 95_000;
const TARGET_SCORE = 6000;
const FRAME_MS = 1000 / 60;
const BIG_COMBO_REMOVED = 6;
const BIG_COMBO_CHAIN = 2;
const COMIC_COLORS = {
  ink: "#202027",
  caveBlue: "#2f4c61",
  caveDeep: "#182635",
};
const NOTE_FREQUENCIES = {
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  Bb4: 466.16,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
};
const ANTHEM_TEMPO = 116;
const ANTHEM_SEQUENCE = [
  { note: "A4", beats: 0.75 },
  { note: "Bb4", beats: 0.25 },
  { note: "C5", beats: 1 },
  { note: "C5", beats: 1 },
  { note: "C5", beats: 0.75 },
  { note: "A4", beats: 0.25 },
  { note: "D5", beats: 0.5 },
  { note: "C5", beats: 0.5 },
  { note: "Bb4", beats: 0.5 },
  { note: "A4", beats: 0.5 },
  { note: "G4", beats: 0.75 },
  { note: "G4", beats: 0.25 },
  { note: "C5", beats: 1.5 },
  { note: "Bb4", beats: 0.5 },
  { note: "Bb4", beats: 1 },
  { note: "A4", beats: 1 },
  { note: null, beats: 1 },
  { note: "A4", beats: 0.75 },
  { note: "Bb4", beats: 0.25 },
  { note: "C5", beats: 1 },
  { note: "C5", beats: 1 },
  { note: "C5", beats: 0.75 },
  { note: "A4", beats: 0.25 },
  { note: "D5", beats: 0.5 },
  { note: "C5", beats: 0.5 },
  { note: "Bb4", beats: 0.5 },
  { note: "A4", beats: 0.5 },
  { note: "G4", beats: 0.75 },
  { note: "G4", beats: 0.25 },
  { note: "C5", beats: 1.5 },
  { note: "E5", beats: 0.5 },
  { note: "G4", beats: 1 },
  { note: "F4", beats: 1 },
  { note: null, beats: 1 },
];
const SEARCH_PARAMS = new URLSearchParams(window.location.search);
const CONFIGURED_TEST_SEED = parseSeedValue(
  SEARCH_PARAMS.get("seed") ?? window.__WENGIEL_TEST_SEED__,
);
const LARGE_COMBO_VOICE_SRC = "./assets/audio/jeszcze-polska.wav";
const LARGE_COMBO_VOICE_LINE = "Jeszcze Polska nie zginęła";

const audioState = {
  ctx: null,
  masterGain: null,
  musicGain: null,
  sfxGain: null,
  nextAnthemAt: 0,
  anthemIndex: 0,
  schedulerId: null,
  active: false,
  muted: false,
  unlockPromise: null,
  primed: false,
  lastComboVoiceMode: null,
  lastComboVoiceAt: 0,
  speechCooldownUntil: 0,
};

const TREASURE_TYPES = [
  {
    id: "black-coal",
    label: "Wegiel kamienny",
    fill: "#2c3440",
    sprite: "./assets/treasures/coal-black.svg",
  },
  {
    id: "amber",
    label: "Bursztyn",
    fill: "#dd8d23",
    sprite: "./assets/treasures/amber.svg",
  },
  {
    id: "lignite",
    label: "Wegiel brunatny",
    fill: "#76431f",
    sprite: "./assets/treasures/lignite.svg",
  },
  {
    id: "copper",
    label: "Miedz",
    fill: "#b96431",
    sprite: "./assets/treasures/copper.svg",
  },
  {
    id: "salt",
    label: "Sol kamienna",
    fill: "#9dcbd8",
    sprite: "./assets/treasures/salt.svg",
  },
  {
    id: "flint",
    label: "Krzemien pasiasty",
    fill: "#96918c",
    sprite: "./assets/treasures/flint.svg",
  },
];

const TILE_IDS = TREASURE_TYPES.map((item) => item.id);
const tileMetaById = Object.fromEntries(TREASURE_TYPES.map((item) => [item.id, item]));

const assets = {
  images: new Map(),
  background: null,
  comboVoiceBytes: null,
  comboVoiceBuffer: null,
  comboVoiceDecodePromise: null,
};

const state = {
  mode: "loading",
  board: [],
  score: 0,
  timeLeft: ROUND_TIME_MS,
  selected: null,
  cursor: { row: 0, col: 0 },
  hover: null,
  pendingPhase: null,
  combo: 0,
  bestCombo: 0,
  collected: Object.fromEntries(TILE_IDS.map((id) => [id, 0])),
  message: "Ladujemy plansze...",
  messageTimer: 0,
  invalidPulse: 0,
  shake: 0,
  sparkle: 0,
  starShower: [],
  frames: 0,
  moves: 0,
  lastTick: performance.now(),
  largestMatch: 0,
  rngState: 0x1a2b3c4d,
  roundSeed: null,
  externalTimeControl: false,
};
const touchGesture = {
  active: false,
  pointerId: null,
  startCell: null,
  suppressClickUntil: 0,
};
const LANGUAGE_STORAGE_KEY = "wengiel-language";
const LANGUAGE_OPTIONS = ["pl", "en", "zh-CN"];
const TRANSLATIONS = {
  pl: {
    meta: {
      title: "Wengiel",
      eyebrow: "Polska ziemia. Francuski kadr. Match-3 pod ziemia.",
      lede:
        "Kreskowkowa ukladanka o skarbach Polski: bursztynie, miedzi, krzemieniu pasiastym, soli i dwoch odcieniach wegla.",
      canvasAria: "Gra Wengiel",
    },
    controls: {
      start: "Start szychu",
      restart: "Nowa fedra",
      fullscreen: "Pelny ekran [F]",
      mute: "Mute [M]",
      unmute: "Unmute [M]",
      language: "Jezyk",
    },
    treasures: {
      "black-coal": "Wegiel kamienny",
      amber: "Bursztyn",
      lignite: "Wegiel brunatny",
      copper: "Miedz",
      salt: "Sol kamienna",
      flint: "Krzemien pasiasty",
    },
    messages: {
      loading: "Ladujemy plansze...",
      shuffle: "Nowa zyla! Plansza przetasowana.",
      muted: "Dzwiek wyciszony.",
      unmuted: "Dzwiek wlaczony.",
      ready: "Fedruj grupy 3+ sasiednich skarbow.",
      win: "Syrena! Dobra zmiana.",
      lose: "Syrena! Koniec szychu.",
      cascade: ({ chain }) => `Kaskada x${chain}!`,
      bigCombo: 'Duze combo! "Jeszcze Polska nie zginęła!"',
      invalid: "Te skarby nie lacza sie w grupe 3+.",
      cascadeStart: "Fedruj! Kaskada ruszyla.",
      promptStart: "Wcisnij Start szychu.",
      assetFallback: "Czesc assetow nie doszla, ale gra rusza.",
      fullscreenOn: "Pelny ekran aktywny.",
      fullscreenOff: "Powrot z pelnego ekranu.",
      selected: ({ label }) => `${label} zaznaczony.`,
    },
    canvas: {
      title: "Skarby Polskiej Ziemi",
      subtitle: "Lacz grupy skarbow zanim zabrzmi syrena z szybu.",
      points: "Punkty",
      time: "Czas",
      combo: "Combo",
      moves: "Ruchy",
      bestCascade: "Najlepsza kaskada",
      biggestHaul: "Najwiekszy urobek",
      progress: "Postep szybu",
      scoreShaft: "Szyb punktow",
      warehouse: "Magazyn",
      readyMobile: "Dotknij dwa sasiednie pola lub przesun palcem, aby polaczyc 3+ sasiednie skarby.",
      readyMobilePanel: "Dotknij dwa sasiednie pola lub przesun palcem, aby zamienic skarby.",
      readyDesktop: "Kliknij Start szychu albo nacisnij spacje. Potem lacz 3+ sasiednie skarby.",
      instructionsMobile:
        "Dotknij dwa sasiednie skarby lub wykonaj krotki swipe. Strzalki i Enter dalej dzialaja, a F wlacza fullscreen.",
      instructionsDesktop:
        "Kliknij dwa sasiednie skarby, zeby je zamienic. Strzalki ruszaja kursorem, Enter lub Spacja wybieraja pole, F przelacza pelny ekran.",
      startOverlay: "Start szychu",
      goalOverlay: ({ target }) => `Cel: ${target} punktow przed syrena.`,
      gameOverTitle: "Koniec szychu",
      gameOverWin: "Syrena ucichla, a magazyn pekal od skarbow. To byla wzorowa fedra.",
      gameOverLose: "Syrena przerwala zmiane. Urobek jest dobry, ale szychtowy glod jeszcze rosnie.",
      loadingOverlay: "Ladujemy skarby i kredowy kontur planszy...",
      playAgainMobile: "Dotknij Nowa fedra lub R i zacznij kolejna szychte.",
      playAgainDesktop: "Kliknij Nowa fedra lub R i pogon syrene jeszcze raz.",
      targetLine: ({ target }) => `Cel: ${target}`,
      pointsLine: ({ score }) => `Punkty: ${score}`,
      finalScoreLine: ({ score }) => `Wynik koncowy: ${score}`,
    },
  },
  en: {
    meta: {
      title: "Wengiel",
      eyebrow: "Polish soil. Franco-Belgian frame. Match-3 underground.",
      lede:
        "A cartoon puzzle about Poland's treasures: amber, copper, striped flint, rock salt, and two shades of coal.",
      canvasAria: "Wengiel game",
    },
    controls: {
      start: "Start Shift",
      restart: "New Shift",
      fullscreen: "Fullscreen [F]",
      mute: "Mute [M]",
      unmute: "Unmute [M]",
      language: "Language",
    },
    treasures: {
      "black-coal": "Hard Coal",
      amber: "Amber",
      lignite: "Lignite",
      copper: "Copper",
      salt: "Rock Salt",
      flint: "Striped Flint",
    },
    messages: {
      loading: "Loading the board...",
      shuffle: "Fresh vein! The board has been reshuffled.",
      muted: "Sound muted.",
      unmuted: "Sound on.",
      ready: "Match 3 or more neighboring treasures.",
      win: "Siren! Fine shift.",
      lose: "Siren! End of shift.",
      cascade: ({ chain }) => `Cascade x${chain}!`,
      bigCombo: 'Big combo! "Jeszcze Polska nie zginęła!"',
      invalid: "Those treasures do not form a 3+ neighboring group.",
      cascadeStart: "Dig in! The cascade has started.",
      promptStart: "Press Start Shift.",
      assetFallback: "Some assets are missing, but the game can start.",
      fullscreenOn: "Fullscreen active.",
      fullscreenOff: "Left fullscreen.",
      selected: ({ label }) => `${label} selected.`,
    },
    canvas: {
      title: "Treasures of Polish Soil",
      subtitle: "Link treasure groups before the shaft siren howls.",
      points: "Score",
      time: "Time",
      combo: "Combo",
      moves: "Moves",
      bestCascade: "Best Cascade",
      biggestHaul: "Biggest Haul",
      progress: "Shaft Progress",
      scoreShaft: "Score Shaft",
      warehouse: "Stockpile",
      readyMobile: "Tap two neighboring tiles or swipe to link 3+ neighboring treasures.",
      readyMobilePanel: "Tap two neighboring tiles or swipe to swap treasures.",
      readyDesktop: "Click Start Shift or press Space. Then link 3+ neighboring treasures.",
      instructionsMobile:
        "Tap two neighboring treasures or use a short swipe. Arrow keys and Enter still work, and F toggles fullscreen.",
      instructionsDesktop:
        "Click two neighboring treasures to swap them. Arrow keys move the cursor, Enter or Space selects a tile, and F toggles fullscreen.",
      startOverlay: "Start Shift",
      goalOverlay: ({ target }) => `Goal: ${target} points before the siren.`,
      gameOverTitle: "Shift Over",
      gameOverWin: "The siren faded and the stockpile burst with treasure. A textbook shift.",
      gameOverLose: "The siren cut the shift short. The haul is solid, but the hunger for ore remains.",
      loadingOverlay: "Loading treasures and the chalk-outline board...",
      playAgainMobile: "Tap New Shift or press R to start another shift.",
      playAgainDesktop: "Click New Shift or press R to chase the siren once more.",
      targetLine: ({ target }) => `Goal: ${target}`,
      pointsLine: ({ score }) => `Score: ${score}`,
      finalScoreLine: ({ score }) => `Final score: ${score}`,
    },
  },
  "zh-CN": {
    meta: {
      title: "Wengiel",
      eyebrow: "波兰大地，法漫画框，地下三消。",
      lede: "一款关于波兰宝藏的漫画风三消：琥珀、铜、条纹燧石、岩盐，以及两种煤。",
      canvasAria: "Wengiel 游戏",
    },
    controls: {
      start: "开始班次",
      restart: "重新开采",
      fullscreen: "全屏 [F]",
      mute: "静音 [M]",
      unmute: "取消静音 [M]",
      language: "语言",
    },
    treasures: {
      "black-coal": "烟煤",
      amber: "琥珀",
      lignite: "褐煤",
      copper: "铜矿",
      salt: "岩盐",
      flint: "条纹燧石",
    },
    messages: {
      loading: "正在加载棋盘...",
      shuffle: "新矿脉！棋盘已重新洗牌。",
      muted: "声音已静音。",
      unmuted: "声音已开启。",
      ready: "请把 3 个或更多相邻宝藏连成一组。",
      win: "汽笛响起！这班干得漂亮。",
      lose: "汽笛响起！本班结束。",
      cascade: ({ chain }) => `连锁 x${chain}！`,
      bigCombo: '超大连击！“Jeszcze Polska nie zginęła!”',
      invalid: "这些宝藏没有连成 3+ 的相邻组合。",
      cascadeStart: "开采吧！连锁开始了。",
      promptStart: "点击“开始班次”。",
      assetFallback: "部分素材缺失，但游戏仍可开始。",
      fullscreenOn: "已进入全屏。",
      fullscreenOff: "已退出全屏。",
      selected: ({ label }) => `已选中：${label}`,
    },
    canvas: {
      title: "波兰大地的宝藏",
      subtitle: "在矿井警报响起前，把相邻宝藏连成组合。",
      points: "分数",
      time: "时间",
      combo: "连击",
      moves: "步数",
      bestCascade: "最佳连锁",
      biggestHaul: "最大收获",
      progress: "矿井进度",
      scoreShaft: "得分井",
      warehouse: "仓库",
      readyMobile: "轻点两个相邻格子或滑动手指，把 3 个以上相邻宝藏连成组合。",
      readyMobilePanel: "轻点两个相邻格子或滑动手指来交换宝藏。",
      readyDesktop: "点击“开始班次”或按空格，然后把 3 个以上相邻宝藏连成组合。",
      instructionsMobile:
        "轻点两个相邻宝藏或短滑交换。方向键和 Enter 仍可使用，F 可切换全屏。",
      instructionsDesktop:
        "点击两个相邻宝藏进行交换。方向键移动光标，Enter 或空格选择格子，F 切换全屏。",
      startOverlay: "开始班次",
      goalOverlay: ({ target }) => `目标：在警报响起前拿到 ${target} 分。`,
      gameOverTitle: "班次结束",
      gameOverWin: "警报渐息，仓库里堆满了宝藏。这是一班模范开采。",
      gameOverLose: "警报打断了本班。收获不错，但矿脉的饥渴仍在。",
      loadingOverlay: "正在加载宝藏与粉笔线棋盘...",
      playAgainMobile: "轻点“重新开采”或按 R 开始下一班。",
      playAgainDesktop: "点击“重新开采”或按 R 再来一班。",
      targetLine: ({ target }) => `目标：${target}`,
      pointsLine: ({ score }) => `分数：${score}`,
      finalScoreLine: ({ score }) => `最终分数：${score}`,
    },
  },
};
let currentLanguage = "pl";

function createEmptyCollected() {
  return Object.fromEntries(TILE_IDS.map((id) => [id, 0]));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseSeedValue(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw >>> 0;
  }
  if (typeof raw === "string") {
    const parsed = raw.trim().startsWith("0x")
      ? Number.parseInt(raw, 16)
      : Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed >>> 0 : null;
  }
  return null;
}

function normalizeLanguage(raw) {
  if (!raw) return "pl";
  if (raw.startsWith("zh")) return "zh-CN";
  if (raw.startsWith("en")) return "en";
  return "pl";
}

function resolveInitialLanguage() {
  try {
    const stored = window.localStorage?.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && LANGUAGE_OPTIONS.includes(stored)) {
      return stored;
    }
  } catch {}
  return normalizeLanguage((navigator.languages && navigator.languages[0]) || navigator.language || "pl");
}

function t(path, params = {}) {
  const source = TRANSLATIONS[currentLanguage] || TRANSLATIONS.pl;
  const value = path.split(".").reduce((acc, part) => acc?.[part], source);
  if (typeof value === "function") {
    return value(params);
  }
  if (typeof value === "string") {
    return value.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? "");
  }
  return path;
}

function getTreasureLabel(id) {
  return t(`treasures.${id}`);
}

function syncStaticText() {
  document.documentElement.lang = currentLanguage;
  if (pageTitle) pageTitle.textContent = t("meta.title");
  if (eyebrowText) eyebrowText.textContent = t("meta.eyebrow");
  if (ledeText) ledeText.textContent = t("meta.lede");
  if (canvas) canvas.setAttribute("aria-label", t("meta.canvasAria"));
  if (languageLabel) languageLabel.textContent = t("controls.language");
  if (languageSelect) languageSelect.value = currentLanguage;
}

currentLanguage = resolveInitialLanguage();
state.message = t("messages.loading");

function getStageInnerWidth() {
  const styles = window.getComputedStyle(stageFrame);
  const horizontalPadding =
    Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
  const width = stageFrame.clientWidth - horizontalPadding;
  return width > 0 ? width : stageFrame.clientWidth;
}

function getStageInnerHeight() {
  const styles = window.getComputedStyle(stageFrame);
  const verticalPadding =
    Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
  const height = stageFrame.clientHeight - verticalPadding;
  return height > 0 ? height : stageFrame.clientHeight;
}

function pickResponsiveLayout() {
  const fullscreen = document.fullscreenElement === stageFrame;
  const compact =
    window.innerWidth <= 820 ||
    (fullscreen && window.innerHeight > window.innerWidth) ||
    (window.matchMedia?.("(pointer: coarse)")?.matches && window.innerWidth <= 960);
  return compact ? MOBILE_LAYOUT : DESKTOP_LAYOUT;
}

function syncCanvasPresentation() {
  const fullscreen = document.fullscreenElement === stageFrame;
  const stageStyles = window.getComputedStyle(stageFrame);
  const controlsGap = Number.parseFloat(stageStyles.rowGap || stageStyles.gap || "0") || 0;
  const controlsHeight = controlStrip ? controlStrip.getBoundingClientRect().height : 0;
  const availableWidth = Math.max(1, getStageInnerWidth());
  const availableHeight = fullscreen
    ? Math.max(1, getStageInnerHeight() - controlsHeight - controlsGap)
    : Number.POSITIVE_INFINITY;
  const scale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);
  canvas.style.width = `${Math.floor(canvas.width * scale)}px`;
  canvas.style.height = `${Math.floor(canvas.height * scale)}px`;
}

function syncResponsiveLayout() {
  const nextLayout = pickResponsiveLayout();
  currentLayoutMode = nextLayout.mode;
  CELL_SIZE = nextLayout.cellSize;
  BOARD_X = nextLayout.boardX;
  BOARD_Y = nextLayout.boardY;
  BOARD_WIDTH = BOARD_COLS * CELL_SIZE;
  BOARD_HEIGHT = BOARD_ROWS * CELL_SIZE;
  PANEL_X = nextLayout.panelX;
  PANEL_Y = nextLayout.panelY;
  PANEL_W = nextLayout.panelW;
  PANEL_H = nextLayout.panelH;

  if (canvas.width !== nextLayout.canvasWidth || canvas.height !== nextLayout.canvasHeight) {
    canvas.width = nextLayout.canvasWidth;
    canvas.height = nextLayout.canvasHeight;
  }
  syncCanvasPresentation();
}

function createRandomSeed() {
  if (window.crypto?.getRandomValues) {
    return window.crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

function createRoundSeed() {
  return CONFIGURED_TEST_SEED ?? createRandomSeed();
}

function nowMs() {
  return performance.now();
}

function isLargeCombo(chain, removed, groups) {
  return (
    chain >= BIG_COMBO_CHAIN ||
    removed >= BIG_COMBO_REMOVED ||
    groups.some((group) => group.length >= 5)
  );
}

function resetRandom(seed) {
  state.rngState = seed >>> 0;
}

function nextRandom() {
  state.rngState = (state.rngState + 0x6d2b79f5) >>> 0;
  let t = state.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function randItem(items) {
  return items[Math.floor(nextRandom() * items.length)];
}

function isInsideBoard(row, col) {
  return row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS;
}

function sameCell(a, b) {
  return !!a && !!b && a.row === b.row && a.col === b.col;
}

function isAdjacent(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function makeCell(id) {
  return {
    id,
    wobble: nextRandom() * Math.PI * 2,
    fallOffsetY: 0,
    fallVelocity: 0,
    fallStartOffsetY: 0,
    fallElapsedMs: 0,
    fallDurationMs: 0,
  };
}

function ensureAudioSystem() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return false;

  if (!audioState.ctx) {
    try {
      audioState.ctx = new AudioCtor();
      audioState.masterGain = audioState.ctx.createGain();
      audioState.musicGain = audioState.ctx.createGain();
      audioState.sfxGain = audioState.ctx.createGain();
      audioState.masterGain.gain.value = 0.72;
      audioState.musicGain.gain.value = 0.18;
      audioState.sfxGain.gain.value = 0.34;
      audioState.musicGain.connect(audioState.masterGain);
      audioState.sfxGain.connect(audioState.masterGain);
      audioState.masterGain.connect(audioState.ctx.destination);
      audioState.nextAnthemAt = audioState.ctx.currentTime + 0.12;
      audioState.anthemIndex = 0;
      audioState.schedulerId = window.setInterval(scheduleAnthemLoop, 240);
      syncAudioMix();
    } catch (error) {
      console.warn("Audio init failed", error);
      audioState.ctx = null;
      return false;
    }
  }

  audioState.active = audioState.ctx.state === "running";
  if (audioState.active) {
    scheduleAnthemLoop();
  }
  return true;
}

function primeAudioHardware() {
  if (!audioState.ctx || !audioState.masterGain || audioState.ctx.state !== "running") return;
  if (audioState.primed) return;

  const silentGain = audioState.ctx.createGain();
  silentGain.gain.value = 0.00001;
  silentGain.connect(audioState.masterGain);

  const silentBuffer = audioState.ctx.createBuffer(1, 1, audioState.ctx.sampleRate);
  const source = audioState.ctx.createBufferSource();
  source.buffer = silentBuffer;
  source.connect(silentGain);
  source.start(audioState.ctx.currentTime);
  source.stop(audioState.ctx.currentTime + 0.001);

  audioState.primed = true;
}

function markAudioActive() {
  if (!audioState.ctx || audioState.ctx.state !== "running") {
    audioState.active = false;
    return false;
  }

  const wasActive = audioState.active;
  audioState.active = true;
  if (!wasActive || audioState.nextAnthemAt <= audioState.ctx.currentTime) {
    audioState.nextAnthemAt = audioState.ctx.currentTime + 0.08;
  }
  scheduleAnthemLoop();
  return true;
}

async function ensureComboVoiceBuffer() {
  if (!audioState.ctx || !assets.comboVoiceBytes) return null;
  if (assets.comboVoiceBuffer) return assets.comboVoiceBuffer;
  if (!assets.comboVoiceDecodePromise) {
    const bytes = assets.comboVoiceBytes.slice(0);
    assets.comboVoiceDecodePromise = audioState.ctx
      .decodeAudioData(bytes)
      .then((buffer) => {
        assets.comboVoiceBuffer = buffer;
        return buffer;
      })
      .catch((error) => {
        console.warn("Combo voice decode failed", error);
        return null;
      })
      .finally(() => {
        assets.comboVoiceDecodePromise = null;
      });
  }
  return assets.comboVoiceDecodePromise;
}

function playComboVoiceBuffer() {
  if (!audioState.ctx || audioState.ctx.state !== "running") return false;
  if (!assets.comboVoiceBuffer || !audioState.masterGain) return false;

  const source = audioState.ctx.createBufferSource();
  const gain = audioState.ctx.createGain();
  gain.gain.value = 1.18;
  source.buffer = assets.comboVoiceBuffer;
  source.connect(gain);
  gain.connect(audioState.masterGain);
  source.start(audioState.ctx.currentTime + 0.02);
  audioState.lastComboVoiceMode = "buffer";
  audioState.lastComboVoiceAt = nowMs();
  return true;
}

async function primeAudioFromGesture() {
  if (!ensureAudioSystem() || !audioState.ctx) return false;
  if (audioState.ctx.state !== "running") {
    if (!audioState.unlockPromise) {
      audioState.unlockPromise = audioState.ctx
        .resume()
        .catch(() => {})
        .finally(() => {
          audioState.unlockPromise = null;
        });
    }
    await audioState.unlockPromise;
  }
  primeAudioHardware();
  const active = markAudioActive();
  if (active) {
    void ensureComboVoiceBuffer();
  }
  return active;
}

function syncAudioMix() {
  if (audioState.masterGain) {
    audioState.masterGain.gain.value = audioState.muted ? 0 : 0.72;
  }
}

function scheduleAnthemLoop() {
  if (!audioState.active || !audioState.ctx || audioState.ctx.state !== "running") return;
  const beatSeconds = 60 / ANTHEM_TEMPO;
  while (audioState.nextAnthemAt < audioState.ctx.currentTime + 0.7) {
    const note = ANTHEM_SEQUENCE[audioState.anthemIndex];
    if (note?.note) {
      playAnthemNote(note.note, audioState.nextAnthemAt, note.beats * beatSeconds);
    }
    audioState.nextAnthemAt += (note?.beats || 1) * beatSeconds;
    audioState.anthemIndex = (audioState.anthemIndex + 1) % ANTHEM_SEQUENCE.length;
  }
}

function playAnthemNote(note, time, duration) {
  const freq = NOTE_FREQUENCIES[note];
  if (!freq || !audioState.ctx) return;

  const attack = 0.02;
  const release = Math.max(0.08, duration * 0.35);
  const gain = audioState.ctx.createGain();
  gain.connect(audioState.musicGain);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.22, time + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration + release);

  const lead = audioState.ctx.createOscillator();
  lead.type = "triangle";
  lead.frequency.setValueAtTime(freq, time);
  lead.connect(gain);

  const body = audioState.ctx.createOscillator();
  body.type = "sine";
  body.frequency.setValueAtTime(freq / 2, time);
  body.connect(gain);

  lead.start(time);
  body.start(time);
  lead.stop(time + duration + release);
  body.stop(time + duration + release);
}

function playSfxTone({ frequency, duration, volume, type = "triangle", when = 0, glideTo = null }) {
  if (!audioState.ctx || audioState.ctx.state !== "running") return;
  const time = audioState.ctx.currentTime + when;
  const gain = audioState.ctx.createGain();
  gain.connect(audioState.sfxGain);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(volume, time + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  const osc = audioState.ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, time);
  if (glideTo) {
    osc.frequency.exponentialRampToValueAtTime(glideTo, time + duration);
  }
  osc.connect(gain);
  osc.start(time);
  osc.stop(time + duration);
}

function playMatchSound(removed, chain, largeCombo) {
  if (!ensureAudioSystem()) return;
  playSfxTone({ frequency: 440 + removed * 18, duration: 0.18, volume: 0.16, type: "triangle" });
  playSfxTone({ frequency: 660 + chain * 40, duration: 0.22, volume: 0.1, type: "sine", when: 0.04 });
  if (largeCombo) {
    playSfxTone({ frequency: 880, duration: 0.45, volume: 0.14, type: "square", when: 0.05, glideTo: 660 });
  }
}

function playFallSound(maxDrop) {
  if (!ensureAudioSystem()) return;
  playSfxTone({
    frequency: 240 + maxDrop * 15,
    duration: 0.26,
    volume: 0.08,
    type: "sawtooth",
    glideTo: 140,
  });
}

function speakLargeCombo() {
  if (audioState.muted) return;
  if (nowMs() < audioState.speechCooldownUntil) return;
  audioState.speechCooldownUntil = nowMs() + 3200;
  if (playComboVoiceBuffer()) return;

  const fallbackSpeech = () => {
    if (!("speechSynthesis" in window)) return;
    try {
      const voices = window.speechSynthesis.getVoices?.() || [];
      const polishVoice =
        voices.find((voice) => voice.lang?.toLowerCase().startsWith("pl")) || null;
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume?.();
      const utterance = new SpeechSynthesisUtterance(LARGE_COMBO_VOICE_LINE);
      utterance.lang = "pl-PL";
      utterance.rate = 0.92;
      utterance.pitch = 0.95;
      utterance.volume = 1;
      if (polishVoice) {
        utterance.voice = polishVoice;
      }
      window.speechSynthesis.speak(utterance);
      audioState.lastComboVoiceMode = "speech";
      audioState.lastComboVoiceAt = nowMs();
    } catch (error) {
      console.warn("Speech synthesis failed", error);
    }
  };

  if (assets.comboVoiceBytes && audioState.ctx?.state === "running") {
    void ensureComboVoiceBuffer().then((buffer) => {
      if (buffer && !audioState.muted) {
        playComboVoiceBuffer();
        return;
      }
      fallbackSpeech();
    });
    return;
  }

  fallbackSpeech();
}

function spawnStarShower(chain, removed) {
  const count = 12 + removed + chain * 4;
  for (let index = 0; index < count; index += 1) {
    state.starShower.push({
      x: 56 + nextRandom() * (canvas.width - 112),
      y: -20 - nextRandom() * 180,
      vx: -70 + nextRandom() * 140,
      vy: 90 + nextRandom() * 140 + chain * 18,
      size: 8 + nextRandom() * 14,
      rotation: nextRandom() * Math.PI * 2,
      spin: -3 + nextRandom() * 6,
      life: 1700 + nextRandom() * 1000,
      hue: randItem(["#ffd34f", "#fff3aa", "#ffb347", "#ffe77a"]),
    });
  }
}

function updateTileFallAnimations(deltaMs) {
  for (const row of state.board) {
    for (const cell of row) {
      if (!cell || cell.fallDurationMs <= 0) continue;
      const previousOffset = cell.fallOffsetY;
      cell.fallElapsedMs = Math.min(cell.fallDurationMs, cell.fallElapsedMs + deltaMs);
      const t = clamp(cell.fallElapsedMs / cell.fallDurationMs, 0, 1);
      const eased = 1 - (1 - t) ** 3;
      cell.fallOffsetY = cell.fallStartOffsetY * (1 - eased);
      cell.fallVelocity = Math.abs(cell.fallOffsetY - previousOffset) * 60;
      if (t >= 1 || cell.fallOffsetY > -1) {
        cell.fallOffsetY = 0;
        cell.fallVelocity = 0;
        cell.fallStartOffsetY = 0;
        cell.fallElapsedMs = 0;
        cell.fallDurationMs = 0;
      }
    }
  }
}

function snapFallingTiles() {
  for (const row of state.board) {
    for (const cell of row) {
      if (!cell) continue;
      cell.fallOffsetY = 0;
      cell.fallVelocity = 0;
      cell.fallStartOffsetY = 0;
      cell.fallElapsedMs = 0;
      cell.fallDurationMs = 0;
    }
  }
}

function updateStarShower(deltaMs) {
  const dt = deltaMs / 1000;
  state.starShower = state.starShower.filter((star) => {
    star.x += star.vx * dt;
    star.y += star.vy * dt;
    star.vy += 580 * dt;
    star.rotation += star.spin * dt;
    star.life -= deltaMs;
    return star.life > 0 && star.y < canvas.height + 80;
  });
}

function finalizeBoardAfterFall(chain) {
  snapFallingTiles();
  const matches = findMatches(state.board);
  if (matches.cells.length) {
    pulseMessage(t("messages.cascade", { chain: chain + 1 }), 1200);
    queueMatches(matches, chain + 1);
    return;
  }

  state.pendingPhase = null;
  state.combo = 0;
  if (!boardHasMoves(state.board)) {
    shuffleBoard();
  }
}

function randomTileId(exclusions = []) {
  const allowed = TILE_IDS.filter((id) => !exclusions.includes(id));
  return randItem(allowed.length ? allowed : TILE_IDS);
}

function findMatches(board) {
  const matchedCells = [];
  const groups = [];
  const visited = new Set();

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const startCell = board[row]?.[col];
      const startKey = `${row}:${col}`;
      if (!startCell || visited.has(startKey)) continue;

      const group = [];
      const stack = [{ row, col }];
      visited.add(startKey);

      while (stack.length) {
        const current = stack.pop();
        const currentCell = board[current.row]?.[current.col];
        if (!currentCell) continue;
        group.push({ row: current.row, col: current.col, id: currentCell.id });

        const neighbors = [
          { row: current.row - 1, col: current.col },
          { row: current.row + 1, col: current.col },
          { row: current.row, col: current.col - 1 },
          { row: current.row, col: current.col + 1 },
        ];

        for (const neighbor of neighbors) {
          if (!isInsideBoard(neighbor.row, neighbor.col)) continue;
          const neighborCell = board[neighbor.row]?.[neighbor.col];
          const neighborKey = `${neighbor.row}:${neighbor.col}`;
          if (!neighborCell || neighborCell.id !== startCell.id || visited.has(neighborKey)) {
            continue;
          }
          visited.add(neighborKey);
          stack.push(neighbor);
        }
      }

      if (group.length >= 3) {
        groups.push(group);
        matchedCells.push(...group);
      }
    }
  }

  return {
    cells: matchedCells,
    groups,
  };
}

function boardHasMoves(board) {
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const neighbors = [
        { row, col: col + 1 },
        { row: row + 1, col },
      ];
      for (const neighbor of neighbors) {
        if (!isInsideBoard(neighbor.row, neighbor.col)) continue;
        const test = cloneBoard(board);
        [test[row][col], test[neighbor.row][neighbor.col]] = [
          test[neighbor.row][neighbor.col],
          test[row][col],
        ];
        if (findMatches(test).cells.length) {
          return true;
        }
      }
    }
  }
  return false;
}

function buildFreshBoard() {
  let board = [];
  let tries = 0;

  do {
    tries += 1;
    board = [];
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      const rowItems = [];
      for (let col = 0; col < BOARD_COLS; col += 1) {
        const draftBoard = board.map((existingRow) => existingRow.slice());
        draftBoard[row] = rowItems.slice();
        const exclusions = TILE_IDS.filter((id) => {
          draftBoard[row][col] = { id };
          return findMatches(draftBoard).cells.some((cell) => cell.row === row && cell.col === col);
        });
        rowItems.push(makeCell(randomTileId(exclusions)));
      }
      board.push(rowItems);
    }
  } while ((!boardHasMoves(board) || findMatches(board).cells.length) && tries < 300);

  return board;
}

function pulseMessage(text, duration = 1600) {
  state.message = text;
  state.messageTimer = duration;
}

function buildBoardForSeed(seed) {
  state.roundSeed = seed >>> 0;
  resetRandom(state.roundSeed);
  return buildFreshBoard();
}

function shuffleBoard() {
  state.board = buildFreshBoard();
  state.selected = null;
  pulseMessage(t("messages.shuffle"), 1700);
}

function syncButtons() {
  startBtn.hidden = state.mode !== "ready";
  restartBtn.hidden = state.mode === "loading";
  restartBtn.disabled = state.mode === "loading";
  startBtn.textContent = t("controls.start");
  restartBtn.textContent = t("controls.restart");
  fullscreenBtn.textContent = t("controls.fullscreen");
  muteBtn.textContent = audioState.muted ? t("controls.unmute") : t("controls.mute");
  syncStaticText();
}

function setLanguage(nextLanguage) {
  const normalized = normalizeLanguage(nextLanguage);
  if (!LANGUAGE_OPTIONS.includes(normalized)) return;
  currentLanguage = normalized;
  try {
    window.localStorage?.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
  } catch {}
  if (state.mode === "loading") {
    state.message = t("messages.loading");
  } else if (state.mode === "ready") {
    state.message = t("messages.ready");
  } else if (state.mode === "gameover") {
    state.message = state.score >= TARGET_SCORE ? t("messages.win") : t("messages.lose");
  }
  syncButtons();
  render();
}

function toggleMute() {
  audioState.muted = !audioState.muted;
  syncAudioMix();
  if (audioState.muted && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  pulseMessage(audioState.muted ? t("messages.muted") : t("messages.unmuted"), 1200);
  syncButtons();
}

function startGame() {
  void primeAudioFromGesture();
  const reusePreviewBoard =
    state.mode === "ready" && state.board.length > 0 && state.pendingPhase === null;
  ensureAudioSystem();
  state.mode = "playing";
  if (!reusePreviewBoard) {
    state.board = buildBoardForSeed(createRoundSeed());
  }
  state.score = 0;
  state.timeLeft = ROUND_TIME_MS;
  state.selected = null;
  state.cursor = { row: 0, col: 0 };
  state.pendingPhase = null;
  state.combo = 0;
  state.bestCombo = 0;
  state.collected = createEmptyCollected();
  state.message = t("messages.ready");
  state.messageTimer = 2200;
  state.invalidPulse = 0;
  state.shake = 0;
  state.sparkle = 0;
  state.starShower = [];
  state.moves = 0;
  state.largestMatch = 0;
  syncButtons();
  render();
}

function endGame() {
  state.mode = "gameover";
  state.pendingPhase = null;
  state.selected = null;
  pulseMessage(state.score >= TARGET_SCORE ? t("messages.win") : t("messages.lose"), 3200);
  syncButtons();
}

function getCellAtClientPoint(clientX, clientY) {
  const bounds = canvas.getBoundingClientRect();
  const scaleX = canvas.width / bounds.width;
  const scaleY = canvas.height / bounds.height;
  const x = (clientX - bounds.left) * scaleX;
  const y = (clientY - bounds.top) * scaleY;
  const col = Math.floor((x - BOARD_X) / CELL_SIZE);
  const row = Math.floor((y - BOARD_Y) / CELL_SIZE);
  if (!isInsideBoard(row, col)) {
    return null;
  }
  return { row, col, x, y };
}

function setCursor(row, col) {
  if (isInsideBoard(row, col)) {
    state.cursor = { row, col };
  }
}

function queueMatches(matchResult, chain) {
  state.pendingPhase = {
    type: "clear",
    timer: 240,
    matchCells: matchResult.cells,
    groups: matchResult.groups,
    chain,
  };
  state.combo = chain;
  state.bestCombo = Math.max(state.bestCombo, chain);
}

function settleBoardAfterClear(chain) {
  const board = cloneBoard(state.board);
  const columnsToUpdate = new Set();
  const uniqueMatched = state.pendingPhase.matchCells;
  const groups = state.pendingPhase.groups;
  const removed = uniqueMatched.length;
  const largeCombo = isLargeCombo(chain, removed, groups);
  let maxDrop = 0;
  let maxFallDuration = 0;

  for (const group of groups) {
    state.largestMatch = Math.max(state.largestMatch, group.length);
  }

  for (const cell of uniqueMatched) {
    state.collected[cell.id] += 1;
  }

  for (const cell of state.pendingPhase.matchCells) {
    board[cell.row][cell.col] = null;
    columnsToUpdate.add(cell.col);
  }

  state.score += uniqueMatched.length * 60 * chain;
  state.shake = Math.min(14, 3 + removed * 0.4);
  state.sparkle = 420;
  playMatchSound(removed, chain, largeCombo);

  if (largeCombo) {
    pulseMessage(t("messages.bigCombo"), 2200);
    spawnStarShower(chain, removed);
    speakLargeCombo();
  }

  columnsToUpdate.forEach((col) => {
    const survivors = [];
    for (let row = BOARD_ROWS - 1; row >= 0; row -= 1) {
      if (board[row][col]) {
        survivors.push({ cell: board[row][col], sourceRow: row });
      }
    }

    let targetRow = BOARD_ROWS - 1;
    for (const survivor of survivors) {
      const dropRows = targetRow - survivor.sourceRow;
      const cell = { ...survivor.cell };
      cell.fallStartOffsetY = dropRows > 0 ? -dropRows * CELL_SIZE : 0;
      cell.fallOffsetY = cell.fallStartOffsetY;
      cell.fallVelocity = 0;
      cell.fallElapsedMs = 0;
      cell.fallDurationMs = dropRows > 0 ? 280 + dropRows * 120 : 0;
      maxDrop = Math.max(maxDrop, dropRows);
      maxFallDuration = Math.max(maxFallDuration, cell.fallDurationMs);
      board[targetRow][col] = cell;
      targetRow -= 1;
    }

    while (targetRow >= 0) {
      const cell = makeCell(randomTileId());
      const spawnDrop = targetRow + 2;
      cell.fallStartOffsetY = -spawnDrop * CELL_SIZE;
      cell.fallOffsetY = cell.fallStartOffsetY;
      cell.fallVelocity = 0;
      cell.fallElapsedMs = 0;
      cell.fallDurationMs = 320 + spawnDrop * 120;
      maxDrop = Math.max(maxDrop, spawnDrop);
      maxFallDuration = Math.max(maxFallDuration, cell.fallDurationMs);
      board[targetRow][col] = cell;
      targetRow -= 1;
    }
  });

  state.board = board;
  if (maxDrop > 0) {
    state.pendingPhase = {
      type: "fall",
      timer: Math.max(360, maxFallDuration + 60),
      chain,
    };
    playFallSound(maxDrop);
    return;
  }

  finalizeBoardAfterFall(chain);
}

function trySwap(first, second) {
  if (state.mode !== "playing") return;
  if (!isAdjacent(first, second)) {
    state.selected = second;
    return;
  }

  state.moves += 1;
  const board = cloneBoard(state.board);
  [board[first.row][first.col], board[second.row][second.col]] = [
    board[second.row][second.col],
    board[first.row][first.col],
  ];

  const matches = findMatches(board);
  if (!matches.cells.length) {
    state.invalidPulse = 220;
    state.selected = null;
    pulseMessage(t("messages.invalid"), 1100);
    return;
  }

  state.board = board;
  state.selected = null;
  state.combo = 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.pendingPhase = {
    type: "clear",
    timer: 250,
    matchCells: matches.cells,
    groups: matches.groups,
    chain: 1,
  };
  pulseMessage(t("messages.cascadeStart"), 1300);
}

function activateCell(row, col) {
  if (state.mode === "ready") {
    startGame();
    return;
  }
  if (state.mode !== "playing" || state.pendingPhase) {
    return;
  }

  setCursor(row, col);
  const target = { row, col };
  if (!state.selected) {
    state.selected = target;
    pulseMessage(t("messages.selected", { label: getTreasureLabel(state.board[row][col].id) }), 900);
    return;
  }

  if (sameCell(state.selected, target)) {
    state.selected = null;
    return;
  }

  if (!isAdjacent(state.selected, target)) {
    state.selected = target;
    return;
  }

  trySwap(state.selected, target);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    stageFrame.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

function handleKeyboard(event) {
  void primeAudioFromGesture();
  const key = event.key.toLowerCase();
  if (key === "f") {
    toggleFullscreen();
    return;
  }
  if (key === "m") {
    toggleMute();
    return;
  }
  if (key === "r") {
    startGame();
    return;
  }
  if (state.mode === "loading") return;

  if (key === "arrowup") {
    event.preventDefault();
    setCursor(state.cursor.row - 1, state.cursor.col);
  } else if (key === "arrowdown") {
    event.preventDefault();
    setCursor(state.cursor.row + 1, state.cursor.col);
  } else if (key === "arrowleft") {
    event.preventDefault();
    setCursor(state.cursor.row, state.cursor.col - 1);
  } else if (key === "arrowright") {
    event.preventDefault();
    setCursor(state.cursor.row, state.cursor.col + 1);
  } else if (key === " " || key === "enter") {
    event.preventDefault();
    activateCell(state.cursor.row, state.cursor.col);
  }
}

function drawRoundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawPaperBackground() {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#f7efd7");
  gradient.addColorStop(0.52, "#e7d8bb");
  gradient.addColorStop(1, "#d7c7aa");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (assets.background?.complete) {
    ctx.save();
    ctx.globalAlpha = 0.15;
    const pattern = ctx.createPattern(assets.background, "repeat");
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
  }

  const sky = ctx.createLinearGradient(0, 0, 0, 250);
  sky.addColorStop(0, "rgba(116, 162, 176, 0.92)");
  sky.addColorStop(1, "rgba(116, 162, 176, 0)");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, 280);

  ctx.save();
  ctx.fillStyle = "rgba(255, 235, 169, 0.24)";
  ctx.beginPath();
  ctx.arc(780, 118, 94, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = COMIC_COLORS.caveBlue;
  ctx.beginPath();
  ctx.moveTo(0, 238);
  ctx.bezierCurveTo(160, 184, 250, 282, 378, 220);
  ctx.bezierCurveTo(476, 172, 572, 252, 658, 214);
  ctx.bezierCurveTo(760, 170, 838, 238, 960, 180);
  ctx.lineTo(960, 302);
  ctx.lineTo(0, 302);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = COMIC_COLORS.caveDeep;
  ctx.beginPath();
  ctx.moveTo(0, 310);
  ctx.bezierCurveTo(164, 240, 290, 348, 416, 290);
  ctx.bezierCurveTo(542, 230, 630, 332, 748, 286);
  ctx.bezierCurveTo(824, 256, 898, 300, 960, 266);
  ctx.lineTo(960, 422);
  ctx.lineTo(0, 422);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(34, 34, 40, 0.18)";
  ctx.lineWidth = 2;
  for (let index = 0; index < 20; index += 1) {
    ctx.beginPath();
    ctx.arc(80 + index * 42, 88 + ((index % 2) * 16), 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFrame() {
  const titleBarHeight = currentLayoutMode === "mobile" ? 82 : 62;
  drawRoundedRect(28, 28, canvas.width - 56, canvas.height - 56, 28);
  ctx.fillStyle = "rgba(252, 245, 224, 0.58)";
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = COMIC_COLORS.ink;
  ctx.stroke();

  drawRoundedRect(44, 44, canvas.width - 88, titleBarHeight, 22);
  ctx.fillStyle = "rgba(255, 232, 171, 0.88)";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = COMIC_COLORS.ink;
  ctx.stroke();

  ctx.fillStyle = COMIC_COLORS.ink;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font =
    currentLayoutMode === "mobile"
      ? '900 31px "Alegreya SC", Georgia, serif'
      : '900 38px "Alegreya SC", Georgia, serif';
  ctx.fillText(t("canvas.title"), 68, 78);

  if (currentLayoutMode === "mobile") {
    ctx.font = '600 12px "Spectral", Georgia, serif';
    wrapText(t("canvas.subtitle"), 468, 58, 160, 14);
  } else {
    ctx.font = '600 16px "Spectral", Georgia, serif';
    ctx.fillText(t("canvas.subtitle"), 512, 80);
  }
}

function drawBoardBase() {
  drawRoundedRect(BOARD_X - 12, BOARD_Y - 12, BOARD_WIDTH + 24, BOARD_HEIGHT + 24, 28);
  ctx.fillStyle = "rgba(248, 236, 204, 0.9)";
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = COMIC_COLORS.ink;
  ctx.stroke();

  ctx.save();
  drawRoundedRect(BOARD_X, BOARD_Y, BOARD_WIDTH, BOARD_HEIGHT, 20);
  ctx.clip();
  const wellGradient = ctx.createLinearGradient(BOARD_X, BOARD_Y, BOARD_X, BOARD_Y + BOARD_HEIGHT);
  wellGradient.addColorStop(0, "#2c4155");
  wellGradient.addColorStop(1, "#17242f");
  ctx.fillStyle = wellGradient;
  ctx.fillRect(BOARD_X, BOARD_Y, BOARD_WIDTH, BOARD_HEIGHT);

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const x = BOARD_X + col * CELL_SIZE;
      const y = BOARD_Y + row * CELL_SIZE;
      ctx.fillStyle = (row + col) % 2 === 0 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.08)";
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
    }
  }
  ctx.restore();
}

function drawTile(cell, row, col, phaseTime) {
  const x = BOARD_X + col * CELL_SIZE + 4;
  const y = BOARD_Y + row * CELL_SIZE + 4 + (cell.fallOffsetY || 0);
  const size = CELL_SIZE - 8;
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const tile = tileMetaById[cell.id];
  let scale = 1;
  const fallTilt = clamp((cell.fallVelocity || 0) / 1400, 0, 0.16);

  if (state.pendingPhase?.type === "clear") {
    const isMatched = state.pendingPhase.matchCells.some((item) => item.row === row && item.col === col);
    if (isMatched) {
      scale = 1 + Math.sin(phaseTime * 0.04 + row + col) * 0.09;
    }
  }

  const pulse = sameCell(state.selected, { row, col });
  const cursorPulse = sameCell(state.cursor, { row, col });

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((col % 2 === 0 ? 1 : -1) * fallTilt);
  ctx.scale(scale, scale);

  drawRoundedRect(-size / 2, -size / 2, size, size, 22);
  ctx.fillStyle = "rgba(250, 244, 229, 0.96)";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = COMIC_COLORS.ink;
  ctx.stroke();

  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = tile.fill;
  drawRoundedRect(-size / 2 + 6, -size / 2 + 6, size - 12, size - 12, 18);
  ctx.fill();
  ctx.restore();

  const image = assets.images.get(cell.id);
  if (image?.complete) {
    ctx.drawImage(image, -26, -26, 52, 52);
  } else {
    ctx.fillStyle = tile.fill;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255,255,255,0.24)";
  ctx.beginPath();
  ctx.ellipse(-8, -14, 14, 8, -0.4, 0, Math.PI * 2);
  ctx.fill();

  if (pulse) {
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#ffcd57";
    drawRoundedRect(-size / 2 + 2, -size / 2 + 2, size - 4, size - 4, 20);
    ctx.stroke();
  }

  if (cursorPulse) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#9de0ff";
    ctx.setLineDash([10, 7]);
    drawRoundedRect(-size / 2 - 3, -size / 2 - 3, size + 6, size + 6, 22);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function drawComicStar(star) {
  ctx.save();
  ctx.translate(star.x, star.y);
  ctx.rotate(star.rotation);
  ctx.fillStyle = star.hue;
  ctx.strokeStyle = "rgba(32, 32, 39, 0.78)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const radius = index % 2 === 0 ? star.size : star.size * 0.46;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawStarShower() {
  for (const star of state.starShower) {
    drawComicStar(star);
  }
}

function drawBoard(phaseTime) {
  drawBoardBase();

  ctx.save();
  if (state.shake > 0) {
    const offsetX = Math.sin(state.frames * 0.9) * state.shake;
    const offsetY = Math.cos(state.frames * 0.6) * state.shake * 0.45;
    ctx.translate(offsetX, offsetY);
  }

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const cell = state.board[row]?.[col];
      if (!cell) continue;
      drawTile(cell, row, col, phaseTime);
    }
  }
  ctx.restore();
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.includes(" ") ? text.split(" ") : Array.from(text);
  const separator = text.includes(" ") ? " " : "";
  let line = "";
  let lineY = y;
  for (const word of words) {
    const testLine = line ? `${line}${separator}${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, lineY);
  }
}

function drawSpeechBubble(x, y, width, height, text, fill) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = COMIC_COLORS.ink;
  ctx.lineWidth = 4;
  drawRoundedRect(x, y, width, height, 18);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + 34, y + height);
  ctx.lineTo(x + 56, y + height);
  ctx.lineTo(x + 46, y + height + 20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = COMIC_COLORS.ink;
  ctx.font =
    currentLayoutMode === "mobile"
      ? '600 15px "Spectral", Georgia, serif'
      : '600 17px "Spectral", Georgia, serif';
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  wrapText(text, x + 18, y + 16, width - 36, currentLayoutMode === "mobile" ? 21 : 24);
  ctx.restore();
}

function drawStatChip(x, y, width, height, label, value) {
  drawRoundedRect(x, y, width, height, 18);
  ctx.fillStyle = "rgba(255, 243, 208, 0.92)";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = COMIC_COLORS.ink;
  ctx.stroke();

  ctx.fillStyle = COMIC_COLORS.ink;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = '700 14px "Alegreya SC", Georgia, serif';
  ctx.fillText(label, x + 14, y + 12);
  ctx.font = '900 26px "Alegreya SC", Georgia, serif';
  ctx.fillText(String(value), x + 14, y + 34);
}

function drawMobilePanel() {
  drawRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 28);
  ctx.fillStyle = "rgba(248, 239, 213, 0.94)";
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = COMIC_COLORS.ink;
  ctx.stroke();

  const chipGap = 14;
  const chipWidth = (PANEL_W - 36 * 2 - chipGap * 2) / 3;
  const chipY = PANEL_Y + 22;
  drawStatChip(PANEL_X + 22, chipY, chipWidth, 82, t("canvas.points"), state.score);
  drawStatChip(
    PANEL_X + 22 + chipWidth + chipGap,
    chipY,
    chipWidth,
    82,
    t("canvas.time"),
    `${Math.max(0, Math.ceil(state.timeLeft / 1000))}s`,
  );
  drawStatChip(
    PANEL_X + 22 + (chipWidth + chipGap) * 2,
    chipY,
    chipWidth,
    82,
    t("canvas.combo"),
    `x${state.bestCombo || 1}`,
  );

  ctx.fillStyle = COMIC_COLORS.ink;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = '800 21px "Alegreya SC", Georgia, serif';
  ctx.fillText(t("canvas.progress"), PANEL_X + 22, PANEL_Y + 126);

  const scoreRatio = clamp(state.score / TARGET_SCORE, 0, 1);
  drawRoundedRect(PANEL_X + 22, PANEL_Y + 160, PANEL_W - 44, 20, 10);
  ctx.fillStyle = "rgba(32, 32, 39, 0.18)";
  ctx.fill();
  drawRoundedRect(PANEL_X + 22, PANEL_Y + 160, (PANEL_W - 44) * scoreRatio, 20, 10);
  ctx.fillStyle = "rgba(236, 147, 56, 0.92)";
  ctx.fill();

  const cardGap = 16;
  const cardWidth = (PANEL_W - 44 - cardGap) / 2;
  const cardHeight = 78;
  let index = 0;
  for (const type of TREASURE_TYPES) {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = PANEL_X + 22 + col * (cardWidth + cardGap);
    const y = PANEL_Y + 206 + row * (cardHeight + 12);
    drawRoundedRect(x, y, cardWidth, cardHeight, 18);
    ctx.fillStyle = "rgba(255, 246, 222, 0.95)";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = COMIC_COLORS.ink;
    ctx.stroke();

    const image = assets.images.get(type.id);
    if (image?.complete) {
      ctx.drawImage(image, x + 14, y + 16, 34, 34);
    }
    ctx.fillStyle = COMIC_COLORS.ink;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = '700 13px "Spectral", Georgia, serif';
    wrapText(getTreasureLabel(type.id), x + 58, y + 12, cardWidth - 96, 16);
    ctx.font = '900 26px "Alegreya SC", Georgia, serif';
    ctx.textAlign = "right";
    ctx.fillText(String(state.collected[type.id]), x + cardWidth - 14, y + 20);
    index += 1;
  }

  drawSpeechBubble(
    PANEL_X + 22,
    PANEL_Y + PANEL_H - 118,
    PANEL_W - 44,
    86,
    state.mode === "ready"
      ? t("canvas.readyMobilePanel")
      : state.mode === "gameover"
        ? t("canvas.playAgainMobile")
        : state.message,
    "rgba(255, 242, 202, 0.94)",
  );
}

function drawSidePanel() {
  if (currentLayoutMode === "mobile") {
    drawMobilePanel();
    return;
  }

  drawRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 28);
  ctx.fillStyle = "rgba(248, 239, 213, 0.92)";
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = COMIC_COLORS.ink;
  ctx.stroke();

  ctx.fillStyle = COMIC_COLORS.ink;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = '800 24px "Alegreya SC", Georgia, serif';
  ctx.fillText(t("canvas.scoreShaft"), PANEL_X + 22, PANEL_Y + 18);

  const scoreRatio = clamp(state.score / TARGET_SCORE, 0, 1);
  ctx.font = '700 16px "Spectral", Georgia, serif';
  ctx.fillText(t("canvas.pointsLine", { score: state.score }), PANEL_X + 22, PANEL_Y + 60);
  ctx.fillText(t("canvas.targetLine", { target: TARGET_SCORE }), PANEL_X + 22, PANEL_Y + 84);

  drawRoundedRect(PANEL_X + 20, PANEL_Y + 112, PANEL_W - 40, 20, 10);
  ctx.fillStyle = "rgba(32, 32, 39, 0.18)";
  ctx.fill();
  drawRoundedRect(PANEL_X + 20, PANEL_Y + 112, (PANEL_W - 40) * scoreRatio, 20, 10);
  ctx.fillStyle = "rgba(236, 147, 56, 0.92)";
  ctx.fill();

  const secondsLeft = Math.max(0, Math.ceil(state.timeLeft / 1000));
  ctx.font = '900 24px "Alegreya SC", Georgia, serif';
  ctx.fillText(`${t("canvas.time")}: ${secondsLeft}s`, PANEL_X + 22, PANEL_Y + 152);
  ctx.font = '700 16px "Spectral", Georgia, serif';
  ctx.fillText(`${t("canvas.moves")}: ${state.moves}`, PANEL_X + 22, PANEL_Y + 188);
  ctx.fillText(`${t("canvas.bestCascade")}: x${state.bestCombo || 1}`, PANEL_X + 22, PANEL_Y + 212);
  ctx.fillText(`${t("canvas.biggestHaul")}: ${state.largestMatch || 0}`, PANEL_X + 22, PANEL_Y + 236);

  ctx.font = '800 22px "Alegreya SC", Georgia, serif';
  ctx.fillText(t("canvas.warehouse"), PANEL_X + 22, PANEL_Y + 274);

  let y = PANEL_Y + 316;
  for (const type of TREASURE_TYPES) {
    const image = assets.images.get(type.id);
    if (image?.complete) {
      ctx.drawImage(image, PANEL_X + 20, y - 6, 34, 34);
    }
    ctx.font = '700 15px "Spectral", Georgia, serif';
    ctx.fillStyle = COMIC_COLORS.ink;
    ctx.fillText(getTreasureLabel(type.id), PANEL_X + 62, y + 2);
    ctx.textAlign = "right";
    ctx.fillText(String(state.collected[type.id]), PANEL_X + PANEL_W - 20, y + 2);
    ctx.textAlign = "left";
    y += 40;
  }

  drawSpeechBubble(
    PANEL_X + 18,
    PANEL_Y + 538,
    PANEL_W - 36,
    90,
    state.mode === "ready"
      ? t("canvas.readyDesktop")
      : state.mode === "gameover"
        ? t("canvas.playAgainDesktop")
        : state.message,
    "rgba(255, 242, 202, 0.94)",
  );
}

function drawReadyOverlay() {
  const bubbleWidth = currentLayoutMode === "mobile" ? BOARD_WIDTH - 48 : 404;
  const bubbleX = currentLayoutMode === "mobile" ? BOARD_X + 24 : BOARD_X + 86;
  const bubbleY = currentLayoutMode === "mobile" ? BOARD_Y + 96 : BOARD_Y + 118;
  ctx.save();
  ctx.fillStyle = "rgba(17, 22, 28, 0.38)";
  ctx.fillRect(BOARD_X, BOARD_Y, BOARD_WIDTH, BOARD_HEIGHT);
  drawSpeechBubble(
    bubbleX,
    bubbleY,
    bubbleWidth,
    currentLayoutMode === "mobile" ? 146 : 154,
    currentLayoutMode === "mobile"
      ? t("canvas.instructionsMobile")
      : t("canvas.instructionsDesktop"),
    "rgba(255, 238, 187, 0.97)",
  );
  ctx.fillStyle = "#fff8e6";
  ctx.font =
    currentLayoutMode === "mobile"
      ? '900 46px "Alegreya SC", Georgia, serif'
      : '900 54px "Alegreya SC", Georgia, serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    t("canvas.startOverlay"),
    BOARD_X + BOARD_WIDTH / 2,
    currentLayoutMode === "mobile" ? BOARD_Y + 420 : BOARD_Y + 380,
  );
  ctx.font =
    currentLayoutMode === "mobile"
      ? '700 24px "Spectral", Georgia, serif'
      : '700 22px "Spectral", Georgia, serif';
  ctx.fillText(
    t("canvas.goalOverlay", { target: TARGET_SCORE }),
    BOARD_X + BOARD_WIDTH / 2,
    currentLayoutMode === "mobile" ? BOARD_Y + 470 : BOARD_Y + 430,
  );
  ctx.restore();
}

function drawGameOverOverlay() {
  const bubbleWidth = currentLayoutMode === "mobile" ? BOARD_WIDTH - 64 : 384;
  const bubbleX = currentLayoutMode === "mobile" ? BOARD_X + 32 : BOARD_X + 120;
  const bubbleY = currentLayoutMode === "mobile" ? BOARD_Y + 108 : BOARD_Y + 128;
  ctx.save();
  ctx.fillStyle = "rgba(17, 22, 28, 0.44)";
  ctx.fillRect(BOARD_X, BOARD_Y, BOARD_WIDTH, BOARD_HEIGHT);
  drawSpeechBubble(
    bubbleX,
    bubbleY,
    bubbleWidth,
    currentLayoutMode === "mobile" ? 158 : 168,
    state.score >= TARGET_SCORE
      ? t("canvas.gameOverWin")
      : t("canvas.gameOverLose"),
    "rgba(245, 232, 196, 0.97)",
  );
  ctx.fillStyle = "#fff8e6";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font =
    currentLayoutMode === "mobile"
      ? '900 44px "Alegreya SC", Georgia, serif'
      : '900 52px "Alegreya SC", Georgia, serif';
  ctx.fillText(
    t("canvas.gameOverTitle"),
    BOARD_X + BOARD_WIDTH / 2,
    currentLayoutMode === "mobile" ? BOARD_Y + 428 : BOARD_Y + 386,
  );
  ctx.font =
    currentLayoutMode === "mobile"
      ? '700 24px "Spectral", Georgia, serif'
      : '700 22px "Spectral", Georgia, serif';
  ctx.fillText(
    t("canvas.finalScoreLine", { score: state.score }),
    BOARD_X + BOARD_WIDTH / 2,
    currentLayoutMode === "mobile" ? BOARD_Y + 476 : BOARD_Y + 434,
  );
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPaperBackground();
  drawFrame();
  drawBoard(state.frames);
  drawSidePanel();
  drawStarShower();

  if (state.mode === "ready") {
    drawReadyOverlay();
  } else if (state.mode === "gameover") {
    drawGameOverOverlay();
  } else if (state.mode === "loading") {
    const loadingWidth = currentLayoutMode === "mobile" ? BOARD_WIDTH - 96 : 360;
    drawSpeechBubble(
      currentLayoutMode === "mobile" ? BOARD_X + 48 : BOARD_X + 110,
      currentLayoutMode === "mobile" ? BOARD_Y + 230 : BOARD_Y + 200,
      loadingWidth,
      110,
    t("canvas.loadingOverlay"),
      "#fff3cc",
    );
  }
}

function tick(deltaMs) {
  state.frames += 1;
  updateTileFallAnimations(deltaMs);
  updateStarShower(deltaMs);
  scheduleAnthemLoop();

  if (state.messageTimer > 0) {
    state.messageTimer = Math.max(0, state.messageTimer - deltaMs);
  }
  state.invalidPulse = Math.max(0, state.invalidPulse - deltaMs);
  state.shake = Math.max(0, state.shake - deltaMs * 0.03);
  state.sparkle = Math.max(0, state.sparkle - deltaMs);

  if (state.mode === "playing" || state.pendingPhase) {
    state.timeLeft = Math.max(0, state.timeLeft - deltaMs);
    if (state.timeLeft === 0 && state.mode !== "gameover") {
      endGame();
      return;
    }
  }

  if (state.pendingPhase) {
    state.pendingPhase.timer -= deltaMs;
    if (state.pendingPhase.type === "clear" && state.pendingPhase.timer <= 0) {
      settleBoardAfterClear(state.pendingPhase.chain);
    } else if (state.pendingPhase.type === "fall" && state.pendingPhase.timer <= 0) {
      finalizeBoardAfterFall(state.pendingPhase.chain);
    }
  }
}

function loop(now) {
  if (state.externalTimeControl) {
    state.lastTick = now;
    requestAnimationFrame(loop);
    return;
  }
  const delta = clamp(now - state.lastTick, 0, 48);
  state.lastTick = now;
  tick(delta);
  render();
  requestAnimationFrame(loop);
}

async function loadImage(key, src) {
  const image = new Image();
  image.src = src;
  await image.decode();
  assets.images.set(key, image);
}

async function loadAssets() {
  const jobs = TREASURE_TYPES.map((item) => loadImage(item.id, item.sprite));
  jobs.push(
    fetch(LARGE_COMBO_VOICE_SRC)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then((bytes) => {
        assets.comboVoiceBytes = bytes;
      })
      .catch((error) => {
        console.warn("Combo voice asset failed", error);
      }),
  );
  const background = new Image();
  background.src = "./assets/paper-texture.jpg";
  background.addEventListener("load", () => {
    assets.background = background;
  });
  background.addEventListener("error", () => {
    assets.background = null;
  });
  await Promise.all(jobs);
}

function renderGameToText() {
  const payload = {
    language: currentLanguage,
    note: "board[0][0] is top-left; x increases right, y increases down",
    mode: state.mode,
    score: state.score,
    targetScore: TARGET_SCORE,
    timeLeftMs: Math.max(0, Math.round(state.timeLeft)),
    combo: state.combo,
    cursor: state.cursor,
    selected: state.selected,
    boardRect: {
      x: BOARD_X,
      y: BOARD_Y,
      cellSize: CELL_SIZE,
      width: BOARD_WIDTH,
      height: BOARD_HEIGHT,
    },
    controls: {
      mouse: "click one tile, then a neighboring tile",
      keyboard: ["Arrow keys move cursor", "Space or Enter select or swap", "R restart", "F fullscreen"],
    },
    effects: {
      pendingPhase: state.pendingPhase?.type || null,
      fallingTiles: state.board.flat().filter((cell) => cell && Math.abs(cell.fallOffsetY || 0) > 0.5).length,
      stars: state.starShower.length,
      audioActive: audioState.active,
      muted: audioState.muted,
      comboVoiceLoaded: Boolean(assets.comboVoiceBytes),
      comboVoiceReady: Boolean(assets.comboVoiceBuffer),
      comboVoiceMode: audioState.lastComboVoiceMode,
      comboVoiceAt: audioState.lastComboVoiceAt,
    },
    seed: state.roundSeed,
    collected: state.collected,
    board: state.board.map((row) => row.map((cell) => (cell ? cell.id : null))),
    message: state.message,
  };
  return JSON.stringify(payload);
}

window.render_game_to_text = renderGameToText;
window.advanceTime = async (ms) => {
  state.externalTimeControl = true;
  const steps = Math.max(1, Math.round(ms / FRAME_MS));
  const stepSize = ms / steps;
  for (let index = 0; index < steps; index += 1) {
    tick(stepSize);
  }
  render();
  state.lastTick = performance.now();
};

function activateTouchGesture(endCell, event) {
  const startCell = touchGesture.startCell;
  touchGesture.active = false;
  touchGesture.pointerId = null;
  touchGesture.startCell = null;
  touchGesture.suppressClickUntil = nowMs() + 420;
  canvas.releasePointerCapture?.(event.pointerId);

  if (!startCell) return;
  if (state.mode === "ready") {
    startGame();
    return;
  }
  if (state.mode !== "playing" || state.pendingPhase) {
    return;
  }

  if (endCell && isAdjacent(startCell, endCell)) {
    setCursor(startCell.row, startCell.col);
    trySwap(startCell, endCell);
    return;
  }

  activateCell((endCell || startCell).row, (endCell || startCell).col);
}

canvas.addEventListener("pointerdown", (event) => {
  void primeAudioFromGesture();
  if (event.pointerType !== "touch") return;
  const cell = getCellAtClientPoint(event.clientX, event.clientY);
  if (!cell) return;
  touchGesture.active = true;
  touchGesture.pointerId = event.pointerId;
  touchGesture.startCell = { row: cell.row, col: cell.col };
  canvas.setPointerCapture?.(event.pointerId);
  event.preventDefault();
});

canvas.addEventListener("pointerup", (event) => {
  if (!touchGesture.active || event.pointerId !== touchGesture.pointerId) return;
  const cell = getCellAtClientPoint(event.clientX, event.clientY);
  activateTouchGesture(cell ? { row: cell.row, col: cell.col } : null, event);
  event.preventDefault();
});

canvas.addEventListener("pointercancel", () => {
  touchGesture.active = false;
  touchGesture.pointerId = null;
  touchGesture.startCell = null;
});

canvas.addEventListener("click", (event) => {
  void primeAudioFromGesture();
  if (nowMs() < touchGesture.suppressClickUntil) return;
  const cell = getCellAtClientPoint(event.clientX, event.clientY);
  if (cell) {
    activateCell(cell.row, cell.col);
  }
});

canvas.addEventListener("mousemove", (event) => {
  const cell = getCellAtClientPoint(event.clientX, event.clientY);
  state.hover = cell ? { row: cell.row, col: cell.col } : null;
});

function attachAudioUnlockListeners(element) {
  if (!element) return;
  element.addEventListener("pointerdown", () => {
    void primeAudioFromGesture();
  });
  element.addEventListener(
    "touchstart",
    () => {
      void primeAudioFromGesture();
    },
    { passive: true },
  );
}

window.addEventListener("keydown", handleKeyboard);
window.addEventListener("resize", () => {
  syncResponsiveLayout();
  render();
});

attachAudioUnlockListeners(canvas);
attachAudioUnlockListeners(startBtn);
attachAudioUnlockListeners(restartBtn);
attachAudioUnlockListeners(fullscreenBtn);
attachAudioUnlockListeners(muteBtn);

languageSelect?.addEventListener("change", (event) => {
  setLanguage(event.target.value);
});

startBtn.addEventListener("click", () => {
  void primeAudioFromGesture();
  startGame();
});
restartBtn.addEventListener("click", () => {
  void primeAudioFromGesture();
  startGame();
});
fullscreenBtn.addEventListener("click", () => {
  void primeAudioFromGesture();
  toggleFullscreen();
});
muteBtn.addEventListener("click", () => {
  void primeAudioFromGesture();
  toggleMute();
});

window.addEventListener("fullscreenchange", () => {
  syncResponsiveLayout();
  pulseMessage(
    document.fullscreenElement ? t("messages.fullscreenOn") : t("messages.fullscreenOff"),
    1200,
  );
});

async function boot() {
  syncResponsiveLayout();
  syncButtons();
  try {
    await loadAssets();
    state.mode = "ready";
    state.board = buildBoardForSeed(createRoundSeed());
    pulseMessage(t("messages.promptStart"), 1800);
  } catch (error) {
    console.error(error);
    state.mode = "ready";
    state.board = buildBoardForSeed(createRoundSeed());
    pulseMessage(t("messages.assetFallback"), 2500);
  }
  syncButtons();
  syncResponsiveLayout();
  render();
  requestAnimationFrame(loop);
}

boot();
