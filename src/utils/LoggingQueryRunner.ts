import { SceneQueryRunner } from '@grafana/scenes';
import { debugQuery, debugData, formatDataFrame } from './debug';

/**
 * Extended SceneQueryRunner that logs query execution and results
 * when debug mode is enabled.
 *
 * Usage: Replace SceneQueryRunner with LoggingQueryRunner in tab components
 */
export class LoggingQueryRunner extends SceneQueryRunner {
  public activate() {
    // Log query execution start
    debugQuery('Query execution started', {
      datasource: this.state.datasource,
      queryCount: this.state.queries.length,
      queries: this.state.queries.map((q: any) => ({
        refId: q.refId,
        queryType: q.queryType,
        url: q.url,
        format: q.format,
        type: q.type,
        source: q.source,
        parser: q.parser,
      })),
    });

    // Call parent activate
    const deactivate = super.activate();

    debugQuery('Setting up state subscription', {
      initialDataExists: !!this.state.data,
      initialStateKeys: Object.keys(this.state),
    });

    // Subscribe to state changes to log results with FULL DATA
    const unsubscribe = this.subscribeToState((newState) => {
      // Debug: Log ALL state changes to diagnose subscription
      debugQuery('State callback triggered', {
        hasDataProperty: 'data' in newState,
        dataValue: newState.data ? 'exists' : 'null/undefined',
        allStateKeys: Object.keys(newState),
      });

      // Debug: Log raw state structure to understand what we're receiving
      if (newState.data) {
        debugQuery('State change detected - data exists', {
          hasData: !!newState.data,
          state: newState.data.state,
          hasSeries: !!newState.data.series,
          seriesLength: newState.data.series?.length,
          stateKeys: Object.keys(newState.data),
        });
      } else {
        debugQuery('State change detected - no data property', {
          stateKeys: Object.keys(newState),
        });
      }

      // Check for data availability in multiple ways
      const hasData = newState.data && newState.data.series && newState.data.series.length > 0;
      const isDone = newState.data?.state === 'Done' || newState.data?.state === 'done';
      const isLoading = newState.data?.state === 'Loading' || newState.data?.state === 'loading';
      const isError = newState.data?.state === 'Error' || newState.data?.state === 'error';

      // Log data whenever it's available, regardless of state
      if (hasData) {
        debugData('Query results received', {
          state: newState.data.state,
          seriesCount: newState.data.series?.length || 0,
          series: newState.data.series?.map((df, idx) => {
            const formattedData = formatDataFrame(df); // Includes all rows and values
            return {
              name: df.name || `Query ${idx}`,
              refId: df.refId,
              rowCount: df.length,
              fieldCount: df.fields.length,
              fields: df.fields.map((f) => ({ name: f.name, type: f.type })),
              data: formattedData, // FULL DATA: Array of row objects with all values
            };
          }),
        });
      }

      // Log errors
      if (isError) {
        debugQuery('Query execution failed', {
          error: newState.data?.errors,
          fullState: newState.data,
        });
      }

      // Log loading state for completeness
      if (isLoading) {
        debugQuery('Query loading', {
          state: newState.data?.state,
        });
      }
    });

    // Return combined deactivation function
    return () => {
      unsubscribe.unsubscribe();
      deactivate();
    };
  }
}
