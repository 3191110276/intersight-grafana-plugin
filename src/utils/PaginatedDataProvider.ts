/**
 * Paginated Data Provider
 *
 * A custom SceneDataProvider that wraps existing query runners and automatically
 * handles OData pagination for Intersight API queries. When a query returns
 * exactly 1000 results (the API limit), it fetches additional pages with $skip
 * parameter and merges them.
 *
 * Usage:
 * ```typescript
 * const queryRunner = new LoggingQueryRunner({
 *   datasource: { uid: '${Account}' },
 *   queries: [{ url: '/api/v1/compute/RackUnits?$filter=...' }],
 * });
 *
 * const paginatedData = new PaginatedDataProvider({
 *   $data: queryRunner,
 *   pageSize: 1000,
 *   maxPages: 10,
 * });
 *
 * const panel = PanelBuilders.table()
 *   .setData(paginatedData)
 *   .build();
 * ```
 */

import {
  SceneObjectBase,
  SceneObjectState,
  SceneDataProvider,
  SceneDataProviderResult,
  sceneGraph,
} from '@grafana/scenes';
import { DataFrame, LoadingState, PanelData } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { lastValueFrom, Observable, ReplaySubject } from 'rxjs';
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_MAX_PAGES,
  shouldFetchMorePages,
  mergeDataFrames,
  addPaginationParams,
  extractUrlFromQuery,
  extractResultsFromResponse,
  resultsToDataFrame,
} from './paginationHelpers';
import { debugQuery, debugData } from './debug';

/**
 * State interface for PaginatedDataProvider
 */
export interface PaginatedDataProviderState extends SceneObjectState {
  /** The source data provider (typically LoggingQueryRunner) */
  $data: SceneDataProvider;
  /** Page size - number of records per page (default: 1000) */
  pageSize?: number;
  /** Maximum pages to fetch - safety limit (default: 10, max 10000 records) */
  maxPages?: number;
  /** Current data state (managed internally) */
  data?: PanelData;
}

/**
 * PaginatedDataProvider - Wraps a SceneDataProvider and handles pagination
 *
 * This provider:
 * 1. Subscribes to the source data provider
 * 2. When data arrives with exactly pageSize rows, fetches additional pages
 * 3. Merges all pages into a single result
 * 4. Emits the merged data to consumers
 */
