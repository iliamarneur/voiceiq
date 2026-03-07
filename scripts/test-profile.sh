#!/bin/bash
# Run tests for a specific profile
# Usage: ./scripts/test-profile.sh business
set -e
cd "$(dirname "$0")/../backend"

PROFILE="${1:-generic}"
echo "=== VoiceIQ Tests — Profile: $PROFILE ==="
python -m pytest tests/ -v --tb=short -k "$PROFILE" "${@:2}"
