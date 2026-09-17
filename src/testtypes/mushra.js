import { renderMushraItem } from "../ui.js";
import { playItem, getBuffer } from "../audio.js";
import { shuffle } from "../utils.js";

export const mushra = {
  id: "mushra",
  label: "MUSHRA — Multiple Stimuli with Hidden Reference and Anchor",
  description:
    "Rate several processed versions of a sound against a labeled reference, on a continuous 0-100 scale — including a hidden copy of the reference and a hidden low-quality anchor, for listener screening.",
  defaultScale: [
    { value: 0, label: "Bad" },
    { value: 20, label: "Poor" },
    { value: 40, label: "Fair" },
    { value: 60, label: "Good" },
    { value: 80, label: "Excellent" },
  ],

  // items: [{ id, reference: {type,...}, anchor: {type,...}, conditions: [{ id, type, ... }] }]
  //
  // Unlike the other test types, one "item" here produces several ratings at
  // once (one per stimulus). There's no per-response schema change needed
  // for this: each stimulus is recorded through the existing single-scalar
  // onRate(itemId, rating) as its own composite id —
  // "<item.id>::ref" (hidden reference), "<item.id>::anchor" (hidden
  // anchor), "<item.id>::<conditionId>" (each named condition) — so
  // results.js/crypto.js and the analysis pipeline need no changes.
  //
  // options: { itemLabel, allowSkip, onRate(compositeItemId, rating) }
  async runItems(items, config, { itemLabel = "Item", allowSkip = false, onRate }) {
    const bands = config.scale ?? mushra.defaultScale;

    for (let index = 0; index < items.length; index++) {
      const item = items[index];

      const entries = shuffle([
        { key: `${item.id}::ref`, stimulus: item.reference },
        { key: `${item.id}::anchor`, stimulus: item.anchor },
        ...item.conditions.map((c) => ({ key: `${item.id}::${c.id}`, stimulus: c })),
      ]);
      entries.forEach((e, i) => {
        e.label = `Sound ${String.fromCharCode(65 + i)}`; // A, B, C, ... in shuffled order
      });
      const stimulusByKey = new Map(entries.map((e) => [e.key, e.stimulus]));

      const action = await new Promise((resolve) => {
        renderMushraItem(
          {
            index,
            total: items.length,
            itemLabel,
            bands,
            stimuli: entries.map(({ key, label }) => ({ key, label })),
          },
          {
            onPlayReference: (region) => playItem(item.reference, config.clickDelayMs, region),
            onPlayStimulus: (key, region) => playItem(stimulusByKey.get(key), config.clickDelayMs, region),
            getReferenceBuffer:
              item.reference.type === "file" ? () => getBuffer(item.reference.src) : undefined,
            onSubmit: (ratings) => {
              for (const [key, value] of Object.entries(ratings)) {
                onRate(key, value);
              }
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
