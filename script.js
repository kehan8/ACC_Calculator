// ---------------------------------------------------------------------------
// Roblox notation helpers (port of the Apps Script functions from the Google Sheet)
// ---------------------------------------------------------------------------

const RL = ["", "K", "M", "B", "T", "Q", "QN", "S", "SP", "OC", "N", "D", "UD"];

const RARITIES = ["REGULAR", "GOLD", "EMERALD", "VOID", "DIAMOND", "RAINBOW"];

// Text like "1,5N" or "400000" -> number
function toNumber(input) {
  if (input === null || input === undefined || input === "") return 0;
  const t = input.toString().toUpperCase().trim();

  for (let i = RL.length - 1; i >= 0; i--) {
    const unit = RL[i];
    if (unit !== "" && t.endsWith(unit)) {
      const numPart = t.slice(0, t.length - unit.length).replace(",", ".");
      return parseFloat(numPart) * Math.pow(1000, i);
    }
  }
  return parseFloat(t.replace(",", ".")) || 0;
}

// Number -> Roblox notation ("1,50N"), 2 decimals
function toRoblox(value) {
  if (!value || isNaN(value)) return "0";
  let tier = Math.floor(Math.log10(Math.abs(value)) / 3);
  tier = Math.max(0, Math.min(tier, RL.length - 1));
  return (value / Math.pow(1000, tier)).toFixed(2).replace(".", ",") + RL[tier];
}

// "per 15 sec" / "per 1 hour" / "1 min" -> number of seconds
function parseSeconds(label) {
  if (!label) return 0;
  const text = label.toString().toLowerCase();
  const numMatch = text.match(/(\d+([.,]\d+)?)/);
  const num = numMatch ? parseFloat(numMatch[1].replace(",", ".")) : 1;

  if (text.includes("sec")) return num * 1;
  if (text.includes("min")) return num * 60;
  if (text.includes("hour")) return num * 3600;
  if (text.includes("week")) return num * 604800;
  if (text.includes("month")) return num * 2592000;
  if (text.includes("year")) return num * 31536000;
  if (text.includes("day")) return num * 86400;
  return 0;
}

// Calculates price + status of 1 pack in 1 rarity.
// Returns an object (not a string!) so the rest of the code never has to
// "parse" it back apart -- that was only needed in the Google Sheets version
// because a cell can only return text, but here we can just work with real values.
function calcRarity(basePrice, rarityName, currentCps, gradeInput) {
  const gradeDrainPerBuy = toNumber(gradeInput);
  const cps = currentCps - gradeDrainPerBuy * 3;

  if (!basePrice || cps <= 0) {
    return { price: 0, minToEarn: Infinity, status: "NEGATIVE" };
  }

  const price = basePrice * CONFIG.RARITY_MULT[rarityName];
  const minToEarn = price / cps / 60;

  let status = "PROFIT";
  if (minToEarn > CONFIG.STATUS_THRESHOLDS.slowDrain) status = "SLOW_DRAIN";
  if (minToEarn > CONFIG.STATUS_THRESHOLDS.cashDrop) status = "CASH_DROP";

  return { price, minToEarn, status };
}

function formatTime(minToEarn) {
  if (minToEarn < 60) return minToEarn.toFixed(0) + "m";
  if (minToEarn < 1440) return (minToEarn / 60).toFixed(1) + "h";
  if (minToEarn < 525600) return (minToEarn / 1440).toFixed(1) + "d";
  return (minToEarn / 525600).toFixed(1) + "y";
}

const STATUS_LABEL = {
  PROFIT: "✅ PROFIT",
  SLOW_DRAIN: "⚠️ SLOW DRAIN",
  CASH_DROP: "❌ CASH DROP",
  NEGATIVE: "🛑 NEGATIVE INCOME!",
};

// ---------------------------------------------------------------------------
// Net income: income - (basket of 6 packs, repeated at the configured cadence) - grade cost
// ---------------------------------------------------------------------------

const INTERVALS = [
  "per 15 sec", "per 1 min", "per 1 hour", "per 3 hour", "per 6 hour",
  "per 12 hour", "per 1 day", "per 1 week (7d)", "per 1 month (30d)", "per 1 year (365d)",
];

// grid = 6 rows (packs) x 6 columns (rarities) of calcRarity() results
function netIncome(perSecondIncome, gradeInput, grid, intervalLabel, repeatLabel) {
  const intervalSeconds = parseSeconds(intervalLabel);
  const repeatSeconds = parseSeconds(repeatLabel);
  const repeats = repeatSeconds > 0 ? intervalSeconds / repeatSeconds : 0;

  let cartCost = 0;
  for (const row of grid) {
    let best = 0;
    for (const cell of row) {
      if (cell.status === "PROFIT" && cell.price > best) best = cell.price;
    }
    cartCost += best;
  }

  const gradeDrainTotal = toNumber(gradeInput) * 3 * intervalSeconds;
  const income = perSecondIncome * intervalSeconds;
  const net = income - cartCost * repeats - gradeDrainTotal;
  return { income, net };
}

