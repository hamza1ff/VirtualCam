#!/usr/bin/env bash
set -e
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

if [ -x ./gradlew ]; then
  ./gradlew clean assembleRelease
else
  gradle clean assembleRelease
fi

APK_PATH="app/build/outputs/apk/release/app-release-unsigned.apk"
if [ ! -f "$APK_PATH" ]; then
  echo "Unsigned APK not found at $APK_PATH"
  exit 1
fi

OUT_ZIP="VirtualCam-release-unsigned.zip"
zip -j "$OUT_ZIP" "$APK_PATH"

echo "Unsigned APK zipped to $OUT_ZIP"
