import React from 'react';
import { SceneObjectBase, SceneComponentProps, SceneObjectState } from '@grafana/scenes';
import { useObservable } from 'react-use';
import { PanelData, LoadingState } from '@grafana/data';
import { pivotNetworkUtilizationData } from '../utils/PivotDataTransformer';

interface PivotTableWrapperState extends SceneObjectState {
  tablePanel: any;
  dataProvider: any;
}

/**
 * Wrapper component that transforms data before passing to table panel
 */
export class PivotTableWrapper extends SceneObjectBase<PivotTableWrapperState> {
  public static Component = PivotTableWrapperRenderer;
}

function PivotTableWrapperRenderer({ model }: SceneComponentProps<PivotTableWrapper>) {
  const { tablePanel, dataProvider } = model.useState();

  // Subscribe to the data
  const data = useObservable(dataProvider.getData(), {
    series: [],
    state: LoadingState.Loading,
    timeRange: {} as any,
  } as PanelData);

  console.log('PivotTableWrapper: Received data', data);

  // Transform the data if it's ready
  let transformedData: PanelData = data;
  if (data.state === LoadingState.Done && data.series && data.series.length > 0) {
    try {
      console.log('PivotTableWrapper: Starting pivot transformation');
      const pivotedFrame = pivotNetworkUtilizationData(data.series);
      console.log('PivotTableWrapper: Pivoted data', pivotedFrame);

      transformedData = {
        ...data,
        series: [pivotedFrame],
      };
    } catch (error) {
      console.error('PivotTableWrapper: Error pivoting data:', error);
    }
  }

  // Create a temporary data provider that returns the transformed data
  const transformedDataProvider = {
    getData: () => {
      return {
        subscribe: (callback: any) => {
          callback(transformedData);
          return { unsubscribe: () => {} };
        },
      };
    },
  };

  // Clone the table panel with the transformed data provider
  const TableComponent = tablePanel.Component;

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <TableComponent model={tablePanel} />
    </div>
  );
}
