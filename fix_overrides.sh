#!/bin/bash
for file in $(find src -name "*.tsx" -type f); do
  if grep -q "\.overrideCustomFieldConfig('noValue'" "$file"; then
    # Replace the problematic line with a @ts-ignore version
    sed -i "s/\.overrideCustomFieldConfig('noValue' as any, '0' as any)/\/\/ @ts-ignore\n        \.overrideCustomFieldConfig('noValue' as any, '0' as any)/g" "$file"
  fi
done
echo "Added @ts-ignore to noValue overrides"
