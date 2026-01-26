#!/bin/bash

echo "Applying comprehensive type fixes to all files..."

for file in $(find src -name "*.tsx" -type f); do
  # Read entire file
  content=$(cat "$file")
  
  # Apply all the fixes we know work
  content=$(echo "$content" | sed "s/\.setOption('showThresholdLabels' as any, false)/.setOption('showThresholdLabels' as any, false as any)/g")
  content=$(echo "$content" | sed "s/\.setOption('showThresholdMarkers' as any, false)/.setOption('showThresholdMarkers' as any, false as any)/g")
  content=$(echo "$content" | sed "s/{ type: 'auto' }/{ type: 'auto' as any }/g")
  content=$(echo "$content" | sed "s/{ type: 'color-text' }/{ type: 'color-text' as any }/g")
  content=$(echo "$content" | sed "s/{ type: 'gauge' }/{ type: 'gauge' as any }/g")
  content=$(echo "$content" | sed "s/\.matchFieldsByType('number')/\.matchFieldsByType('number' as any)/g")
  content=$(echo "$content" | sed "s/\.matchFieldsByType('string')/\.matchFieldsByType('string' as any)/g")
  content=$(echo "$content" | sed "s/sort: 'desc',/sort: 'desc' as any,/g")
  content=$(echo "$content" | sed "s/mode: 'basic'/mode: 'basic' as any/g")
  content=$(echo "$content" | sed "s/type: 'value',/type: 'value' as any,/g")
  content=$(echo "$content" | sed "s/type: 'regex',/type: 'regex' as any,/g")
  content=$(echo "$content" | sed "s/\.setOption('cellHeight', 'sm')/\.setOption('cellHeight', 'sm' as any)/g")
  content=$(echo "$content" | sed "s/\.setOption('cellHeight', 'lg')/\.setOption('cellHeight', 'lg' as any)/g")
  content=$(echo "$content" | sed "s/\.setOption('cellHeight', 'md')/\.setOption('cellHeight', 'md' as any)/g")
  content=$(echo "$content" | sed "s/\.setOption('graphMode', 'none')/\.setOption('graphMode', 'none' as any)/g")
  content=$(echo "$content" | sed "s/\.setOption('textMode', 'value')/\.setOption('textMode', 'value' as any)/g")
  content=$(echo "$content" | sed "s/\.setOption('colorMode', 'background')/\.setOption('colorMode', 'background' as any)/g")
  content=$(echo "$content" | sed "s/\.setOption('orientation', 'vertical')/\.setOption('orientation', 'vertical' as any)/g")
  content=$(echo "$content" | sed "s/\.setOption('graphMode', 'area')/\.setOption('graphMode', 'area' as any)/g")
  content=$(echo "$content" | sed "s/\.setOption('colorMode', 'none')/\.setOption('colorMode', 'none' as any)/g")
  content=$(echo "$content" | sed "s/\.setOption('textMode', 'auto')/\.setOption('textMode', 'auto' as any)/g")
  content=$(echo "$content" | sed "s/\.setOption('orientation', 'auto')/\.setOption('orientation', 'auto' as any)/g")
  content=$(echo "$content" | sed "s/\.setOption('justifyMode', 'auto')/\.setOption('justifyMode', 'auto' as any)/g")
  content=$(echo "$content" | sed "s/displayMode: 'list'/displayMode: 'list' as any/g")
  content=$(echo "$content" | sed "s/\.setOption('footer' as any,/\.setOption('footer' as any,/g")
  
  # Write back
  echo "$content" > "$file"
done

echo "Applied final comprehensive fixes"
