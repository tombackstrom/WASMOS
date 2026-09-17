import { renderPairItem } from "../ui.js";
import { playItem } from "../audio.js";

export const dcr = {
  id: "dcr",
  label: "DCR — Degradation Category Rating",
  description:
    "Rate how degraded a processed sample sounds relative to its clean reference, on a 5-point impairment scale.",
  defaultScale: [
    { value: 1, label: "Very annoying" },
    { value: 2, label: "Annoying" },
    { value: 3, label: "Slightly annoying" },
    { value: 4, label: "Perceptible, not annoying" },
    { value: 5, label: "Imperceptible" },
  ],

  // items: [{ id, reference: {type, ...}, test: {type, ...} }]
  // options: { itemLabel, allowSkip, onRate(itemId, rating) }
  async runItems(items, config, { itemLabel = "Item", allowSkip = false, onRate }) {
    const scale = config.scale ?? dcr.defaultScale;

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const action = await new Promise((resolve) => {
        renderPairItem(
          { index, total: items.length, scale, itemLabel },
          {
            onPlayReference: () => playItem(item.reference, config.clickDelayMs),
            onPlayTest: () => playItem(item.test, config.clickDelayMs),
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
