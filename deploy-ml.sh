#!/usr/bin/env bash
# Run once on the VPS to set up the ML environment and train the models.
# Re-run any time you want to retrain.
#
# Usage:
#   bash deploy-ml.sh
#
# Override the artifacts destination (defaults to value in API .env):
#   ARTIFACTS_DEST=/custom/path bash deploy-ml.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ML_DIR="$SCRIPT_DIR/apps/ml"

# Read ML_ARTIFACTS_PATH from the API .env if ARTIFACTS_DEST not set
API_ENV="$SCRIPT_DIR/apps/api/.env"
if [[ -z "${ARTIFACTS_DEST:-}" ]]; then
    if [[ -f "$API_ENV" ]]; then
        ARTIFACTS_DEST=$(grep -E "^ML_ARTIFACTS_PATH=" "$API_ENV" | cut -d= -f2- | tr -d '"' | tr -d "'")
    fi
fi

# Final fallback
ARTIFACTS_DEST="${ARTIFACTS_DEST:-$ML_DIR/artifacts}"

echo "==> ML dir:    $ML_DIR"
echo "==> Artifacts: $ARTIFACTS_DEST"

# ── 1. Create venv if needed ──────────────────────────────────────────────────
if [[ ! -f "$ML_DIR/.venv/bin/python" ]]; then
    echo "==> Creating virtual environment..."
    python3 -m venv "$ML_DIR/.venv"
fi

PYTHON="$ML_DIR/.venv/bin/python"
PIP="$ML_DIR/.venv/bin/pip"

# ── 2. Install dependencies ───────────────────────────────────────────────────
echo "==> Installing dependencies..."
"$PIP" install -q --upgrade pip
"$PIP" install -q -r "$ML_DIR/requirements.txt"

# ── 3. Train models ───────────────────────────────────────────────────────────
echo "==> Training models..."
cd "$ML_DIR"
"$PYTHON" train.py

# ── 4. Copy artifacts to API expected path ────────────────────────────────────
BUILT_ARTIFACTS="$ML_DIR/artifacts"

if [[ "$BUILT_ARTIFACTS" != "$ARTIFACTS_DEST" ]]; then
    echo "==> Copying artifacts to $ARTIFACTS_DEST..."
    mkdir -p "$ARTIFACTS_DEST"
    cp "$BUILT_ARTIFACTS/anomaly_detector.joblib"  "$ARTIFACTS_DEST/"
    cp "$BUILT_ARTIFACTS/threat_classifier.joblib" "$ARTIFACTS_DEST/"
    cp "$BUILT_ARTIFACTS/evaluation.json"          "$ARTIFACTS_DEST/"
fi

echo ""
echo "Done. Restart the API to load the new models:"
echo "  systemctl restart redline-api"
echo "  # or however you manage the API process"
