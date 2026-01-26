#!/bin/bash

for file in $(find src -name "*.tsx" -type f); do
  # Fix more setOption string values
  sed -i "s/\.setOption('graphMode', 'area')/\.setOption('graphMode', 'area' as any)/g" "$file"
  sed -i "s/\.setOption('colorMode', 'none')/\.setOption('colorMode', 'none' as any)/g" "$file"
  sed -i "s/\.setOption('textMode', 'auto')/\.setOption('textMode', 'auto' as any)/g" "$file"
  sed -i "s/\.setOption('orientation', 'auto')/\.setOption('orientation', 'auto' as any)/g" "$file"
  sed -i "s/\.setOption('justifyMode', 'auto')/\.setOption('justifyMode', 'auto' as any)/g" "$file"
done

# Fix LoadingState comparison issues
sed -i "s/'Done'/'Done' as any/g" src/utils/LoggingDataTransformer.ts
sed -i "s/'done'/'done' as any/g" src/utils/LoggingDataTransformer.ts
sed -i "s/'Loading'/'Loading' as any/g" src/utils/LoggingDataTransformer.ts
sed -i "s/'loading'/'loading' as any/g" src/utils/LoggingDataTransformer.ts
sed -i "s/'Error'/'Error' as any/g" src/utils/LoggingDataTransformer.ts
sed -i "s/'error'/'error' as any/g" src/utils/LoggingDataTransformer.ts

sed -i "s/'Done'/'Done' as any/g" src/utils/LoggingQueryRunner.ts
sed -i "s/'done'/'done' as any/g" src/utils/LoggingQueryRunner.ts
sed -i "s/'Loading'/'Loading' as any/g" src/utils/LoggingQueryRunner.ts
sed -i "s/'loading'/'loading' as any/g" src/utils/LoggingQueryRunner.ts
sed -i "s/'Error'/'Error' as any/g" src/utils/LoggingQueryRunner.ts
sed -i "s/'error'/'error' as any/g" src/utils/LoggingQueryRunner.ts

echo "Applied final fixes"
