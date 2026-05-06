#!/usr/bin/env bash
set -euo pipefail

echo "[1/3] Build client"
npm --prefix client run build

echo "[2/3] Verify prop docs exists"
test -f ".monkeycode/docs/道具百科.md"

echo "[3/3] Verify key prop ids in source"
rg -n "ethereal_step|smoke_bomb|skeleton_revival|flip_chess_pair|gomoku_mode" client/src > /dev/null

echo "Regression check passed"
