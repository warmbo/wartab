# WarTab UI/UX consistency audit

Date: 2026-07-13
Scope: desktop and responsive application shell, shared design system, panels, forms, configurable icons, interaction states, and all registered modules.
Target: preserve the existing dark glass/skeuomorphic appearance while removing behavioral and visual inconsistencies.

## Visual contract

- Dark neutral glass surfaces with subtle borders, restrained highlights, and accent-driven emphasis.
- Existing configurable accent, theme, opacity, radius, scale, density, alignment, background, and animation behavior remains authoritative.
- Equivalent controls share geometry and state behavior; module-specific data visualization remains semantically distinct.
- Hover may change border, color, opacity, or shadow, but does not lift or scale cards and controls.
- Active feedback may use a restrained scale response.
- Keyboard focus is visible, selected state is not color-only, disabled state is visibly unavailable, reduced motion is respected, and hover-only hints remain available on coarse pointers.

## Evidence baseline

Source inventory:

- 18 module scripts.
- 113 unique hardcoded colors and 40 shadow declarations in the broad source baseline; these include intentional module/data colors as well as shared surfaces.
- 78 `!important` declarations, concentrated in compatibility and late override layers.
- 211 remaining `style.cssText` assignments after the preceding clean-code remediation; these mostly construct dynamic module/editor layouts.
- Before remediation: 3 explicit `:focus-visible` rules, no shared disabled selector, and 3 hover scale/lift rules in shared CSS.
- Before remediation: configurable page/card icons were independently rendered by several files, with image URL/path support missing on some page surfaces.
- The top-bar scale block preceded base top-bar declarations, allowing base values to override the user scale setting.
- The edit-panel cascade repeated transform, side, open, shadow, and picker z-index ownership.

Runtime baseline:

- Local and public roots returned HTTP 200.
- Browser loaded the dashboard with no JavaScript exceptions.
- The desktop shell, glass cards, nested service/link tiles, and module-specific visualizations were coherent before remediation, so no redesign was warranted.

## Component/state matrix

| Family | Default | Hover | Active/selected | Focus | Disabled/touch | Result |
| --- | --- | --- | --- | --- | --- | --- |
| Top actions | shared glass icon button | accent border/background | semantic accent state | shared focus ring | shared disabled state | normalized |
| Page tabs | compact bordered navigation | accent border | active class + `aria-current` | native button + shared ring | native keyboard behavior | normalized |
| Card edit controls | subdued 36px target | opacity/color | restrained press | shared ring | always visible on coarse pointer | normalized |
| Arrange controls | glass/outline | border/shadow only | restrained press/semantic active state | shared ring | touch remains usable | normalized |
| Form controls | shared panel fields | existing border states | existing checked/value states | shared ring | shared disabled state | normalized |
| Panels/dialogs | shared slide/glass surface | n/a | open transform/shadow | contained controls focus visibly | animation setting and reduced motion preserved | consolidated |
| Configurable icons | Lucide/image/emoji | role-specific only | semantic state inherited | parent control ring | decorative images use empty alt | centralized |
| Module surfaces | shared card frame where appropriate | no lift/scale | semantic module state | interactive descendants visible | module controls remain touchable | reviewed |

## Findings and resolution

