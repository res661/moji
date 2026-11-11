/* Moji Mini App prototype — localStorage, no backend, Stars mocked. */
const KEY = "moji-save-v2";
const WEEK_LABELS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

const HATS = [
  { id: "none", name: "Без шапки", price: 0, currency: "coins", tint: "#8E8E93" },
  { id: "bow", name: "Бантик", price: 40, currency: "coins", tint: "#FF6B9A" },
  { id: "beanie", name: "Шапка", price: 60, currency: "coins", tint: "#007AFF" },
  { id: "glasses", name: "Очки", price: 80, currency: "coins", tint: "#1C1C1E" },
  { id: "scarf", name: "Шарф", price: 70, currency: "coins", tint: "#FF3B30" },
  { id: "crown", name: "Корона", price: 1, currency: "stars", tint: "#C9972A" },
];
const BACKGROUNDS = [
  { id: "room", name: "Комната", price: 0, currency: "coins" },
  { id: "meadow", name: "Поляна", price: 50, currency: "coins" },
  { id: "night", name: "Ночь", price: 1, currency: "stars" },
];
const TASKS = [
  { id: "feed", title: "Покормить моджи", hint: "Дай вкусняшку", xp: 20, coins: 8, color: "#FF6B9A", icon: "feed" },
  { id: "visit", title: "Зайти сегодня", hint: "Открыть приложение", xp: 10, coins: 4, color: "#007AFF", icon: "visit" },
  { id: "share", title: "Поделиться карточкой", hint: "Серия, уровень или спин", xp: 15, coins: 6, color: "#34C759", icon: "share" },
  { id: "dress", title: "Примерить вещь", hint: "Загляни в магазин", xp: 12, coins: 5, color: "#FF9F0A", icon: "dress" },
  { id: "spin", title: "Крутить рулетку", hint: "Один бесплатный спин", xp: 10, coins: 5, color: "#AF52DE", icon: "spin" },
];

const TASK_ICONS = {
  feed: '<path d="M4 13c0 4 3.6 7 8 7s8-3 8-7H4z"/><path d="M6 13V7.5A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 6 .5V13"/>',
  visit: '<path d="M20 6 9 17l-5-5"/>',
  share: '<circle cx="6.5" cy="12" r="2.1"/><circle cx="17" cy="6.5" r="2.1"/><circle cx="17" cy="17.5" r="2.1"/><path d="M8.5 11.2 14.8 7.6M8.5 12.8 14.8 16.4"/>',
  dress: '<path d="M6 8h12l-.8 11H7.8L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  spin: '<circle cx="12" cy="12" r="8"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3"/>',
  xp: '<path d="M12 4v16M8 8l4-4 4 4"/>',
};

const ITEM_ICONS = {
  none: '<circle cx="12" cy="12" r="7"/><path d="M8 12h8"/>',
  bow: '<path d="M12 12 5 8v8l7-4zM12 12l7-4v8l-7-4z"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>',
  beanie: '<path d="M5 14h14v4H5z"/><path d="M6 14a6 6 0 0 1 12 0"/><circle cx="12" cy="6.5" r="1.3" fill="currentColor"/>',
  glasses: '<circle cx="8" cy="13" r="3"/><circle cx="16" cy="13" r="3"/><path d="M11 13h2M5 13H4M20 13h-1"/>',
  scarf: '<path d="M8 5.8a4 4 0 0 1 8 0V8.5H8V5.8z"/><path d="M8 8.5h3.3v11.2"/><path d="M12.7 8.5H16v8.2"/>',
  crown: '<path d="M4 16h16l-1.2-8-4.3 3.2L12 6l-2.5 5.2L5.2 8 4 16z"/><path d="M5 18h14"/>',
};

const tg = window.Telegram && window.Telegram.WebApp;
const $ = (id) => document.getElementById(id);

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function weekdayIndex() {
  return (new Date().getDay() + 6) % 7;
}
function defaultState() {
  const today = todayKey();
  return {
    loopVersion: 1,
    onboarded: false,
    selectedId: "axolotl",
    name: "",
    coins: 80,
    xp: 0,
    level: 1,
    streak: 1,
    lastVisit: today,
    week: Array(7).fill(false).map((_, i) => i === weekdayIndex()),
    hunger: 55,
    mood: 70,
    hat: "none",
    bg: "night",
    ownedHats: ["none"],
    ownedBgs: ["room", "night"],
    tasksDone: {},
    tasksDay: today,
    freezes: 1,
    frozenDays: [],
    loginDays: [today],
    lastSpin: null,
    lastSpinResult: null,
    claimedLevels: [1],
    titles: [TITLES[1]],
    activeTitle: TITLES[1],
    weekly: emptyWeekly(weekId()),
    food: {},
    ownedToys: [],
    bestStreak: 1,
    totalXp: 0,
    streakLost: false,
    frozenToday: false,
    settings: { sound: true, haptics: true, notifications: false, theme: "auto" },
  };
}

function migrate(s) {
  s.loopVersion = 1;
  s.selectedId = "axolotl";
  s.freezes = s.freezes == null ? 1 : s.freezes;
  s.frozenDays = s.frozenDays || [];
  s.loginDays = s.loginDays || [s.lastVisit || todayKey()];
  s.claimedLevels = s.claimedLevels || [1];
  s.titles = s.titles || [TITLES[1]];
  s.activeTitle = s.activeTitle || TITLES[1];
  s.food = s.food || {};
  s.ownedToys = s.ownedToys || [];
  s.bestStreak = Math.max(s.bestStreak || 1, s.streak || 1);
  s.totalXp = s.totalXp || 0;
  s.streakLost = !!s.streakLost;
  s.frozenToday = !!s.frozenToday;
  s.settings = Object.assign({ sound: true, haptics: true, notifications: false, theme: "auto" }, s.settings || {});
  ensureWeekly(s);
  const cap = xpToNext(s.level);
  if (cap && s.xp >= cap) s.xp = cap - 1;
  if (s.level > MAX_LEVEL) s.level = MAX_LEVEL;
  return s;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const s = migrate({ ...defaultState(), ...JSON.parse(raw) });
    if (s.tasksDay !== todayKey()) {
      s.tasksDone = {};
      s.tasksDay = todayKey();
    }
    const report = applyDayRollover(s, todayKey());
    s._rollover = report;
    if (report.usedFreeze) s.frozenToday = true;
    if (report.resetStreak) s.streakLost = true;
    s.bestStreak = Math.max(s.bestStreak || 1, s.streak || 1);
    return s;
  } catch {
    return defaultState();
  }
}
function save() {
  const copy = { ...state };
  delete copy._rollover;
  localStorage.setItem(KEY, JSON.stringify(copy));
}

let state = load();
let shareKind = "streak";
let wheelAngle = 0;
let spinning = false;
let countdownTimer = null;

function haptic(kind) {
  try {
    if (state && state.settings && state.settings.haptics === false) return;
    if (!tg || !tg.HapticFeedback) return;
    if (kind === "success") tg.HapticFeedback.notificationOccurred("success");
    else if (kind === "warn") tg.HapticFeedback.notificationOccurred("warning");
    else tg.HapticFeedback.impactOccurred(kind || "light");
  } catch {}
}

function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hidden"), 2000);
}

function spec() {
  return MASCOTS.find((m) => m.id === state.selectedId) || MASCOTS[0];
}

function homeEmotion() {
  if (state.hunger < 28) return "hungry";
  if (state.mood < 30) return "sad";
  if (state.hunger > 80 && state.mood > 70) return "happy";
  if (state.streak >= 3) return "proud";
  return "idle";
}

function showScreen(name) {
  $("toast").classList.add("hidden");
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  const el = document.querySelector(`[data-screen="${name}"]`);
  if (el) {
    el.classList.remove("hidden");
    el.classList.remove("is-compact");
  }
  const tabs = $("tabbar");
  const isApp = ["home", "tasks", "shop", "path", "share", "profile"].includes(name);
  tabs.classList.toggle("hidden", !isApp);
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === name);
  });
  if (name === "home") renderHome();
  if (name === "tasks") renderTasks();
  if (name === "shop") renderShop();
  if (name === "share") renderShare();
  if (name === "path") renderPath();
  if (name === "roulette") renderRoulette();
  if (name === "profile") renderProfile();
  if (name === "onboard") {
    syncOnboard();
    bindHero(document.querySelector(".onboard-hero"), true);
  }
  if (name === "name") bindHero(document.querySelector(".name-hero"), true);
}

