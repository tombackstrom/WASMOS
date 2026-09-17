import { playItem } from "./audio.js";
import { createResultsCollector } from "./results.js";
import {
  renderWelcome,
  renderTraining,
  renderItem,
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

async function main() {
  const config = await fetch("config/test-config.json").then((r) => r.json());

  renderWelcome(config, (participantId) => {
    renderTraining(config.training, {
      onPlay: (index) =>
        playItem(config.training.items[index], config.clickDelayMs),
      onContinue: async () => {
        const collector = createResultsCollector({
          testId: config.testId,
          participantId,
        });
        const items = config.randomize ? shuffle(config.items) : config.items;
        await runItems(items, config, collector);
        renderEnd(() => collector.download());
      },
    });
  });
}

main();
