/**
 * NetworkUtilPivotProvider
 *
 * A custom SceneDataProvider that wraps a source query runner returning flat table data
 * (with columns: Time, Chassis, HostName, PortRole, TX, RX) and reshapes it into
 * 4 sets of timeseries frames with refIds A, B, C, D:
 *   - refId A: eCMC-A TX — one timeseries per chassis
 *   - refId B: eCMC-A RX — one timeseries per chassis
 *   - refId C: eCMC-B TX — one timeseries per chassis
 *   - refId D: eCMC-B RX — one timeseries per chassis
 *
 * This produces the same input shape as CPUUtilizationTab's multi-query approach,
 * allowing the standard timeSeriesTable + joinByField pipeline to work.
 */

import {
  SceneObjectBase,
  SceneObjectState,
  SceneDataProvider,
  SceneDataProviderResult,
} from '@grafana/scenes';
import {
  DataFrame,
  FieldType,
  LoadingState,
  PanelData,
  MutableDataFrame,
} from '@grafana/data';
import { Observable, ReplaySubject } from 'rxjs';

export interface NetworkUtilPivotProviderState extends SceneObjectState {
  /** The source data provider (typically LoggingQueryRunner) */
  $data: SceneDataProvider;
  /** Port role to filter by (e.g., 'eth_uplink' or 'eth_uplink_pc') */
  portRole: string;
  /** Current data state (managed internally) */
  data?: PanelData;
}

