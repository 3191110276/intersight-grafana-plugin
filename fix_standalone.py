#!/usr/bin/env python3

# Read the broken file
with open('src/pages/StandalonePage.tsx.broken', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find line 1456 (end of getCoolingBudgetTab, 0-indexed so it's 1455)
# Insert the missing function declaration after it

insert_text = """
function getCPUUtilizationTab() {
  // Create query runner with 3 timeseries queries
  const baseQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
"""

# Insert at line 1456 (after the closing brace of getCoolingBudgetTab)
# This is index 1456 (1457 in 1-based numbering)
lines.insert(1456, insert_text)

# Write the fixed file
with open('src/pages/StandalonePage.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("File fixed! Inserted missing function declaration.")
