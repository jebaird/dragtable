# Migrating from dragtable v3 (jQuery) to v4 (Web Component)

dragtable v4 is a native Web Component with no jQuery dependency. This guide covers everything you need to move an existing v3 integration to v4.

---

## Table of contents

- [Why upgrade?](#why-upgrade)
- [Installation](#installation)
- [Quick comparison](#quick-comparison)
- [HTML changes](#html-changes)
- [Initialization](#initialization)
- [Options / configuration](#options--configuration)
- [Events](#events)
- [API methods](#api-methods)
- [CSS / styles](#css--styles)
- [Removing jQuery](#removing-jquery)
- [Feature parity notes](#feature-parity-notes)

---

## Why upgrade?

| | v3 (jQuery widget) | v4 (Web Component) |
|---|---|---|
| Dependencies | jQuery + jQuery UI | None |
| Bundle size | ~90 KB (jQuery) + ~30 KB (jQuery UI) | ~12 KB (3.4 KB gzipped) |
| Browser support | IE 8+ | All modern browsers (Chrome, Firefox, Safari, Edge) |
| Module format | Global / AMD | ES module + UMD |
| TypeScript | ❌ | ✅ Full typings |

---

## Installation

**v3**
```html
<script src="jquery.js"></script>
<script src="jquery-ui.js"></script>
<link  rel="stylesheet" href="dragtable-default.css">
<script src="jquery.dragtable.js"></script>
```

**v4 – CDN / script tag (unpkg)**
```html
<script type="module" src="https://unpkg.com/dragtable@4/dist/dragtable.js"></script>
```

**v4 – CDN / script tag (jsDelivr)**
```html
<script type="module" src="https://cdn.jsdelivr.net/npm/dragtable@4/dist/dragtable.js"></script>
```

**v4 – npm**
```bash
npm install dragtable@4
```
```js
import 'dragtable'; // registers <drag-table> automatically
```

---

## Quick comparison

### v3
```html
<table id="my-table">
  <thead>
    <tr>
      <th data-header="name">Name</th>
      <th data-header="age">Age</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Alice</td><td>30</td></tr>
  </tbody>
</table>

<script>
  $('#my-table').dragtable();
</script>
```

### v4
```html
<drag-table>
  <table>
    <thead>
      <tr>
        <th data-header="name">Name</th>
        <th data-header="age">Age</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Alice</td><td>30</td></tr>
    </tbody>
  </table>
</drag-table>

<script type="module" src="dragtable.js"></script>
```

---

## HTML changes

In v3 you called `$('.my-table').dragtable()` directly on the `<table>` element.

In v4 you **wrap** the `<table>` with a `<drag-table>` custom element. No JavaScript initialization call is needed — the component activates as soon as it is connected to the DOM.

```diff
- <table id="my-table" data-header="name">
+ <drag-table>
+   <table>
      <thead>
        <tr>
          <th data-header="name">Name</th>
        </tr>
      </thead>
      ...
+   </table>
+ </drag-table>
```

---

## Initialization

**v3** – explicit jQuery call:
```js
$('#my-table').dragtable({ scroll: true });
```

**v4** – declarative HTML attributes:
```html
<drag-table scroll="true">
  <table>...</table>
</drag-table>
```

Or set options programmatically via attributes after the fact:
```js
const el = document.querySelector('drag-table');
el.setAttribute('scroll', 'true');
```

---

## Options / configuration

All v3 options that are relevant to the Web Component are supported. They are now set as **HTML attributes** on `<drag-table>` instead of an options object.

| v3 option | v4 attribute | Default | Notes |
|---|---|---|---|
| `dataHeader` | `data-header` | `"data-header"` | Attribute name on `<th>` that identifies a column |
| `handle` | `handle` | `"dragtable-drag-handle"` | Class name for optional drag handles |
| `items` | `items` | `"th:not(:has(.dragtable-drag-handle)), .dragtable-drag-handle"` | Drag target selector |
| `boundary` | `boundary` | `"dragtable-drag-boundary"` | Class that prevents dragging past that column |
| `placeholder` | `placeholder` | `"dragtable-col-placeholder"` | Class applied to the original column during drag |
| `scroll` | `scroll` | `"false"` | `"true"` to auto-scroll the container during drag |
| `appendTarget` | _(automatic)_ | parent element | In v4 the drag clone is always appended to the table's parent; this option is not configurable |

### v3
```js
$('#my-table').dragtable({
  dataHeader: 'data-col',
  handle:     'my-handle',
  scroll:     true
});
```

### v4
```html
<drag-table data-header="data-col" handle="my-handle" scroll="true">
  <table>...</table>
</drag-table>
```

---

## Events

Event names have changed slightly and the event system has moved from jQuery's custom event mechanism to native `CustomEvent`.

| v3 event | v4 event | Cancelable |
|---|---|---|
| `dragtablestart` | `dragtable-start` | No |
| `dragtablebeforeChange` | `dragtable-beforechange` | **Yes** – `preventDefault()` cancels the swap |
| `dragtablechange` | `dragtable-change` | No |
| `dragtablestop` | `dragtable-stop` | No |

### v3
```js
$('#my-table')
  .dragtable()
  .on('dragtablechange', function(event, ui) {
    console.log('order:', ui.order);
  })
  .on('dragtablebeforeChange', function(event, ui) {
    // Return false to cancel
    return false;
  });
```

### v4
```js
const el = document.querySelector('drag-table');

el.addEventListener('dragtable-change', (e) => {
  console.log('order:', e.detail.order);
});

el.addEventListener('dragtable-beforechange', (e) => {
  // Call preventDefault() to cancel the column swap
  e.preventDefault();
});
```

### Event detail object

Both v3 `ui` data and v4 `e.detail` expose the same fields:

| Field | Type | Description |
|---|---|---|
| `column` | `HTMLElement[]` | All cells in the column being dragged |
| `order` | `string[]` | Current column order (array of `data-header` values) |
| `startIndex` | `number` | Original column index when drag started |
| `endIndex` | `number` | Current column index during/after drag |
| `dragDisplay` | `HTMLElement \| null` | The floating drag clone element |
| `columnOffset` | `{ left, top }` | Position of the dragged column |

---

## API methods

### `order()` – get current column order

**v3**
```js
var order = $('#my-table').dragtable('order');
// → ['name', 'age', 'city']
```

**v4**
```js
const order = document.querySelector('drag-table').order();
// → ['name', 'age', 'city']
```

### `order(newOrder)` – set column order

**v3**
```js
$('#my-table').dragtable('order', ['city', 'name', 'age']);
```

**v4**
```js
document.querySelector('drag-table').order(['city', 'name', 'age']);
// Returns the element for chaining:
document.querySelector('drag-table').order(['city', 'name', 'age']).order();
```

### `destroy()` – tear down the widget

**v3**
```js
$('#my-table').dragtable('destroy');
```

**v4** – remove the `<drag-table>` wrapper from the DOM. All event listeners are cleaned up automatically via `disconnectedCallback`.
```js
const el = document.querySelector('drag-table');
const table = el.querySelector('table');
el.replaceWith(table); // unwrap — listeners cleaned up automatically
```

---

## CSS / styles

In v3 you had to include `dragtable-default.css` manually.

In v4 the required drag styles are **injected automatically** into `<head>` the first time a `<drag-table>` element connects to the DOM. No separate CSS file is needed.

The injected class names are the same as in v3:

| Class | Purpose |
|---|---|
| `.dragtable-drag-handle` | Marks a drag handle element |
| `.dragtable-drag-wrapper` | The absolutely-positioned drag clone container |
| `.dragtable-drag-col` | The `<table>` inside the drag clone |
| `.dragtable-col-placeholder` | Applied to original column cells during drag |
| `.dragtable-drag-boundary` | Prevents dragging past this column |

Custom styling still works the same way — add these classes to your own stylesheet to override defaults.

---

## Removing jQuery

Once you have migrated all `dragtable` usages to v4, you can remove the jQuery and jQuery UI dependencies from your project entirely (provided nothing else depends on them).

```diff
- <script src="jquery.js"></script>
- <script src="jquery-ui.js"></script>
- <link rel="stylesheet" href="jquery-ui.css">
- <script src="jquery.dragtable.js"></script>
- <link rel="stylesheet" href="dragtable-default.css">
+ <script type="module" src="dragtable.js"></script>
```

---

## Feature parity notes

- **`appendTarget` option** — v3 let you specify where the drag clone is appended. In v4 it is always appended to the direct parent of the `<table>`. Ensure the parent element is `position: relative` if you need accurate positioning.
- **Touch support** — v3 relied on jQuery UI's touchPunch adapter for touch events. v4 uses mouse events only. Touch/pointer event support can be added in a future release.
- **IE support** — v4 targets modern browsers only (Chrome 67+, Firefox 63+, Safari 10.1+, Edge 79+). IE is not supported.
- **`notdraggable` class** — columns with the class `notdraggable` on their `<th>` cannot be dragged. This behaviour is preserved in v4.
