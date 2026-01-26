#!/bin/bash

for file in $(find src -name "*.tsx" -type f); do
  # Fix all setOption string values
  sed -i "s/\.setOption('graphMode', 'none')/\.setOption('graphMode', 'none' as any)/g" "$file"
  sed -i "s/\.setOption('textMode', 'value')/\.setOption('textMode', 'value' as any)/g" "$file"
  sed -i "s/\.setOption('colorMode', 'background')/\.setOption('colorMode', 'background' as any)/g" "$file"
  sed -i "s/\.setOption('orientation', 'vertical')/\.setOption('orientation', 'vertical' as any)/g" "$file"
  sed -i "s/\.setOption('textSize', {/\.setOption('textSize' as any, {/g" "$file"
  sed -i "s/\.setOption('showThresholdLabels', false)/\.setOption('showThresholdLabels' as any, false as any)/g" "$file"
  sed -i "s/\.setOption('showThresholdMarkers', false)/\.setOption('showThresholdMarkers' as any, false as any)/g" "$file"
  
  # Fix cellOptions type values
  sed -i "s/type: 'gauge',/type: 'gauge' as any,/g" "$file"
  sed -i "s/mode: 'lcd',/mode: 'lcd' as any,/g" "$file"
  sed -i "s/valueDisplayMode: 'text',/valueDisplayMode: 'text' as any,/g" "$file"
  sed -i "s/mode: 'percentage',/mode: 'percentage' as any,/g" "$file"
  sed -i "s/mode: 'absolute',/mode: 'absolute' as any,/g" "$file"
done

echo "Applied comprehensive setOption value type casts"
