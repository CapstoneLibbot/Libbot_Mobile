#!/usr/bin/env bash
set -euo pipefail

# Scripts: setup_vosk_model.sh
# Tự động tải và thiết lập mô hình tiếng Việt offline cho react-native-vosk
# Đường dẫn chuẩn: assets/models/model-vn-vn

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${PROJECT_ROOT}/assets/models/model-vn-vn"
MODEL_URL="https://alphacephei.com/vosk/models/vosk-model-small-vn-0.4.zip"
ZIP_FILE="${PROJECT_ROOT}/assets/models/model-vn-vn.zip"

if [ -f "${TARGET_DIR}/am/final.mdl" ] && [ -f "${TARGET_DIR}/uuid" ]; then
  echo "==> [Vosk Setup] Mô hình tiếng Việt đã tồn tại tại assets/models/model-vn-vn. Bỏ qua bước tải."
  exit 0
fi

echo "==> [Vosk Setup] Đang tải mô hình tiếng Việt từ ${MODEL_URL}..."
mkdir -p "${PROJECT_ROOT}/assets/models"

curl -L -o "${ZIP_FILE}" "${MODEL_URL}"

echo "==> [Vosk Setup] Đang giải nén mô hình..."
TEMP_EXTRACT="${PROJECT_ROOT}/assets/models/temp_extract"
mkdir -p "${TEMP_EXTRACT}"
unzip -q -o "${ZIP_FILE}" -d "${TEMP_EXTRACT}"

# Thư mục giải nén từ zip là vosk-model-small-vn-0.4
rm -rf "${TARGET_DIR}"
mv "${TEMP_EXTRACT}/vosk-model-small-vn-0.4" "${TARGET_DIR}"
rm -rf "${TEMP_EXTRACT}" "${ZIP_FILE}"

# Sinh UUID để Vosk StorageService nhận diện phiên bản
if command -v uuidgen >/dev/null 2>&1; then
  uuidgen > "${TARGET_DIR}/uuid"
else
  echo "$RANDOM-$RANDOM-$RANDOM" > "${TARGET_DIR}/uuid"
fi

echo "==> [Vosk Setup] Cài đặt mô hình Vosk tiếng Việt thành công tại assets/models/model-vn-vn!"
