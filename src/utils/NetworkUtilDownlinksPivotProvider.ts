/**
 * NetworkUtilDownlinksPivotProvider
 *
 * A custom SceneDataProvider that wraps a source query runner returning flat table data
 * (with columns: Time, Chassis, HostName, PortRole, TX, RX) and reshapes it into
 * 2 sets of timeseries frames with refIds A, B:
 *   - refId A: TX (aggregated across eCMC-A and eCMC-B) — one timeseries per chassis
 *   - refId B: RX (aggregated across eCMC-A and eCMC-B) — one timeseries per chassis
 *
 * This differs from NetworkUtilPivotProvider which produces 4 refIds (separate A/B).
 * For downlinks, we aggregate across both eCMCs to show per-slot/host utilization.
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

export interface NetworkUtilDownlinksPivotProviderState extends SceneObjectState {
  /** The source data provider (typically LoggingQueryRunner) */
  $data: SceneDataProvider;
  /** Port role to filter by (e.g., 'host_port') */
  portRole: string;
  /** Current data state (managed internally) */
  data?: PanelData;
}

export class NetworkUtilDownlinksPivotProvider
  extends SceneObjectBase<NetworkUtilDownlinksPivotProviderState>
  implements SceneDataProvider
{
  private _sourceSubscription?: { unsubscribe: () => void };
  private _resultsStream = new ReplaySubject<SceneDataProviderResult>(1);

  public constructor(state: NetworkUtilDownlinksPivotProviderState) {
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
   * Takes flat table frames and reshapes into 2 timeseries frame sets.
   *
   * Input: flat table with columns Time, Chassis, PortName, PortRole, TX, RX
   * Output: 2 sets of timeseries frames (A=TX, B=RX)
   *         Each set has one frame per (chassis, slot), with Chassis and Server fields.
   */
  private pivotData(sourceData: PanelData): PanelData {
    const { portRole } = this.state;

    // Port name to slot mapping
    const portToSlotMap: Record<string, string> = {
      'Ethernet1/1/5': 'Slot 1',
      'Ethernet1/1/6': 'Slot 4',
      'Ethernet1/1/7': 'Slot 5',
      'Ethernet1/1/8': 'Slot 2',
      'Ethernet1/1/9': 'Slot 3',
    };

    // Collect all rows from all source frames into a single list
    const allRows: Array<{
      time: number;
      chassis: string;
      portName: string;
      rowPortRole: string;
      tx: number;
      rx: number;
    }> = [];

    for (const frame of sourceData.series) {
      const timeField = frame.fields.find(f => f.name === 'Time');
      const chassisField = frame.fields.find(f => f.name === 'Chassis');
      const portNameField = frame.fields.find(f => f.name === 'PortName');
      const portRoleField = frame.fields.find(f => f.name === 'PortRole');
      const txField = frame.fields.find(f => f.name === 'TX');
      const rxField = frame.fields.find(f => f.name === 'RX');

      if (!timeField || !chassisField || !portNameField || !portRoleField || !txField || !rxField) {
        continue;
      }

      for (let i = 0; i < frame.length; i++) {
        allRows.push({
          time: timeField.values[i],
          chassis: chassisField.values[i],
          portName: portNameField.values[i],
          rowPortRole: portRoleField.values[i],
          tx: txField.values[i],
          rx: rxField.values[i],
        });
      }
    }

    // Filter by portRole and map port names to slots
    const filtered = allRows
      .filter(r => r.rowPortRole === portRole && portToSlotMap[r.portName])
      .map(r => ({
        ...r,
        slot: portToSlotMap[r.portName],
      }));

    // Get unique (chassis, slot) combinations
    const chassisSlotPairs = new Set<string>();
    filtered.forEach(r => {
      chassisSlotPairs.add(`${r.chassis}|||${r.slot}`);
    });

    // Build 2 sets of timeseries frames (TX and RX per chassis/slot)
    const frames: DataFrame[] = [];

    for (const pair of Array.from(chassisSlotPairs).sort()) {
      const [chassis, slot] = pair.split('|||');

      // refId A: TX for this chassis and slot
      const txRows = filtered
        .filter(r => r.chassis === chassis && r.slot === slot)
        .sort((a, b) => a.time - b.time);
      if (txRows.length > 0) {
        frames.push(this.buildTimeseriesFrame('A', chassis, slot, txRows.map(r => r.time), txRows.map(r => r.tx)));
      }

      // refId B: RX for this chassis and slot
      const rxRows = filtered
        .filter(r => r.chassis === chassis && r.slot === slot)
        .sort((a, b) => a.time - b.time);
      if (rxRows.length > 0) {
        frames.push(this.buildTimeseriesFrame('B', chassis, slot, rxRows.map(r => r.time), rxRows.map(r => r.rx)));
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
    server: string,
    times: number[],
    values: number[]
  ): DataFrame {
    // Create composite key for proper joining
    const key = `${chassis}::${server}`;

    return new MutableDataFrame({
      refId,
      fields: [
        { name: 'Time', type: FieldType.time, values: times },
        {
          name: 'Value',
          type: FieldType.number,
          values,
          labels: {
            key: key,
            Chassis: chassis,
            Server: server,
          },
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
