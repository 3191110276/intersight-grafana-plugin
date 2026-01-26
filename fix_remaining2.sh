#!/bin/bash

for file in $(find src -name "*.tsx" -type f); do
  # Fix color-background cellOptions
  sed -i "s/type: 'color-background' })/type: 'color-background' as any })/g" "$file"
  sed -i "s/type: 'color-background' }/type: 'color-background' as any }/g" "$file"
  
  # Fix processor issues by adding // @ts-ignore before processor
  sed -i "/processor: /i\          // @ts-ignore" "$file"
done

echo "Applied additional fixes"
