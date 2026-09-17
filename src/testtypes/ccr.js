import { renderPairItem } from "../ui.js";
import { playItem } from "../audio.js";

export const ccr = {
  id: "ccr",
  label: "CCR — Comparison Category Rating",
  description:
    "Compare a pair of samples (A and B) and rate how B compares to A on a 7-point scale, from much worse to much better.",
  defaultScale: [
    { value: -3, displayValue: "-3", label: "Much worse" },
    { value: -2, displayValue: "-2", label: "Worse" },
    { value: -1, displayValue: "-1", label: "Slightly worse" },
    { value: 0, displayValue: "0", label: "About the same" },
    { value: 1, displayValue: "+1", label: "Slightly better" },
    { value: 2, displayValue: "+2", label: "Better" },
    { value: 3, displayValue: "+3", label: "Much better" },
  ],

  // items: [{ id, a: {type, ...}, b: {type, ...} }]
  // Unlike DCR, A and B are not "reference"/"test" — either can be better.
  // options: { itemLabel, allowSkip, onRate(itemId, rating) }
  async runItems(items, config, { itemLabel = "Item", allowSkip = false, onRate }) {
    const scale = config.scale ?? ccr.defaultScale;

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const action = await new Promise((resolve) => {
        renderPairItem(
          {
            index,
            total: items.length,
            scale,
            itemLabel,
            heading: "Listen and compare",
            playALabel: "Play A",
            playBLabel: "Play B",
          },
          {
            onPlayA: () => playItem(item.a, config.clickDelayMs),
            onPlayB: () => playItem(item.b, config.clickDelayMs),
            onRate: (rating) => {
              onRate(item.id, rating);
              resolve("continue");
            },
            onSkip: allowSkip ? () => resolve("skip") : undefined,
          }
        );
      });
      if (action === "skip") return;
    }
  },
};
