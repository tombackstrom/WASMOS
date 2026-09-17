"""Generates synthetic WASMOS results files — 50 listeners each for the ACR,
DCR, CCR, and MUSHRA demo tests — in the exact encrypted format the app
produces, for demonstrating/testing the analysis pipeline. This is
fabricated data, not real listener responses; item IDs and testIds match
config/demo-acr.json, config/demo-dcr.json, config/demo-ccr.json, and
config/demo-mushra.json.

Usage:
    python3 scripts/generate_synthetic_results.py
"""

import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

from wasmos_analysis import make_result_document

HERE = Path(__file__).resolve().parent
DEMO_RESULTS_DIR = HERE.parent / "analysis" / "demo_results"

N_LISTENERS = 50
SEED = 20260917

# Mean rating per item/condition, tuned so the synthetic scale mirrors the
# real degradation levels used in the demo audio (see
# scripts/generate_demo_sounds.py): SNR 20dB is mild, SNR 5dB is severe.
ACR_ITEM_MEANS = {
    "clean": 4.8,
    "white_20db": 4.2,
    "white_5db": 1.8,
    "pink_20db": 4.0,
    "pink_5db": 1.6,
}

DCR_ITEM_MEANS = {
    "identical": 4.9,
    "white_20db": 4.0,
    "white_5db": 1.7,
    "pink_20db": 3.8,
    "pink_5db": 1.5,
}

# CCR rates B relative to A on a -3..+3 scale, so means are signed: negative
# means B sounds worse than A, positive means B sounds better.
CCR_ITEM_MEANS = {
    "identical": 0.0,
    "clean_vs_white5": -2.8,
    "white20_vs_pink20": -0.1,
    "white20_vs_white5": -2.2,
    "pink5_vs_white5": 0.1,
}

# MUSHRA rates each stimulus 0-100 against the labeled reference. Composite
# ids ("<item.id>::ref" etc.) match how src/testtypes/mushra.js records
# responses — see that file's comment for why no separate schema is needed.
# The hidden reference ("::ref") should score near 100 if listeners are
# reliable; the hidden low-anchor ("::anchor", 3.5kHz low-pass) scores low.
MUSHRA_ITEM_MEANS = {
    "scene1::ref": 97,
    "scene1::anchor": 35,
    "scene1::white_20db": 80,
    "scene1::white_5db": 25,
    "scene1::pink_20db": 78,
    "scene1::pink_5db": 22,
}

LANGUAGE_OPTIONS = ["Native", "Fluent", "Fluent", "Intermediate", "Basic"]


def sample_rating(mean, listener_bias, rng, lo=1, hi=5, std=0.5):
    value = rng.gauss(mean + listener_bias, std)
    return min(hi, max(lo, round(value)))


def generate_test(test_id, item_means, out_dir, rng, lo=1, hi=5, std=0.5, bias_std=0.3):
    out_dir.mkdir(parents=True, exist_ok=True)
    for i in range(1, N_LISTENERS + 1):
        participant_id = f"P{i:03d}"
        # Some listeners rate systematically higher/lower than others.
        listener_bias = rng.gauss(0, bias_std)
        background = {
            "age": str(rng.randint(19, 65)),
            "languageSkills": rng.choice(LANGUAGE_OPTIONS),
        }

        item_ids = list(item_means.keys())
        rng.shuffle(item_ids)  # each listener sees items in a random order
        now = datetime.now(timezone.utc)
        responses = [
            (
                item_id,
                sample_rating(item_means[item_id], listener_bias, rng, lo, hi, std),
                (now + timedelta(seconds=5 * j)).isoformat(),
            )
            for j, item_id in enumerate(item_ids)
        ]

        doc = make_result_document(test_id, participant_id, background, responses)
        out_path = out_dir / f"wasmos-results-{test_id}-{participant_id}.json"
        with open(out_path, "w") as f:
            json.dump(doc, f, indent=2)


def main():
    rng = random.Random(SEED)
    generate_test("demo-acr-001", ACR_ITEM_MEANS, DEMO_RESULTS_DIR / "acr", rng)
    generate_test("demo-dcr-001", DCR_ITEM_MEANS, DEMO_RESULTS_DIR / "dcr", rng)
    generate_test("demo-ccr-001", CCR_ITEM_MEANS, DEMO_RESULTS_DIR / "ccr", rng, lo=-3, hi=3)
    generate_test(
        "demo-mushra-001", MUSHRA_ITEM_MEANS, DEMO_RESULTS_DIR / "mushra", rng,
        lo=0, hi=100, std=8, bias_std=5,
    )
    print(f"Wrote {N_LISTENERS} synthetic result files each for ACR, DCR, CCR, and MUSHRA to {DEMO_RESULTS_DIR}")


if __name__ == "__main__":
    main()
