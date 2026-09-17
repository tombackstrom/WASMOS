import { createResultsCollector } from "./results.js";
import { testTypes } from "./testtypes/index.js";
import { shuffle } from "./utils.js";
import {
  renderPrivacyNotice,
  renderBackgroundQuestions,
  renderWelcome,
  renderTrainingComplete,
  renderEnd,
} from "./ui.js";

async function runTraining(config, testType) {
  while (true) {
    await testType.runItems(config.training.items, config, {
      itemLabel: "Practice sample",
      allowSkip: config.training.allowSkip,
      onRate: () => {}, // practice ratings are not recorded
    });

    const retry = await new Promise((resolve) => {
      renderTrainingComplete({
        onRetry: () => resolve(true),
        onStartTest: () => resolve(false),
      });
    });
    if (!retry) return;
  }
}

function getConfigPath() {
  return new URLSearchParams(window.location.search).get("config") ?? "config/demo-acr.json";
}

async function main() {
  const config = await fetch(getConfigPath()).then((r) => r.json());
  const testType = testTypes[config.testType ?? "acr"];
  if (!testType) {
    throw new Error(`Unknown testType "${config.testType}" in ${getConfigPath()}`);
  }

  renderPrivacyNotice(config.privacyNotice, () => {
    renderWelcome(config, async (participantId) => {
      const backgroundQuestions = config.backgroundQuestions ?? [];
      const background = backgroundQuestions.length
        ? await new Promise((resolve) => {
            renderBackgroundQuestions(backgroundQuestions, resolve);
          })
        : {};

      await runTraining(config, testType);

      const collector = createResultsCollector({
        testId: config.testId,
        participantId,
      });
      collector.setBackground(background);

      const items = config.randomize ? shuffle(config.items) : config.items;
      await testType.runItems(items, config, {
        itemLabel: "Item",
        allowSkip: false,
        onRate: (itemId, rating) => collector.record(itemId, rating),
      });

      renderEnd(() => collector.download());
    });
  });
}

main();
