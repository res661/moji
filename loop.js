/* Moji core loop — XP curve, rewards, roulette, weekly reset. No DOM. */

const MAX_LEVEL = 50;

/** XP needed to go from `level` to `level+1`. */
function xpToNext(level) {
  if (level >= MAX_LEVEL) return 0;
  return 20 + 12 * level + Math.floor((level * level) / 8);
}

function xpNeededForLevel(level) {
  let s = 0;
  for (let l = 1; l < level; l++) s += xpToNext(l);
  return s;
}

const CHAPTERS = [
  { id: "start", title: "Начало", from: 1, to: 10 },
  { id: "habit", title: "Привычка", from: 11, to: 20 },
  { id: "care", title: "Забота", from: 21, to: 30 },
  { id: "master", title: "Мастерство", from: 31, to: 40 },
  { id: "legend", title: "Легенда", from: 41, to: 50 },
];

const TITLES = {
  1: "Новичок",
  5: "Заботливый",
  10: "Верный друг",
  15: "Хранитель серии",
  20: "Звёздный",
  25: "Наставник",
  30: "Чемпион недели",
  35: "Исследователь",
  40: "Мастер заботы",
  45: "Легенда двора",
  50: "Хранитель Moji",
};

function coinsForLevel(level) {
  return 8 + level * 3;
}

/** Special milestone rewards on top of coins. */
const MILESTONES = {
  5: { freeze: 1, title: TITLES[5] },
  10: { hat: "beanie", title: TITLES[10] },
  15: { freeze: 1, title: TITLES[15] },
  20: { bg: "meadow", title: TITLES[20] },
  25: { freeze: 1, title: TITLES[25] },
  30: { hat: "scarf", title: TITLES[30] },
  35: { title: TITLES[35] },
  40: { freeze: 2, title: TITLES[40] },
  45: { hat: "glasses", title: TITLES[45] },
  50: { hat: "crown", freeze: 1, title: TITLES[50] },
};

function rewardFor(level) {
  if (level <= 1 || level > MAX_LEVEL) return null;
  const extra = MILESTONES[level] || {};
  return {
    level,
    coins: coinsForLevel(level),
    freeze: extra.freeze || 0,
    hat: extra.hat || null,
    bg: extra.bg || null,
    title: extra.title || null,
  };
}

function rewardLines(reward) {
  if (!reward) return [];
  const lines = [`${reward.coins} монет`];
  if (reward.title) lines.push(`звание «${reward.title}»`);
  if (reward.hat) {
    const names = { beanie: "Шапка", scarf: "Шарф", glasses: "Очки", crown: "Корона", bow: "Бантик" };
    lines.push(names[reward.hat] || reward.hat);
  }
  if (reward.bg) {
    const names = { meadow: "фон «Поляна»", night: "фон «Ночь»", room: "фон «Комната»" };
    lines.push(names[reward.bg] || reward.bg);
  }
  if (reward.freeze) lines.push(reward.freeze === 1 ? "1 заморозка" : `${reward.freeze} заморозки`);
  return lines;
}

function rewardSummary(reward) {
  return rewardLines(reward).join(" · ");
}

/* --- Roulette: weights sum to 100, shown honestly --- */
const SPIN_TABLE = [
  { id: "coins20", label: "20 монет", weight: 28, color: "#007AFF", kind: "coins", amount: 20 },
  { id: "coins50", label: "50 монет", weight: 12, color: "#0039A6", kind: "coins", amount: 50 },
  { id: "xp30", label: "30 XP", weight: 20, color: "#64D2FF", kind: "xp", amount: 30 },
  { id: "xp80", label: "80 XP", weight: 8, color: "#FFD60A", kind: "xp", amount: 80 },
  { id: "item", label: "Вещь", weight: 7, color: "#FF6B9A", kind: "item" },
  { id: "freeze", label: "Заморозка", weight: 5, color: "#34C759", kind: "freeze", amount: 1 },
  { id: "nothing", label: "Ничего", weight: 20, color: "#AEAEB2", kind: "nothing" },
];

function spinLayout() {
  let angle = 0;
  return SPIN_TABLE.map((s) => {
    const sweep = s.weight * 3.6;
    const start = angle;
    angle += sweep;
    return { ...s, start, sweep, mid: start + sweep / 2 };
  });
}

function pickSpin(rand) {
  const r = (rand == null ? Math.random() : rand) * 100;
  let acc = 0;
  for (const s of SPIN_TABLE) {
    acc += s.weight;
    if (r < acc) return s;
  }
  return SPIN_TABLE[SPIN_TABLE.length - 1];
}

function conicGradient() {
  let acc = 0;
  const parts = SPIN_TABLE.map((s) => {
    const a = acc;
    acc += s.weight;
    return `${s.color} ${a}% ${acc}%`;
  });
  return `conic-gradient(from -90deg, ${parts.join(", ")})`;
}

/* --- Week / calendar --- */
function weekIdFromDate(d) {
  const day = (d.getDay() + 6) % 7;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const dd = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function weekId() {
  return weekIdFromDate(new Date());
}

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= days; d++) {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push(`${year}-${mm}-${dd}`);
  }
  return cells;
}

