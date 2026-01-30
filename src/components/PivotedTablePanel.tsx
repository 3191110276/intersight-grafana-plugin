import React, { useMemo } from 'react';
import { SceneObjectBase, SceneComponentProps, SceneObjectState, SceneQueryRunner } from '@grafana/scenes';
import { useObservable } from 'react-use';
import { PanelData, LoadingState, FieldType } from '@grafana/data';
import { useTheme2 } from '@grafana/ui';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface PivotedTablePanelState extends SceneObjectState {
  title: string;
  queryRunner: SceneQueryRunner;
  unit?: string;
  onRowClick?: (chassisName: string) => void;
}

/**
 * Custom panel component that displays pivoted network utilization data
 */
export class PivotedTablePanel extends SceneObjectBase<PivotedTablePanelState> {
  public static Component = PivotedTablePanelRenderer;

  /**
   * Provide getData method for Scene compatibility
   */
  public getData(): Observable<PanelData> {
    console.log('PivotedTablePanel: getData() called');
    const { queryRunner } = this.state;

    if (!queryRunner) {
      console.error('PivotedTablePanel: No query runner available');
      return new Observable((subscriber) => {
        subscriber.next({
          series: [],
          state: LoadingState.Done,
          timeRange: {} as any,
        });
      });
    }

    return queryRunner.getResultsStream().pipe(map(result => result.data));
  }
}

function PivotedTablePanelRenderer({ model }: SceneComponentProps<PivotedTablePanel>) {
  const { title, queryRunner, unit, onRowClick } = model.useState();
  const theme = useTheme2();

  // Subscribe to query runner data
  const data = useObservable<PanelData>(
    queryRunner.getResultsStream().pipe(map(result => result.data)),
    {
      series: [],
      state: LoadingState.Loading,
      timeRange: {} as any,
    }
  );

  console.log('PivotedTablePanel: Received data', data);

  // Transform and pivot the data
  const tableData = useMemo(() => {
    if (data.state !== LoadingState.Done || !data.series || data.series.length === 0) {
      return null;
    }

    try {
      // Parse field names and extract data
      const dataByChassisAndMetric: Record<string, Record<string, number | null>> = {};

      data.series.forEach((series) => {
        series.fields.forEach((field) => {
          if (field.type === FieldType.time) return;

          // Parse field name: "A Utilization ChassisName"
          const match = field.name.match(/^([A-D]) Utilization (.+)$/);
          if (!match) return;

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

          // Get last value
          const values = field.values;
          const lastValue = values.length > 0 ? values[values.length - 1] : null;

          if (!dataByChassisAndMetric[chassisName]) {
            dataByChassisAndMetric[chassisName] = {};
          }
          dataByChassisAndMetric[chassisName][metricName] = lastValue;
        });
      });

      console.log('PivotedTablePanel: Transformed data', dataByChassisAndMetric);

      // Convert to rows
      const rows: Array<{ chassis: string; [key: string]: string | number | null }> = Object.keys(dataByChassisAndMetric)
        .sort()
        .map((chassis) => ({
          chassis,
          ...dataByChassisAndMetric[chassis],
        }));

      return rows;
    } catch (error) {
      console.error('PivotedTablePanel: Error transforming data', error);
      return null;
    }
  }, [data]);

  // Render loading state
  if (data.state === LoadingState.Loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Loading...
      </div>
    );
  }

  // Render error state
  if (data.state === LoadingState.Error) {
    return (
      <div style={{ padding: '20px', color: theme.colors.error.text }}>
        Error loading data
      </div>
    );
  }

  // Render no data state
  if (!tableData || tableData.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        No data
      </div>
    );
  }

  // Render table
  const columns = [
    { name: 'Chassis', key: 'chassis', width: 250 },
    { name: 'eCMC-A TX', key: 'eCMC-A TX', width: 150 },
    { name: 'eCMC-A RX', key: 'eCMC-A RX', width: 150 },
    { name: 'eCMC-B TX', key: 'eCMC-B TX', width: 150 },
    { name: 'eCMC-B RX', key: 'eCMC-B RX', width: 150 },
  ];

  return (
    <div style={{ width: '100%', height: '100%', padding: '10px' }}>
      <h3 style={{ marginBottom: '10px' }}>{title}</h3>
      <div style={{ overflowY: 'auto', maxHeight: 'calc(100% - 40px)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.colors.border.weak}` }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    textAlign: 'left',
                    padding: '8px',
                    fontWeight: 600,
                    width: col.width,
                  }}
                >
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick?.(row.chassis)}
                style={{
                  borderBottom: `1px solid ${theme.colors.border.weak}`,
                  cursor: onRowClick ? 'pointer' : 'default',
                }}
                onMouseEnter={(e) => {
                  if (onRowClick) {
                    e.currentTarget.style.backgroundColor = theme.colors.emphasize(
                      theme.colors.background.primary,
                      0.03
                    );
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <td style={{ padding: '8px' }}>{row.chassis}</td>
                <td style={{ padding: '8px' }}>
                  {row['eCMC-A TX'] != null
                    ? unit === 'percent'
                      ? `${((row['eCMC-A TX'] as number) * 100).toFixed(4)}%`
                      : row['eCMC-A TX']
                    : 'N/A'}
                </td>
                <td style={{ padding: '8px' }}>
                  {row['eCMC-A RX'] != null
                    ? unit === 'percent'
                      ? `${((row['eCMC-A RX'] as number) * 100).toFixed(4)}%`
                      : row['eCMC-A RX']
                    : 'N/A'}
                </td>
                <td style={{ padding: '8px' }}>
                  {row['eCMC-B TX'] != null
                    ? unit === 'percent'
                      ? `${((row['eCMC-B TX'] as number) * 100).toFixed(4)}%`
                      : row['eCMC-B TX']
                    : 'N/A'}
                </td>
                <td style={{ padding: '8px' }}>
                  {row['eCMC-B RX'] != null
                    ? unit === 'percent'
                      ? `${((row['eCMC-B RX'] as number) * 100).toFixed(4)}%`
                      : row['eCMC-B RX']
                    : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
