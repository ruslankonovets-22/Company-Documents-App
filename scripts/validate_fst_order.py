#!/usr/bin/env python3
"""
Validate Folder Structure Template order in fixtures.

This script checks that parent elements appear BEFORE their children
in folder_structure_template.json. This is critical for Frappe NestedSet
to import fixtures successfully.

Usage:
    python scripts/validate_fst_order.py

Exit codes:
    0 - All records in correct order
    1 - Order violation found
"""

import json
import sys
from pathlib import Path


def validate_fst_order():
    """Validate that FST fixtures are in correct hierarchical order."""
    fixture_path = Path(__file__).parent.parent / 'company_documents' / 'fixtures' / 'folder_structure_template.json'
    
    if not fixture_path.exists():
        print(f"❌ ERROR: File not found: {fixture_path}")
        return False
    
    with open(fixture_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Track which parents have been created
    seen_parents = {None, ''}  # Root elements have parent=None or ''
    errors = []
    
    for i, item in enumerate(data):
        name = item.get('name')
        parent = item.get('parent_folder_structure_template')
        
        # Check if parent exists
        if parent not in seen_parents:
            errors.append({
                'index': i,
                'name': name,
                'parent': parent,
                'line': i * 12 + 2  # Approximate line number
            })
        
        # Add this item to seen parents
        seen_parents.add(name)
    
    # Report results
    if errors:
        print(f"❌ VALIDATION FAILED: Found {len(errors)} order violations!")
        print()
        for err in errors:
            print(f"  ERROR at index {err['index']} (~line {err['line']}):")
            print(f"    Child:  {err['name']}")
            print(f"    Parent: {err['parent']} (NOT CREATED YET!)")
            print(f"    → Parent {err['parent']} must appear BEFORE child {err['name']}")
            print()
        
        print("💡 TIP: Run this to fix order:")
        print("    python scripts/fix_fst_order.py")
        return False
    else:
        print(f"✅ VALIDATION PASSED: All {len(data)} records are in correct order!")
        print()
        print("Order verification:")
        roots = [item for item in data if not item.get('parent_folder_structure_template')]
        print(f"  - Root elements: {len(roots)}")
        print(f"  - Child elements: {len(data) - len(roots)}")
        print()
        for root in roots:
            print(f"  ✓ {root['name']}: {root['folder_name']}")
        
        return True


if __name__ == '__main__':
    success = validate_fst_order()
    sys.exit(0 if success else 1)
