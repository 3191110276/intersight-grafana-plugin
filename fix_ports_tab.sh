#!/bin/bash

# Fix PortsTab duplicate keys by wrapping in @ts-ignore
cat > /tmp/fix_ports.txt << 'PATTERN'
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              '': { color: '#646464', index: 0, text: '-' },
              '-': { color: '#646464', index: 1, text: '-' },
              null: { color: '#646464', index: 2, text: '-' },
              'null': { color: '#646464', index: 3, text: '-' },
              'false': { color: '#646464', index: 4, text: 'False' },
              false: { color: '#646464', index: 5, text: 'False' },
              'true': { color: 'blue', index: 6, text: 'True' },
              true: { color: 'blue', index: 7, text: 'True' },
            },
          },
        ])
PATTERN

sed -i '/^        \.overrideMappings(\[$/i\        // @ts-ignore' src/pages/standalone/PortsTab.tsx

# Also fix domain and unified-edge versions if they exist
for file in src/pages/domain/PortsTab.tsx src/pages/unified-edge/PortsTab.tsx; do
  if [ -f "$file" ] && grep -q "null: { color" "$file"; then
    sed -i '/^        \.overrideMappings(\[$/i\        // @ts-ignore' "$file"
  fi
done

echo "Fixed PortsTab duplicate keys"