/* ---------- splash ---------- */
function buildSpinner(root) {
  root.innerHTML = "";
  for (let i = 0; i < 12; i++) {
    const tick = document.createElement("i");
    tick.style.transform = `rotate(${i * 30}deg)`;
    tick.style.animationDelay = `${(i / 12) * -1}s`;
    root.appendChild(tick);
  }
}

function loadSplashArt() {
  const img = $("splash-art");
  const fallback = $("splash-fallback");
  if (!img) return;
  const ok = () => { if (fallback) fallback.classList.add("hidden"); img.classList.remove("hidden"); };
  const fail = () => { img.classList.add("hidden"); if (fallback) fallback.classList.remove("hidden"); };
  img.onload = ok;
  img.onerror = fail;
  if (img.complete) {
    if (img.naturalWidth) ok();
    else fail();
  }
}

/* ---------- onboard ---------- */
function fillOnboardArts() {
  const emos = ["idle", "proud", "reward"];
  document.querySelectorAll(".onboard-art").forEach((el, i) => {
    renderMascot(el, { id: "axolotl", emotion: emos[i] });
    el.classList.add("onboard-art");
  });
  $("onboard-dots").innerHTML = "<i class='on'></i><i></i><i></i>";
  bindHero(document.querySelector(".onboard-hero"), true);
}
function onboardIndex() {
  const track = $("onboard-track");
  const w = track.clientWidth || 1;
  return Math.round(track.scrollLeft / w);
}
function syncOnboard() {
  const i = onboardIndex();
  [...$("onboard-dots").children].forEach((d, n) => d.classList.toggle("on", n === i));
  $("btn-onboard-next").textContent = i >= 2 ? "Как зовут?" : "Далее";
}

function goToName() {
  state.selectedId = "axolotl";
  showScreen("name");
  renderName();
  setTimeout(() => $("name-input").focus(), 50);
}

function renderName() {
  renderMascot($("name-mascot"), { id: "axolotl", emotion: "idle" });
  bindHero(document.querySelector(".name-hero"), true);
  $("btn-name-go").disabled = $("name-input").value.trim().length < 1;
}

/* ---------- home ---------- */
function renderWeek(el, week) {
  el.innerHTML = WEEK_LABELS.map((lab, i) => {
    const done = week[i];
    return `<div class="day ${done ? "done" : ""}"><div class="day-dot">${done ? "✓" : ""}</div><div class="day-lab">${lab}</div></div>`;
  }).join("");
}

function renderRings() {
  const svg = $("rings-svg");
  const legend = $("ring-legend");
  const need = xpToNext(state.level) || 1;
  const rings = [
    { key: "hunger", label: "Сытость", value: state.hunger, color: "var(--ring-hunger)", r: 52 },
    { key: "mood", label: "Настроение", value: state.mood, color: "var(--ring-mood)", r: 40 },
    { key: "xp", label: "Опыт", value: Math.min(100, (state.xp / need) * 100), color: "var(--ring-xp)", r: 28 },
  ];
  const cx = 64, cy = 64;
  svg.innerHTML = `<circle cx="${cx}" cy="${cy}" r="14" fill="var(--fill)"/>` + rings.map((ring) => {
    const c = 2 * Math.PI * ring.r;
    const pct = Math.max(0, Math.min(100, ring.value)) / 100;
    const dash = `${(c * pct).toFixed(1)} ${c.toFixed(1)}`;
    return `
      <circle cx="${cx}" cy="${cy}" r="${ring.r}" fill="none" stroke="${ring.color}" stroke-width="9" opacity=".18"/>
      <circle cx="${cx}" cy="${cy}" r="${ring.r}" fill="none" stroke="${ring.color}" stroke-width="9"
        stroke-linecap="round" stroke-dasharray="${dash}" transform="rotate(-90 ${cx} ${cy})"/>`;
  }).join("");
  legend.innerHTML = rings.map((ring) => `
    <div class="legend-row">
      <span class="legend-label"><i class="legend-dot" style="background:${ring.color}"></i>${ring.label}</span>
      <span class="legend-val">${Math.round(ring.value)}%</span>
    </div>`).join("");
}

function dailyDoneCount() {
  return TASKS.filter((t) => state.tasksDone[t.id]).length;
}

function renderHomeWidgets() {
  const done = dailyDoneCount();
  $("widget-tasks-val").textContent = `${done} из ${TASKS.length}`;
  $("widget-tasks-bar").style.width = `${(done / TASKS.length) * 100}%`;
  $("widget-tasks").classList.toggle("ready", done === TASKS.length);

  const free = canSpinToday(state, todayKey());
  const w = $("widget-roulette");
  w.classList.toggle("ready", free);
  if (free) {
    $("widget-spin-val").textContent = "Спин";
    $("widget-spin-foot").textContent = "Бесплатно сегодня";
  } else {
    $("widget-spin-val").textContent = formatCountdown(msUntilMidnight());
    $("widget-spin-foot").textContent = "до следующего спина";
  }

  const pending = unclaimedLevels(state);
  const need = xpToNext(state.level) || 1;
  const line = $("home-level-line");
  if (line) line.style.width = (state.level >= MAX_LEVEL ? 100 : Math.min(100, (state.xp / need) * 100)) + "%";
  if (pending.length) {
    const r = rewardFor(pending[0]);
    $("reward-title").textContent = `Уровень ${pending[0]}`;
    $("reward-sub").textContent = "Забери награду · " + rewardSummary(r);
    $("widget-reward").classList.add("claimable");
  } else if (state.level >= MAX_LEVEL) {
    $("reward-title").textContent = "Уровень 50";
    $("reward-sub").textContent = "Путь пройден";
    $("widget-reward").classList.remove("claimable");
  } else {
    const next = rewardFor(state.level + 1);
    $("reward-title").textContent = `Уровень ${state.level}`;
    $("reward-sub").textContent = `Далее: ${rewardSummary(next)}`;
    $("widget-reward").classList.remove("claimable");
  }
  const rk = $("reward-kicker");
  if (rk) rk.textContent = state.activeTitle || "Путь";

  const fp = $("home-freeze");
  if (state.freezes > 0) {
    fp.classList.remove("hidden");
    fp.textContent = state.freezes === 1 ? "1 заморозка" : `${state.freezes} заморозки`;
  } else {
    fp.classList.add("hidden");
  }
}

function renderHome() {
  const m = spec();
  const need = xpToNext(state.level) || 1;
  $("home-coins").textContent = state.coins;
  $("home-level").textContent = state.level >= MAX_LEVEL ? "Макс." : `Ур. ${state.level}`;
  $("home-xp-bar").style.width = (state.level >= MAX_LEVEL ? 100 : Math.min(100, (state.xp / need) * 100)) + "%";
  applyStreakMood();
  $("streak-days").textContent = daysWord(state.streakLost && state.streak <= 1 ? 0 : state.streak);
  renderWeek($("week-row"), state.week);
  $("banner-risk").classList.add("hidden");
  const hero = $("home-hero");
  hero.classList.toggle("bg-night", state.bg === "night");
  hero.classList.toggle("bg-meadow", state.bg === "meadow");
  hero.classList.toggle("bg-room", state.bg === "room");
  renderMascot($("home-mascot"), { id: "axolotl", emotion: homeEmotion(), hat: state.hat, className: "slot-hero" });
  bindHero(hero, true);
  $("home-name").textContent = state.name || m.label;
  const titleEl = $("home-title");
  if (state.activeTitle) {
    titleEl.textContent = state.activeTitle;
    titleEl.classList.remove("hidden");
  } else titleEl.classList.add("hidden");
  renderRings();
  renderHomeWidgets();
}

