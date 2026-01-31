import React from 'react';
import { SceneObjectBase, SceneObjectState, SceneComponentProps } from '@grafana/scenes';

/**
 * State interface for ClickableTableWrapper component
 */
export interface ClickableTableWrapperState extends SceneObjectState {
  /**
   * The table panel to wrap with click functionality
   */
  tablePanel: any;

  /**
   * Callback invoked when a table row is clicked
   * @param value - The text content from the clicked cell
   */
  onRowClick: (value: string) => void;

  /**
   * Zero-based index of the column to extract value from when clicked
   * @default 0 (first column)
   */
  clickColumnIndex?: number;
}

/**
 * ClickableTableWrapper - Makes table rows clickable for drilldown navigation
 *
 * Wraps a Grafana table panel to enable row-level click interactions. When a user
 * clicks on a table row, it extracts the text from a specified column and invokes
 * the onRowClick callback.
 *
 * Features:
 * - Supports multiple Grafana table rendering strategies (virtualized, non-virtualized)
 * - Configurable column index for value extraction
 * - Visual feedback via pointer cursor
 * - Compatible with Grafana 12+ virtualized tables
 *
 * @example
 * ```typescript
 * const tablePanel = PanelBuilders.table()
 *   .setTitle('Power consumption per Host - Click row to drill down')
 *   .setData(dataTransformer)
 *   .build();
 *
 * const clickableTable = new ClickableTableWrapper({
 *   tablePanel: tablePanel,
 *   onRowClick: (hostName: string) => {
 *     scene.drillToHost(hostName);
 *   },
 *   clickColumnIndex: 0, // Extract value from first column
 * });
 * ```
 */
export class ClickableTableWrapper extends SceneObjectBase<ClickableTableWrapperState> {
  public static Component = ClickableTableWrapperRenderer;

  constructor(state: ClickableTableWrapperState) {
    super({
      clickColumnIndex: 0, // Default to first column
      ...state,
    });
  }
}

/**
 * Renderer component for ClickableTableWrapper
 */
function ClickableTableWrapperRenderer({ model }: SceneComponentProps<ClickableTableWrapper>) {
  const { tablePanel, onRowClick, clickColumnIndex = 0 } = model.useState();

  /**
   * Handles click events on the table, extracts the value from the target column,
   * and invokes the onRowClick callback
   */
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Find the row element using multiple strategies
    let row = (event.target as HTMLElement).closest('[role="row"]');

    // Fallback: try standard table selectors for non-virtualized tables
    if (!row) {
      row = (event.target as HTMLElement).closest('tr');
    }

    if (!row) {
      return;
    }

    // Extract the cell value using the configured column index
    const cellValue = extractCellValue(row, clickColumnIndex);

    if (cellValue) {
      onRowClick(cellValue);
    }
  };

  return (
    <div onClick={handleClick} style={{ cursor: 'pointer', width: '100%', height: '100%' }}>
      <tablePanel.Component model={tablePanel} />
    </div>
  );
}

/**
 * Extracts text content from a table cell at the specified column index
 *
 * Supports multiple Grafana table rendering strategies:
 * - Grafana 12+ virtualized tables with role="cell"
 * - Legacy tables with role="gridcell" and aria-colindex
 * - Standard HTML tables with <td> elements
 *
 * @param row - The table row element
 * @param columnIndex - Zero-based index of the column to extract from
 * @returns The trimmed text content of the cell, or null if not found
 */
function extractCellValue(row: Element, columnIndex: number): string | null {
  // Strategy 1: Grafana 12+ virtualized tables use role="cell"
  // These tables render cells as divs with role="cell"
  const virtualizedCells = row.querySelectorAll('[role="cell"]');
  if (virtualizedCells.length > columnIndex) {
    const text = virtualizedCells[columnIndex].textContent?.trim();
    if (text) {
      return text;
    }
  }

  // Strategy 2: Legacy Grafana tables use role="gridcell" with aria-colindex
  // aria-colindex is 1-based, so we need to add 1 to our 0-based index
  const ariaColIndex = columnIndex + 1;
  const gridCell = row.querySelector(`[role="gridcell"][aria-colindex="${ariaColIndex}"]`);
  if (gridCell) {
    const text = gridCell.textContent?.trim();
    if (text) {
      return text;
    }
  }

  // Strategy 3: Fallback to standard HTML table cells (non-virtualized)
  const standardCells = row.querySelectorAll('td');
  if (standardCells.length > columnIndex) {
    const text = standardCells[columnIndex].textContent?.trim();
    if (text) {
      return text;
    }
  }

  return null;
}
