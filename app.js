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
  const isApp = ["home", "tasks", "shop", "path", "share"].includes(name);
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
  img.onload = () => {
    img.classList.remove("hidden");
    if (fallback) fallback.classList.add("hidden");
  };
  img.onerror = () => img.classList.add("hidden");
  img.src = "assets/brand/splash.png";
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
  if (pending.length) {
    const r = rewardFor(pending[0]);
    $("reward-title").textContent = "Награда не забрана";
    $("reward-sub").textContent = `Уровень ${pending[0]} · ${rewardSummary(r)}`;
    $("widget-reward").classList.add("claimable");
  } else if (state.level >= MAX_LEVEL) {
    $("reward-title").textContent = "Путь пройден";
    $("reward-sub").textContent = "Хранитель Moji · 50 уровень";
    $("widget-reward").classList.remove("claimable");
  } else {
    const next = rewardFor(state.level + 1);
    $("reward-title").textContent = "Следующая награда";
    $("reward-sub").textContent = `Уровень ${state.level + 1} · ${rewardSummary(next)}`;
    $("widget-reward").classList.remove("claimable");
  }

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
  $("streak-days").textContent = daysWord(state.streak);
  $("streak-sub").textContent = state.name || "твой моджи";
  renderWeek($("week-row"), state.week);
  $("banner-risk").classList.toggle("hidden", state.hunger >= 28);
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
  if (n) addWeeklyXp(n);
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
function owns(kind, id) {
  return kind === "hat" ? state.ownedHats.includes(id) : state.ownedBgs.includes(id);
}
function shopCard(item, kind) {
  const equipped = kind === "hat" ? state.hat === item.id : state.bg === item.id;
  const have = owns(kind, item.id);
  let meta;
  if (equipped) meta = `<span class="pill">На моджи</span>`;
  else if (have) meta = `<span class="pill">Надеть</span>`;
  else if (item.price === 0) meta = `<span class="pill">Бесплатно</span>`;
  else if (item.currency === "stars") meta = `<span class="shop-meta">★ ${item.price}</span>`;
  else meta = `<span class="shop-meta"><span class="coin-ic"></span>${item.price}</span>`;
  let preview;
  if (kind === "hat") {
    const path = ITEM_ICONS[item.id] || ITEM_ICONS.none;
    preview = `<div class="item-icon" style="background:${item.tint}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>
    </div>`;
  } else {
    preview = `<div class="bg-thumb ${item.id}"></div>`;
  }
  return `<div class="shop-card ${equipped ? "equipped" : ""}" data-kind="${kind}" data-id="${item.id}">
    ${preview}<h3>${item.name}</h3>${meta}
  </div>`;
}
function renderShop() {
  $("shop-coins").textContent = state.coins;
  $("shop-hats").innerHTML = HATS.map((h) => shopCard(h, "hat")).join("");
  $("shop-bgs").innerHTML = BACKGROUNDS.map((b) => shopCard(b, "bg")).join("");
}

function buyOrEquip(kind, id) {
  const list = kind === "hat" ? HATS : BACKGROUNDS;
  const item = list.find((x) => x.id === id);
  if (!item) return;
  if (owns(kind, id)) {
    if (kind === "hat") state.hat = id;
    else state.bg = id;
    markTask("dress");
    haptic("light");
    save();
    renderShop();
    return;
  }
  if (item.currency === "stars") {
    openStarsModal(item, kind);
    return;
  }
  if (state.coins < item.price) {
    toast("Не хватает монет");
    haptic("warn");
    return;
  }
  state.coins -= item.price;
  if (kind === "hat") {
    state.ownedHats.push(id);
    state.hat = id;
  } else {
    state.ownedBgs.push(id);
    state.bg = id;
  }
  markTask("dress");
  haptic("success");
  toast("Готово");
  save();
  renderShop();
}

function openStarsModal(item, kind) {
  openModal({
    emotion: "idea",
    title: "Telegram Stars",
    text: `Покупка «${item.name}» за ${item.price} ★ пока смоделирована. В релизе откроется счёт Telegram.`,
    ok: "Понятно, примерять",
    onOk: () => {
      if (kind === "hat") {
        if (!state.ownedHats.includes(item.id)) state.ownedHats.push(item.id);
        state.hat = item.id;
      } else {
        if (!state.ownedBgs.includes(item.id)) state.ownedBgs.push(item.id);
        state.bg = item.id;
      }
      markTask("dress");
      save();
      renderShop();
      toast("Надето (демо)");
    },
  });
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

function initTelegram() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
    const p = tg.themeParams || {};
    if (p.bg_color) document.documentElement.style.setProperty("--bg", p.bg_color);
    if (p.text_color) document.documentElement.style.setProperty("--label", p.text_color);
    if (p.hint_color) document.documentElement.style.setProperty("--secondary-label", p.hint_color);
    if (tg.setHeaderColor) tg.setHeaderColor(p.secondary_bg_color || p.bg_color || "#F2F2F7");
    if (tg.setBackgroundColor) tg.setBackgroundColor(p.bg_color || "#F2F2F7");
  } catch {}
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
  $("btn-reset-path").onclick = resetDemo;
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

  const seg = $("shop-segment");
  if (seg) {
    seg.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-seg]");
      if (!btn) return;
      seg.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === btn));
      $("shop-hats").classList.toggle("hidden", btn.dataset.seg !== "hats");
      $("shop-bgs").classList.toggle("hidden", btn.dataset.seg !== "bgs");
    });
  }
  $("shop-hats").addEventListener("click", (e) => {
    const card = e.target.closest(".shop-card");
    if (card) buyOrEquip("hat", card.dataset.id);
  });
  $("shop-bgs").addEventListener("click", (e) => {
    const card = e.target.closest(".shop-card");
    if (card) buyOrEquip("bg", card.dataset.id);
  });
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
  if (state.onboarded && state.name) {
    showScreen("home");
  } else {
    showScreen("splash");
    window._splashTimer = setTimeout(() => showScreen("onboard"), 1600);
  }
}

document.addEventListener("DOMContentLoaded", boot);
