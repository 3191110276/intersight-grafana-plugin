import { DataFrame, Field, FieldType } from '@grafana/data';

/**
 * Custom data transformer to pivot network utilization data
 *
 * Input: Multiple series with labels like {Chassis: "Beta04", ...}
 * Output: Table with Chassis as rows and metrics as columns
 */
export function pivotNetworkUtilizationData(frames: DataFrame[]): DataFrame {
  // Extract data from all series
  const dataByChassisAndMetric: Record<string, Record<string, number>> = {};

  frames.forEach((frame) => {
    frame.fields.forEach((field: Field) => {
      // Skip time fields
      if (field.type === FieldType.time) {
        return;
      }

      // Parse field name: "A Utilization ChassisName" or similar
      const fieldName = field.name;
      const match = fieldName.match(/^([A-D]) Utilization (.+)$/);

      if (!match) {
        return;
      }

      const queryId = match[1];
      const chassisName = match[2];

      // Map query ID to metric name
      const metricMap: Record<string, string> = {
        'A': 'eCMC-A TX',
        'B': 'eCMC-A RX',
        'C': 'eCMC-B TX',
        'D': 'eCMC-B RX',
      };

      const metricName = metricMap[queryId];

      // Get the last value from the field
      const values = field.values;
      const lastValue = values.length > 0 ? values[values.length - 1] : null;

      // Store in nested structure
      if (!dataByChassisAndMetric[chassisName]) {
        dataByChassisAndMetric[chassisName] = {};
      }
      dataByChassisAndMetric[chassisName][metricName] = lastValue;
    });
  });

  // Convert to DataFrame format
  const chassisNames = Object.keys(dataByChassisAndMetric).sort();
  const metricNames = ['eCMC-A TX', 'eCMC-A RX', 'eCMC-B TX', 'eCMC-B RX'];

  // Create fields
  const fields: Field[] = [
    {
      name: 'Chassis',
      type: FieldType.string,
      config: {},
      values: chassisNames,
    },
  ];

  metricNames.forEach((metricName) => {
    const values = chassisNames.map((chassis) => {
      return dataByChassisAndMetric[chassis][metricName] ?? null;
    });

    fields.push({
      name: metricName,
      type: FieldType.number,
      config: {},
      values: values,
    });
  });

  return {
    name: 'Network Utilization',
    fields: fields,
    length: chassisNames.length,
  };
}
