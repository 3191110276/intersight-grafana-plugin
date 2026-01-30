import { SceneObjectBase, SceneObjectState, SceneQueryRunner } from '@grafana/scenes';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PanelData, LoadingState } from '@grafana/data';
import { pivotNetworkUtilizationData } from './PivotDataTransformer';

interface PivotDataProviderState extends SceneObjectState {
  queryRunner: SceneQueryRunner;
}

/**
 * Data provider that transforms query results using custom pivot logic
 */
export class PivotDataProvider extends SceneObjectBase<PivotDataProviderState> {
  public constructor(queryRunner: SceneQueryRunner) {
    super({
      queryRunner: queryRunner,
    });
  }

  /**
   * Implement activate to start data flow
   */
  public activate() {
    const cleanup = super.activate();
    console.log('PivotDataProvider: Activated');

    // Subscribe to query runner to trigger data loading
    if (this.state.queryRunner) {
      const sub = this.state.queryRunner.subscribeToState((state) => {
        console.log('PivotDataProvider: Query runner state changed', state);
      });

      this._subs.add(sub);
    }

    return cleanup;
  }

  /**
   * Get data - subscribes to query runner and transforms results
   */
  public getData(): Observable<PanelData> {
    console.log('PivotDataProvider: getData() called');

    const queryRunner = this.state.queryRunner;

    if (!queryRunner) {
      console.error('PivotDataProvider: No query runner available');
      return new Observable((subscriber) => {
        subscriber.next({
          series: [],
          state: LoadingState.Done,
          timeRange: {} as any,
        });
      });
    }

    console.log('PivotDataProvider: Getting data from query runner');

    return queryRunner.getResultsStream().pipe(
      map((result) => {
        const data = result.data;
        console.log('PivotDataProvider: Received data', {
          state: data.state,
          seriesCount: data.series?.length,
        });

        // If loading or error, pass through
        if (data.state === LoadingState.Loading || data.state === LoadingState.Error) {
          return data;
        }

        // Apply reduce transformation manually
        // Get last value from each series
        const reducedSeries = data.series.map((series) => {
          const fields = series.fields.map((field) => {
            const values = field.values;
            const lastValue = values.length > 0 ? values[values.length - 1] : null;
            return {
              ...field,
              values: [lastValue],
            };
          });
          return {
            ...series,
            fields,
            length: 1,
          };
        });

        console.log('PivotDataProvider: After reduce', reducedSeries);

        // Apply pivot transformation
        try {
          const pivotedFrame = pivotNetworkUtilizationData(reducedSeries);
          console.log('PivotDataProvider: Pivoted successfully', pivotedFrame);

          return {
            ...data,
            series: [pivotedFrame],
          };
        } catch (error) {
          console.error('PivotDataProvider: Error pivoting:', error);
          return {
            ...data,
            series: reducedSeries,
          };
        }
      })
    );
  }
}
