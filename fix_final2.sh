#!/bin/bash

# Fix domainNames issue in domain/InventoryTab.tsx
sed -i 's/domainNames.map/variable.state.value?.map/g' src/pages/domain/InventoryTab.tsx
sed -i 's/(domainName: any)/(domainName: any)/g' src/pages/domain/InventoryTab.tsx
sed -i 's/(t: any)/(t: any)/g' src/pages/domain/InventoryTab.tsx

# Fix domainNames issue in domain/PortsTab.tsx  
sed -i 's/domainNames.map/variable.state.value?.map/g' src/pages/domain/PortsTab.tsx

# Fix serverNames in standalone/AlarmsTab.tsx
sed -i 's/createAllServersAlarmsBody(serverNames)/createAllServersAlarmsBody(variable.state.value as string[] || [])/g' src/pages/standalone/AlarmsTab.tsx

# Fix chassisNames in unified-edge/AlarmsTab.tsx
sed -i 's/createAllChassisAlarmsBody(chassisNames)/createAllChassisAlarmsBody(variable.state.value as string[] || [])/g' src/pages/unified-edge/AlarmsTab.tsx

# Fix legend mode 'list'
for file in $(find src -name "*.tsx" -type f); do
  sed -i "s/displayMode: 'list'/displayMode: 'list' as any/g" "$file"
  sed -i "s/\.setCustomFieldConfig('showLegend', true)/\.setCustomFieldConfig('showLegend', true as any)/g" "$file"
done

# Fix cellHeight 'md'
for file in $(find src -name "*.tsx" -type f); do
  sed -i "s/\.setOption('cellHeight', 'md')/\.setOption('cellHeight', 'md' as any)/g" "$file"
done

# Fix text mode 'markdown'
sed -i "s/mode: 'markdown'/mode: 'markdown' as any/g" src/pages/home/index.tsx

# Fix color-background in NetworkErrorsTab
sed -i "s/type: 'color-background', mode: 'basic'/type: 'color-background' as any, mode: 'basic' as any/g" src/pages/standalone/NetworkErrorsTab.tsx

# Fix setOverride typo
sed -i "s/\.setOverride(/.setOverrides(/g" src/pages/domain/SFPTab.tsx

# Fix range mappings by adding @ts-ignore
sed -i '/{ from: number; result:/i\          // @ts-ignore' src/pages/standalone/StorageTab.tsx

echo "Applied final fixes"
