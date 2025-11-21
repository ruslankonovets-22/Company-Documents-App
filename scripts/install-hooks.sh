#!/bin/bash
# Install Git hooks for Company Documents App
#
# This script installs pre-commit hooks that validate:
# - Folder Structure Template order
# - Version consistency between __init__.py and hooks.py
#
# Usage: bash scripts/install-hooks.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"

echo "🔧 Installing Git hooks for Company Documents App..."
echo ""

# Create hooks directory if it doesn't exist
mkdir -p "$HOOKS_DIR"

# Install pre-commit hook
echo "📝 Installing pre-commit hook..."
cp "$SCRIPT_DIR/pre-commit-hook.sh" "$HOOKS_DIR/pre-commit"
chmod +x "$HOOKS_DIR/pre-commit"
echo "✅ Pre-commit hook installed"

echo ""
echo "🎉 Git hooks installed successfully!"
echo ""
echo "The following checks will run automatically before each commit:"
echo "  - Folder Structure Template order validation"
echo ""
echo "To test the hooks:"
echo "  python3 scripts/validate_fst_order.py"
echo ""
echo "To bypass hooks (NOT RECOMMENDED):"
echo "  git commit --no-verify"
