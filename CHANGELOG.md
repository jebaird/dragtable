# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [4.0.0] – 2026-03-17

This is a complete rewrite of the library as a **native Web Component** with no dependencies.

### Added

- `<drag-table>` custom element — wraps any `<table>` to enable drag-and-drop column reordering
- Full TypeScript source with exported types `DragTableOptions` and `DragTableEventDetail`
- Dual distribution: ES module (`dist/dragtable.js`) and UMD (`dist/dragtable.umd.js`)
- Generated TypeScript declarations (`dist/dragtable.d.ts`)
- Automatic style injection — no external CSS file needed
- HTML attribute API: `data-header`, `handle`, `items`, `boundary`, `placeholder`, `scroll`
- Public `order()` method — get or set the current column order
- Native `CustomEvent` system replacing jQuery custom events:
  - `dragtable-start`
  - `dragtable-beforechange` (cancelable via `e.preventDefault()`)
  - `dragtable-change`
  - `dragtable-stop`
- 47 automated tests (Vitest + jsdom)
- Demo page (`web-component/index.html`)
- Migration guide (`MIGRATION.md`)
- GitHub Actions CI workflow (build, typecheck, test on every push/PR)
- GitHub Actions publish workflow (triggered on GitHub Release)

### Changed

- No jQuery or jQuery UI dependency required
- `<drag-table>` replaces `$('#table').dragtable()` — see [MIGRATION.md](MIGRATION.md) for details
- Events renamed with a hyphen separator (`dragtablechange` → `dragtable-change`)
- `dragtablebeforeChange` returns `false` to cancel → `e.preventDefault()` on `dragtable-beforechange`
- `appendTarget` option removed — drag display is always appended to the table's parent

### Removed

- jQuery UI widget API (`$.widget`, `_create`, `_destroy`, etc.)
- Dependency on jQuery and jQuery UI
- Legacy CSS file requirement (`dragtable-default.css`)

---

## [3.0.0] – 2010-12-02

Initial release of the jQuery UI widget.

- jQuery UI widget (`$.widget("jb.dragtable", ...)`)
- Options: `dataHeader`, `handle`, `items`, `boundary`, `placeholder`, `appendTarget`, `scroll`
- Events: `dragtablestart`, `dragtablebeforeChange`, `dragtablechange`, `dragtablestop`
- `order()` get/set API
- IE 8+ support

[4.0.0]: https://github.com/jebaird/dragtable/releases/tag/v4.0.0
[3.0.0]: https://github.com/jebaird/dragtable/releases/tag/v3.0.0
