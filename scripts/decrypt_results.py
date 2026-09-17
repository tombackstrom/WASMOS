"""Decrypts the 'rating' field in a WASMOS results JSON file for the test
operator. Mirrors src/crypto.js exactly: AES-GCM keyed by
SHA-256(testId + ":" + participantId), both of which are plain text in the
same results file — this is light obfuscation against casual viewing, not
strong secrecy (see the "encryption" block in the results file itself).

Usage:
    python3 scripts/decrypt_results.py path/to/wasmos-results-*.json

Requires the 'cryptography' package (pip install cryptography).
"""

import base64
import hashlib
import json
import sys

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def derive_key(test_id, participant_id):
    material = f"{test_id}:{participant_id}".encode("utf-8")
    return hashlib.sha256(material).digest()


def decrypt_rating(key, rating_b64, iv_b64):
    aesgcm = AESGCM(key)
    ciphertext = base64.b64decode(rating_b64)
    iv = base64.b64decode(iv_b64)
    return aesgcm.decrypt(iv, ciphertext, None).decode("utf-8")


def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <results.json>")
        sys.exit(1)

    with open(sys.argv[1]) as f:
        data = json.load(f)

    key = derive_key(data["testId"], data["participantId"])

    print(f"testId: {data['testId']}  participantId: {data['participantId']}")
    for response in data["responses"]:
        rating = decrypt_rating(key, response["rating"], response["iv"])
        print(f"  {response['itemId']}: {rating}  (at {response['timestamp']})")


if __name__ == "__main__":
    main()