function addWeeklyXp(n) {
  const w = ensureWeekly(state);
  w.xp += n;
}

function addXp(n, coins, opts) {
  if (coins) state.coins += coins;
  if (n) {
    addWeeklyXp(n);
    state.totalXp = (state.totalXp || 0) + n;
  }
  const gained = [];
  if (state.level >= MAX_LEVEL) {
    save();
    return gained;
  }
  state.xp += n;
  while (state.level < MAX_LEVEL && state.xp >= xpToNext(state.level)) {
    state.xp -= xpToNext(state.level);
    state.level += 1;
    gained.push(state.level);
  }
  if (state.level >= MAX_LEVEL) state.xp = 0;
  if (gained.length && !(opts && opts.silent)) {
    haptic("success");
    celebrateLevel(gained);
  }
  save();
  return gained;
}

function celebrateLevel(gained) {
  const first = gained[0];
  const reward = rewardFor(first);
  const more = gained.length > 1 ? `<p>И ещё ${gained.length - 1} ${gained.length === 2 ? "уровень" : "уровня"}.</p>` : "";
  const lines = rewardLines(reward).map((l) => `<div class="reward-chip">${l}</div>`).join("");
  burst();
  openModal({
    emotion: "reward",
    title: `Уровень ${first}!`,
    html: `${more}<div class="reward-stack">${lines}</div><p>Награда появится в пути, если не забрать сейчас.</p>`,
    ok: "Забрать",
    onOk: () => {
      gained.forEach((lv) => {
        if (!state.claimedLevels.includes(lv)) grantRewardTo(state, rewardFor(lv));
      });
      save();
      haptic("success");
      toast(gained.length > 1 ? "Награды получены" : "Награда получена");
      if (document.querySelector('[data-screen="home"]:not(.hidden)')) renderHome();
      if (document.querySelector('[data-screen="path"]:not(.hidden)')) renderPath();
    },
  });
}

function feed() {
  if (state.coins < 10) {
    toast("Не хватает монет");
    haptic("warn");
    return;
  }
  state.coins -= 10;
  state.hunger = Math.min(100, state.hunger + 35);
  state.mood = Math.min(100, state.mood + 18);
  state.week[weekdayIndex()] = true;
  const w = ensureWeekly(state);
  if (!w.fedOn[todayKey()]) {
    w.fedOn[todayKey()] = true;
    w.feedDays += 1;
  }
  state.streakLost = false;
  state.bestStreak = Math.max(state.bestStreak || 1, state.streak || 1);
  addXp(8, 0);
  markTask("feed");
  haptic("medium");
  $("home-hero").classList.add("just-fed");
  renderHome();
  setTimeout(() => $("home-hero").classList.remove("just-fed"), 450);
}

/* ---------- tasks ---------- */
function markTask(id) {
  if (state.tasksDone[id]) return;
  const t = TASKS.find((x) => x.id === id);
  if (!t) return;
  state.tasksDone[id] = true;
  addXp(t.xp, t.coins);
}

function weeklyProgress(ch) {
  const w = ensureWeekly(state);
  if (ch.id === "feed3") return w.feedDays || 0;
  if (ch.id === "xp150") return w.xp || 0;
  if (ch.id === "login5") return Object.keys(w.logins || {}).length;
  return 0;
}

function claimWeekly(id) {
  const ch = WEEKLY_CHALLENGES.find((x) => x.id === id);
  if (!ch) return;
  const w = ensureWeekly(state);
  if (w.claimed[id]) return;
  if (weeklyProgress(ch) < ch.target) return;
  w.claimed[id] = true;
  addXp(ch.xp, ch.coins);
  haptic("success");
  toast("Награда за неделю");
  renderTasks();
}

function renderTasks() {
  const allDone = TASKS.every((t) => state.tasksDone[t.id]);
  $("tasks-empty").classList.toggle("hidden", !allDone);
  $("task-list").classList.toggle("hidden", allDone);
  $("task-list").innerHTML = TASKS.map((t) => {
    const done = !!state.tasksDone[t.id];
    const path = TASK_ICONS[t.icon] || TASK_ICONS.visit;
    return `<div class="task">
      <div class="task-glyph" style="background:${t.color}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>
      </div>
      <div class="task-info">
        <h3>${t.title}</h3>
        <p>${t.hint} · +${t.xp} XP</p>
      </div>
      <button class="task-btn" data-task="${t.id}" ${done ? "disabled" : ""}>${done ? "Готово" : "Забрать"}</button>
    </div>`;
  }).join("");

  $("weekly-list").innerHTML = WEEKLY_CHALLENGES.map((ch) => {
    const have = weeklyProgress(ch);
    const done = !!ensureWeekly(state).claimed[ch.id];
    const ready = have >= ch.target && !done;
    const pct = Math.min(100, (have / ch.target) * 100);
    const path = TASK_ICONS[ch.icon] || TASK_ICONS.visit;
    const label = done ? "Готово" : ready ? "Забрать" : `${Math.min(have, ch.target)} / ${ch.target}`;
    return `<div class="task">
      <div class="task-glyph" style="background:${ch.color}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>
      </div>
      <div class="task-info">
        <h3>${ch.title}</h3>
        <p>${ch.hint} · +${ch.xp} XP</p>
        <div class="task-progress"><i style="width:${pct}%"></i></div>
      </div>
      <button class="task-btn" data-weekly="${ch.id}" ${done || !ready ? "disabled" : ""}>${label}</button>
    </div>`;
  }).join("");

  renderCalendar();
}

function renderCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  $("cal-label").textContent = MONTHS_RU[month];
  const today = todayKey();
  const logged = new Set(state.loginDays || []);
  const frozen = new Set(state.frozenDays || []);
  $("cal-grid").innerHTML = monthGrid(year, month).map((key) => {
    if (!key) return `<div class="cal-cell empty"></div>`;
    const day = String(Number(key.slice(-2)));
    const cls = [
      "cal-cell",
      frozen.has(key) ? "freeze" : logged.has(key) ? "in" : "",
      key === today ? "today" : "",
    ].filter(Boolean).join(" ");
    return `<div class="${cls}">${day}</div>`;
  }).join("");
}

/* ---------- path ---------- */
function renderPath() {
  const need = xpToNext(state.level);
  $("path-level").textContent = state.level >= MAX_LEVEL ? "Уровень 50" : `Уровень ${state.level}`;
  $("path-kicker").textContent = state.activeTitle || "Сейчас";
  if (state.level >= MAX_LEVEL) {
    $("path-xp").textContent = "Максимум";
    $("path-bar").style.width = "100%";
    $("path-next").textContent = "Твой моджи прошёл весь путь";
  } else {
    $("path-xp").textContent = `${state.xp} / ${need} XP`;
    $("path-bar").style.width = `${Math.min(100, (state.xp / need) * 100)}%`;
    const left = need - state.xp;
    $("path-next").textContent = `Ещё ${left} XP до уровня ${state.level + 1}`;
  }
  const pending = unclaimedLevels(state);
  $("banner-claim").classList.toggle("hidden", pending.length === 0);
  if (pending.length) {
    const r = rewardFor(pending[0]);
    $("claim-banner-title").textContent = pending.length === 1 ? `Награда за уровень ${pending[0]}` : `${pending.length} награды ждут`;
    $("claim-banner-sub").textContent = rewardSummary(r);
  }

  $("path-chapters").innerHTML = CHAPTERS.map((ch) => {
    const nodes = [];
    for (let l = ch.from; l <= ch.to; l++) {
      const r = l === 1 ? { coins: 0, title: TITLES[1] } : rewardFor(l);
      const claimed = (state.claimedLevels || []).includes(l);
      const reached = state.level >= l;
      const claimable = reached && l > 1 && !claimed;
      const current = state.level === l;
      let cls = "locked";
      if (claimable) cls = "claimable";
      else if (current) cls = "current";
      else if (claimed || (l === 1 && reached)) cls = "done";
      const summary = l === 1 ? "Старт · звание «Новичок»" : rewardSummary(r);
      let action = "";
      if (claimable) action = `<button class="path-action" data-claim="${l}">Забрать</button>`;
      else if (cls === "done") action = `<span class="path-lock">Готово</span>`;
      else if (current) action = `<span class="path-lock">Сейчас</span>`;
      else action = `<span class="path-lock">Ур. ${l}</span>`;
      const idx = cls === "done" ? "✓" : String(l);
      nodes.push(`<div class="path-node ${cls}">
        <div class="path-idx">${idx}</div>
        <div class="path-info"><h3>Уровень ${l}</h3><p>${summary}</p></div>
        ${action}
      </div>`);
    }
    return `<section class="path-chapter">
      <h2 class="section-label">${ch.title} · ${ch.from}–${ch.to}</h2>
      <div class="group">${nodes.join("")}</div>
    </section>`;
  }).join("");
}