export class PaginatedDataProvider
  extends SceneObjectBase<PaginatedDataProviderState>
  implements SceneDataProvider
{
  private _sourceSubscription?: { unsubscribe: () => void };
  private _resultsStream = new ReplaySubject<SceneDataProviderResult>(1);

  public constructor(state: PaginatedDataProviderState) {
    super({
      pageSize: DEFAULT_PAGE_SIZE,
      maxPages: DEFAULT_MAX_PAGES,
      ...state,
    });
  }

  /**
   * Activates the provider and sets up subscription to source data
   */
  public activate(): () => void {
    const deactivate = super.activate();

    debugQuery('PaginatedDataProvider activated', {
      pageSize: this.state.pageSize,
      maxPages: this.state.maxPages,
    });

    // Subscribe to source data provider
    const source = this.state.$data;
    if (source) {
      this._sourceSubscription = source.subscribeToState((newState: any) => {
        this.handleSourceDataChange(newState);
      });

      // Activate the source if not already active
      if (!source.isActive) {
        source.activate();
      }
    }

    return () => {
      this._sourceSubscription?.unsubscribe();
      deactivate();
    };
  }

  /**
   * Handles data changes from the source provider
   */
  private async handleSourceDataChange(sourceState: any): Promise<void> {
    const sourceData = sourceState.data as PanelData | undefined;

    if (!sourceData) {
      return;
    }

    // Pass through loading and error states immediately
    if (sourceData.state === LoadingState.Loading) {
      this.updateData(sourceData);
      return;
    }

    if (sourceData.state === LoadingState.Error) {
      this.updateData(sourceData);
      return;
    }

    // Check if we have data that might need pagination
    if (sourceData.state === LoadingState.Done && sourceData.series && sourceData.series.length > 0) {
      const firstFrame = sourceData.series[0];
      const pageSize = this.state.pageSize || DEFAULT_PAGE_SIZE;

      debugQuery('PaginatedDataProvider received data', {
        frameLength: firstFrame.length,
        pageSize,
        needsPagination: shouldFetchMorePages(firstFrame, pageSize),
      });

      // Check if pagination is needed
      if (shouldFetchMorePages(firstFrame, pageSize)) {
        await this.fetchAdditionalPages(sourceData, firstFrame);
      } else {
        // No pagination needed, pass through as-is
        this.updateData(sourceData);
      }
    } else {
      // Pass through empty or other states
      this.updateData(sourceData);
    }
  }

  /**
   * Fetches additional pages and merges with existing data
   */
  private async fetchAdditionalPages(sourceData: PanelData, firstFrame: DataFrame): Promise<void> {
    const pageSize = this.state.pageSize || DEFAULT_PAGE_SIZE;
    const maxPages = this.state.maxPages || DEFAULT_MAX_PAGES;
    const source = this.state.$data as any;

    // Get query configuration from source
    const queries = source?.state?.queries;
    if (!queries || queries.length === 0) {
      debugQuery('PaginatedDataProvider: No queries found in source');
      this.updateData(sourceData);
      return;
    }

    const query = queries[0];
    const baseUrl = extractUrlFromQuery(query);

    if (!baseUrl) {
      debugQuery('PaginatedDataProvider: Could not extract URL from query');
      this.updateData(sourceData);
      return;
    }

    // Get datasource UID
    const datasourceRef = source?.state?.datasource;
    let datasourceUid: string | undefined;

    if (typeof datasourceRef === 'string') {
      datasourceUid = datasourceRef;
    } else if (datasourceRef?.uid) {
      // Handle variable reference like '${Account}'
      datasourceUid = datasourceRef.uid;
      if (datasourceUid?.startsWith('${') && datasourceUid?.endsWith('}')) {
        // Resolve variable
        const varName = datasourceUid.slice(2, -1);
        try {
          const variable = sceneGraph.lookupVariable(varName, this);
          if (variable && (variable as any).state?.current?.value) {
            datasourceUid = (variable as any).state.current.value;
          }
        } catch {
          // Variable lookup failed, try to use as-is
        }
      }
    }

    if (!datasourceUid) {
      debugQuery('PaginatedDataProvider: Could not resolve datasource UID');
      this.updateData(sourceData);
      return;
    }

    debugQuery('PaginatedDataProvider: Fetching additional pages', {
      baseUrl,
      datasourceUid,
      pageSize,
      maxPages,
    });

    // Set loading state while fetching additional pages
    this.updateData({
      ...sourceData,
      state: LoadingState.Loading,
    });

    try {
      const allFrames: DataFrame[] = [firstFrame];
      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages && currentPage < maxPages) {
        const skip = currentPage * pageSize;
        const paginatedUrl = addPaginationParams(baseUrl, skip, pageSize);

        debugQuery(`PaginatedDataProvider: Fetching page ${currentPage + 1}`, {
          url: paginatedUrl,
          skip,
        });

        try {
          const response = await lastValueFrom(
            getBackendSrv().fetch({
              url: `/api/datasources/proxy/uid/${datasourceUid}${paginatedUrl}`,
              method: 'GET',
            })
          );

          const results = extractResultsFromResponse(response.data, query.root_selector);

          if (results.length === 0) {
            hasMorePages = false;
            debugQuery(`PaginatedDataProvider: Page ${currentPage + 1} empty, stopping`);
          } else {
            // Convert results to DataFrame
            const pageFrame = resultsToDataFrame(results, query.columns);
            allFrames.push(pageFrame);

            debugQuery(`PaginatedDataProvider: Page ${currentPage + 1} fetched`, {
              resultsCount: results.length,
              hasMorePages: results.length === pageSize,
            });

            // Check if there might be more pages
            hasMorePages = results.length === pageSize;
            currentPage++;
          }
        } catch (error) {
          debugQuery(`PaginatedDataProvider: Error fetching page ${currentPage + 1}`, { error });
          hasMorePages = false;
        }
      }

      // Merge all frames
      const mergedFrame = mergeDataFrames(allFrames);

      debugData('PaginatedDataProvider: Merged results', {
        totalPages: allFrames.length,
        totalRows: mergedFrame.length,
        fieldCount: mergedFrame.fields.length,
      });

      // Emit merged data
      this.updateData({
        ...sourceData,
        state: LoadingState.Done,
        series: [mergedFrame],
      });
    } catch (error) {
      debugQuery('PaginatedDataProvider: Pagination failed', { error });
      // Fall back to original data on error
      this.updateData(sourceData);
    }
  }

  /**
   * Updates data state and emits to results stream
   */
  private updateData(data: PanelData): void {
    this.setState({ data });
    this._resultsStream.next({
      data,
      origin: this,
    });
  }

  /**
   * Returns an observable stream of data results
   * Required by SceneDataProvider interface
   */
  public getResultsStream(): Observable<SceneDataProviderResult> {
    return this._resultsStream.asObservable();
  }

  /**
   * Sets the container width (no-op for this provider)
   * Required by SceneDataProvider interface
   */
  public setContainerWidth(width: number): void {
    // Pass through to source if it supports this
    const source = this.state.$data as any;
    if (source && typeof source.setContainerWidth === 'function') {
      source.setContainerWidth(width);
    }
  }

  /**
   * Checks if queries are being processed
   * Required by SceneDataProvider interface
   */
  public isDataReadyToDisplay(): boolean {
    const data = this.state.data;
    return data?.state === LoadingState.Done || data?.state === LoadingState.Streaming;
  }

  /**
   * Cancels any in-flight queries
   * Required by SceneDataProvider interface
   */
  public cancelQuery(): void {
    const source = this.state.$data as any;
    if (source && typeof source.cancelQuery === 'function') {
      source.cancelQuery();
    }
  }
}
