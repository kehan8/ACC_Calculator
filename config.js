// Your own settings / calibration -- edit these yourself in the source code
// (via GitHub), not exposed as an input field to site visitors. This is the
// "private" place for values you don't want the public to be able to tweak.

const CONFIG = {
  // How often you assume the basket of 6 packs gets repurchased (auto-buy
  // cadence). Determines how heavily the AutoBuy cost weighs into Net Income.
  REPEAT_LABEL: "1.15 min",

  // Thresholds (in minutes) for the profit / slow-drain / cash-drop label.
  STATUS_THRESHOLDS: { slowDrain: 0.25, cashDrop: 0.75 },

  // Price multiplier per rarity relative to the REGULAR price.
  RARITY_MULT: {
    REGULAR: 1,
    GOLD: 5,
    EMERALD: 10,
    VOID: 25,
    DIAMOND: 60,
    RAINBOW: 140,
  },

  // Fish exchange (see fish.html): how much "Regular-equivalent" each rarity of fish is worth.
  FISH_MULT: { Regular: 1, Gold: 3, Emerald: 9, Void: 27, Diamond: 81 },
  FISH_RAINBOW_THRESHOLD: 243,
};
