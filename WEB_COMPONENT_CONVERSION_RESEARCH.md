# Web Component Conversion Research: Dragtable

## Executive Summary

This document outlines the research findings and recommendations for converting the dragtable jQuery UI widget into a native Web Component. The conversion is **feasible but represents a significant rewrite** rather than a simple port, as it involves moving from a jQuery plugin paradigm to native browser APIs.

---

## Current Architecture Analysis

### Technology Stack (Current)
- **jQuery** (1.7.2+) - DOM manipulation, event handling, `delegate()`, `bind()`, `unbind()`
- **jQuery UI** (1.8.16+) - Widget factory (`$.widget()`)
- **CSS** - Standard styling for drag visualization

### Key Dependencies on jQuery/jQuery UI
1. **Widget Factory Pattern** (`$.widget("jb.dragtable", {...})`)
   - Automatic option management
   - Lifecycle methods (`_create`, `_destroy`, `_setOption`)
   - Event triggering (`_trigger`)
   - Method chaining

2. **jQuery Methods Used**
   - `$.each()` - iteration
   - `.delegate()` / `.bind()` / `.unbind()` - event delegation
   - `.css()` - style manipulation
   - `.addClass()` / `.removeClass()` - class manipulation
   - `.find()` / `.filter()` / `.eq()` / `.closest()` - DOM traversal
   - `.position()` / `.offset()` / `.outerWidth()` - geometry
   - `.disableSelection()` / `.enableSelection()` - jQuery UI utilities
   - `.appendTo()` / `.remove()` - DOM manipulation
   - `.attr()` / `.data()` - attribute access

3. **Widget Size**
   - ~593 lines of JavaScript
   - ~51 lines of CSS

---

## Web Component Conversion Approach

### Recommended Approach: Custom Element with Shadow DOM

```javascript
class DragTable extends HTMLElement {
  // Custom element implementation
}
customElements.define('drag-table', DragTable);
```

### Two Possible Strategies

#### Strategy 1: Wrapper Component (Lower Effort)
Create a Web Component that wraps an existing `<table>` element:

```html
<drag-table>
  <table>
    <thead>...</thead>
    <tbody>...</tbody>
  </table>
</drag-table>
```

**Pros:**
- Works with existing table markup
- Easier to adopt incrementally
- Light DOM means standard table accessibility

**Cons:**
- Cannot use Shadow DOM for style encapsulation
- Must carefully manage slotted content

#### Strategy 2: Full Encapsulation (Higher Effort, Better Architecture)
Create a fully encapsulated component that renders its own table:

```html
<drag-table columns='["Name", "Age", "City"]' data='[...]'></drag-table>
```

**Pros:**
- Full Shadow DOM encapsulation
- Complete control over rendering
- Better for framework integration

**Cons:**
- Requires passing data via attributes/properties
- More complex implementation
- May need additional APIs for complex tables

### Recommended: Strategy 1 (Wrapper Component)

For backward compatibility and easier migration, the wrapper approach is recommended.

---

## Detailed Conversion Mapping

### 1. Widget Factory → Custom Element Lifecycle

| jQuery UI Widget | Web Component |
|------------------|---------------|
| `$.widget("jb.dragtable", {...})` | `class DragTable extends HTMLElement` |
| `_create()` | `connectedCallback()` |
| `_destroy()` | `disconnectedCallback()` |
| `_setOption()` | `attributeChangedCallback()` + setters |
| `this.element` | `this` or `this.querySelector('table')` |
| `this.options` | `this.getAttribute()` or class properties |

### 2. Event System Conversion

| jQuery UI Events | Web Component Equivalent |
|------------------|--------------------------|
| `this._trigger('start', e, data)` | `this.dispatchEvent(new CustomEvent('dragtable-start', { detail: data, bubbles: true }))` |
| `.delegate(selector, 'mousedown', fn)` | `addEventListener('mousedown', fn)` + manual delegation |
| `.bind('mousemove', fn)` | `document.addEventListener('mousemove', fn)` |
| `.unbind('mousemove')` | `document.removeEventListener('mousemove', fn)` |

