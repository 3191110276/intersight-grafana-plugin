import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
} from '@grafana/scenes';
import { LoggingQueryRunner } from '../../utils/LoggingQueryRunner';

export function getHomeSceneBody() {
  // Query runners for each entity type count
  const domainsQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
      refId: 'A',
      queryType: 'infinity',
      type: 'json',
      source: 'url',
      parser: 'backend',
      format: 'table',
      url: `/api/v1/network/ElementSummaries?$top=0&$count=true&$filter=ManagementMode eq 'Intersight' and endswith(Name, ' FI-A')`,
      root_selector: '$.Count',
      columns: [],
      url_options: { method: 'GET', data: '' },
    }],
  });

  const standaloneQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
      refId: 'A',
      queryType: 'infinity',
      type: 'json',
      source: 'url',
      parser: 'backend',
      format: 'table',
      url: `/api/v1/compute/RackUnits?$top=0&$count=true&$filter=ManagementMode eq 'IntersightStandalone' and not(startswith(Model,'HX')) and Vendor eq 'Cisco Systems Inc'`,
      root_selector: '$.Count',
      columns: [],
      url_options: { method: 'GET', data: '' },
    }],
  });

  const unifiedEdgeQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
      refId: 'A',
      queryType: 'infinity',
      type: 'json',
      source: 'url',
      parser: 'backend',
      format: 'table',
      url: `/api/v1/equipment/Chasses?$top=0&$count=true&$filter=Model eq 'UCSXE-9305'`,
      root_selector: '$.Count',
      columns: [],
      url_options: { method: 'GET', data: '' },
    }],
  });

  // Domains stat panel - Blue background
  const domainsStat = PanelBuilders.stat()
    .setTitle('Domains')
    .setMenu(undefined)
    .setData(domainsQueryRunner)
    .setOption('graphMode', 'none' as any)
    .setOption('textMode', 'value' as any)
    .setOption('colorMode', 'background' as any)
    .setOption('orientation', 'vertical' as any)
    .setOption('textSize' as any, {
      title: 14,
      value: 32,
    })
    .setOption('showThresholdLabels' as any, false as any)
    .setOption('showThresholdMarkers' as any, false as any)
    .setOverrides((builder) => {
      builder.matchFieldsWithNameByRegex('.*')
        // @ts-ignore
        .overrideCustomFieldConfig('noValue', '0')
        .overrideColor({
          mode: 'fixed',
          fixedColor: '#3274D9',
        });
      return builder.build();
    })
    .build();

  // Standalone stat panel - Green background
  const standaloneStat = PanelBuilders.stat()
    .setTitle('Standalone')
    .setMenu(undefined)
    .setData(standaloneQueryRunner)
    .setOption('graphMode', 'none' as any)
    .setOption('textMode', 'value' as any)
    .setOption('colorMode', 'background' as any)
    .setOption('orientation', 'vertical' as any)
    .setOption('textSize' as any, {
      title: 14,
      value: 32,
    })
    .setOption('showThresholdLabels' as any, false as any)
    .setOption('showThresholdMarkers' as any, false as any)
    .setOverrides((builder) => {
      builder.matchFieldsWithNameByRegex('.*')
        // @ts-ignore
        .overrideCustomFieldConfig('noValue', '0')
        .overrideColor({
          mode: 'fixed',
          fixedColor: '#37872D',
        });
      return builder.build();
    })
    .build();

  // Unified Edge stat panel - Purple background
  const unifiedEdgeStat = PanelBuilders.stat()
    .setTitle('Unified Edge')
    .setMenu(undefined)
    .setData(unifiedEdgeQueryRunner)
    .setOption('graphMode', 'none' as any)
    .setOption('textMode', 'value' as any)
    .setOption('colorMode', 'background' as any)
    .setOption('orientation', 'vertical' as any)
    .setOption('textSize' as any, {
      title: 14,
      value: 32,
    })
    .setOption('showThresholdLabels' as any, false as any)
    .setOption('showThresholdMarkers' as any, false as any)
    .setOverrides((builder) => {
      builder.matchFieldsWithNameByRegex('.*')
        // @ts-ignore
        .overrideCustomFieldConfig('noValue', '0')
        .overrideColor({
          mode: 'fixed',
          fixedColor: '#8F3BB8',
        });
      return builder.build();
    })
    .build();

  // Welcome text panel
  const welcomePanel = PanelBuilders.text()
    .setTitle('')
    .setOption('content', `# Welcome to the Cisco Intersight Plugin for Grafana

Select an Account datasource above to view your infrastructure.
Use the tabs to explore IMM Domains, Standalone servers, and Unified Edge devices.`)
    .setOption('mode', 'markdown' as any)
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      // Welcome text row
      new SceneFlexItem({
        height: 130,
        body: welcomePanel,
      }),
      // Stats row
      new SceneFlexItem({
        height: 150,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ body: domainsStat }),
            new SceneFlexItem({ body: standaloneStat }),
            new SceneFlexItem({ body: unifiedEdgeStat }),
          ],
        }),
      }),
    ],
  });
}