// ---------------------------------------------------------------------------
// UI wiring
// ---------------------------------------------------------------------------

// The conveyor always shows 6 CONSECUTIVE packs from the list (a window that
// slides up as you discover more cards) -- not 6 independently picked packs.
const WINDOW_SIZE = 6;
const MAX_START = PACKS.length - WINDOW_SIZE;

function buildPackWindowPicker() {
  const select = document.getElementById("start-pack");
  const slider = document.getElementById("start-pack-slider");

  select.innerHTML = "";
  for (let i = 0; i <= MAX_START; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `${PACKS[i].name} (packs ${i + 1}–${i + WINDOW_SIZE})`;
    select.appendChild(opt);
  }

  slider.max = MAX_START;
  slider.value = 0;

  const syncFromSelect = () => {
    slider.value = select.value;
    render();
  };
  const syncFromSlider = () => {
    select.value = slider.value;
    render();
  };

  select.addEventListener("change", syncFromSelect);
  slider.addEventListener("input", syncFromSlider);
}

function getSelectedPacks() {
  const start = Number(document.getElementById("start-pack").value) || 0;
  return PACKS.slice(start, start + WINDOW_SIZE);
}

function renderPackWindowPreview(packs) {
  document.getElementById("pack-window-preview").textContent =
    "Selected: " + packs.map((p) => p.name).join(", ");
}

function render() {
  const incomeInput = document.getElementById("income-input").value;
  const gradeInput = document.getElementById("grade-input").value;

  const perSecondIncome = toNumber(incomeInput);
  const packs = getSelectedPacks();
  renderPackWindowPreview(packs);

  // Build + draw the rarity grid
  const grid = packs.map((pack) =>
    RARITIES.map((rarity) => calcRarity(toNumber(pack.price), rarity, perSecondIncome, gradeInput))
  );
  renderGrid(packs, grid);

  // Net income table -- the repeat cadence comes from config.js, not from the page itself
  renderNetIncome(perSecondIncome, gradeInput, grid, CONFIG.REPEAT_LABEL);
}

function renderGrid(packs, grid) {
  const table = document.getElementById("rarity-table");
  table.innerHTML = "";

  const headRow = document.createElement("tr");
  headRow.appendChild(document.createElement("th"));
  for (const rarity of RARITIES) {
    const th = document.createElement("th");
    th.textContent = rarity;
    th.className = "rarity-" + rarity.toLowerCase();
    headRow.appendChild(th);
  }
  table.appendChild(headRow);

  packs.forEach((pack, r) => {
    const tr = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.textContent = pack.name;
    nameCell.className = "pack-name";
    tr.appendChild(nameCell);

    grid[r].forEach((cell) => {
      const td = document.createElement("td");
      td.className = "status-" + cell.status.toLowerCase();
      if (cell.status === "NEGATIVE") {
        td.textContent = STATUS_LABEL[cell.status];
      } else {
        td.textContent =
          toRoblox(cell.price) + " | " + STATUS_LABEL[cell.status] + " (" + formatTime(cell.minToEarn) + ")";
      }
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
}

function renderNetIncome(perSecondIncome, gradeInput, grid, repeatLabel) {
  const table = document.getElementById("net-table");
  table.innerHTML = "";

  const headRow = document.createElement("tr");
  ["Period", "Income", "Net Income"].forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    headRow.appendChild(th);
  });
  table.appendChild(headRow);

  for (const label of INTERVALS) {
    const { income, net } = netIncome(perSecondIncome, gradeInput, grid, label, repeatLabel);
    const tr = document.createElement("tr");

    const tdLabel = document.createElement("td");
    tdLabel.textContent = label;
    tr.appendChild(tdLabel);

    const tdIncome = document.createElement("td");
    tdIncome.textContent = toRoblox(income);
    tr.appendChild(tdIncome);

    const tdNet = document.createElement("td");
    tdNet.textContent = toRoblox(net);
    tdNet.className = net >= 0 ? "net-positive" : "net-negative";
    tr.appendChild(tdNet);

    table.appendChild(tr);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  buildPackWindowPicker();
  document.getElementById("income-input").addEventListener("input", render);
  document.getElementById("grade-input").addEventListener("input", render);
  render();
});
