#!/usr/bin/env python3

# Read the original broken file
with open('src/pages/StandalonePage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Read the new environmental implementation
with open('src/pages/EnvironmentalTab.txt', 'r', encoding='utf-8') as f:
    new_impl_lines = f.readlines()

# Find the line with "function getEnvironmentalTab()"
start_idx = None
for i, line in enumerate(lines):
    if 'function getEnvironmentalTab()' in line:
        start_idx = i
        break

if start_idx is None:
    print("Could not find getEnvironmentalTab function!")
    exit(1)

# Find the end of the function - look for the closing brace of getEnvironmentalTab
# We need to track brace depth
brace_depth = 0
end_idx = None
for i in range(start_idx, len(lines)):
    line = lines[i]
    # Count braces
    brace_depth += line.count('{') - line.count('}')

    # When we hit depth 0 after starting, we've found the end
    if i > start_idx and brace_depth == 0:
        end_idx = i
        break

if end_idx is None:
    print("Could not find end of getEnvironmentalTab function!")
    exit(1)

print(f"Found function from line {start_idx + 1} to line {end_idx + 1}")

# Replace the lines
new_lines = lines[:start_idx] + new_impl_lines + lines[end_idx + 1:]

# Write back
with open('src/pages/StandalonePage.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("File fixed successfully!")
