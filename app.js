/* Moji Mini App prototype — localStorage, no backend, Stars mocked. */
const KEY = "moji-save-v2";
const WEEK_LABELS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const XP_PER_LEVEL = 100;

const HATS = [
  { id: "none", name: "Без шапки", price: 0, currency: "coins" },
  { id: "bow", name: "Бантик", price: 40, currency: "coins" },
  { id: "beanie", name: "Шапка", price: 60, currency: "coins" },
  { id: "glasses", name: "Очки", price: 80, currency: "coins" },
  { id: "crown", name: "Корона", price: 1, currency: "stars" },
];
const BACKGROUNDS = [
  { id: "room", name: "Комната", price: 0, currency: "coins" },
  { id: "meadow", name: "Поляна", price: 50, currency: "coins" },
  { id: "night", name: "Ночь", price: 1, currency: "stars" },
];
const TASKS = [
  { id: "feed", title: "Покормить моджи", hint: "Дай вкусняшку на главной", xp: 20, coins: 8 },
  { id: "visit", title: "Зайти сегодня", hint: "Открыть приложение", xp: 10, coins: 4 },
  { id: "share", title: "Поделиться серией", hint: "Карточка для чата", xp: 15, coins: 6 },
  { id: "dress", title: "Примерить вещь", hint: "Загляни в магазин", xp: 12, coins: 5 },
];

const tg = window.Telegram && window.Telegram.WebApp;
const $ = (id) => document.getElementById(id);

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function weekdayIndex() {
  return (new Date().getDay() + 6) % 7; // Mon=0
}
function defaultState() {
  return {
    onboarded: false,
    selectedId: "dino",
    name: "",
    coins: 80,
    xp: 0,
    level: 1,
    streak: 1,
    lastVisit: todayKey(),
    week: Array(7).fill(false).map((_, i) => i === weekdayIndex()),
    hunger: 55,
    mood: 70,
    hat: "none",
    bg: "room",
    ownedHats: ["none"],
    ownedBgs: ["room"],
    tasksDone: {},
    tasksDay: todayKey(),
  };
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const s = { ...defaultState(), ...JSON.parse(raw) };
    if (s.tasksDay !== todayKey()) {
      s.tasksDone = {};
      s.tasksDay = todayKey();
    }
    rollDay(s);
    return s;
  } catch {
    return defaultState();
  }
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}
function rollDay(s) {
  const today = todayKey();
  if (s.lastVisit === today) return;
  const prev = new Date(s.lastVisit + "T12:00:00");
  const now = new Date(today + "T12:00:00");
  const diff = Math.round((now - prev) / 86400000);
  if (diff === 1) s.streak += 1;
  else if (diff > 1) {
    s.streak = 1;
    s.week = Array(7).fill(false);
  }
  s.week[weekdayIndex()] = true;
  s.lastVisit = today;
  s.hunger = Math.max(8, (s.hunger || 50) - 25 * Math.min(diff, 3));
  s.mood = Math.max(10, (s.mood || 60) - 15 * Math.min(diff, 3));
}

let state = load();

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
  toast._t = setTimeout(() => el.classList.add("hidden"), 1800);
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

/* ---------- screens ---------- */
function showScreen(name) {
  $("toast").classList.add("hidden");
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  const el = document.querySelector(`[data-screen="${name}"]`);
  if (el) el.classList.remove("hidden");
  const tabs = $("tabbar");
  const isApp = ["home", "tasks", "shop", "share"].includes(name);
  tabs.classList.toggle("hidden", !isApp);
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === name);
  });
  if (name === "home") renderHome();
  if (name === "tasks") renderTasks();
  if (name === "shop") renderShop();
  if (name === "share") renderShare();
  if (name === "select") syncCarousel();
  if (name === "onboard") syncOnboard();
}

