#!/usr/bin/env python3
import re

# Read the original file
with open('src/pages/StandalonePage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Read the new implementation
with open('src/pages/EnvironmentalTab.txt', 'r', encoding='utf-8') as f:
    new_impl = f.read()

# Find and replace the getEnvironmentalTab function
# Pattern matches from "function getEnvironmentalTab()" to its closing brace
pattern = r'function getEnvironmentalTab\(\) \{[^}]+\{[^}]+\{[^}]+\}[^}]+\}[^}]+\}[^}]+\}'

# Replace with new implementation
new_content = re.sub(pattern, new_impl, content, flags=re.DOTALL)

# Write back
with open('src/pages/StandalonePage.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Replacement complete!")