export class NetworkUtilPivotProvider
  extends SceneObjectBase<NetworkUtilPivotProviderState>
  implements SceneDataProvider
{
  private _sourceSubscription?: { unsubscribe: () => void };
  private _resultsStream = new ReplaySubject<SceneDataProviderResult>(1);

  public constructor(state: NetworkUtilPivotProviderState) {
    super(state);
  }

  public activate(): () => void {
    const deactivate = super.activate();

    const source = this.state.$data;
    if (source) {
      this._sourceSubscription = source.subscribeToState((newState: any) => {
        this.handleSourceDataChange(newState);
      });

      if (!source.isActive) {
        source.activate();
      }
    }

    return () => {
      this._sourceSubscription?.unsubscribe();
      deactivate();
    };
  }

  private handleSourceDataChange(sourceState: any): void {
    const sourceData = sourceState.data as PanelData | undefined;

    if (!sourceData) {
      return;
    }

    // Pass through loading and error states
    if (sourceData.state === LoadingState.Loading || sourceData.state === LoadingState.Error) {
      this.updateData(sourceData);
      return;
    }

    if (sourceData.state === LoadingState.Done && sourceData.series && sourceData.series.length > 0) {
      const pivotedData = this.pivotData(sourceData);
      this.updateData(pivotedData);
    } else {
      this.updateData(sourceData);
    }
  }

  /**
   * Takes flat table frames and reshapes into 4 timeseries frame sets.
   *
   * Input: flat table with columns Time, Chassis, HostName, PortRole, TX, RX
   * Output: 4 sets of timeseries frames (A=eCMC-A TX, B=eCMC-A RX, C=eCMC-B TX, D=eCMC-B RX)
   *         Each set has one frame per chassis, with Time + value fields.
   */
  private pivotData(sourceData: PanelData): PanelData {
    const { portRole } = this.state;

    // Collect all rows from all source frames into a single list
    const allRows: Array<{
      time: number;
      chassis: string;
      hostName: string;
      rowPortRole: string;
      tx: number;
      rx: number;
    }> = [];

    for (const frame of sourceData.series) {
      const timeField = frame.fields.find(f => f.name === 'Time');
      const chassisField = frame.fields.find(f => f.name === 'Chassis');
      const hostNameField = frame.fields.find(f => f.name === 'HostName');
      const portRoleField = frame.fields.find(f => f.name === 'PortRole');
      const txField = frame.fields.find(f => f.name === 'TX');
      const rxField = frame.fields.find(f => f.name === 'RX');

      if (!timeField || !chassisField || !hostNameField || !portRoleField || !txField || !rxField) {
        continue;
      }

      for (let i = 0; i < frame.length; i++) {
        allRows.push({
          time: timeField.values[i],
          chassis: chassisField.values[i],
          hostName: hostNameField.values[i],
          rowPortRole: portRoleField.values[i],
          tx: txField.values[i],
          rx: rxField.values[i],
        });
      }
    }

    // Filter by portRole
    const filtered = allRows.filter(r => r.rowPortRole === portRole);

    // Split by eCMC-A vs eCMC-B (hostName contains "eCMC-A" or "eCMC-B")
    const eCMC_A_rows = filtered.filter(r => r.hostName.includes('eCMC-A'));
    const eCMC_B_rows = filtered.filter(r => r.hostName.includes('eCMC-B'));

    // Get unique chassis names
    const chassisNames = [...new Set(filtered.map(r => r.chassis))].sort();

    // Build 4 sets of timeseries frames
    const frames: DataFrame[] = [];

    // For each chassis, create timeseries frames for each of the 4 combinations
    for (const chassis of chassisNames) {
      // refId A: eCMC-A TX
      const aTxRows = eCMC_A_rows.filter(r => r.chassis === chassis).sort((a, b) => a.time - b.time);
      if (aTxRows.length > 0) {
        frames.push(this.buildTimeseriesFrame('A', chassis, aTxRows.map(r => r.time), aTxRows.map(r => r.tx)));
      }

      // refId B: eCMC-A RX
      const aRxRows = eCMC_A_rows.filter(r => r.chassis === chassis).sort((a, b) => a.time - b.time);
      if (aRxRows.length > 0) {
        frames.push(this.buildTimeseriesFrame('B', chassis, aRxRows.map(r => r.time), aRxRows.map(r => r.rx)));
      }

      // refId C: eCMC-B TX
      const bTxRows = eCMC_B_rows.filter(r => r.chassis === chassis).sort((a, b) => a.time - b.time);
      if (bTxRows.length > 0) {
        frames.push(this.buildTimeseriesFrame('C', chassis, bTxRows.map(r => r.time), bTxRows.map(r => r.tx)));
      }

      // refId D: eCMC-B RX
      const bRxRows = eCMC_B_rows.filter(r => r.chassis === chassis).sort((a, b) => a.time - b.time);
      if (bRxRows.length > 0) {
        frames.push(this.buildTimeseriesFrame('D', chassis, bRxRows.map(r => r.time), bRxRows.map(r => r.rx)));
      }
    }

    return {
      ...sourceData,
      state: LoadingState.Done,
      series: frames,
    };
  }

  private buildTimeseriesFrame(
    refId: string,
    chassis: string,
    times: number[],
    values: number[]
  ): DataFrame {
    return new MutableDataFrame({
      refId,
      fields: [
        { name: 'Time', type: FieldType.time, values: times },
        {
          name: 'Value',
          type: FieldType.number,
          values,
          labels: { Chassis: chassis },
        },
      ],
    });
  }

  private updateData(data: PanelData): void {
    this.setState({ data });
    this._resultsStream.next({
      data,
      origin: this,
    });
  }

  public getResultsStream(): Observable<SceneDataProviderResult> {
    return this._resultsStream.asObservable();
  }

  public setContainerWidth(width: number): void {
    const source = this.state.$data as any;
    if (source && typeof source.setContainerWidth === 'function') {
      source.setContainerWidth(width);
    }
  }

  public isDataReadyToDisplay(): boolean {
    const data = this.state.data;
    return data?.state === LoadingState.Done || data?.state === LoadingState.Streaming;
  }

  public cancelQuery(): void {
    const source = this.state.$data as any;
    if (source && typeof source.cancelQuery === 'function') {
      source.cancelQuery();
    }
  }
}
