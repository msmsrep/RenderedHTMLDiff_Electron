# RenderedHTMLDiff_Electron

English | [日本語](./readme.ja.md)

Available on the Microsoft Store!

https://apps.microsoft.com/detail/9mtvd87v16dq?hl=en-us&gl=US&ocid=pdpshare


An Electron-based desktop app for visualizing differences between two HTML or PDF files.
Select two HTML/PDF files and visualize rendered text differences with color highlights.

## Features

- GUI-based file selection for the old and new files (HTML or PDF)
- Generate differences for the text content actually rendered in the browser, rather than for the HTML source code.
- PDF inputs are compared by their extracted text (mixed HTML vs PDF comparison is also supported)
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

1. Click `Choose` in **Old File** and select the original file (HTML or PDF).
2. Click `Choose` in **New File** and select the updated file (HTML or PDF).
3. Click `Generate Diff` to build and preview changes.
4. Click `Save as HTML` to export the diff result.

The default output filename is `diff_output.html`.


## Dependencies

- [cheerio](https://github.com/cheeriojs/cheerio)
- [diff](https://github.com/kpdecker/jsdiff)
- [pdfjs-dist](https://github.com/mozilla/pdf.js)

## Known Limitations

- The implementation focuses on text-node differences.
- Large structural/layout changes may not always place highlights where users expect.
- Text under `script`, `style`, and `noscript` is excluded from diff processing.
- PDF comparison covers extracted text only (images and layout are ignored). Scanned PDFs without embedded text cannot be compared.
- When the new file is a PDF, the diff result is rendered as a simple HTML page of the extracted text.

## License

This project is published under the [MIT License](./Licenses/License.txt).

## Privacy Policy

Last updated: April 22, 2026

### Data Collection

This app does not collect any personal information or user data.

### How Processing Works

The HTML files selected by the user are processed inside the app.
Rendering and diff processing are completed locally, and no data is sent to external servers.

### External Service Access

This app does not transmit user data to external services.

### Cookies and Tracking

This app does not use cookies, local storage, or tracking technologies.

### Contact

For privacy-related or other questions, please use [GitHub Issues](https://github.com/msmsrep/RenderedHTMLDiff_Electron/issues).