function msUntilMidnight(now) {
  const n = now || new Date();
  const m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
  return m - n;
}

function formatCountdown(ms) {
  if (ms <= 0) return "скоро";
  const h = Math.floor(ms / 3600000);
  const min = Math.floor((ms % 3600000) / 60000);
  if (h <= 0) return `${min} мин`;
  return `${h} ч ${String(min).padStart(2, "0")} мин`;
}

const WEEKLY_CHALLENGES = [
  { id: "feed3", title: "Покорми 3 дня", hint: "В разные дни этой недели", target: 3, unit: "дня", xp: 40, coins: 25, color: "#FF6B9A", icon: "feed" },
  { id: "xp150", title: "Набери 150 XP", hint: "За любые действия", target: 150, unit: "XP", xp: 35, coins: 20, color: "#FFD60A", icon: "xp" },
  { id: "login5", title: "Зайди 5 дней", hint: "Серия внутри недели", target: 5, unit: "дней", xp: 30, coins: 20, color: "#007AFF", icon: "visit" },
];

function emptyWeekly(id) {
  return { id: id || weekId(), feedDays: 0, fedOn: {}, xp: 0, logins: {}, claimed: {} };
}

function ensureWeekly(s) {
  const id = weekId();
  if (!s.weekly || s.weekly.id !== id) s.weekly = emptyWeekly(id);
  return s.weekly;
}

function dateShift(key, days) {
  const d = new Date(key + "T12:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/**
 * Apply a day change to state (streak, freeze, hunger, weekly).
 * `today` is YYYY-MM-DD. Mutates and returns a small report.
 */
function applyDayRollover(s, today) {
  const report = { usedFreeze: 0, resetStreak: false };
  if (s.lastVisit === today) {
    if (!(s.loginDays || []).includes(today)) {
      s.loginDays = [...(s.loginDays || []), today];
    }
    const w = ensureWeekly(s);
    w.logins[today] = true;
    return report;
  }
  if (!s.lastVisit) {
    s.lastVisit = today;
    s.streak = Math.max(1, s.streak || 1);
    s.week = Array(7).fill(false);
    s.week[(new Date(today + "T12:00:00").getDay() + 6) % 7] = true;
    s.loginDays = [...new Set([...(s.loginDays || []), today])];
    ensureWeekly(s).logins[today] = true;
    return report;
  }
  const prev = new Date(s.lastVisit + "T12:00:00");
  const now = new Date(today + "T12:00:00");
  const diff = Math.round((now - prev) / 86400000);
  const missed = Math.max(0, diff - 1);

  if (diff === 1) {
    s.streak = (s.streak || 0) + 1;
  } else if (diff > 1) {
    if ((s.freezes || 0) >= missed) {
      s.freezes -= missed;
      report.usedFreeze = missed;
      s.frozenDays = s.frozenDays || [];
      for (let i = 1; i <= missed; i++) s.frozenDays.push(dateShift(s.lastVisit, i));
      s.streak = (s.streak || 0) + 1;
    } else {
      s.streak = 1;
      s.week = Array(7).fill(false);
      report.resetStreak = true;
    }
  }
  if (diff > 0) {
    const wd = (now.getDay() + 6) % 7;
    if (diff > 1 && report.resetStreak) s.week = Array(7).fill(false);
    s.week[wd] = true;
    s.hunger = Math.max(8, (s.hunger || 50) - 25 * Math.min(diff, 3));
    s.mood = Math.max(10, (s.mood || 60) - 15 * Math.min(diff, 3));
  }
  s.lastVisit = today;
  s.loginDays = [...new Set([...(s.loginDays || []), today])];
  ensureWeekly(s).logins[today] = true;
  return report;
}

function canSpinToday(s, today) {
  return s.lastSpin !== (today || todayKeySafe());
}

function todayKeySafe() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nextUnownedHat(s) {
  const order = ["bow", "beanie", "glasses", "scarf", "crown"];
  const owned = s.ownedHats || [];
  return order.find((id) => !owned.includes(id)) || null;
}

function grantRewardTo(s, reward) {
  if (!reward) return;
  s.coins += reward.coins;
  if (reward.freeze) s.freezes = (s.freezes || 0) + reward.freeze;
  if (reward.hat && !(s.ownedHats || []).includes(reward.hat)) {
    s.ownedHats = [...(s.ownedHats || []), reward.hat];
  }
  if (reward.bg && !(s.ownedBgs || []).includes(reward.bg)) {
    s.ownedBgs = [...(s.ownedBgs || []), reward.bg];
  }
  if (reward.title) {
    s.titles = [...new Set([...(s.titles || []), reward.title])];
    s.activeTitle = reward.title;
  }
  s.claimedLevels = [...new Set([...(s.claimedLevels || []), reward.level])];
}

function unclaimedLevels(s) {
  const out = [];
  for (let l = 2; l <= Math.min(s.level, MAX_LEVEL); l++) {
    if (!(s.claimedLevels || []).includes(l)) out.push(l);
  }
  return out;
}
