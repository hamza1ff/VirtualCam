#!/usr/bin/env bash
set -e
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

KEYSTORE=${1:-release-keystore.jks}
KEY_ALIAS=${2:-virtualcam}
OUT_APK="app-release-signed.apk"
INPUT_APK="app/build/outputs/apk/release/app-release-unsigned.apk"

if [ ! -f "$INPUT_APK" ]; then
  echo "Unsigned APK not found. Run build script first."; exit 1
fi

if [ ! -f "$KEYSTORE" ]; then
  echo "Keystore $KEYSTORE not found. Create one using the instructions in README."; exit 1
fi

zipalign -v -p 4 "$INPUT_APK" "aligned-unsigned.apk"

apksigner sign --ks "$KEYSTORE" --out "$OUT_APK" "aligned-unsigned.apk"

apksigner verify --print-certs "$OUT_APK"

echo "Signed APK: $OUT_APK"
