/* Pack path: assets/mascots/{id}/{state}.png
   If the file is missing, a placeholder slot («твой моджи») is shown.
   The only shipped art is the user splash (assets/brand/splash.png)
   and an optional pixel-exact hero crop (assets/mascots/axolotl/hero.png).
*/
const MASCOTS = [
  {
    id: "axolotl",
    species: "Аксолотль",
    label: "Моджи-аксолотль",
    trait: "Любит подарки и зимние шарфы",
    accent: "#FF6B9A",
    stage: "#0E1424",
    hero: "assets/mascots/axolotl/hero.png",
    splash: "assets/brand/splash.png",
  },
];

const EMOTION_FALLBACKS = {
  idle: ["hero", "idle", "laugh", "happy"],
  happy: ["hero", "happy", "laugh", "idle"],
  sad: ["sad", "cry", "hungry", "idle"],
  hungry: ["hungry", "cry", "sad", "idle"],
  sleep: ["sleep", "idle"],
  proud: ["proud", "glasses", "hero", "idle"],
  reward: ["reward", "hero", "idle"],
  idea: ["idea", "curious", "idle"],
  peek: ["peek", "curious", "idle"],
  love: ["heart", "hero", "idle"],
  feed: ["hero", "laugh", "happy", "idle"],
};

function cosmeticEmotion(hat) {
  if (hat === "glasses") return "glasses";
  if (hat === "crown") return "crown";
  if (hat === "wizard") return "wizard";
  if (hat === "scarf") return "scarf";
  return null;
}

function assetCandidates(id, emotion, hat) {
  const chain = [];
  const cosmetic = cosmeticEmotion(hat);
  if (cosmetic) chain.push(cosmetic);
  const fb = EMOTION_FALLBACKS[emotion] || [emotion, "hero", "idle"];
  chain.push(...fb);
  const seen = new Set();
  const out = [];
  for (const name of chain) {
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(`assets/mascots/${id}/${name}.png`);
  }
  return out;
}

function renderMascot(el, { id, emotion = "idle", hat = "none", className = "" } = {}) {
  if (!el) return;
  const keep = [];
  el.classList.forEach((c) => {
    if (c.startsWith("slot-") || c === "onboard-art" || c === "on-dark") keep.push(c);
  });
  if (className) keep.push(...className.split(/\s+/).filter(Boolean));
  el.className = ["mascot-slot", ...new Set(keep)].join(" ");
  el.innerHTML = `
    <div class="ph-frame">
      <img class="ph-img hidden" alt="твой моджи" draggable="false" />
      <div class="ph-fallback"><span class="ph-label">твой моджи</span></div>
    </div>`;
  const img = el.querySelector(".ph-img");
  const fb = el.querySelector(".ph-fallback");
  const paths = assetCandidates(id || "axolotl", emotion, hat);
  let i = 0;
  const tryNext = () => {
    if (i >= paths.length) {
      img.classList.add("hidden");
      fb.classList.remove("hidden");
      return;
    }
    const src = paths[i++];
    img.onload = () => {
      img.classList.remove("hidden");
      fb.classList.add("hidden");
    };
    img.onerror = tryNext;
    img.src = src;
  };
  tryNext();
}

/* Splash art is loading-screen only. Never bind it onto home / onboard / name. */
function bindHero(root) {
  if (!root) return;
  const img = root.querySelector(".hero-scene") || root.querySelector("img.hero-scene");
  if (img) {
    img.classList.add("hidden");
    img.removeAttribute("src");
  }
  root.classList.remove("has-art");
}

function daysWord(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} день`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} дня`;
  return `${n} дней`;
}
