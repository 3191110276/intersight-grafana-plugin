import { SceneDataTransformer, SceneDataTransformerState, SceneDataProviderResult } from '@grafana/scenes';
import { map } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';
import { PanelData, LoadingState } from '@grafana/data';
import { pivotNetworkUtilizationData } from './PivotDataTransformer';

/**
 * Custom SceneDataTransformer that pivots network utilization data
 */
export class CustomPivotTransformer extends SceneDataTransformer {
  private _resultsStream = new ReplaySubject<SceneDataProviderResult>(1);

  public constructor(state: SceneDataTransformerState) {
    super(state);
  }

  public activate() {
    const deactivate = super.activate();

    // Subscribe to upstream data and apply transformation
    const sub = super.getResultsStream().pipe(
      map((result: SceneDataProviderResult) => {
        const data = result.data;
        console.log('CustomPivotTransformer: Received data', {
          state: data.state,
          seriesCount: data.series?.length,
          series: data.series,
        });

        // If data is still loading or has errors, pass through
        if (data.state === LoadingState.Loading || data.state === LoadingState.Error) {
          console.log('CustomPivotTransformer: Data not ready, passing through');
          return result;
        }

        // Transform the data
        try {
          console.log('CustomPivotTransformer: Starting pivot transformation');
          const pivotedFrame = pivotNetworkUtilizationData(data.series);
          console.log('CustomPivotTransformer: Pivoted data successfully', pivotedFrame);

          return {
            ...result,
            data: {
              ...data,
              series: [pivotedFrame],
            },
          };
        } catch (error) {
          console.error('CustomPivotTransformer: Error pivoting data:', error);
          return result;
        }
      })
    ).subscribe(this._resultsStream);

    return () => {
      sub.unsubscribe();
      deactivate();
    };
  }

  /**
   * Override getResultsStream to return our custom results stream
   */
  public getResultsStream(): ReplaySubject<SceneDataProviderResult> {
    return this._resultsStream;
  }
}