function claimLevel(level) {
  if (state.level < level) return;
  if ((state.claimedLevels || []).includes(level)) return;
  const r = rewardFor(level);
  grantRewardTo(state, r);
  save();
  haptic("success");
  openModal({
    emotion: "reward",
    title: `Уровень ${level}`,
    html: `<div class="reward-stack">${rewardLines(r).map((l) => `<div class="reward-chip">${l}</div>`).join("")}</div>`,
    ok: "Поделиться",
    onOk: () => {
      shareKind = "level";
      showScreen("share");
    },
  });
  renderPath();
  renderHome();
}

/* ---------- roulette ---------- */
function renderOdds() {
  $("odds-list").innerHTML = SPIN_TABLE.map((s) => `
    <div class="odds">
      <i class="odds-swatch" style="background:${s.color}"></i>
      <span class="odds-name">${s.label}</span>
      <span class="odds-pct">${s.weight}%</span>
    </div>`).join("");
}

function renderRoulette() {
  const wheel = $("wheel");
  wheel.style.background = conicGradient();
  wheel.style.transform = `rotate(${wheelAngle}deg)`;
  renderOdds();
  const free = canSpinToday(state, todayKey()) && !spinning;
  $("btn-spin").disabled = !free;
  $("btn-spin").textContent = spinning ? "Крутится…" : free ? "Крутить бесплатно" : "Уже крутили сегодня";
  const cd = $("spin-countdown");
  if (!free && !spinning) {
    cd.classList.remove("hidden");
    const tick = () => { cd.textContent = `Следующий спин через ${formatCountdown(msUntilMidnight())}`; };
    tick();
    clearInterval(countdownTimer);
    countdownTimer = setInterval(tick, 15000);
  } else {
    cd.classList.add("hidden");
    clearInterval(countdownTimer);
  }
  $("roulette-lead").textContent = free
    ? "Один бесплатный спин в день · шансы честные"
    : "Возвращайся после полуночи";
}

function applySpinReward(result) {
  applySpinReward._leveled = [];
  let detail = result.label;
  if (result.kind === "coins") {
    state.coins += result.amount;
  } else if (result.kind === "xp") {
    const leveled = addXp(result.amount, 0, { silent: true });
    applySpinReward._leveled = leveled;
  } else if (result.kind === "freeze") {
    state.freezes = (state.freezes || 0) + 1;
  } else if (result.kind === "item") {
    const hat = nextUnownedHat(state);
    if (hat) {
      state.ownedHats = [...state.ownedHats, hat];
      const names = { beanie: "Шапку", scarf: "Шарф", glasses: "Очки", crown: "Корону", bow: "Бантик" };
      detail = names[hat] || hat;
    } else {
      state.coins += 60;
      detail = "60 монет (все вещи уже есть)";
    }
  }
  state.lastSpin = todayKey();
  state.lastSpinResult = { id: result.id, label: detail };
  markTask("spin");
  save();
  return detail;
}

function spinWheel() {
  if (spinning || !canSpinToday(state, todayKey())) return;
  spinning = true;
  $("btn-spin").disabled = true;
  $("btn-spin").textContent = "Крутится…";
  const result = pickSpin();
  const layout = spinLayout().find((s) => s.id === result.id);
  // Wheel uses conic-gradient from -90deg (0 at top). Rotate clockwise by R
  // so the segment mid lands under the pointer at the top: R = 360n - mid.
  const target = 360 * 6 + (360 - layout.mid);
  const start = wheelAngle % 360;
  const dest = wheelAngle + (target - start);
  const wheel = $("wheel");
  wheel.style.transition = "none";
  wheel.style.transform = `rotate(${wheelAngle}deg)`;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      wheel.style.transition = "transform 3.2s cubic-bezier(0.12, 0.72, 0.08, 1)";
      wheel.style.transform = `rotate(${dest}deg)`;
      wheelAngle = dest;
    });
  });
  let ticks = 0;
  const tick = () => {
    haptic("light");
    ticks += 1;
    if (ticks < 14) setTimeout(tick, 70 + ticks * 20);
  };
  tick();
  setTimeout(() => {
    spinning = false;
    const detail = applySpinReward(result);
    haptic(result.kind === "nothing" ? "warn" : "success");
    renderRoulette();
    renderHome();
    const leveled = applySpinReward._leveled || [];
    openModal({
      emotion: result.kind === "nothing" ? "sad" : "reward",
      title: result.kind === "nothing" ? "Сегодня пусто" : "Выигрыш!",
      html: `<div class="reward-stack"><div class="reward-chip">${detail}</div></div><p>Карточку результата можно отправить в чат.</p>`,
      ok: result.kind === "nothing" ? "Понятно" : "Поделиться",
      onOk: () => {
        if (leveled.length) celebrateLevel(leveled);
        else if (result.kind !== "nothing") {
          shareKind = "spin";
          showScreen("share");
        }
      },
    });
  }, 3400);
}

/* ---------- shop ---------- */
/* Catalog + market implemented below (v5). These helpers stay for compatibility. */
function owns(kind, id) {
  if (kind === "hat") return state.ownedHats.includes(id);
  if (kind === "bg" || kind === "bgs") return state.ownedBgs.includes(id);
  if (kind === "toy") return (state.ownedToys || []).includes(id);
  return false;
}

/* ---------- share ---------- */
function renderShare() {
  const card = $("share-card-node");
  card.classList.remove("kind-streak", "kind-level", "kind-spin");
  card.classList.add(`kind-${shareKind}`);
  renderMascot($("share-mascot"), {
    id: "axolotl",
    emotion: shareKind === "spin" ? "happy" : state.streak >= 3 || shareKind === "level" ? "proud" : "happy",
    hat: state.hat,
  });
  const week = $("share-week");
  const extra = $("share-extra");
  const who = state.name || "твой моджи";
  document.querySelectorAll("#share-segment button").forEach((b) => {
    b.classList.toggle("on", b.dataset.share === shareKind);
  });
  if (shareKind === "level") {
    $("share-kicker").textContent = "Уровень";
    $("share-days").textContent = `Ур. ${state.level}`;
    $("share-with").textContent = who;
    $("share-lead").textContent = "Карточка нового уровня для чата";
    week.classList.add("hidden");
    extra.classList.remove("hidden");
    extra.textContent = state.activeTitle ? `Звание «${state.activeTitle}»` : "Moji растёт вместе с тобой";
  } else if (shareKind === "spin") {
    $("share-kicker").textContent = "Рулетка";
    const res = state.lastSpinResult;
    $("share-days").textContent = res ? res.label : "Ещё не крутили";
    $("share-with").textContent = who;
    $("share-lead").textContent = "Карточка выигрыша для чата";
    week.classList.add("hidden");
    extra.classList.remove("hidden");
    extra.textContent = "Сегодняшний бесплатный спин";
  } else {
    $("share-kicker").textContent = "Серия";
    $("share-days").textContent = daysWord(state.streak);
    $("share-with").textContent = who;
    $("share-lead").textContent = "Карточка серии твоего моджи для чата";
    week.classList.remove("hidden");
    extra.classList.add("hidden");
    renderWeek(week, state.week);
  }
}

