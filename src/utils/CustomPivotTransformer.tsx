import { SceneDataTransformer, SceneDataTransformerState } from '@grafana/scenes';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { PanelData, LoadingState } from '@grafana/data';
import { pivotNetworkUtilizationData } from './PivotDataTransformer';

/**
 * Custom SceneDataTransformer that pivots network utilization data
 */
export class CustomPivotTransformer extends SceneDataTransformer {
  public constructor(state: SceneDataTransformerState) {
    super(state);
  }

  /**
   * Override getData to apply custom pivot transformation
   */
  public getData(): Observable<PanelData> {
    // Get data from upstream transformer
    const upstreamData$ = super.getData();

    // Apply pivot transformation
    return upstreamData$.pipe(
      map((data: PanelData) => {
        console.log('CustomPivotTransformer: Received data', {
          state: data.state,
          seriesCount: data.series?.length,
          series: data.series,
        });

        // If data is still loading or has errors, pass through
        if (data.state === LoadingState.Loading || data.state === LoadingState.Error) {
          console.log('CustomPivotTransformer: Data not ready, passing through');
          return data;
        }

        // Transform the data
        try {
          console.log('CustomPivotTransformer: Starting pivot transformation');
          const pivotedFrame = pivotNetworkUtilizationData(data.series);
          console.log('CustomPivotTransformer: Pivoted data successfully', pivotedFrame);

          return {
            ...data,
            series: [pivotedFrame],
          };
        } catch (error) {
          console.error('CustomPivotTransformer: Error pivoting data:', error);
          return data;
        }
      })
    );
  }
}
