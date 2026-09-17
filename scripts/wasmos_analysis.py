"""Shared library for reading and writing WASMOS results files.

Mirrors src/crypto.js and src/results.js exactly: ratings are AES-GCM
encrypted with a key derived from SHA-256(testId + ":" + participantId).
Used by decrypt_results.py, extract_results.py, and
generate_synthetic_results.py so the encryption/decoding logic lives in
exactly one place.
"""

import base64
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

KEY_DERIVATION_DESCRIPTION = 'SHA-256("<testId>:<participantId>")'


def derive_key(test_id: str, participant_id: str) -> bytes:
    material = f"{test_id}:{participant_id}".encode("utf-8")
    return hashlib.sha256(material).digest()


def decrypt_rating(key: bytes, rating_b64: str, iv_b64: str) -> str:
    aesgcm = AESGCM(key)
    ciphertext = base64.b64decode(rating_b64)
    iv = base64.b64decode(iv_b64)
    return aesgcm.decrypt(iv, ciphertext, None).decode("utf-8")


def encrypt_rating(key: bytes, rating) -> tuple[str, str]:
    aesgcm = AESGCM(key)
    iv = os.urandom(12)
    ciphertext = aesgcm.encrypt(iv, str(rating).encode("utf-8"), None)
    return base64.b64encode(ciphertext).decode("ascii"), base64.b64encode(iv).decode("ascii")


def load_result_file(path) -> dict:
    """Loads one WASMOS results JSON file, returning it with ratings decrypted
    to plain ints (everything else passed through unchanged)."""
    with open(path) as f:
        data = json.load(f)
    key = derive_key(data["testId"], data["participantId"])
    for response in data["responses"]:
        response["rating"] = int(decrypt_rating(key, response["rating"], response["iv"]))
    return data


def load_results_dir(dir_path) -> pd.DataFrame:
    """Loads every *.json results file under dir_path (recursively) into one
    tidy DataFrame: one row per (participant, item) rating, with background
    fields flattened as background_<field> columns."""
    rows = []
    for path in sorted(Path(dir_path).rglob("*.json")):
        data = load_result_file(path)
        background = data.get("background", {})
        for response in data["responses"]:
            rows.append(
                {
                    "testId": data["testId"],
                    "participantId": data["participantId"],
                    "itemId": response["itemId"],
                    "rating": response["rating"],
                    "timestamp": response["timestamp"],
                    **{f"background_{k}": v for k, v in background.items()},
                }
            )
    return pd.DataFrame(rows)


def make_result_document(test_id, participant_id, background, responses, completed_at=None):
    """Builds a dict in exactly the format src/results.js's toJSON() produces.

    responses: iterable of (itemId, rating, timestamp) tuples (plain-text
    ratings in, encrypted on the way out).
    """
    key = derive_key(test_id, participant_id)
    encrypted_responses = []
    for item_id, rating, timestamp in responses:
        rating_b64, iv_b64 = encrypt_rating(key, rating)
        encrypted_responses.append(
            {"itemId": item_id, "timestamp": timestamp, "rating": rating_b64, "iv": iv_b64}
        )
    return {
        "testId": test_id,
        "participantId": participant_id,
        "background": background,
        "completedAt": completed_at or datetime.now(timezone.utc).isoformat(),
        "encryption": {
            "algorithm": "AES-GCM",
            "keyDerivation": KEY_DERIVATION_DESCRIPTION,
            "note": (
                "Only the 'rating' field is encrypted (light obfuscation, not a "
                "strong secrecy guarantee) — everything else in this file is "
                "plain text so you can verify what is being sent. See "
                "src/crypto.js and scripts/decrypt_results.py for the exact, "
                "open scheme."
            ),
        },
        "responses": encrypted_responses,
    }