/* ---------- splash / onboard ---------- */
function fillOnboardArts() {
  const emos = ["idle", "proud", "reward"];
  const ids = ["dino", "dino", "dino"];
  document.querySelectorAll(".onboard-art").forEach((el, i) => {
    renderMascot(el, { id: ids[i], emotion: emos[i] });
    el.classList.add("onboard-art");
  });
  const dots = $("onboard-dots");
  dots.innerHTML = "<i class='on'></i><i></i><i></i>";
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

/* ---------- carousel ---------- */
let carouselReady = false;
function buildCarousel() {
  const root = $("carousel");
  const dots = $("carousel-dots");
  root.innerHTML = "";
  dots.innerHTML = "";
  MASCOTS.forEach((m, i) => {
    const card = document.createElement("div");
    card.className = "carousel-card";
    card.dataset.id = m.id;
    const slot = document.createElement("div");
    renderMascot(slot, { id: m.id, emotion: "idle" });
    card.appendChild(slot);
    root.appendChild(card);
    const dot = document.createElement("i");
    if (i === 0) dot.className = "on";
    dots.appendChild(dot);
  });
  carouselReady = true;
  syncCarousel();
}
function carouselIndex() {
  const root = $("carousel");
  const card = root.querySelector(".carousel-card");
  const step = card ? card.getBoundingClientRect().width + 16 : root.clientWidth;
  return Math.max(0, Math.min(MASCOTS.length - 1, Math.round(root.scrollLeft / step)));
}
function syncCarousel() {
  const i = carouselIndex();
  const m = MASCOTS[i];
  if (!m) return;
  state.selectedId = m.id;
  $("carousel-title").textContent = m.label;
  $("carousel-trait").textContent = m.trait;
  [...$("carousel-dots").children].forEach((d, n) => d.classList.toggle("on", n === i));
}

/* ---------- name ---------- */
function renderName() {
  renderMascot($("name-mascot"), { id: state.selectedId, emotion: "idle" });
  const ok = $("name-input").value.trim().length >= 1;
  $("btn-name-go").disabled = !ok;
}

/* ---------- home ---------- */
function renderWeek(el, week, light) {
  el.innerHTML = WEEK_LABELS.map((lab, i) => {
    const done = week[i];
    return `<div class="day ${done ? "done" : ""}"><div class="day-dot">${done ? "✓" : ""}</div><div class="day-lab">${lab}</div></div>`;
  }).join("");
  if (light) el.classList.add("week-light");
}

function renderHome() {
  const m = spec();
  $("home-coins").textContent = state.coins;
  $("home-level").textContent = `Ур. ${state.level}`;
  const xpPct = Math.min(100, (state.xp / XP_PER_LEVEL) * 100);
  $("home-xp-bar").style.width = xpPct + "%";
  $("streak-days").textContent = daysWord(state.streak);
  const sub = document.querySelector("#streak-card .streak-sub");
  if (sub) sub.textContent = state.name ? "с " + state.name : "с моджи";
  renderWeek($("week-row"), state.week);
  const hungry = state.hunger < 28;
  $("banner-risk").classList.toggle("hidden", !hungry);
  const stage = $("home-stage");
  stage.className = `stage bg-${state.bg}`;
  const emo = homeEmotion();
  renderMascot($("home-mascot"), { id: state.selectedId, emotion: emo, hat: state.hat });
  $("home-name").textContent = state.name || m.label;
  const hBar = $("bar-hunger");
  const mBar = $("bar-mood");
  hBar.style.width = state.hunger + "%";
  mBar.style.width = state.mood + "%";
  hBar.classList.toggle("low", state.hunger < 28);
  mBar.classList.toggle("low", state.mood < 30);
}

function addXp(n, coins) {
  state.xp += n;
  if (coins) state.coins += coins;
  let leveled = false;
  while (state.xp >= XP_PER_LEVEL) {
    state.xp -= XP_PER_LEVEL;
    state.level += 1;
    leveled = true;
  }
  if (leveled) {
    haptic("success");
    celebrateLevel();
  }
  save();
}

function celebrateLevel() {
  openModal({
    emotion: "reward",
    title: `Уровень ${state.level}!`,
    text: `Твой моджи стал сильнее. Так держать!`,
    ok: "Отлично",
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
  addXp(8, 0);
  markTask("feed");
  haptic("medium");
  const slot = $("home-mascot");
  renderMascot(slot, { id: state.selectedId, emotion: "feed", hat: state.hat, className: "just-fed slot-stage" });
  $("home-coins").textContent = state.coins;
  $("bar-hunger").style.width = state.hunger + "%";
  $("bar-mood").style.width = state.mood + "%";
  $("streak-days").textContent = daysWord(state.streak);
  renderWeek($("week-row"), state.week);
  save();
  setTimeout(() => renderHome(), 450);
}

/* ---------- tasks ---------- */
function markTask(id) {
  if (state.tasksDone[id]) return;
  const t = TASKS.find((x) => x.id === id);
  if (!t) return;
  state.tasksDone[id] = true;
  addXp(t.xp, t.coins);
}

function renderTasks() {
  $("task-list").innerHTML = TASKS.map((t) => {
    const done = !!state.tasksDone[t.id];
    return `<div class="task">
      <div class="task-info">
        <h3>${t.title}</h3>
        <p>${t.hint} · +${t.xp} XP</p>
      </div>
      <button class="task-btn" data-task="${t.id}" ${done ? "disabled" : ""}>${done ? "Готово" : "Забрать"}</button>
    </div>`;
  }).join("");
}

/* ---------- shop ---------- */
function canBuy(item) {
  if (item.currency === "stars") return true;
  return state.coins >= item.price;
}
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
  else meta = `<span class="shop-meta"><span class="coin-ic coin-ic-sm"></span>${item.price}</span>`;
  const preview =
    kind === "hat"
      ? `<div class="preview"><div class="mascot-slot" data-hat="${item.id}"></div></div>`
      : `<div class="bg-thumb ${item.id}"></div>`;
  return `<div class="shop-card ${equipped ? "equipped" : ""}" data-kind="${kind}" data-id="${item.id}">
    ${preview}<h3>${item.name}</h3>${meta}
  </div>`;
}
function renderShop() {
  $("shop-coins").textContent = state.coins;
  $("shop-hats").innerHTML = HATS.map((h) => shopCard(h, "hat")).join("");
  $("shop-bgs").innerHTML = BACKGROUNDS.map((b) => shopCard(b, "bg")).join("");
  $("shop-hats").querySelectorAll("[data-hat]").forEach((el) => {
    const hat = el.getAttribute("data-hat");
    const emo = hat === "glasses" ? "glasses" : hat === "crown" ? "reward" : "idle";
    renderMascot(el, { id: state.selectedId, emotion: emo, hat });
  });
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
  toast("Готово!");
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
  renderMascot($("share-mascot"), {
    id: state.selectedId,
    emotion: state.streak >= 3 ? "proud" : "happy",
    hat: state.hat,
  });
  $("share-days").textContent = daysWord(state.streak);
  $("share-with").textContent = state.name ? `с ${state.name}` : "с моджи";
  renderWeek($("share-week"), state.week, true);
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
    a.download = `moji-streak-${state.streak}.png`;
    a.click();
    markTask("share");
    haptic("success");
    toast("Карточка скачана");
    save();
  } catch (e) {
    toast("Не получилось сохранить");
  }
}

async function copyShare() {
  const text = `${state.name || "Мой моджи"} уже ${daysWord(state.streak)} со мной в Moji! @moji_app`;
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
function openModal({ emotion, title, text, ok, onOk }) {
  $("toast").classList.add("hidden");
  const el = $("modal");
  el.innerHTML = `<div class="sheet">
    <div class="grabber" aria-hidden="true"></div>
    <div class="mascot-slot" id="modal-mascot"></div>
    <h2>${title}</h2>
    <p>${text}</p>
    <button class="btn btn-accent" id="modal-ok">${ok || "OK"}</button>
  </div>`;
  renderMascot($("modal-mascot"), { id: state.selectedId, emotion: emotion || "happy" });
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
  $("name-input").value = "";
  showScreen("splash");
  setTimeout(() => showScreen("onboard"), 700);
  toast("Демо сброшено");
}

/* ---------- telegram ---------- */
function initTelegram() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
    const p = tg.themeParams || {};
    if (p.bg_color) document.documentElement.style.setProperty("--bg", p.bg_color);
    if (p.text_color) document.documentElement.style.setProperty("--ink", p.text_color);
    if (p.hint_color) document.documentElement.style.setProperty("--muted", p.hint_color);
    if (p.button_color) document.documentElement.style.setProperty("--accent", p.button_color);
    if (tg.setHeaderColor) tg.setHeaderColor(p.secondary_bg_color || p.bg_color || "#F2F2F7");
    if (tg.setBackgroundColor) tg.setBackgroundColor(p.bg_color || "#F2F2F7");
  } catch {}
}


