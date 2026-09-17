import { playItem } from "./audio.js";
import { createResultsCollector } from "./results.js";
import {
  renderPrivacyNotice,
  renderBackgroundQuestions,
  renderWelcome,
  renderItem,
  renderTrainingComplete,
  renderEnd,
} from "./ui.js";

function shuffle(array) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function runItems(items, config, collector) {
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    await new Promise((resolve) => {
      renderItem({ index, total: items.length, scale: config.scale }, {
        onPlay: () => playItem(item, config.clickDelayMs),
        onRate: (rating) => {
          collector.record(item.id, rating);
          resolve();
        },
      });
    });
  }
}

// Runs the practice items one per screen, identical to the real test except
// for a "skip training" button. Returns once the last item is rated or the
// participant skips ahead.
async function runTrainingItems(config) {
  const items = config.training.items;
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const action = await new Promise((resolve) => {
      renderItem(
        { index, total: items.length, scale: config.scale, itemLabel: "Practice sample" },
        {
          onPlay: () => playItem(item, config.clickDelayMs),
          onRate: () => resolve("continue"),
          onSkip: config.training.allowSkip ? () => resolve("skip") : undefined,
        }
      );
    });
    if (action === "skip") return;
  }
}

async function runTraining(config) {
  while (true) {
    await runTrainingItems(config);
    const retry = await new Promise((resolve) => {
      renderTrainingComplete({
        onRetry: () => resolve(true),
        onStartTest: () => resolve(false),
      });
    });
    if (!retry) return;
  }
}

async function main() {
  const config = await fetch("config/test-config.json").then((r) => r.json());

  renderPrivacyNotice(config.privacyNotice, () => {
    renderWelcome(config, async (participantId) => {
      const backgroundQuestions = config.backgroundQuestions ?? [];
      const background = backgroundQuestions.length
        ? await new Promise((resolve) => {
            renderBackgroundQuestions(backgroundQuestions, resolve);
          })
        : {};

      await runTraining(config);

      const collector = createResultsCollector({
        testId: config.testId,
        participantId,
      });
      collector.setBackground(background);
      const items = config.randomize ? shuffle(config.items) : config.items;
      await runItems(items, config, collector);
      renderEnd(() => collector.download());
    });
  });
}

main();
