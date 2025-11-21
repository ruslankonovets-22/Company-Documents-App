#!/bin/sh
# Pre-commit hook to validate Folder Structure Template order
#
# To install this hook:
#   1. Make it executable: chmod +x scripts/pre-commit-hook.sh
#   2. Copy to .git/hooks: cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
#
# OR use the install script: bash scripts/install-hooks.sh

echo "🔍 Checking Folder Structure Template order..."

# Check if the FST file is being committed
if git diff --cached --name-only | grep -q "company_documents/fixtures/folder_structure_template.json"; then
    echo "📝 FST file modified, validating order..."
    
    # Run validation script
    if python3 scripts/validate_fst_order.py; then
        echo "✅ Validation passed!"
        exit 0
    else
        echo ""
        echo "❌ COMMIT BLOCKED: FST order validation failed!"
        echo ""
        echo "To fix automatically:"
        echo "    python3 scripts/fix_fst_order.py"
        echo "    git add company_documents/fixtures/folder_structure_template.json"
        echo "    git commit"
        echo ""
        echo "Or to skip this check (NOT RECOMMENDED):"
        echo "    git commit --no-verify"
        exit 1
    fi
else
    echo "✓ FST file not modified, skipping validation"
    exit 0
fi
