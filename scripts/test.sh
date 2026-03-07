#!/bin/bash
# Run all VoiceIQ backend tests
set -e
cd "$(dirname "$0")/../backend"

echo "=== VoiceIQ Test Suite ==="
echo ""

# Install test deps if needed
pip install pytest pytest-asyncio httpx aiosqlite --quiet 2>/dev/null

# Run tests
python -m pytest tests/ -v --tb=short "$@"
