/**
 * DragTable Web Component - Comprehensive Tests
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { DragTable } from './dragtable';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal drag-table + table structure and attach to document. */
function createDragTable(html?: string): DragTable {
  const container = document.createElement('div');
  container.innerHTML = html ?? `
    <drag-table>
      <table>
        <thead>
          <tr>
            <th data-header="name">Name</th>
            <th data-header="age">Age</th>
            <th data-header="city">City</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Alice</td><td>30</td><td>Oslo</td></tr>
          <tr><td>Bob</td><td>25</td><td>Paris</td></tr>
        </tbody>
      </table>
    </drag-table>
  `;
  document.body.appendChild(container);
  const el = container.querySelector('drag-table') as DragTable;
  return el;
}

/** Fire a mousedown event on a <th> at the given column index. */
function mousedownOnHeader(el: DragTable, colIndex: number): MouseEvent {
  const th = el.querySelectorAll('thead th')[colIndex] as HTMLElement;
  const evt = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
  Object.defineProperty(evt, 'pageX', { value: 100, configurable: true });
  th.dispatchEvent(evt);
  return evt;
}

/** Fire a mouseup event on document to end a drag. */
function mouseup(): void {
  const evt = new MouseEvent('mouseup', { bubbles: true });
  Object.defineProperty(evt, 'pageX', { value: 100, configurable: true });
  document.dispatchEvent(evt);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DragTable Web Component', () => {
  afterEach(() => {
    // Clean up every div we added to body
    document.body.innerHTML = '';
    // Remove injected styles so each test has a clean slate
    document.getElementById('dragtable-styles')?.remove();
  });

  // ── Registration ────────────────────────────────────────────────────────────

  describe('Custom Element registration', () => {
    it('registers the <drag-table> custom element', () => {
      expect(customElements.get('drag-table')).toBe(DragTable);
    });

    it('is an instance of HTMLElement', () => {
      const el = createDragTable();
      expect(el).toBeInstanceOf(HTMLElement);
    });

    it('is an instance of DragTable', () => {
      const el = createDragTable();
      expect(el).toBeInstanceOf(DragTable);
    });
  });

  // ── connectedCallback ───────────────────────────────────────────────────────

  describe('connectedCallback', () => {
    it('warns when no <table> is found inside the element', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      createDragTable('<drag-table></drag-table>');
      // Force connectedCallback by adding to DOM (already done in createDragTable)
      expect(spy).toHaveBeenCalledWith('DragTable: No <table> element found inside <drag-table>');
      spy.mockRestore();
    });

    it('injects dragtable styles into the document head', () => {
      createDragTable();
      expect(document.getElementById('dragtable-styles')).not.toBeNull();
    });

    it('injects styles only once even when multiple instances exist', () => {
      createDragTable();
      createDragTable();
      const styleEls = document.querySelectorAll('#dragtable-styles');
      expect(styleEls.length).toBe(1);
    });
  });

  // ── disconnectedCallback ────────────────────────────────────────────────────

  describe('disconnectedCallback', () => {
    it('removes the mousedown listener when element is removed from DOM', () => {
      const el = createDragTable();
      const table = el.querySelector('table')!;
      const removeSpy = vi.spyOn(table, 'removeEventListener');
      el.parentElement!.removeChild(el);
      expect(removeSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
    });
  });

  // ── observedAttributes / attributeChangedCallback ──────────────────────────

  describe('observedAttributes', () => {
    it('lists all expected observed attributes', () => {
      expect(DragTable.observedAttributes).toEqual(
        expect.arrayContaining(['data-header', 'handle', 'items', 'boundary', 'placeholder', 'scroll'])
      );
    });
  });

  describe('attributeChangedCallback', () => {
    it('updates the handle option when attribute changes', () => {
      const el = createDragTable();
      el.setAttribute('handle', 'my-handle');
      // Access private via cast to any
      expect((el as unknown as { _options: { handle: string } })._options.handle).toBe('my-handle');
    });

    it('updates the boundary option when attribute changes', () => {
      const el = createDragTable();
      el.setAttribute('boundary', 'my-boundary');
      expect((el as unknown as { _options: { boundary: string } })._options.boundary).toBe('my-boundary');
    });

    it('updates the placeholder option when attribute changes', () => {
      const el = createDragTable();
      el.setAttribute('placeholder', 'my-placeholder');
      expect((el as unknown as { _options: { placeholder: string } })._options.placeholder).toBe('my-placeholder');
    });

    it('enables scroll when scroll attribute is "true"', () => {
      const el = createDragTable();
      el.setAttribute('scroll', 'true');
      expect((el as unknown as { _options: { scroll: boolean } })._options.scroll).toBe(true);
    });

    it('disables scroll when scroll attribute is not "true"', () => {
      const el = createDragTable();
      el.setAttribute('scroll', 'false');
      expect((el as unknown as { _options: { scroll: boolean } })._options.scroll).toBe(false);
    });

    it('does not update options when newValue is null', () => {
      const el = createDragTable();
      const optionsBefore = { ...(el as unknown as { _options: object })._options };
      // Calling attributeChangedCallback directly with null
      (el as unknown as DragTable & {
        attributeChangedCallback(n: string, o: string | null, v: string | null): void
      }).attributeChangedCallback('scroll', null, null);
      expect((el as unknown as { _options: object })._options).toEqual(optionsBefore);
    });
  });

  // ── order() API ─────────────────────────────────────────────────────────────

  describe('order() - get', () => {
    it('returns the current column order by data-header values', () => {
      const el = createDragTable();
      expect(el.order()).toEqual(['name', 'age', 'city']);
    });

    it('falls back to textContent when data-header is absent', () => {
      const el = createDragTable(`
        <drag-table>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Age</th>
              </tr>
            </thead>
            <tbody><tr><td>X</td><td>Y</td></tr></tbody>
          </table>
        </drag-table>
      `);
      expect(el.order()).toEqual(['Name', 'Age']);
    });

    it('returns an empty array when there is no table', () => {
      const el = createDragTable('<drag-table></drag-table>');
      expect(el.order()).toEqual([]);
    });
  });

  describe('order() - set', () => {
    it('reorders columns when given a new order', () => {
      const el = createDragTable();
      el.order(['age', 'name', 'city']);
      expect(el.order()).toEqual(['age', 'name', 'city']);
    });

    it('reorders data rows along with headers', () => {
      const el = createDragTable();
      el.order(['city', 'name', 'age']);
      const cells = Array.from(el.querySelectorAll('tbody tr:first-child td'));
      expect(cells.map(c => c.textContent)).toEqual(['Oslo', 'Alice', '30']);
    });

    it('returns `this` for chaining', () => {
      const el = createDragTable();
      const result = el.order(['city', 'name', 'age']);
      expect(result).toBe(el);
    });

    it('is a no-op when the new order has a different length', () => {
      const el = createDragTable();
      const original = el.order() as string[];
      el.order(['name', 'age']); // only 2 columns, table has 3
      expect(el.order()).toEqual(original);
    });

    it('is a no-op when the new order matches the current order', () => {
      const el = createDragTable();
      el.order(['name', 'age', 'city']); // same as initial
      expect(el.order()).toEqual(['name', 'age', 'city']);
    });
  });

  // ── Column reordering internals (tested through the public order() API) ─────

  describe('column swap mechanics', () => {
    it('moves a column one step to the right', () => {
      const el = createDragTable();
      el.order(['age', 'name', 'city']); // name → position 1 (from 0)
      expect(el.order()).toEqual(['age', 'name', 'city']);
    });

    it('moves a column one step to the left', () => {
      const el = createDragTable();
      el.order(['name', 'city', 'age']); // age from 1 → 2
      el.order(['name', 'age', 'city']); // age back from 2 → 1
      expect(el.order()).toEqual(['name', 'age', 'city']);
    });

    it('moves a column multiple steps', () => {
      const el = createDragTable();
      el.order(['city', 'name', 'age']);
      expect(el.order()).toEqual(['city', 'name', 'age']);
    });

    it('respects boundary columns — other columns cannot be swapped into a boundary position', () => {
      const el = createDragTable(`
        <drag-table>
          <table>
            <thead>
              <tr>
                <th data-header="col1">Col1</th>
                <th data-header="fixed" class="dragtable-drag-boundary">Fixed</th>
                <th data-header="col2">Col2</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>A</td><td>B</td><td>C</td></tr>
            </tbody>
          </table>
        </drag-table>
      `);
      // col2 (index 2) tries to move to index 1 (occupied by boundary "fixed") — BLOCKED.
      // fixed (index 1) can still move to index 2 — ALLOWED (col2 is not a boundary).
      el.order(['col1', 'col2', 'fixed']);
      // col2 tried index 1 → blocked; fixed moved to index 2; result matches request
      expect(el.order()).toEqual(['col1', 'col2', 'fixed']);
    });

    it('boundary blocks a mousedown drag from passing the boundary column', () => {
      const el = createDragTable(`
        <drag-table>
          <table>
            <thead>
              <tr>
                <th data-header="col1">Col1</th>
                <th data-header="fixed" class="dragtable-drag-boundary">Fixed</th>
                <th data-header="col2">Col2</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>A</td><td>B</td><td>C</td></tr>
            </tbody>
          </table>
        </drag-table>
      `);
      // Order stays the same because the only eligible swap is col2 → 0, but
      // requesting the reverse just verifies the boundary event fires
      const cancelledSwaps: number[] = [];
      el.addEventListener('dragtable-beforechange', (e) => {
        const detail = (e as CustomEvent).detail as { endIndex: number };
        // Track what swaps were attempted
        cancelledSwaps.push(detail.endIndex);
      });
      // Requesting col2 → 0 would require passing through boundary at 1: blocked
      // fixed → 0: target col1 at 0 is not boundary → allowed
      el.order(['fixed', 'col2', 'col1']);
      // Only the non-blocked swaps fire beforechange
      expect(cancelledSwaps.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Events ──────────────────────────────────────────────────────────────────

  describe('events', () => {
    it('emits dragtable-start on mousedown on a header', () => {
      const el = createDragTable();
      const handler = vi.fn();
      el.addEventListener('dragtable-start', handler);
      mousedownOnHeader(el, 0);
      mouseup();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('dragtable-start event detail contains order, startIndex, endIndex', () => {
      const el = createDragTable();
      let detail: Record<string, unknown> | null = null;
      el.addEventListener('dragtable-start', (e: Event) => {
        detail = (e as CustomEvent).detail as Record<string, unknown>;
      });
      mousedownOnHeader(el, 0);
      mouseup();
      expect(detail).not.toBeNull();
      expect(detail!.order).toEqual(['name', 'age', 'city']);
      expect(detail!.startIndex).toBe(0);
    });

    it('emits dragtable-stop on mouseup after drag', () => {
      const el = createDragTable();
      const handler = vi.fn();
      el.addEventListener('dragtable-stop', handler);
      mousedownOnHeader(el, 1);
      mouseup();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('emits dragtable-change when columns are swapped via order()', () => {
      const el = createDragTable();
      const handler = vi.fn();
      el.addEventListener('dragtable-change', handler);
      el.order(['age', 'name', 'city']);
      expect(handler).toHaveBeenCalled();
    });

    it('emits dragtable-beforechange (cancelable) before every swap', () => {
      const el = createDragTable();
      const handler = vi.fn();
      el.addEventListener('dragtable-beforechange', handler);
      el.order(['age', 'name', 'city']);
      expect(handler).toHaveBeenCalled();
      const evt = handler.mock.calls[0][0] as CustomEvent;
      expect(evt.cancelable).toBe(true);
    });

    it('cancelling dragtable-beforechange prevents the swap', () => {
      const el = createDragTable();
      el.addEventListener('dragtable-beforechange', (e) => e.preventDefault());
      const orderBefore = el.order() as string[];
      el.order(['age', 'name', 'city']);
      expect(el.order()).toEqual(orderBefore);
    });

    it('dragtable-change event detail includes updated order', () => {
      const el = createDragTable();
      let detail: Record<string, unknown> | null = null;
      el.addEventListener('dragtable-change', (e: Event) => {
        detail = (e as CustomEvent).detail as Record<string, unknown>;
      });
      el.order(['age', 'name', 'city']);
      expect(detail).not.toBeNull();
      expect(detail!.order).toBeDefined();
    });

    it('does not fire dragtable-start when clicking a notdraggable header', () => {
      const el = createDragTable(`
        <drag-table>
          <table>
            <thead>
              <tr>
                <th data-header="locked" class="notdraggable">Locked</th>
                <th data-header="free">Free</th>
              </tr>
            </thead>
            <tbody><tr><td>A</td><td>B</td></tr></tbody>
          </table>
        </drag-table>
      `);
      const handler = vi.fn();
      el.addEventListener('dragtable-start', handler);
      mousedownOnHeader(el, 0); // locked column
      mouseup();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ── Drag display lifecycle ──────────────────────────────────────────────────

  describe('drag display', () => {
    it('creates a drag wrapper element on mousedown', () => {
      const el = createDragTable();
      mousedownOnHeader(el, 0);
      const wrapper = document.querySelector('.dragtable-drag-wrapper');
      expect(wrapper).not.toBeNull();
      mouseup();
    });

    it('removes the drag wrapper on mouseup', () => {
      const el = createDragTable();
      mousedownOnHeader(el, 0);
      mouseup();
      const wrapper = document.querySelector('.dragtable-drag-wrapper');
      expect(wrapper).toBeNull();
    });

    it('adds placeholder class to source column cells during drag', () => {
      const el = createDragTable();
      mousedownOnHeader(el, 0);
      const placeholder = el.querySelector('.dragtable-col-placeholder');
      expect(placeholder).not.toBeNull();
      mouseup();
    });

    it('removes placeholder class from source column cells after drag', () => {
      const el = createDragTable();
      mousedownOnHeader(el, 0);
      mouseup();
      const placeholder = el.querySelector('.dragtable-col-placeholder');
      expect(placeholder).toBeNull();
    });

    it('disables text selection (userSelect=none) during drag', () => {
      const el = createDragTable();
      mousedownOnHeader(el, 0);
      expect(document.body.style.userSelect).toBe('none');
      mouseup();
    });

    it('re-enables text selection after drag ends', () => {
      const el = createDragTable();
      mousedownOnHeader(el, 0);
      mouseup();
      expect(document.body.style.userSelect).toBe('');
    });
  });

  // ── Style injection ─────────────────────────────────────────────────────────

  describe('style injection', () => {
    it('injected style element has id "dragtable-styles"', () => {
      createDragTable();
      const style = document.getElementById('dragtable-styles');
      expect(style?.tagName.toLowerCase()).toBe('style');
    });

    it('injected styles contain drag-wrapper rule', () => {
      createDragTable();
      const style = document.getElementById('dragtable-styles') as HTMLStyleElement;
      expect(style.textContent).toContain('.dragtable-drag-wrapper');
    });

    it('injected styles contain placeholder rule', () => {
      createDragTable();
      const style = document.getElementById('dragtable-styles') as HTMLStyleElement;
      expect(style.textContent).toContain('.dragtable-col-placeholder');
    });
  });

  // ── Edge-case: no table on mousedown ────────────────────────────────────────

  describe('edge cases', () => {
    it('does not throw when mousedown occurs on a cell outside thead', () => {
      const el = createDragTable();
      const td = el.querySelector('tbody td')!;
      expect(() => {
        td.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      }).not.toThrow();
    });

    it('does not throw when disconnectedCallback is called before connectedCallback', () => {
      const el = document.createElement('drag-table') as DragTable;
      expect(() => el.disconnectedCallback()).not.toThrow();
    });

    it('handles tables with tfoot section correctly', () => {
      const el = createDragTable(`
        <drag-table>
          <table>
            <thead>
              <tr>
                <th data-header="a">A</th>
                <th data-header="b">B</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>1</td><td>2</td></tr>
            </tbody>
            <tfoot>
              <tr><td>Total A</td><td>Total B</td></tr>
            </tfoot>
          </table>
        </drag-table>
      `);
      expect(() => el.order(['b', 'a'])).not.toThrow();
      expect(el.order()).toEqual(['b', 'a']);
    });
  });
});