function shareText() {
  const who = state.name || "Мой моджи";
  if (shareKind === "level") {
    const t = state.activeTitle ? ` и звание «${state.activeTitle}»` : "";
    return `${who} — уровень ${state.level}${t} в Moji! @moji_app`;
  }
  if (shareKind === "spin") {
    const res = state.lastSpinResult;
    return res
      ? `${who} — выигрыш в рулетке Moji: ${res.label}! @moji_app`
      : `Кручу рулетку в Moji. @moji_app`;
  }
  return `${who} — уже ${daysWord(state.streak)} подряд в Moji! @moji_app`;
}

async function downloadCard() {
  const node = $("share-card-node");
  if (!window.html2canvas) {
    toast("Не удалось загрузить html2canvas");
    return;
  }
  try {
    const canvas = await html2canvas(node, { backgroundColor: null, scale: 2, useCORS: true });
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `moji-${shareKind}.png`;
    a.click();
    markTask("share");
    haptic("success");
    toast("Карточка скачана");
    save();
  } catch {
    toast("Не получилось сохранить");
  }
}

async function copyShare() {
  const text = shareText();
  try {
    await navigator.clipboard.writeText(text);
    markTask("share");
    haptic("success");
    toast("Текст скопирован");
    save();
  } catch {
    toast(text);
  }
}

/* ---------- modal ---------- */
function openModal({ emotion, title, text, html, ok, onOk }) {
  $("toast").classList.add("hidden");
  const el = $("modal");
  const body = html || (text ? `<p>${text}</p>` : "");
  el.innerHTML = `<div class="sheet">
    <div class="grabber" aria-hidden="true"></div>
    <div class="mascot-slot" id="modal-mascot"></div>
    <h2>${title}</h2>
    ${body}
    <button class="btn btn-accent" id="modal-ok">${ok || "OK"}</button>
  </div>`;
  renderMascot($("modal-mascot"), { id: "axolotl", emotion: emotion || "happy" });
  el.classList.remove("hidden");
  $("modal-ok").onclick = () => {
    el.classList.add("hidden");
    if (onOk) onOk();
  };
  el.onclick = (e) => {
    if (e.target === el) el.classList.add("hidden");
  };
}

function resetDemo() {
  localStorage.removeItem(KEY);
  state = defaultState();
  shareKind = "streak";
  $("name-input").value = "";
  $("modal").classList.add("hidden");
  showScreen("splash");
  setTimeout(() => showScreen("onboard"), 700);
  toast("Демо сброшено");
}

function lockTelegramViewport() {
  if (!tg) return;
  try { if (typeof tg.ready === "function") tg.ready(); } catch {}
  try { if (typeof tg.expand === "function") tg.expand(); } catch {}
  try { if (typeof tg.disableVerticalSwipes === "function") tg.disableVerticalSwipes(); } catch {}
  try {
    if (typeof tg.lockOrientation === "function") tg.lockOrientation("portrait");
  } catch {}
}

function initTelegram() {
  try {
    lockTelegramViewport();
    if (tg && tg.onEvent) {
      tg.onEvent("themeChanged", () => applyTheme());
      tg.onEvent("viewportChanged", () => {
        try { if (tg && !tg.isExpanded && typeof tg.expand === "function") tg.expand(); } catch {}
        applyChrome();
      });
      tg.onEvent("safeAreaChanged", () => applyChrome());
      tg.onEvent("contentSafeAreaChanged", () => applyChrome());
    }
  } catch {}
  applyChrome();
  applyTheme();
  window.addEventListener("resize", applyChrome);
  if (window.visualViewport) visualViewport.addEventListener("resize", applyChrome);
}

function bindCompactTitles() {
  document.querySelectorAll("[data-scroll-title]").forEach((body) => {
    body.addEventListener("scroll", () => {
      const screen = body.closest(".screen");
      if (screen) screen.classList.toggle("is-compact", body.scrollTop > 28);
    }, { passive: true });
  });
}

function bind() {
  $("onboard-track").addEventListener("scroll", () => syncOnboard(), { passive: true });
  $("btn-onboard-next").onclick = () => {
    const i = onboardIndex();
    if (i >= 2) { goToName(); return; }
    const track = $("onboard-track");
    track.scrollTo({ left: (i + 1) * track.clientWidth, behavior: "smooth" });
    haptic("light");
  };
  $("btn-onboard-skip").onclick = () => goToName();
  $("btn-name-back").onclick = () => showScreen("onboard");
  $("name-input").addEventListener("input", renderName);
  $("btn-name-go").onclick = () => {
    const name = $("name-input").value.trim();
    if (!name) return;
    state.name = name.slice(0, 14);
    state.onboarded = true;
    state.week[weekdayIndex()] = true;
    markTask("visit");
    save();
    haptic("success");
    showScreen("home");
  };

  $("btn-feed").onclick = feed;
  $("btn-download-card").onclick = downloadCard;
  $("btn-copy-share").onclick = copyShare;
  $("streak-card").onclick = () => { shareKind = "streak"; showScreen("share"); };
  $("home-level-chip").onclick = () => showScreen("path");
  $("widget-tasks").onclick = () => showScreen("tasks");
  $("widget-roulette").onclick = () => showScreen("roulette");
  $("widget-reward").onclick = () => showScreen("path");
  $("btn-roulette-back").onclick = () => showScreen("home");
  $("btn-spin").onclick = spinWheel;
  $("banner-claim").onclick = () => {
    const pending = unclaimedLevels(state);
    if (pending[0]) claimLevel(pending[0]);
  };

  $("task-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-task]");
    if (!btn || btn.disabled) return;
    const id = btn.dataset.task;
    if (id === "feed") { showScreen("home"); toast("Покорми моджи на главной"); return; }
    if (id === "share") { shareKind = "streak"; showScreen("share"); return; }
    if (id === "dress") { showScreen("shop"); return; }
    if (id === "spin") { showScreen("roulette"); return; }
    markTask(id);
    haptic("success");
    renderTasks();
  });
  $("weekly-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-weekly]");
    if (!btn || btn.disabled) return;
    claimWeekly(btn.dataset.weekly);
  });

  $("path-chapters").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-claim]");
    if (btn) claimLevel(Number(btn.dataset.claim));
  });

  bindShop();
  const ev = $("widget-event");
  if (ev) ev.onclick = () => showScreen("shop");
  const ws = $("widget-shop");
  if (ws) ws.onclick = () => showScreen("shop");
  $("share-segment").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-share]");
    if (!btn) return;
    shareKind = btn.dataset.share;
    renderShare();
  });

  document.querySelectorAll(".tab").forEach((t) => {
    t.onclick = () => { haptic("light"); showScreen(t.dataset.tab); };
  });
  bindCompactTitles();
}

function fadeFromSplash(next) {
  const splash = $("screen-splash");
  if (!splash || splash.classList.contains("hidden")) {
    showScreen(next);
    return;
  }
  if (next === "home") renderHome();
  else if (next === "onboard") {
    syncOnboard();
    bindHero(document.querySelector(".onboard-hero"), true);
  }
  const dest = document.querySelector(`[data-screen="${next}"]`);
  if (dest) dest.classList.remove("hidden");
  splash.classList.add("is-leaving");
  setTimeout(() => {
    splash.classList.add("hidden");
    splash.classList.remove("is-leaving");
    showScreen(next);
  }, 450);
}

function boot() {
  initTelegram();
  buildSpinner($("splash-spinner"));
  loadSplashArt();
  fillOnboardArts();
  bind();
  if (state.onboarded && state.name) markTask("visit");
  if (state._rollover && state._rollover.usedFreeze) {
    toast(state._rollover.usedFreeze === 1 ? "Заморозка спасла серию" : "Заморозки спасли серию");
  } else if (state._rollover && state._rollover.resetStreak) {
    toast("Серия началась заново");
  }
  save();
  const next = (state.onboarded && state.name) ? "home" : "onboard";
  showScreen("splash");
  window._splashTimer = setTimeout(() => fadeFromSplash(next), 1800);
}



