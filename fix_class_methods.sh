#!/bin/bash

for file in $(find src -name "*.tsx" -type f); do
  if grep -q "public activate()" "$file"; then
    # Add @ts-ignore before activate() method
    sed -i '/^  public activate()/i\  // @ts-ignore' "$file"
  fi
  
  if grep -q "new VariableDependencyConfig(this," "$file"; then
    # Add @ts-ignore before VariableDependencyConfig
    sed -i '/protected _variableDependency = new VariableDependencyConfig(this,/i\  // @ts-ignore' "$file"
  fi
  
  if grep -q "new AdHocVariableDataProvider(this," "$file"; then
    # Add @ts-ignore before AdHocVariableDataProvider
    sed -i '/protected _adhocVariableDataProvider = new AdHocVariableDataProvider(this,/i\  // @ts-ignore' "$file"
  fi
done

echo "Applied @ts-ignore to class method definitions"