| ID | Severity | Finding | Root cause | Resolution |
| --- | --- | --- | --- | --- |
| UI-01 | High | Page tabs were non-focusable spans. | Navigation was implemented as pointer-only generic elements. | Converted to buttons and added `aria-current="page"`; retained the same classes and appearance. |
| UI-02 | High | Keyboard focus and disabled state coverage was incomplete. | State styling existed only on selected component classes. | Added shared `:focus-visible` and disabled contracts without removing specialized rules. |
| UI-03 | High | Page icon images could render as URL text in navigation/editor previews. | Lucide/image/emoji branches were duplicated and incomplete. | Added safe `ds.icon()` and adopted it across page, branding, card-preview, empty-state, and module-card icon surfaces. |
| UI-04 | Medium | Equivalent edit actions used a text pencil glyph. | Card controls predated the Lucide icon contract. | Replaced both card/gap edit glyphs with the same role-sized Lucide pencil. |
| UI-05 | Medium | Shared hover rules scaled arrange arrows/cards and the active arrange button. | Interaction feedback mixed shadow/border changes with geometric movement. | Removed hover scaling and retained border/shadow feedback; pressed scale remains intentional. |
| UI-06 | Medium | Top-bar scale could be overridden by later base declarations. | Customization block appeared before base component ownership. | Moved scale declarations after base top-bar/action rules. |
| UI-07 | Medium | Edit-panel transform/shadow and picker z-index declarations were duplicated. | A late patch layer repeated shared panel ownership. | Consolidated the repeated declarations into the canonical panel rules. |
| UI-08 | Medium | Quotes/timer/search hints were hover-revealed on touch hardware. | Coarse-pointer override only exposed card edit buttons. | Exposed all three hint families in the existing coarse-pointer media query. |
| UI-09 | Low | Top action and card-edit icon geometry depended on library/default sizing. | No explicit optical role contract. | Standardized dimensions and Lucide stroke width for these roles. |
| UI-10 | Low | An unused `transition: all` token encouraged accidental property animation. | Legacy token remained after targeted transitions were introduced. | Removed the unused token; source scan confirms no `transition: all` declarations. |

## Module review

Reviewed: API poller, ASCII animation, clock, digital pet, git, iframe, image, LAN scan, link list, links, media, notes, Proxmox, quotes, resource monitor, search, timer, and weather.

- Data/status modules retain meaningful status colors, meters, charts, weather symbols, and terminal/ASCII treatments.
- Content/input modules retain editor sizing, search composition, notes toolbars, and timer interaction semantics.
- Media/decorative modules retain image fitting, iframe boundaries, and animation content.
- No module CSS hover rule applies geometric lift/scale after remediation.
- No source declaration uses `transition: all`.
- Dynamic inline layout declarations were not mechanically converted: doing so would create broad DOM/CSS risk without a visible consistency benefit.

## Responsive and accessibility review

- Existing five-tier responsive rules and grid behavior remain intact.
- Shared focus styling applies to links, buttons, form controls, editable regions, and explicit tabindex targets.
- Page tabs are keyboard reachable and expose current-page state to assistive technology.
- Coarse-pointer users receive visible card edit controls and interaction hints.
- The application animation toggle and `prefers-reduced-motion` now govern CSS and scripted ASCII/pet motion.
- Image icons use decorative empty alternative text and role-specific `object-fit: contain` sizing.

## Regression controls

`tests/ui-consistency.test.js` loads production `design-system.js` and verifies:

- safe Lucide/image/emoji icon creation;
- shared helper adoption on configurable icon surfaces;
- keyboard-operable current-page tabs;
- shared focus and disabled contracts;
- no card/control hover transforms;
- coarse-pointer hint visibility; and
- top-bar scale cascade order.

The independent late audit additionally identified and closed:

- hover-only arrange-mode selection (tap, focus, Enter, and Space now work);
- pointer-only icon-picker choices, missing source-tab state, and missing focus restoration;
- late desktop card rules overriding mobile and tiny-screen spacing;
- broad panel button overrides erasing semantic button states;
- inconsistent image-icon geometry and undersized coarse-pointer targets;
- mouse-only note resizing and non-keyboard quote/media/image interactions;
- ineffective timer/search hint reveal selectors;
- iframe height configuration that was not applied;
- scripted motion that ignored WarTab's animation setting;
- panel-open top-bar compensation that used the wrong breakpoint and side;
- overly prominent arrange/save glows and continuous arrange-icon rotation; and
- full-bleed mobile overrides that discarded the configured spacing and radius.

The final JavaScript suite contains 61 passing tests across 12 files, including 13 production-source UI consistency contracts. The Python suite contains 30 passing tests.

## Post-remediation visual review

The live desktop review found no blocking visual regression, overlap, clipping, or broken card layout. Top actions, edit controls, borders, shadows, nested surfaces, and card spacing remain visually coherent and nearly identical to baseline. The dashboard console reported initialization logs and zero JavaScript errors.

Intentional differences retained:

- module/data status colors;
- circular status/badge geometry where shape carries meaning;
- terminal/ASCII and media presentation;
- per-module compact data density; and
- user-configured transparent cards and content heights.
