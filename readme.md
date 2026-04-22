# RenderedHTMLDiff_Electron

English | [日本語](./readme.ja.md)

透過にする参考
https://stackoverflow.com/questions/31735562/make-app-icon-on-task-bar-have-a-transparent-background-uwa?utm_source=copilot.com

An Electron-based desktop app for visualizing differences between two HTML files.
Select two HTML files and visualize rendered text differences with color highlights.

## Features

- GUI-based file selection for `old.html` and `new.html`
- Generate differences for the text content actually rendered in the browser, rather than for the HTML source code.
- Character-level text diff highlighting
- Instant preview in an embedded `iframe`
- Save the diff result as an HTML file

Highlight rules:

- Inserted text: green background
- Deleted text: red background with strikethrough

## Requirements

- Node.js 18+
- npm
- Windows/macOS/Linux (Electron-supported environments)

## Setup

```bash
npm install
```

## Run

```bash
npm start
```

## Usage

1. Click `Choose` in **Old HTML** and select the original file.
2. Click `Choose` in **New HTML** and select the updated file.
3. Click `Generate Diff` to build and preview changes.
4. Click `Save as HTML` to export the diff result.

The default output filename is `diff_output.html`.

## Architecture

- Main process: `main.js`
	- Open file dialog
	- Trigger diff generation
	- Save dialog and file write
- Renderer process: `renderer.js`
	- UI interactions
	- Diff preview rendering
	- Status/error messaging
- Diff engine: `src/htmlDiff.js`
	- Parse HTML with `cheerio`
	- Collect and merge text nodes
	- Compute differences with `diff-match-patch`
	- Inject highlighted spans into the new HTML

## Dependencies

- `electron`
- `cheerio`
- `diff-match-patch`

## Known Limitations

- The implementation focuses on text-node differences.
- Large structural/layout changes may not always place highlights where users expect.
- Text under `script`, `style`, and `noscript` is excluded from diff processing.