### 3. DOM Manipulation Conversion

| jQuery | Native API |
|--------|------------|
| `$(selector)` | `document.querySelector(selector)` |
| `$el.find(sel)` | `el.querySelectorAll(sel)` |
| `$el.closest(sel)` | `el.closest(sel)` |
| `$el.addClass('x')` | `el.classList.add('x')` |
| `$el.removeClass('x')` | `el.classList.remove('x')` |
| `$el.hasClass('x')` | `el.classList.contains('x')` |
| `$el.css('prop', val)` | `el.style.prop = val` |
| `$el.attr('name')` | `el.getAttribute('name')` |
| `$el.position()` | `el.getBoundingClientRect()` (with adjustments) |
| `$el.outerWidth()` | `el.offsetWidth` |
| `$el.appendTo(target)` | `target.appendChild(el)` |
| `$el.remove()` | `el.remove()` |
| `$.each(arr, fn)` | `arr.forEach(fn)` |

### 4. jQuery UI Specific Methods

```javascript
// jQuery UI disableSelection
// Replace with CSS: user-select: none
el.style.userSelect = 'none';

// jQuery UI enableSelection
el.style.userSelect = '';
```

---

## Implementation Skeleton

```javascript
class DragTable extends HTMLElement {
  static get observedAttributes() {
    return ['data-header', 'handle', 'items', 'boundary', 'placeholder', 'scroll'];
  }

  constructor() {
    super();
    
    // Default options
    this._options = {
      dataHeader: 'data-header',
      handle: 'dragtable-drag-handle',
      items: 'th:not(:has(.dragtable-drag-handle)), .dragtable-drag-handle',
      boundary: 'dragtable-drag-boundary',
      placeholder: 'dragtable-col-placeholder',
      scroll: false
    };
    
    // State
    this._startIndex = null;
    this._endIndex = null;
    this._currentColumnCollection = [];
    this._currentColumnCollectionOffset = {};
    this._dragDisplay = null;
    this._table = null;
    
    // Bound handlers for proper cleanup
    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
  }

  connectedCallback() {
    this._table = this.querySelector('table');
    if (!this._table) {
      console.warn('DragTable: No <table> element found');
      return;
    }
    
    // Inject styles
    this._injectStyles();
    
    // Set up event delegation
    this._table.addEventListener('mousedown', this._onMouseDown);
  }

  disconnectedCallback() {
    this._table?.removeEventListener('mousedown', this._onMouseDown);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
    this._cleanup();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    const camelName = name.replace(/-([a-z])/g, g => g[1].toUpperCase());
    this._options[camelName] = newValue === 'true' ? true : 
                               newValue === 'false' ? false : newValue;
  }

  // Public API
  order(newOrder) {
    if (newOrder === undefined) {
      return this._getOrder();
    } else {
      this._setOrder(newOrder);
      return this;
    }
  }

  // Private methods would follow...
  _handleMouseDown(e) { /* ... */ }
  _handleMouseMove(e) { /* ... */ }
  _handleMouseUp(e) { /* ... */ }
  _getCol(index) { /* ... */ }
  _dropCol() { /* ... */ }
  _swapCol(to) { /* ... */ }
  _getCells(table, index) { /* ... */ }
  _swapCells(a, b) { /* ... */ }
  _getOrder() { /* ... */ }
  _setOrder(order) { /* ... */ }
  _emitEvent(name, detail) { /* ... */ }
  _injectStyles() { /* ... */ }
  _cleanup() { /* ... */ }
}

customElements.define('drag-table', DragTable);
```

---

## CSS Strategy

### Option A: Adoptable Stylesheets (Modern)
```javascript
const styles = new CSSStyleSheet();
styles.replaceSync(`
  .dragtable-drag-handle { cursor: move; }
  .dragtable-drag-wrapper { position: absolute; z-index: 1000; }
  /* ... */
