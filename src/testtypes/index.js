import { acr } from "./acr.js";
import { dcr } from "./dcr.js";
import { ccr } from "./ccr.js";

// To add a new test type: implement the same shape (id, label, description,
// defaultScale, async runItems(items, config, { itemLabel, allowSkip, onRate })
// as acr.js/dcr.js/ccr.js, then register it here.
export const testTypes = {
  [acr.id]: acr,
  [dcr.id]: dcr,
  [ccr.id]: ccr,
};
