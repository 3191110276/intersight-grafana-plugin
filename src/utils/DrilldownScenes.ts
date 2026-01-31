import { DynamicChassisScene, DynamicChassisSceneState } from './DynamicChassisScene';

/**
 * Base class for scenes with host-level drilldown functionality.
 * Extends DynamicChassisScene and adds drillToHost() and exitDrilldown() methods.
 * This eliminates ~15 lines of boilerplate drilldown code per scene.
 */
export abstract class HostDrilldownScene<
  TState extends DynamicChassisSceneState & {
    isDrilldown?: boolean;
    drilldownHost?: string;
  }
> extends DynamicChassisScene<TState> {
  /**
   * Drills down to a specific host's detailed view
   */
  public drillToHost(hostName: string) {
    if (!hostName || !hostName.trim()) {
      return;
    }
    this.setState({
      drilldownHost: hostName,
      isDrilldown: true,
    } as any);
    this.rebuildBody();
  }

  /**
   * Exits drilldown mode and returns to overview
   */
  public exitDrilldown() {
    this.setState({
      drilldownHost: undefined,
      isDrilldown: false,
    } as any);
    this.rebuildBody();
  }
}

/**
 * Base class for scenes with chassis-level drilldown functionality.
 * Extends DynamicChassisScene and adds drillToChassis() and exitDrilldown() methods.
 * This eliminates ~15 lines of boilerplate drilldown code per scene.
 */
export abstract class ChassisDrilldownScene<
  TState extends DynamicChassisSceneState & {
    isDrilldown?: boolean;
    drilldownChassis?: string;
  }
> extends DynamicChassisScene<TState> {
  /**
   * Drills down to a specific chassis's detailed view
   */
  public drillToChassis(chassisName: string) {
    this.setState({
      drilldownChassis: chassisName,
      isDrilldown: true,
    } as any);
    this.rebuildBody();
  }

  /**
   * Exits drilldown mode and returns to overview
   */
  public exitDrilldown() {
    this.setState({
      drilldownChassis: undefined,
      isDrilldown: false,
    } as any);
    this.rebuildBody();
  }
}
