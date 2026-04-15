![readme-header](https://user-images.githubusercontent.com/1769678/223572353-788d5d38-cd28-40fa-96cd-9d29226f7e4b.png)

<h4 align="center">
  <a href="https://codesandbox.io/p/sandbox/github/markmanx/isoflow">Online playground</a> |
  <a href="https://isoflow.io/docs">Developer docs</a> |
  <a href="https://github.com/markmanx/isoflow">Upstream GitHub</a> |
  <a href="https://github.com/liljemery/isoflow-cloud">This fork</a> |
  <a href="https://discord.gg/QYPkvZth7D">Discord</a> |
  <a href="https://hub.docker.com/r/markmanx/isoflow/tags">Docker image</a>
</h4>

<div align="center">
    <h1>A React component for drawing network diagrams.</h1>
</div>

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![CircleCI](https://circleci.com/gh/markmanx/isoflow.svg?style=shield)

</div>

## About this fork (`isoflow-cloud`)

**[isoflow-cloud](https://github.com/liljemery/isoflow-cloud)** is a **fork** of [Isoflow Community Edition](https://github.com/markmanx/isoflow) ([markmanx/isoflow](https://github.com/markmanx/isoflow)). It started as a personal clone of upstream and is maintained separately with additional fixes and features. This README describes both upstream Isoflow and what differs in this repository.

### What this fork adds

The following summarizes changes present in this fork’s history (not an exhaustive changelog):

- **Containers & build** — Standalone webpack build for shipping the editor, a **Dockerfile** and docker-oriented webpack config, **pnpm**-aligned container scripts, and hardening around **model loading** in those environments.
- **Editing & navigation** — **Zoom on scroll**, **expandable node labels**, showing the **grid in edit mode**, panning and **drag-and-drop** UX improvements, connector **direction** and **anchor** behavior, and smoother zoom/scroll/scene behavior (including fixes for first paint and resize).
- **Export & model API** — Image export **grid toggle** and **background color**, higher-resolution image export, fixes for export edge cases (wrong view/scene, `cloneNode`, positioning, timestamps), **`deleteView`** reducer, **`lastUpdated`** on views, optional **`viewId`** in `initialData`, **model + view titles** in the UI, and broader **`standaloneExports`** / **validation schema** exports from the package.
- **Richer component documentation (in-repo)** — The bundled docs site includes a props table for **`Isoflow`** with an explicit **Description** column for each prop (types, defaults, and behavior), not only types/defaults. The **`initialData`** page documents the full model surface: root fields, **`Icon`** through **`TextBox`**, **connectors** and **anchors**, markdown-capable **`description`** fields on items/views/connectors where applicable, and common **validation** failures. **`docs/ISOFLOW_MODEL_JSON.md`** adds a long-form reference for the JSON model and REST **`model`** payloads (field notes, sizes, and integration-oriented detail). See also **Studio** (`docs/pages/docs/studio.mdx`) for how the host app wires the component to the API.
- **Accounts, projects, and multiple views per project** — The optional **`apps/api`** + **`apps/web`** stack adds **JWT-authenticated** users: each account can **create many projects** (`POST /projects` persists a title + `model` JSON in PostgreSQL, keyed to `userId`). Each project’s model holds a **`views`** array; the UI lists **views in this project**, lets you **add named views** (new view id + name, appended to `model.views`), **delete** views (at least one view must remain), and opens **`/project/:uuid/view/:viewId`** so each view has its own canvas route. Projects and API identifiers use **`uuid`** in URLs while numeric DB ids stay internal.
- **Docs & housekeeping** — README and copy updates, **lint** script fixes, and license year refresh.

Issues **for this fork** belong on **[github.com/liljemery/isoflow-cloud/issues](https://github.com/liljemery/isoflow-cloud/issues)**. Upstream bugs and general Isoflow CE discussion remain on the **[official repository](https://github.com/markmanx/isoflow)**.

## About Isoflow Community Edition
Isoflow is an open-core project. We offer the [Isoflow Community Edition](https://github.com/markmanx/isoflow) as fully-functional, open-source software under the MIT license.  In addition, we also support our development efforts by offering **Isoflow Pro** with additional features for commercial use.  You can read more about the differences between Pro and the Community Edition [here](https://isoflow.io/pro-vs-community-edition).

## Key features
- **Drag-and-drop editor** - Express your architecture with icons, regions and connectors.
- **Extensible icon system** - Create your own icon library, or use plugins for existing libraries including AWS, Azure, GCP, Kubernetes, and more.
- **Export options** - Export diagrams as code or images.

## Quick start

Install both the editor and isopacks from [npm](https://www.npmjs.com/package/isoflow):

- `npm install isoflow @isoflow/isopacks`

See our [documentation](https://isoflow.io/docs) for more information.

## Professional support
For professional support, please consider purchasing a license for Isoflow Pro.  Isoflow Pro includes additional features and support options.  For more information, visit [isoflow.io](https://isoflow.io).

## Found a bug or need support?
For **this fork**, open an issue on [isoflow-cloud](https://github.com/liljemery/isoflow-cloud/issues). For **upstream Isoflow CE**, use [markmanx/isoflow issues](https://github.com/markmanx/isoflow/issues), or ask on the [Discord server](https://discord.gg/QYPkvZth7D).