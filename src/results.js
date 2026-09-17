import { createEncryptor, KEY_DERIVATION_DESCRIPTION } from "./crypto.js";

export function createResultsCollector({ testId, participantId }) {
  const responses = [];
  const encryptRating = createEncryptor(testId, participantId);

  return {
    record(itemId, rating) {
      responses.push({ itemId, rating, timestamp: new Date().toISOString() });
    },
    async toJSON() {
      const encryptedResponses = await Promise.all(
        responses.map(async ({ itemId, rating, timestamp }) => {
          const { rating: encryptedRating, iv } = await encryptRating(rating);
          return { itemId, timestamp, rating: encryptedRating, iv };
        })
      );
      return {
        testId,
        participantId,
        completedAt: new Date().toISOString(),
        encryption: {
          algorithm: "AES-GCM",
          keyDerivation: KEY_DERIVATION_DESCRIPTION,
          note:
            "Only the 'rating' field is encrypted (light obfuscation, not a strong secrecy guarantee) — everything else in this file is plain text so you can verify what is being sent. See src/crypto.js and scripts/decrypt_results.py for the exact, open scheme.",
        },
        responses: encryptedResponses,
      };
    },
    async download() {
      const data = JSON.stringify(await this.toJSON(), null, 2);
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
