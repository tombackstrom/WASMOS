import { renderItem } from "../ui.js";
import { playItem } from "../audio.js";

export const acr = {
  id: "acr",
  label: "ACR — Absolute Category Rating",
  description: "Rate the absolute quality of each sample on a 5-point scale.",
  defaultScale: [
    { value: 1, label: "Bad" },
    { value: 2, label: "Poor" },
    { value: 3, label: "Fair" },
    { value: 4, label: "Good" },
    { value: 5, label: "Excellent" },
  ],

  // items: [{ id, type: "tone"|"file", ... }]
  // options: { itemLabel, allowSkip, onRate(itemId, rating) }
  async runItems(items, config, { itemLabel = "Item", allowSkip = false, onRate }) {
    const scale = config.scale ?? acr.defaultScale;

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const action = await new Promise((resolve) => {
        renderItem(
          { index, total: items.length, scale, itemLabel },
          {
            onPlay: () => playItem(item, config.clickDelayMs),
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
