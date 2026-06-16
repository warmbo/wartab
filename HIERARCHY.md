# WarTab Component Hierarchy

## Top Level
```
Page (index.html)
├── Top Bar (#top-bar)
│   ├── Brand (.brand) — page title + icon
│   ├── Stats (#top-stats) — CPU/memory/disk/uptime
│   └── Actions (#top-actions) — Add Card, Config buttons
├── Card Grid (#card-grid)
│   ├── Card (.card) — main dashboard cards
│   │   ├── Accent Bar (.card::before) — 3px colored top bar
│   │   ├── Card Header (.card-header)
│   │   │   ├── Card Title (.card-title)
│   │   │   │   ├── Icon (.card-icon) — 24px Lucide/emoji
│   │   │   │   └── Title text
│   │   │   └── Card Actions (inline div)
│   │   │       ├── Edit Button (.card-edit-btn) — ✎ pencil
│   │   │       └── Drag Handle (.drag-handle) — ⠿ grip
│   │   ├── Card Body (.card-body)
│   │   │   └── Section (.section-title + .section-content)
│   │   │       ├── Section Toggle (.section-toggle) — ▶/▼
│   │   │       └── Module Content (.dropdown-content / module widget)
│   │   │           ├── Links (.link-grid → .link-item)
│   │   │           ├── Link List (.link-list → .link-row)
│   │   │           ├── Search (.inline-search-wrap)
│   │   │           ├── Clock (.clock-widget)
│   │   │           ├── Weather (.weather-widget)
│   │   │           ├── Iframe (.card-iframe)
│   │   │           ├── Notes (.notes-text) — contentEditable
│   │   │           ├── API Poller (.api-widget)
│   │   │           ├── Quotes (.quotes-widget)
│   │   │           └── Status Bar (.status-bar-widget)
│   │   └── Section Divider (.section-divider) — <hr> between sections
│   └── Gap Card (.card.grid-gap-card) — invisible spacer
│       └── Controls (positioned absolute)
│           ├── Edit Button (.card-edit-btn)
│           └── Drag Handle (.drag-handle)
├── Footer (#footer)
├── Config Panel (.config-panel#config-panel) — global settings
│   ├── Header (.config-header) — title + close button
│   └── Body (#config-body)
│       └── Config Cards (.cs-panel.cp-config-card) — per-section card
│           ├── Section Header (<h3>) — "Page", "Background", etc.
│           └── Form Fields (pf() / chk() / el())
├── Edit Panel (.config-panel#edit-panel) — per-card editor
│   ├── Header (.config-header) — title + close button
│   └── Body (#edit-panel-body)
│       ├── Divider (.cp-divider) — "CARD SETTINGS"
│       ├── Card Settings Panel (.cs-panel) — Title, Icon, Color, Width, Height
│       │   └── Grid (.cs-grid) — 2-column layout
│       │       ├── Title row (.cs-full.cs-pair)
│       │       ├── Icon row (.cs-pair > .cs-icon-row)
│       │       │   ├── Preview (.cs-icon-preview)
│       │       │   ├── Change button
│       │       │   └── Clear button
│       │       ├── Color row (.cs-pair > .cs-color-row)
│       │       │   ├── Color picker (<input type=color>)
│       │       │   └── Hex input (.cp-input)
│       │       ├── Width (.cs-pair) — cpRange
│       │       └── Height (.cs-pair) — cpRange
│       ├── Divider (.cp-divider) — "SECTIONS"
│       └── Section Editors (.se-card) — one per section
│           ├── Header (.se-card-header)
│           │   ├── Drag Handle (.se-drag-handle) — ⠿
│           │   ├── Type Badge (.me-badge) — "links", "clock", etc.
│           │   ├── Title (.se-card-title) — section label
│           │   └── Actions (.se-card-actions)
│           │       └── Delete button (btn-danger)
│           ├── Body (.se-card-body)
│           │   ├── Label + Type inline (.se-inline)
│           │   │   ├── Label field (cpLabel + cpInput)
│           │   │   └── Type selector (cpLabel + cpSelect)
│           │   └── Module Card (.me-card) — type-specific fields
│           │       ├── Links: table (.me-link-th + .me-link-tr rows)
│           │       ├── Clock: checkboxes (.me-check-group)
│           │       ├── Search: fields + select
│           │       └── ... per module
│           └── Ghost indicator (.se-ghost) — drag placeholder
│       ├── Add Section button (cpBtn)
│       └── Footer (.cp-footer)
│           ├── Done button
│           └── Delete Card button
└── Icon Picker (.icon-picker#icon-picker)
    ├── Header (.config-header)
    ├── Body (.icon-picker-body)
    │   ├── Tabs (.icon-picker-tabs → .ip-tab)
    │   ├── Search bar (.icon-search-bar)
    │   └── Grid (.icon-grid → .icon-grid-item)
    └── Upload Zone (.upload-zone)
```

## Class Naming Conventions

| Prefix | Scope | Examples |
|--------|-------|---------|
| `cp-` | **C**ard **P**anel — edit panel form helpers | `cp-label`, `cp-input`, `cp-select`, `cp-check`, `cp-range`, `cp-hint`, `cp-divider`, `cp-footer`, `cp-group` |
| `cs-` | **C**ard **S**ettings — card-level fields in edit panel | `cs-panel`, `cs-grid`, `cs-pair`, `cs-full`, `cs-icon-*`, `cs-color-row` |
| `se-` | **S**ection **E**ditor — section cards within edit panel | `se-card`, `se-card-header`, `se-drag-handle`, `se-card-title`, `se-card-actions`, `se-card-body`, `se-inline`, `se-ghost` |
| `me-` | **M**odule **E**ditor — type-specific field groups | `me-badge`, `me-card`, `me-link-*`, `me-icon-btn`, `me-check-group` |
| `cfg-` | **C**on**fig** — global config panel | `cfg-conditional` |
| `card-` | Main dashboard card | `card-edit-btn` |
| `grid-` | Grid containers | `grid-gap-card` |

## Z-Index Stack

| Level | Element |
|-------|---------|
| 100   | Config overlay (`.config-overlay`) |
| 101   | Config panel (`.config-panel#config-panel`) |
| 102   | Edit panel overlay (`#edit-panel-overlay`) |
| 103   | Edit panel (`#edit-panel`) |
| 104   | Icon picker (`.icon-picker`) |
| 200   | Toast container |
