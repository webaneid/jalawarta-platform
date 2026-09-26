#!/bin/bash
# scripts/next-adr-number.sh
# Print nomor ADR berikutnya berdasarkan file yang sudah ada di docs/decisions/.
# Pakai: bash scripts/next-adr-number.sh
# Output: 0004 (zero-padded 4 digit)

DECISIONS_DIR="docs/decisions"

if [ ! -d "$DECISIONS_DIR" ]; then
  echo "0001"
  exit 0
fi

LAST=$(ls "$DECISIONS_DIR"/adr-[0-9]*.md 2>/dev/null \
  | grep -oE 'adr-[0-9]+' \
  | grep -oE '[0-9]+' \
  | sort -n \
  | tail -1)

if [ -z "$LAST" ]; then
  printf "%04d\n" 1
else
  printf "%04d\n" $((10#$LAST + 1))
fi
