"""Decrypts and prints one WASMOS results JSON file for the test operator.
See wasmos_analysis.py for the shared scheme (mirrors src/crypto.js exactly).

Usage:
    python3 scripts/decrypt_results.py path/to/wasmos-results-*.json

Requires the 'cryptography' package (pip install cryptography).
"""

import sys

from wasmos_analysis import load_result_file


def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <results.json>")
        sys.exit(1)

    data = load_result_file(sys.argv[1])

    print(f"testId: {data['testId']}  participantId: {data['participantId']}")
    if data.get("background"):
        print(f"background: {data['background']}")
    for response in data["responses"]:
        print(f"  {response['itemId']}: {response['rating']}  (at {response['timestamp']})")


if __name__ == "__main__":
    main()
