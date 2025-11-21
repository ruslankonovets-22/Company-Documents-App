#!/usr/bin/env python3
"""
Fix Folder Structure Template order in fixtures.

This script automatically reorders folder_structure_template.json
to ensure parents appear before their children.

Usage:
    python scripts/fix_fst_order.py

The script will:
1. Read the current JSON file
2. Sort records: roots first, then children recursively
3. Create a backup (.bak)
4. Write the fixed order
"""

import json
import shutil
from pathlib import Path
from datetime import datetime


def fix_fst_order():
    """Reorder FST fixtures to correct hierarchical order."""
    fixture_path = Path(__file__).parent.parent / 'company_documents' / 'fixtures' / 'folder_structure_template.json'
    
    if not fixture_path.exists():
        print(f"❌ ERROR: File not found: {fixture_path}")
        return False
    
    print(f"📂 Reading: {fixture_path}")
    
    with open(fixture_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"📊 Total records: {len(data)}")
    
    # Separate roots and children
    roots = [item for item in data if not item.get('parent_folder_structure_template')]
    children = [item for item in data if item.get('parent_folder_structure_template')]
    
    print(f"   - Root elements: {len(roots)}")
    print(f"   - Child elements: {len(children)}")
    
    # Build hierarchy map
    children_map = {}
    for child in children:
        parent = child.get('parent_folder_structure_template')
        if parent not in children_map:
            children_map[parent] = []
        children_map[parent].append(child)
    
    # Recursive function to get children
    def get_children_recursive(parent_name):
        """Get all children of a parent, recursively."""
        result = []
        if parent_name in children_map:
            for child in sorted(children_map[parent_name], key=lambda x: x['name']):
                result.append(child)
                result.extend(get_children_recursive(child['name']))
        return result
    
    # Build ordered list
    ordered = []
    for root in sorted(roots, key=lambda x: x['name']):
        ordered.append(root)
        ordered.extend(get_children_recursive(root['name']))
    
    # Check if order changed
    if ordered == data:
        print("✅ Order is already correct! No changes needed.")
        return True
    
    # Create backup
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = fixture_path.with_suffix(f'.{timestamp}.bak')
    shutil.copy(fixture_path, backup_path)
    print(f"💾 Backup created: {backup_path.name}")
    
    # Write fixed order
    with open(fixture_path, 'w', encoding='utf-8') as f:
        json.dump(ordered, f, indent=4, ensure_ascii=False)
    
    print(f"✅ FIXED: Reordered {len(ordered)} records")
    print()
    print("New order:")
    for i, item in enumerate(ordered[:5]):
        parent = item.get('parent_folder_structure_template') or '(root)'
        print(f"  {i+1}. {item['name']}: {item['folder_name']} (parent: {parent})")
    
    if len(ordered) > 5:
        print(f"  ... and {len(ordered) - 5} more")
    
    print()
    print("🎉 Done! Run validation to confirm:")
    print("    python scripts/validate_fst_order.py")
    
    return True


if __name__ == '__main__':
    import sys
    success = fix_fst_order()
    sys.exit(0 if success else 1)
