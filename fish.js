// Fish exchange calculator -- port of your "Fish (Amine Card Collection)" tab.
// Each rarity of fish is worth a number of "Regular-equivalent" (CONFIG.FISH_MULT).
// Once your total reaches CONFIG.FISH_RAINBOW_THRESHOLD, you can trade up to Rainbow.

const FISH_RARITIES = ["Regular", "Gold", "Emerald", "Void", "Diamond"];

function calcFish(counts) {
  let total = 0;
  for (const rarity of FISH_RARITIES) {
    total += (counts[rarity] || 0) * CONFIG.FISH_MULT[rarity];
  }
  const needed = total < CONFIG.FISH_RAINBOW_THRESHOLD ? CONFIG.FISH_RAINBOW_THRESHOLD - total : 0;
  return { total, needed };
}

function renderFish() {
  const counts = {};
  for (const rarity of FISH_RARITIES) {
    counts[rarity] = Number(document.getElementById("fish-" + rarity).value) || 0;
  }

  const { total, needed } = calcFish(counts);
  document.getElementById("fish-total").textContent = total;
  document.getElementById("fish-needed").textContent = needed;
}

window.addEventListener("DOMContentLoaded", () => {
  for (const rarity of FISH_RARITIES) {
    document.getElementById("fish-" + rarity).addEventListener("input", renderFish);
  }
  renderFish();
});
