---
title: Design Kit
description: The desktop app that catalogues every GENSLATE component, in every state and both themes.
section: The apps
order: 2
icon: codicon:symbol-color
---

The Design Kit is a desktop app of its own: the living catalogue of the GENSLATE design system. It is
where every component is built, reviewed and documented before it appears in an app.

## What's inside

The sidebar is organised like the design system itself:

| Group | Pages |
|---|---|
| Foundations | Colors, Typography, Spacing & Elevation, Motion, Icons |
| Window | Title Bar, Window Controls, Status Bar, App Shell |
| Layout | Sidebar, Panel, Card, Scroll Area & Separator |
| Actions | Button, Icon Button, Toggle Button, Segmented Control, Toolbar |
| Inputs | Text Field, Search Field, Select, Checkbox, Radio, Switch, Slider, Number Field, Textarea |
| Navigation | Tabs, Tree, Breadcrumbs |
| Overlays | Menu, Context Menu, Popover, Tooltip, Dialog, Alert Dialog, Command Palette, Toast |
| Feedback | Badge, Banner, Progress, Skeleton, Empty State |
| Display | Avatar, Kbd, Code Block, Color Swatch |

Each page has live examples, a **state matrix** (rest, hover, pressed, focus, disabled, loading) and
the JSX that produced it, ready to copy.

## Try it

Press <kbd>mod</kbd> <kbd>K</kbd> to search components, and switch between **Polar Night** and
**Snow Storm** from the title bar to see every page in both themes.

## Run it

```sh
bun run dev                      # the native window with hot reload
bun x moon run example:web-dev   # or just the frontend, in any browser
```

## Learn more

- The [Design Kit page](/design/) on this site shows the palette, type scale and live components.
- The developer [design system guide](/docs/developers/design-system/) covers tokens and the
  component contract.
