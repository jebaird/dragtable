/**
 * DragTable Web Component
 * 
 * A native Web Component for drag-and-drop table column reordering.
 * Converted from the jQuery UI widget: https://github.com/jebaird/dragtable
 * 
 * @version 4.0.0
 * @license MIT
 * @author Jesse Baird <jebaird@gmail.com>
 */

export interface DragTableOptions {
  /** Attribute name for column headers (default: 'data-header') */
  dataHeader: string;
  /** Class name for drag handles (default: 'dragtable-drag-handle') */
  handle: string;
  /** Selector for draggable items */
  items: string;
  /** Class name for boundary columns that can't be dragged past */
  boundary: string;
  /** Class name applied to placeholder cells during drag */
  placeholder: string;
  /** Enable scroll when dragging past boundaries */
  scroll: boolean;
}

export interface DragTableEventDetail {
  /** Array of column cells being dragged */
  column: HTMLElement[];
  /** Current column order (array of header names) */
  order: string[];
  /** Starting index of the dragged column */
  startIndex: number;
  /** Ending index of the dragged column */
  endIndex: number;
  /** The drag display element */
  dragDisplay: HTMLElement | null;
  /** Current offset position of the column */
  columnOffset: { left: number; top: number };
}

// Default styles for the drag table
const DRAGTABLE_STYLES = `
.dragtable-drag-handle {
  cursor: move;
}

.dragtable-drag-wrapper {
  position: absolute;
  z-index: 1000;
}

.dragtable-drag-wrapper .dragtable-drag-col {
  opacity: 0.7;
  cursor: move;
}

.dragtable-col-placeholder {
  border-left: 1px dotted black;
  border-right: 1px dotted black;
  color: #EFEFEF;
  background: #EFEFEF !important;
  visibility: visible !important;
}

table .dragtable-col-placeholder:first-child {
  border-top: 1px dotted black;
}

.dragtable-col-placeholder * {
  opacity: 0.0;
  visibility: hidden;
}
`;

interface CellCollection {
  semantic: {
    head: HTMLElement[];
    body: HTMLElement[];
    foot: HTMLElement[];
  };
  array: HTMLElement[];
}

