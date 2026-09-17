"""Decrypts and combines a directory of WASMOS results JSON files into one
tidy CSV (one row per participant/item rating), for analysis.

Usage:
    python3 scripts/extract_results.py <results_dir> <output.csv>

Requires the 'cryptography' and 'pandas' packages.
"""

import sys

from wasmos_analysis import load_results_dir


def main():
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <results_dir> <output.csv>")
        sys.exit(1)

    results_dir, output_csv = sys.argv[1], sys.argv[2]
    df = load_results_dir(results_dir)
    df.to_csv(output_csv, index=False)
    print(
        f"Wrote {len(df)} rows from {df['participantId'].nunique()} participants "
        f"to {output_csv}"
    )


if __name__ == "__main__":
    main()