/* ========== v5: theme, chrome, mood, market, profile, motion ========== */
function applyChrome() {
  const root = document.documentElement;
  let top = 0, bot = 0, h = window.innerHeight;
  try {
    if (tg) {
      const sa = tg.safeAreaInset || {};
      const csa = tg.contentSafeAreaInset || {};
      top = (Number(sa.top) || 0) + (Number(csa.top) || 0);
      bot = (Number(sa.bottom) || 0) + (Number(csa.bottom) || 0);
      if (tg.viewportStableHeight) h = tg.viewportStableHeight;
    }
  } catch {}
  if (!tg || !tg.viewportStableHeight) {
    h = (window.visualViewport && visualViewport.height) || window.innerHeight;
  }
  root.style.setProperty("--tg-safe-t", top + "px");
  root.style.setProperty("--tg-safe-b", bot + "px");
  root.style.setProperty("--app-h", h + "px");
}
function systemTheme() {
  if (tg && tg.colorScheme) return tg.colorScheme === "dark" ? "dark" : "light";
  return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function resolvedTheme() {
  const pref = (state.settings && state.settings.theme) || "auto";
  return pref === "auto" ? systemTheme() : pref;
}
function applyTheme() {
  const theme = resolvedTheme();
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  const color = theme === "dark" ? "#0B0B10" : "#F3F3F8";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", color);
  try {
    if (tg && tg.setBackgroundColor) tg.setBackgroundColor(color);
    if (tg && tg.setHeaderColor) tg.setHeaderColor(color);
  } catch {}
}

function burst() {
  const el = $("burst");
  if (!el) return;
  el.innerHTML = "";
  el.classList.remove("hidden");
  const colors = ["#FF5A8A", "#0A84FF", "#FFD60A", "#24C46A", "#C58BFF"];
  for (let i = 0; i < 14; i++) {
    const d = document.createElement("i");
    const ang = (i / 14) * Math.PI * 2 + (Math.random() * 0.2);
    const dist = 70 + Math.random() * 90;
    d.style.setProperty("--x", (Math.cos(ang) * dist) + "px");
    d.style.setProperty("--y", (Math.sin(ang) * dist - 20) + "px");
    d.style.background = colors[i % colors.length];
    el.appendChild(d);
  }
  setTimeout(() => el.classList.add("hidden"), 800);
}

function streakMood() {
  if (state.frozenToday) return "frozen";
  if (state.streakLost) return "zero";
  if (state.hunger < 28) return "risk";
  if ((state.streak || 0) >= 3) return "fire";
  return "calm";
}
function applyStreakMood() {
  const mood = streakMood();
  const card = $("streak-card");
  if (!card) return;
  card.classList.remove("mood-calm", "mood-fire", "mood-risk", "mood-frozen", "mood-zero");
  card.classList.add("mood-" + mood);
  const copy = {
    fire: { k: "В огне", s: "Так держать, не пропускай день" },
    risk: { k: "Под угрозой", s: "Покорми моджи до конца дня" },
    frozen: { k: "Заморозка", s: "Серия спасена заморозкой" },
    zero: { k: "Начни серию", s: "Вчерашний прогресс сброшен" },
    calm: { k: "Серия", s: state.name || "твой моджи" },
  }[mood];
  $("streak-kicker").textContent = copy.k;
  $("streak-sub").textContent = copy.s;
  const illu = $("streak-illu");
  if (illu) {
    const svgs = {
      fire: '<svg viewBox="0 0 64 64" fill="currentColor"><path d="M32 6c4 10-4 14-2 22 8-4 16 2 16 14 0 12-10 20-16 20s-16-8-16-20c0-16 14-24 18-36z" opacity=".9"/></svg>',
      risk: '<svg viewBox="0 0 64 64" fill="currentColor"><path d="M32 8 56 52H8L32 8z"/><rect x="29" y="26" width="6" height="14" rx="2" fill="#fff"/><rect x="29" y="42" width="6" height="6" rx="2" fill="#fff"/></svg>',
      frozen: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4"><path d="M32 8v48M12 20l40 24M12 44l40-24"/></svg>',
      zero: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4"><circle cx="32" cy="32" r="16"/><path d="M20 44 44 20"/></svg>',
      calm: '<svg viewBox="0 0 64 64" fill="currentColor"><circle cx="32" cy="32" r="10" opacity=".85"/></svg>',
    };
    illu.innerHTML = svgs[mood] || "";
  }
}

/* ----- market catalog ----- */
const CATALOG = [
  { id: "treat", kind: "food", name: "Вкусняшка", price: 10, rarity: "обычный", sku: "M-201", hunger: 35, mood: 0, tint: "#FF6B9A", pat: "stripes", icon: "food" },
  { id: "cake", kind: "food", name: "Пирог", price: 25, rarity: "редкий", sku: "M-202", hunger: 50, mood: 15, tint: "#E8A0C0", pat: "dots", icon: "cake", isNew: true },
  { id: "tea", kind: "food", name: "Тёплый чай", price: 15, rarity: "обычный", sku: "M-203", hunger: 0, mood: 22, tint: "#C45C26", pat: "waves", icon: "tea" },
  { id: "berry", kind: "food", name: "Снежная ягода", price: 20, rarity: "редкий", sku: "M-204", hunger: 25, mood: 12, tint: "#5B8CFF", pat: "dots", icon: "berry" },
  { id: "bow", kind: "hat", name: "Бантик", price: 40, rarity: "обычный", sku: "M-101", tint: "#FF6B9A", pat: "stripes", icon: "bow" },
  { id: "beanie", kind: "hat", name: "Шапка", price: 60, rarity: "обычный", sku: "M-102", tint: "#0A84FF", pat: "grid", icon: "beanie" },
  { id: "glasses", kind: "hat", name: "Очки", price: 80, rarity: "редкий", sku: "M-103", tint: "#1C1C1E", pat: "waves", icon: "glasses" },
  { id: "scarf", kind: "hat", name: "Шарф", price: 70, rarity: "редкий", sku: "M-104", tint: "#FF3B30", pat: "stripes", icon: "scarf" },
  { id: "crown", kind: "hat", name: "Корона", price: 1, currency: "stars", rarity: "эпик", sku: "M-105", tint: "#C9972A", pat: "stars", icon: "crown" },
  { id: "room", kind: "bg", name: "Комната", price: 0, rarity: "обычный", sku: "M-301", tint: "#2A2A32", pat: "grid", icon: "bg" },
  { id: "meadow", kind: "bg", name: "Поляна", price: 50, rarity: "обычный", sku: "M-302", tint: "#1B2A1E", pat: "grid", icon: "bg" },
  { id: "night", kind: "bg", name: "Ночь", price: 1, currency: "stars", rarity: "эпик", sku: "M-303", tint: "#0E1424", pat: "waves", icon: "bg", isNew: true },
  { id: "ball", kind: "toy", name: "Мячик", price: 30, rarity: "обычный", sku: "M-401", mood: 20, tint: "#34C759", pat: "dots", icon: "ball" },
  { id: "pillow", kind: "toy", name: "Подушка", price: 35, rarity: "обычный", sku: "M-402", mood: 25, tint: "#AF8CFF", pat: "stripes", icon: "pillow" },
  { id: "lantern", kind: "toy", name: "Фонарик", price: 45, rarity: "редкий", sku: "M-403", mood: 18, tint: "#F0C14B", pat: "stars", icon: "lantern", isNew: true },
  { id: "sleigh", kind: "toy", name: "Саночки", price: 60, rarity: "редкий", sku: "M-404", mood: 30, tint: "#5AC8FA", pat: "waves", icon: "sleigh" },
];
const CAT_ICONS = {
  food: '<path d="M8 36c0 12 10 20 24 20s24-8 24-20H8z" fill="currentColor"/><path d="M16 36V18a12 12 0 0 1 24 0v18" stroke="currentColor" stroke-width="4" fill="none"/>',
  cake: '<path d="M10 30h44v18H10z" fill="currentColor"/><path d="M16 30c4-8 8-8 12 0s8 8 12 0 8-8 12 0" stroke="currentColor" stroke-width="4" fill="none"/>',
  tea: '<path d="M14 24h28v16a12 12 0 0 1-24 0V24z" fill="currentColor"/><path d="M42 28h8a6 6 0 0 1 0 12h-4" stroke="currentColor" stroke-width="4" fill="none"/>',
  berry: '<circle cx="26" cy="34" r="10" fill="currentColor"/><circle cx="38" cy="34" r="10" fill="currentColor" opacity=".85"/><path d="M32 16c0 8 4 10 8 12" stroke="currentColor" stroke-width="4" fill="none"/>',
  bow: ITEM_ICONS.bow, beanie: ITEM_ICONS.beanie, glasses: ITEM_ICONS.glasses, scarf: ITEM_ICONS.scarf, crown: ITEM_ICONS.crown,
  bg: '<rect x="10" y="16" width="44" height="32" rx="6" fill="currentColor" opacity=".85"/>',
  ball: '<circle cx="32" cy="32" r="16" fill="none" stroke="currentColor" stroke-width="4"/><path d="M16 32h32M32 16v32" stroke="currentColor" stroke-width="3"/>',
  pillow: '<rect x="10" y="22" width="44" height="22" rx="10" fill="currentColor"/>',
  lantern: '<path d="M24 18h16v6H24zM22 24h20l-4 22H26L22 24z" fill="currentColor"/><path d="M32 10v8" stroke="currentColor" stroke-width="4"/>',
  sleigh: '<path d="M12 36h32l8-10H28L12 36z" fill="currentColor"/><path d="M12 44h40" stroke="currentColor" stroke-width="4" fill="none"/>',
};

let shopCat = "all";
let shopFilter = "all";
let shopQuery = "";
let promoTimer = null;

function eventEnd() {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (7 - day));
  mon.setHours(0, 0, 0, 0);
  return mon;
}
function formatEventCd() {
  const ms = eventEnd() - Date.now();
  if (ms <= 0) return "скоро";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}д ${h}ч`;
  return `${h}ч ${String(m).padStart(2, "0")}м`;
}

function itemOwned(item) {
  if (item.kind === "food") return (state.food[item.id] || 0) > 0;
  if (item.kind === "hat") return state.ownedHats.includes(item.id);
  if (item.kind === "bg") return state.ownedBgs.includes(item.id);
  if (item.kind === "toy") return (state.ownedToys || []).includes(item.id);
  return false;
}
function itemCount(item) {
  if (item.kind === "food") return state.food[item.id] || 0;
  return itemOwned(item) ? 1 : 0;
}
function itemEquipped(item) {
  if (item.kind === "hat") return state.hat === item.id;
  if (item.kind === "bg") return state.bg === item.id;
  return false;
}

function filteredCatalog() {
  const q = (shopQuery || "").trim().toLowerCase();
  return CATALOG.filter((it) => {
    if (shopCat !== "all" && it.kind !== shopCat) return false;
    if (shopFilter === "mine" && !itemOwned(it)) return false;
    if (shopFilter === "new" && !it.isNew) return false;
    if (shopFilter === "cheap" && (it.currency === "stars" || it.price > 40)) return false;
    if (q && !(`${it.name} ${it.sku} ${it.rarity}`).toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderShop() {
  renderMarket();
}

function renderMarket() {
  if ($("shop-coins")) $("shop-coins").textContent = state.coins;
  const cd = $("shop-promo-cd");
  if (cd) {
    cd.textContent = formatEventCd();
    clearInterval(promoTimer);
    promoTimer = setInterval(() => { if ($("shop-promo-cd")) $("shop-promo-cd").textContent = formatEventCd(); }, 30000);
  }
  const grid = $("market-grid");
  if (!grid) return;
  const items = filteredCatalog();
  if (!items.length) {
    grid.innerHTML = `<div class="market-empty">Ничего не нашлось</div>`;
    return;
  }
  grid.innerHTML = items.map((it) => {
    const owned = itemOwned(it);
    const count = itemCount(it);
    const eq = itemEquipped(it);
    const icon = CAT_ICONS[it.icon] || CAT_ICONS.food;
    const vb = it.icon && ITEM_ICONS[it.icon] ? "0 0 24 24" : "0 0 64 64";
    let priceLbl, priceCls = "m-price";
    if (it.currency === "stars" && !owned) {
      priceLbl = `★ ${it.price}`;
      priceCls += " stars";
    } else if (it.kind === "food") {
      priceLbl = `<span class="coin-ic"></span>${it.price}`;
    } else if (owned) {
      priceLbl = eq ? "На моджи" : "В инвентаре";
      priceCls += " owned";
    } else if (it.price === 0) {
      priceLbl = "Бесплатно";
    } else {
      priceLbl = `<span class="coin-ic"></span>${it.price}`;
    }
    let sec = "";
    if (it.kind === "food" && count > 0) sec = `<button class="m-sec" data-use="${it.id}">Скормить</button>`;
    else if (it.kind === "toy" && owned) sec = `<button class="m-sec" data-play="${it.id}">Играть</button>`;
    else if ((it.kind === "hat" || it.kind === "bg") && owned && !eq) sec = `<button class="m-sec" data-equip="${it.kind}:${it.id}">Надеть</button>`;
    const countBadge = it.kind === "food" && count > 0 ? `<span class="m-owned-count">×${count}</span>` : "";
    return `<article class="m-card" data-item="${it.id}">
      <div class="m-art pat-${it.pat}" style="--tint:${it.tint}">
        ${countBadge}
        <svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
      </div>
      <div class="m-name">${it.name}</div>
      <div class="m-meta">${it.rarity} · #${it.sku}</div>
      <div class="m-actions">
        <button class="${priceCls}" data-buy="${it.id}">${priceLbl}</button>
        ${sec}
      </div>
    </article>`;
  }).join("");
}

function buyMarket(id) {
  const it = CATALOG.find((x) => x.id === id);
  if (!it) return;
  if (it.kind !== "food" && itemOwned(it)) {
    if (it.kind === "hat" || it.kind === "bg") equipItem(it);
    return;
  }
  if (it.currency === "stars") {
    openStarsMarket(it);
    return;
  }
  if (state.coins < it.price) {
    toast("Не хватает монет");
    haptic("warn");
    return;
  }
  state.coins -= it.price;
  if (it.kind === "food") {
    state.food[it.id] = (state.food[it.id] || 0) + 1;
    toast(`${it.name} в инвентаре`);
  } else if (it.kind === "hat") {
    if (!state.ownedHats.includes(it.id)) state.ownedHats.push(it.id);
    state.hat = it.id;
    markTask("dress");
    toast("Надето");
  } else if (it.kind === "bg") {
    if (!state.ownedBgs.includes(it.id)) state.ownedBgs.push(it.id);
    state.bg = it.id;
    markTask("dress");
    toast("Фон выбран");
  } else if (it.kind === "toy") {
    if (!state.ownedToys.includes(it.id)) state.ownedToys.push(it.id);
    toast("Игрушка куплена");
  }
  haptic("success");
  save();
  renderMarket();
  if (document.querySelector('[data-screen="home"]:not(.hidden)')) renderHome();
}

function openStarsMarket(it) {
  openModal({
    emotion: "idea",
    title: "Telegram Stars",
    text: `Покупка «${it.name}» за ${it.price} ★ пока смоделирована. В релизе откроется счёт Telegram.`,
    ok: "Понятно, забрать",
    onOk: () => {
      if (it.kind === "hat" && !state.ownedHats.includes(it.id)) state.ownedHats.push(it.id);
      if (it.kind === "hat") state.hat = it.id;
      if (it.kind === "bg" && !state.ownedBgs.includes(it.id)) state.ownedBgs.push(it.id);
      if (it.kind === "bg") state.bg = it.id;
      markTask("dress");
      save();
      renderMarket();
      toast("Добавлено (демо)");
    },
  });
}

function equipItem(it) {
  if (it.kind === "hat") state.hat = it.id;
  if (it.kind === "bg") state.bg = it.id;
  markTask("dress");
  haptic("light");
  save();
  renderMarket();
  toast("Надето");
}

function useFood(id) {
  const it = CATALOG.find((x) => x.id === id);
  if (!it || (state.food[id] || 0) < 1) return;
  state.food[id] -= 1;
  state.hunger = Math.min(100, state.hunger + (it.hunger || 0));
  state.mood = Math.min(100, state.mood + (it.mood || 0));
  state.week[weekdayIndex()] = true;
  state.streakLost = false;
  const w = ensureWeekly(state);
  if (!w.fedOn[todayKey()]) { w.fedOn[todayKey()] = true; w.feedDays += 1; }
  markTask("feed");
  haptic("success");
  save();
  renderMarket();
  toast(`Скормили «${it.name}»`);
}

function playToy(id) {
  const it = CATALOG.find((x) => x.id === id);
  if (!it || !itemOwned(it)) return;
  state.mood = Math.min(100, state.mood + (it.mood || 15));
  haptic("success");
  save();
  renderMarket();
  toast(`${it.name}: настроение +${it.mood || 15}`);
}

function bindShop() {
  const cats = $("shop-cats");
  if (cats) cats.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cat]");
    if (!btn) return;
    shopCat = btn.dataset.cat;
    cats.querySelectorAll(".chip").forEach((b) => b.classList.toggle("on", b === btn));
    renderMarket();
  });
  const filters = $("shop-filters");
  if (filters) filters.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    shopFilter = btn.dataset.filter;
    filters.querySelectorAll(".chip").forEach((b) => b.classList.toggle("on", b === btn));
    renderMarket();
  });
  const search = $("shop-search");
  if (search) search.addEventListener("input", () => {
    shopQuery = search.value;
    renderMarket();
  });
  const grid = $("market-grid");
  if (grid) grid.addEventListener("click", (e) => {
    const buy = e.target.closest("[data-buy]");
    if (buy) { buyMarket(buy.dataset.buy); return; }
    const use = e.target.closest("[data-use]");
    if (use) { useFood(use.dataset.use); return; }
    const play = e.target.closest("[data-play]");
    if (play) { playToy(play.dataset.play); return; }
    const eq = e.target.closest("[data-equip]");
    if (eq) {
      const [kind, id] = eq.dataset.equip.split(":");
      const it = CATALOG.find((x) => x.id === id && x.kind === kind);
      if (it) equipItem(it);
    }
  });
  const promo = $("shop-promo");
  if (promo) promo.onclick = () => {
    shopFilter = "new";
    document.querySelectorAll("#shop-filters .chip").forEach((b) => b.classList.toggle("on", b.dataset.filter === "new"));
    renderMarket();
    haptic("light");
  };
}

/* ----- profile ----- */
function tgUser() {
  try { return (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) || null; }
  catch { return null; }
}
function itemTotal() {
  const hats = (state.ownedHats || []).filter((id) => id !== "none").length;
  const bgs = (state.ownedBgs || []).length;
  const toys = (state.ownedToys || []).length;
  const food = Object.values(state.food || {}).reduce((a, b) => a + b, 0);
  return hats + bgs + toys + food;
}
function renderProfile() {
  const u = tgUser();
  const avatar = $("profile-avatar");
  const name = (u && (u.first_name || u.username)) || "Игрок";
  const handle = u && u.username ? "@" + u.username : "@moji_app";
  $("profile-user").textContent = name;
  $("profile-handle").textContent = handle;
  $("profile-moji").textContent = `${state.name || "Моджи"} · ур. ${state.level}` + (state.activeTitle ? ` · ${state.activeTitle}` : "");
  if (u && u.photo_url) {
    avatar.style.backgroundImage = `url(${u.photo_url})`;
    avatar.textContent = "";
  } else {
    avatar.style.backgroundImage = "";
    avatar.textContent = (name[0] || "М").toUpperCase();
  }
  $("stats-grid").innerHTML = [
    [state.streak, "Серия"],
    [state.bestStreak || state.streak, "Рекорд"],
    [state.totalXp || 0, "Всего XP"],
    [state.coins, "Монеты"],
    [itemTotal(), "Вещи"],
    [state.freezes || 0, "Заморозки"],
  ].map(([n, l]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join("");

  const badges = [
    { id: "new", title: "Новичок", on: true, color: "#FF6B9A" },
    { id: "s7", title: "7 дней", on: (state.bestStreak || 0) >= 7, color: "#FF7A18" },
    { id: "lv5", title: "Уровень 5", on: state.level >= 5, color: "#0A84FF" },
    { id: "spin", title: "Спин", on: !!state.lastSpin, color: "#7A3CFF" },
    { id: "style", title: "Стиль", on: (state.ownedHats || []).length > 1, color: "#C9972A" },
    { id: "keeper", title: "Хранитель", on: (state.titles || []).includes(TITLES[50]), color: "#AF52DE" },
  ];
  $("badge-row").innerHTML = badges.map((b) => `
    <div class="badge ${b.on ? "" : "off"}">
      <div class="badge-icon" style="background:${b.color}">${b.on ? "✓" : ""}</div>
      <p>${b.title}</p>
    </div>`).join("");

  const s = state.settings;
  const rows = [
    { id: "haptics", title: "Вибрация", sub: "Тактильный отклик", color: "#FF3B30", type: "switch", on: s.haptics, icon: "h" },
    { id: "sound", title: "Звук", sub: "Тихие эффекты", color: "#0A84FF", type: "switch", on: s.sound, icon: "s" },
    { id: "notifications", title: "Уведомления", sub: "Напоминание кормить моджи", color: "#FF7A18", type: "switch", on: s.notifications, icon: "n" },
    { id: "theme", title: "Тема", sub: themeLabel(s.theme), color: "#1C1C1E", type: "nav", icon: "t" },
    { id: "lang", title: "Язык", sub: "Русский", color: "#34C759", type: "nav", icon: "l" },
    { id: "reset", title: "Сбросить прогресс", sub: "Начать демо заново", color: "#FF3B30", type: "nav", icon: "r" },
    { id: "about", title: "О приложении", sub: "Moji 5 · @moji_app", color: "#AF52DE", type: "nav", icon: "a" },
  ];
  $("settings-list").innerHTML = rows.map((r) => `
    <button type="button" class="setting" data-set="${r.id}">
      <div class="set-glyph" style="background:${r.color}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="7"/></svg>
      </div>
      <div class="set-text"><strong>${r.title}</strong><span>${r.sub}</span></div>
      ${r.type === "switch" ? `<span class="switch ${r.on ? "on" : ""}" data-sw="${r.id}"><i></i></span>` : `<span class="set-chevron">›</span>`}
    </button>`).join("");
  $("settings-list").onclick = onSetting;
}
function themeLabel(v) {
  return { auto: "Как в Telegram", light: "Светлая", dark: "Тёмная" }[v] || "Как в Telegram";
}
function onSetting(e) {
  const row = e.target.closest("[data-set]");
  if (!row) return;
  const id = row.dataset.set;
  if (id === "haptics" || id === "sound" || id === "notifications") {
    state.settings[id] = !state.settings[id];
    save();
    haptic("light");
    renderProfile();
    return;
  }
  if (id === "theme") {
    const order = ["auto", "light", "dark"];
    const i = order.indexOf(state.settings.theme || "auto");
    state.settings.theme = order[(i + 1) % 3];
    save();
    applyTheme();
    haptic("light");
    renderProfile();
    return;
  }
  if (id === "lang") {
    toast("Пока только русский");
    return;
  }
  if (id === "reset") {
    openModal({
      emotion: "sad",
      title: "Сбросить прогресс?",
      text: "Серия, уровень и инвентарь будут очищены. Это нельзя отменить.",
      ok: "Сбросить",
      onOk: resetDemo,
    });
    return;
  }
  if (id === "about") {
    openModal({
      emotion: "idle",
      title: "Moji",
      text: "Мини-приложение для Telegram. Версия 5. Чистая забота о моджи, без крипты. @moji_app",
      ok: "Закрыть",
    });
  }
}

document.addEventListener("DOMContentLoaded", boot);