function goToName() {
  state.selectedId = "dino";
  showScreen("name");
  renderName();
  setTimeout(() => $("name-input").focus(), 50);
}

/* ---------- boot ---------- */
function bind() {
  $("onboard-track").addEventListener("scroll", () => syncOnboard(), { passive: true });
  $("btn-onboard-next").onclick = () => {
    const i = onboardIndex();
    if (i >= 2) {
      goToName();
      return;
    }
    const track = $("onboard-track");
    track.scrollTo({ left: (i + 1) * track.clientWidth, behavior: "smooth" });
    haptic("light");
  };
  $("btn-onboard-skip").onclick = () => goToName();

  if ($("carousel")) $("carousel").addEventListener("scroll", () => syncCarousel(), { passive: true });
  if ($("btn-select-next")) {
    $("btn-select-next").onclick = () => goToName();
  }

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
  $("btn-reset").onclick = resetDemo;

  $("task-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-task]");
    if (!btn || btn.disabled) return;
    const id = btn.dataset.task;
    if (id === "feed") {
      showScreen("home");
      toast("Покорми моджи на главной");
      return;
    }
    if (id === "share") {
      showScreen("share");
      return;
    }
    if (id === "dress") {
      showScreen("shop");
      return;
    }
    markTask(id);
    haptic("success");
    renderTasks();
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

  document.querySelectorAll(".tab").forEach((t) => {
    t.onclick = () => {
      haptic("light");
      showScreen(t.dataset.tab);
    };
  });
}

function boot() {
  initTelegram();
  fillOnboardArts();
  bind();
  markTask("visit");
  save();
  if (state.onboarded && state.name) {
    showScreen("home");
  } else {
    showScreen("splash");
    window._splashTimer = setTimeout(() => showScreen("onboard"), 900);
  }
}

document.addEventListener("DOMContentLoaded", boot);
