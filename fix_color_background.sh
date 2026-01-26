#!/bin/bash

for file in $(find src -name "*.tsx" -type f); do
  # Fix color-background type values in overrideCustomFieldConfig
  sed -i "s/{ type: 'color-background', mode: 'basic' as any }/{ type: 'color-background' as any, mode: 'basic' as any }/g" "$file"
  sed -i "s/{ applyToRow: false, mode: 'basic' as any, type: 'color-background' }/{ applyToRow: false, mode: 'basic' as any, type: 'color-background' as any }/g" "$file"
done

echo "Fixed color-background type casts"