`);

// In connectedCallback:
document.adoptedStyleSheets = [...document.adoptedStyleSheets, styles];
```

### Option B: Injected `<style>` tag (Broader Support)
```javascript
_injectStyles() {
  if (document.getElementById('dragtable-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'dragtable-styles';
  style.textContent = `/* CSS here */`;
  document.head.appendChild(style);
}
```

### Option C: External CSS (Current approach, still works)
Users include `dragtable-default.css` in their HTML.

---

## Browser Compatibility

### Web Components Support
| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Custom Elements v1 | 67+ | 63+ | 10.1+ | 79+ |
| Shadow DOM v1 | 53+ | 63+ | 10+ | 79+ |
| Adopted Stylesheets | 73+ | 101+ | 16.4+ | 79+ |

### Polyfills (for IE11/older browsers)
- [@webcomponents/webcomponentsjs](https://github.com/webcomponents/polyfills/tree/master/packages/webcomponentsjs)

**Note:** IE11 support would require polyfills and transpilation. Given that IE11 is deprecated, this is likely not a priority.

---

## Effort Estimation

### Development Tasks

| Task | Estimated Hours | Complexity |
|------|-----------------|------------|
| Core element structure & lifecycle | 4-6 | Medium |
| Mouse event handling (down/move/up) | 6-8 | Medium-High |
| Column detection & cell gathering | 4-6 | Medium |
| Drag display creation & positioning | 6-8 | High |
| Column swapping logic | 4-6 | Medium |
| Scroll handling | 2-4 | Medium |
| Event system (CustomEvents) | 2-3 | Low |
| Public API (order get/set) | 2-3 | Low |
| CSS injection/handling | 1-2 | Low |
| Option/attribute handling | 2-3 | Low |
| Testing | 8-12 | Medium |
| Documentation | 4-6 | Low |
| **Total** | **45-67 hours** | |

### Estimated Timeline
- **Minimum Viable Product:** 2-3 weeks (one developer)
- **Production Ready:** 4-6 weeks (including testing and documentation)

---

## Migration Path for Existing Users

### Phase 1: Dual Support
Ship both versions, document migration path:

```html
<!-- Old way (jQuery) -->
<script src="jquery.js"></script>
<script src="jquery-ui.js"></script>
<script src="jquery.dragtable.js"></script>
<script>$('table').dragtable();</script>

<!-- New way (Web Component) -->
<script src="dragtable.js" type="module"></script>
<drag-table>
  <table>...</table>
</drag-table>
```

### Phase 2: API Parity
Ensure all options and events work the same way:

```javascript
// jQuery
$('#table').dragtable({ scroll: true });
$('#table').on('dragtablestop', callback);
$('#table').dragtable('order'); // get
$('#table').dragtable('order', ['a', 'b']); // set

// Web Component
<drag-table scroll="true">...</drag-table>
document.querySelector('drag-table').addEventListener('dragtable-stop', callback);
document.querySelector('drag-table').order(); // get  
document.querySelector('drag-table').order(['a', 'b']); // set
```

---

## Challenges & Considerations

### 1. **No `disableSelection()` Equivalent**
jQuery UI's `disableSelection()` uses browser-specific techniques. In Web Components:
```javascript
document.body.style.userSelect = 'none';
// Plus event.preventDefault() on selectstart
```

### 2. **Position Calculations**
jQuery's `.position()` accounts for offset parents automatically. Native `getBoundingClientRect()` returns viewport-relative coordinates. Additional math needed:
```javascript
const rect = el.getBoundingClientRect();
const parentRect = el.offsetParent.getBoundingClientRect();
const position = {
  left: rect.left - parentRect.left,
  top: rect.top - parentRect.top
};
```

### 3. **Event Delegation Pattern**
jQuery's `.delegate()` is powerful. Native alternative:
```javascript
table.addEventListener('mousedown', (e) => {
  const handle = e.target.closest('th, .dragtable-drag-handle');
  if (handle) {
    // Handle drag start
  }
});
```

### 4. **Framework Integration**
Consider providing wrapper packages for popular frameworks:
- **React:** `<DragTable>` component
- **Vue:** `<drag-table>` component  
- **Angular:** Module with directive

### 5. **TypeScript Support**
Provide TypeScript definitions:
```typescript
interface DragTableOptions {
  dataHeader?: string;
  handle?: string;
  // ...
}

interface DragTableEventDetail {
  column: HTMLElement[];
  order: string[];
  startIndex: number;
  endIndex: number;
}

declare class DragTable extends HTMLElement {
  order(): string[];
  order(newOrder: string[]): this;
}
```

---

## Alternative Approaches Considered

### 1. **Lit Element**
Using Google's Lit library for Web Components:
```javascript
import { LitElement, html, css } from 'lit';

class DragTable extends LitElement {
  static styles = css`...`;
  render() { return html`<slot></slot>`; }
}
```

**Pros:** Reactive properties, declarative templates, smaller boilerplate
**Cons:** Additional dependency (~5KB gzipped)

### 2. **Stencil**
Using Ionic's Stencil compiler:
```typescript
@Component({ tag: 'drag-table' })
export class DragTable {
  @Prop() scroll: boolean = false;
  @Event() dragtableStop: EventEmitter;
}
```

**Pros:** JSX, TypeScript, generates framework wrappers automatically
**Cons:** Build tooling required, larger bundle

### 3. **Vanilla Custom Element (Recommended)**
No framework dependency, smallest bundle size, best for a library.

---

## Recommendations

### Short-term (Recommended First Steps)
1. Create a new branch `web-component`
2. Set up a modern build system (Vite, Rollup, or esbuild)
3. Write TypeScript implementation for better maintainability
4. Start with core drag functionality, add features incrementally
5. Create comprehensive test suite with Web Test Runner or Playwright

### File Structure Suggestion
```
dragtable/
├── src/
│   ├── dragtable.ts          # Main Web Component
│   ├── dragtable.css         # Styles
│   ├── types.ts              # TypeScript interfaces
│   └── utils.ts              # Helper functions
├── dist/
│   ├── dragtable.js          # ES Module
│   ├── dragtable.umd.js      # UMD bundle (for CDN/script tags)
│   └── dragtable.d.ts        # Type definitions
├── legacy/
│   └── jquery.dragtable.js   # Keep original for existing users
├── test/
│   └── dragtable.test.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### Package.json Additions
```json
{
  "name": "dragtable",
  "version": "4.0.0",
  "type": "module",
  "main": "dist/dragtable.umd.js",
  "module": "dist/dragtable.js",
  "types": "dist/dragtable.d.ts",
  "exports": {
    ".": {
      "import": "./dist/dragtable.js",
      "require": "./dist/dragtable.umd.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "web-test-runner"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "@web/test-runner": "^0.18.0"
  }
}
```

---

## Conclusion

Converting dragtable to a Web Component is **feasible and worthwhile** for long-term maintainability, removing the jQuery dependency, and enabling use in modern frameworks. The estimated effort is **45-67 hours** of development time.

The recommended approach is:
1. **Vanilla Custom Element** (no framework dependency)
2. **Wrapper pattern** (wraps existing `<table>` elements)
3. **TypeScript** for better maintainability
4. **Dual distribution** (ES modules + UMD for CDN)
5. **Keep legacy jQuery version** in a separate directory for existing users

### Next Steps
1. ✅ Research complete (this document)
2. ✅ Set up modern build tooling (Vite, TypeScript)
3. ✅ Implement core functionality (`<drag-table>` custom element)
4. ✅ Create demo page with usage examples
5. ⬜ Add comprehensive tests
6. ⬜ Document migration path
7. ⬜ Release v4.0.0
