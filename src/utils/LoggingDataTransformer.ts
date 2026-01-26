import { SceneDataTransformer } from '@grafana/scenes';
import { debugTransform, debugData, formatDataFrame } from './debug';

/**
 * Extended SceneDataTransformer that logs transformation pipeline
 * operations when debug mode is enabled.
 *
 * Usage: Replace SceneDataTransformer with LoggingDataTransformer in tab components
 */
export class LoggingDataTransformer extends SceneDataTransformer {
  public activate() {
    // Log transformation pipeline start
    debugTransform('Transformation pipeline started', {
      transformationCount: this.state.transformations.length,
      transformations: this.state.transformations.map((t: any) => ({
        id: t.id || t.operator || 'unknown',
        options: t.options || {},
      })),
    });

    // Call parent activate
    const deactivate = super.activate();

    debugTransform('Setting up state subscription', {
      initialDataExists: !!this.state.data,
      initialStateKeys: Object.keys(this.state),
    });

    // Subscribe to output data with FULL DATA
    const unsubscribe = this.subscribeToState((newState) => {
      // Debug: Log ALL state changes to diagnose subscription
      debugTransform('State callback triggered', {
        hasDataProperty: 'data' in newState,
        dataValue: newState.data ? 'exists' : 'null/undefined',
        allStateKeys: Object.keys(newState),
      });

      // Debug: Log raw state structure to understand what we're receiving
      if (newState.data) {
        debugTransform('State change detected - data exists', {
          hasData: !!newState.data,
          state: newState.data.state,
          hasSeries: !!newState.data.series,
          seriesLength: newState.data.series?.length,
          stateKeys: Object.keys(newState.data),
        });
      } else {
        debugTransform('State change detected - no data property', {
          stateKeys: Object.keys(newState),
        });
      }

      // Check for data availability in multiple ways
      const hasData = newState.data && newState.data.series && newState.data.series.length > 0;
      const isDone = newState.data?.state === 'Done' as any || newState.data?.state === 'done' as any;
      const isLoading = newState.data?.state === 'Loading' as any || newState.data?.state === 'loading' as any;
      const isError = newState.data?.state === 'Error' as any || newState.data?.state === 'error' as any;

      // Log data whenever it's available, regardless of state
      if (hasData) {
        debugData('Transformation output', {
          state: newState.data?.state,
          seriesCount: newState.data?.series?.length || 0,
          series: newState.data?.series?.map((df, idx) => {
            const formattedData = formatDataFrame(df); // Includes all rows and values
            return {
              name: df.name || `Transformed ${idx}`,
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
        debugTransform('Transformation failed', {
          error: newState.data?.errors,
          fullState: newState.data,
        });
      }

      // Log loading state for completeness
      if (isLoading) {
        debugTransform('Transformation loading', {
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
