# Dragtable

**v4 (Web Component — no jQuery)** · [Migration guide from v3 →](MIGRATION.md)

dragtable lets you reorder table columns via drag and drop.

## v4 — Web Component (recommended)

A native Web Component with no jQuery dependency.

```html
<!-- Load once, anywhere on the page -->
<script type="module" src="web-component/dist/dragtable.js"></script>

<!-- Wrap any <table> -->
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
```

```js
const el = document.querySelector('drag-table');

// Get current column order
el.order(); // → ['name', 'age']

// Set column order
el.order(['age', 'name']);

// Listen to events
el.addEventListener('dragtable-change', (e) => {
  console.log('New order:', e.detail.order);
});
```

See [`web-component/`](web-component/) for the full source, build instructions, and demo.

---

## v3 — jQuery Widget (legacy)

> **Note:** v3 is the legacy jQuery UI widget. New projects should use v4.  
> Existing users: see the [migration guide](MIGRATION.md).

Project home page: http://jebaird.com/blog/dragtable-jquery-ui-widget-re-arrange-table-columns-drag-drop

### Getting started (development)

dragtable uses funcunit for functional testing so you will need to do the following. These steps aren't necessary if you just want to use the widget.

fork this repo and run

```
git submodule init
git submodule update
```

This should pull down:
- https://github.com/bitovi/steal
- https://github.com/bitovi/funcunit

Then go into `funcunit/` and run the same commands.

You should then be ready for testing and development.
