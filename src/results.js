export function createResultsCollector({ testId, participantId }) {
  const responses = [];

  return {
    record(itemId, rating) {
      responses.push({ itemId, rating, timestamp: new Date().toISOString() });
    },
    toJSON() {
      return {
        testId,
        participantId,
        completedAt: new Date().toISOString(),
        responses,
      };
    },
    download() {
      const data = JSON.stringify(this.toJSON(), null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wasmos-results-${testId}-${participantId}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
  };
}