export class DragTable extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['data-header', 'handle', 'items', 'boundary', 'placeholder', 'scroll'];
  }

  private _options: DragTableOptions;
  private _startIndex: number | null = null;
  private _endIndex: number | null = null;
  private _currentColumnCollection: HTMLElement[] = [];
  private _currentColumnCollectionOffset: { left: number; top: number } = { left: 0, top: 0 };
  private _dragDisplay: HTMLElement | null = null;
  private _table: HTMLTableElement | null = null;
  private _appendTarget: HTMLElement | null = null;
  
  // Bound event handlers for cleanup
  private _boundMouseDown: (e: MouseEvent) => void;
  private _boundMouseMove: ((e: MouseEvent) => void) | null = null;
  private _boundMouseUp: ((e: MouseEvent) => void) | null = null;

  constructor() {
    super();

    this._options = {
      dataHeader: 'data-header',
      handle: 'dragtable-drag-handle',
      items: 'th:not(:has(.dragtable-drag-handle)), .dragtable-drag-handle',
      boundary: 'dragtable-drag-boundary',
      placeholder: 'dragtable-col-placeholder',
      scroll: false
    };

    this._boundMouseDown = this._handleMouseDown.bind(this);
  }

  connectedCallback(): void {
    this._table = this.querySelector('table');
    if (!this._table) {
      console.warn('DragTable: No <table> element found inside <drag-table>');
      return;
    }

    this._appendTarget = this._table.parentElement || document.body;

    // Inject styles if not already present
    this._injectStyles();

    // Set up event delegation on the table
    this._table.addEventListener('mousedown', this._boundMouseDown);
  }

  disconnectedCallback(): void {
    if (this._table) {
      this._table.removeEventListener('mousedown', this._boundMouseDown);
    }
    this._cleanup();
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    if (newValue === null) return;
    
    switch (name) {
      case 'data-header':
        this._options.dataHeader = newValue;
        break;
      case 'handle':
        this._options.handle = newValue;
        break;
      case 'items':
        this._options.items = newValue;
        break;
      case 'boundary':
        this._options.boundary = newValue;
        break;
      case 'placeholder':
        this._options.placeholder = newValue;
        break;
      case 'scroll':
        this._options.scroll = newValue === 'true';
        break;
    }
  }

  // Public API

  /**
   * Get or set the current column order
   * @param newOrder - Optional array of column names to set
   * @returns Array of column names if getting, or this for chaining if setting
   */
  order(newOrder?: string[]): string[] | this {
    if (newOrder === undefined) {
      return this._getOrder();
    } else {
      this._setOrder(newOrder);
      return this;
    }
  }

  // Private methods

  private _injectStyles(): void {
    const styleId = 'dragtable-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = DRAGTABLE_STYLES;
    document.head.appendChild(style);
  }

  private _handleMouseDown(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (!target || !this._table) return;

    // Check if we clicked on a draggable item
    let handle = target.closest('th') as HTMLElement | null;
    const dragHandle = target.closest(`.${this._options.handle}`) as HTMLElement | null;

    if (dragHandle) {
      handle = dragHandle.closest('th');
    } else if (!handle) {
      return; // Not a valid drag target
    }

    if (!handle) return;

    // Check if the column is not draggable
    if (handle.classList.contains('notdraggable')) return;

    const index = this._getCellIndex(handle);
    if (index === -1) return;

    // Get the column and create drag display
    this._getCol(index);

    if (!this._dragDisplay || !this._appendTarget) return;

    const tablePosition = this._table.getBoundingClientRect();
    const parentPosition = this._appendTarget.getBoundingClientRect();

    this._dragDisplay.style.top = `${tablePosition.top - parentPosition.top + this._appendTarget.scrollTop}px`;
    this._dragDisplay.style.left = `${this._currentColumnCollectionOffset.left + this._appendTarget.scrollLeft}px`;
    this._appendTarget.appendChild(this._dragDisplay);

    // Disable text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'move';

    // Emit start event
    this._emitEvent('dragtable-start', e);

    // Set up mousemove and mouseup handlers
    this._setupDragHandlers(e);
  }

  private _setupDragHandlers(initialEvent: MouseEvent): void {
    let prevMouseX = initialEvent.pageX;
    const dragDisplayWidth = this._dragDisplay?.offsetWidth || 0;
    const halfDragDisplayWidth = dragDisplayWidth / 2;
    const colCount = this._getColumnCount() - 1;

    this._boundMouseMove = (e: MouseEvent) => {
      if (!this._dragDisplay || !this._appendTarget) return;

      const mouseXDiff = e.pageX - prevMouseX;
      const currentLeft = parseInt(this._dragDisplay.style.left) || 0;
      const newLeft = currentLeft + mouseXDiff;
      
      this._dragDisplay.style.left = `${newLeft}px`;

      // Update column offset
      this._setCurrentColumnCollectionOffset();
      const columnPos = this._currentColumnCollectionOffset;

      // Handle scrolling
      if (this._options.scroll && this._appendTarget) {
        const appendTarget = this._appendTarget;
        if (e.pageX < prevMouseX) {
          // Moving left - scroll left
          if (newLeft < (appendTarget.clientWidth - dragDisplayWidth)) {
            appendTarget.scrollLeft += mouseXDiff;
          }
        } else {
          // Moving right - scroll right
          if (newLeft > (appendTarget.clientWidth - dragDisplayWidth)) {
            appendTarget.scrollLeft += mouseXDiff;
          }
        }
      }

      // Determine if we should swap columns
      if (e.pageX < prevMouseX) {
        // Moving left
        const threshold = columnPos.left - halfDragDisplayWidth;
        if (newLeft < threshold && this._startIndex !== null && this._startIndex > 0) {
          this._swapCol(this._startIndex - 1);
        }
      } else {
        // Moving right
        const threshold = columnPos.left + halfDragDisplayWidth;
        if (newLeft > threshold && this._startIndex !== null && this._startIndex < colCount) {
          this._swapCol(this._startIndex + 1);
        }
      }

      prevMouseX = e.pageX;
    };

    this._boundMouseUp = (e: MouseEvent) => {
      this._stop(e);
    };

    document.addEventListener('mousemove', this._boundMouseMove);
    document.addEventListener('mouseup', this._boundMouseUp, { once: true });
  }

  private _stop(e: MouseEvent): void {
    // Remove event listeners
    if (this._boundMouseMove) {
      document.removeEventListener('mousemove', this._boundMouseMove);
      this._boundMouseMove = null;
    }

    // Re-enable text selection
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    // Clean up drag display
    this._dropCol();
    if (this._dragDisplay) {
      this._dragDisplay.remove();
      this._dragDisplay = null;
    }

    // Emit stop event
    this._emitEvent('dragtable-stop', e);
  }

  private _cleanup(): void {
    if (this._boundMouseMove) {
      document.removeEventListener('mousemove', this._boundMouseMove);
    }
    if (this._boundMouseUp) {
      document.removeEventListener('mouseup', this._boundMouseUp);
    }
    if (this._dragDisplay) {
      this._dragDisplay.remove();
    }
  }

  private _getCellIndex(cell: HTMLElement): number {
    const row = cell.parentElement as HTMLTableRowElement;
    if (!row) return -1;
    return Array.from(row.cells).indexOf(cell as HTMLTableCellElement);
  }

  private _getColumnCount(): number {
    if (!this._table) return 0;
    const thead = this._table.querySelector('thead');
    if (!thead) return 0;
    const firstRow = thead.querySelector('tr');
    if (!firstRow) return 0;
    return firstRow.querySelectorAll('th').length;
  }

  private _getCells(index: number): CellCollection {
    const result: CellCollection = {
      semantic: {
        head: [],
        body: [],
        foot: []
      },
      array: []
    };

    if (!this._table || index < 0) return result;

    const rows = this._table.rows;
    for (let i = 0; i < rows.length; i++) {
      const cell = rows[i].cells[index] as HTMLElement | undefined;
      if (!cell) continue;

      result.array.push(cell);

      const parentNodeName = cell.parentElement?.parentElement?.nodeName.toLowerCase();
      if (parentNodeName === 'thead') {
        result.semantic.head.push(cell);
      } else if (parentNodeName === 'tbody') {
        result.semantic.body.push(cell);
      } else if (parentNodeName === 'tfoot') {
        result.semantic.foot.push(cell);
      }
    }

    return result;
  }

  private _getCol(index: number): void {
    if (!this._table) return;

    this._startIndex = this._endIndex = index;

    const cells = this._getCells(index);
    this._currentColumnCollection = cells.array;

    // Create drag display
    const wrapper = document.createElement('div');
    wrapper.className = 'dragtable-drag-wrapper';

    const table = document.createElement('table');
    // Copy table attributes
    Array.from(this._table.attributes).forEach(attr => {
      table.setAttribute(attr.name, attr.value);
    });
    table.classList.add('dragtable-drag-col');

    // Build the drag display table structure
    const createSection = (sectionName: string, cells: HTMLElement[]): HTMLElement | null => {
      if (cells.length === 0) return null;
      const section = document.createElement(sectionName);
      cells.forEach(cell => {
        const clone = cell.cloneNode(true) as HTMLElement;
        cell.classList.add(this._options.placeholder);
        const tr = document.createElement('tr');
        tr.appendChild(clone);
        section.appendChild(tr);
      });
      return section;
    };

    const thead = createSection('thead', cells.semantic.head);
    const tbody = createSection('tbody', cells.semantic.body);
    const tfoot = createSection('tfoot', cells.semantic.foot);

    if (thead) table.appendChild(thead);
    if (tbody) table.appendChild(tbody);
    if (tfoot) table.appendChild(tfoot);

    wrapper.appendChild(table);
    this._dragDisplay = wrapper;

    // Set width to match original column
    if (this._currentColumnCollection[0]) {
      this._dragDisplay.style.width = `${this._currentColumnCollection[0].offsetWidth}px`;
    }

    this._setCurrentColumnCollectionOffset();
  }

  private _setCurrentColumnCollectionOffset(): { left: number; top: number } {
    if (this._currentColumnCollection.length === 0 || !this._appendTarget) {
      return this._currentColumnCollectionOffset;
    }

    const cell = this._currentColumnCollection[0];
    const cellRect = cell.getBoundingClientRect();
    const parentRect = this._appendTarget.getBoundingClientRect();

    this._currentColumnCollectionOffset = {
      left: cellRect.left - parentRect.left + this._appendTarget.scrollLeft,
      top: cellRect.top - parentRect.top + this._appendTarget.scrollTop
    };

    return this._currentColumnCollectionOffset;
  }

  private _swapCol(to: number): void {
    if (this._startIndex === null || to === this._startIndex) return;

    // Check boundary
    const headers = this._table?.querySelectorAll('thead th');
    if (!headers) return;

    const targetTh = headers[to] as HTMLElement | undefined;
    if (!targetTh) return;

    // Check if target is a boundary
    if (targetTh.classList.contains(this._options.boundary)) return;
    
    // Check if handle is a boundary
    const handleEl = targetTh.querySelector(`.${this._options.handle}`);
    if (handleEl?.classList.contains(this._options.boundary)) return;

    // Emit beforeChange event (can be cancelled)
    const beforeChangeEvent = new CustomEvent('dragtable-beforechange', {
      detail: this._getEventDetail(),
      bubbles: true,
      cancelable: true
    });
    
    if (!this.dispatchEvent(beforeChangeEvent)) return;

    const from = this._startIndex;
    this._endIndex = to;

    // Swap cells
    if (from < to) {
      // Moving right
      for (let i = from; i < to; i++) {
        const row2 = this._getCells(i + 1);
        for (let j = 0; j < row2.array.length; j++) {
          this._swapCells(this._currentColumnCollection[j], row2.array[j]);
        }
      }
    } else {
      // Moving left
      for (let i = from; i > to; i--) {
        const row2 = this._getCells(i - 1);
        for (let j = 0; j < row2.array.length; j++) {
          this._swapCells(row2.array[j], this._currentColumnCollection[j]);
        }
      }
    }

    // Emit change event
    this._emitEvent('dragtable-change', null);

    this._startIndex = this._endIndex;
  }

  private _swapCells(a: HTMLElement, b: HTMLElement): void {
    if (!a.parentNode) {
      console.warn('DragTable: Cannot swap cells - parent node not found');
      return;
    }
    a.parentNode.insertBefore(b, a);
  }

  private _dropCol(): void {
    // Remove placeholder class from all cells
    this._currentColumnCollection.forEach(cell => {
      cell.classList.remove(this._options.placeholder);
    });
  }

  private _getOrder(): string[] {
    if (!this._table) return [];

    const headers = this._table.querySelectorAll('thead tr:first-child th');
    const order: string[] = [];

    headers.forEach((th) => {
      const header = th.getAttribute(this._options.dataHeader);
      if (header) {
        order.push(header);
      } else {
        order.push(th.textContent || '');
      }
    });

    return order;
  }

  private _setOrder(order: string[]): void {
    if (!this._table) return;

    // Use the live header count for the length check
    const initialCount = this._table.querySelectorAll('thead tr:first-child th').length;
    if (order.length !== initialCount) return;

    for (let i = 0; i < order.length; i++) {
      // Re-query the live DOM on every iteration. A static NodeList snapshot
      // would return stale indices after the first swap, causing subsequent
      // iterations to reference incorrect column positions.
      const currentHeaders = Array.from(
        this._table.querySelectorAll('thead tr:first-child th')
      );

      const startIdx = currentHeaders.findIndex(
        th => th.getAttribute(this._options.dataHeader) === order[i]
      );

      if (startIdx !== -1 && startIdx !== i) {
        this._startIndex = startIdx;
        this._currentColumnCollection = this._getCells(startIdx).array;
        this._swapCol(i);
      }
    }
  }

  private _getEventDetail(): DragTableEventDetail {
    return {
      column: this._currentColumnCollection,
      order: this._getOrder(),
      startIndex: this._startIndex ?? 0,
      endIndex: this._endIndex ?? 0,
      dragDisplay: this._dragDisplay,
      columnOffset: this._currentColumnCollectionOffset
    };
  }

  private _emitEvent(name: string, originalEvent: Event | null): void {
    const event = new CustomEvent(name, {
      detail: {
        ...this._getEventDetail(),
        originalEvent
      },
      bubbles: true
    });
    this.dispatchEvent(event);
  }
}

// Register the custom element
customElements.define('drag-table', DragTable);

// Export for module usage
export default DragTable;
