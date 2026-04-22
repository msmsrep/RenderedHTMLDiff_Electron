const path = require("path");
const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { buildDiffHtml } = require("../htmlDiff");

app.setAppUserModelId("renderedhtmldiffelectron");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#f4efe6",
    icon: path.join(__dirname, "..", "..", "assets", "icon-256.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
}

ipcMain.handle("pick-html-file", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "HTML Files", extensions: ["html", "htm"] }],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  return { canceled: false, filePath: result.filePaths[0] };
});

ipcMain.handle("generate-diff", async (_event, payload) => {
  try {
    const { oldPath, newPath } = payload;
    const diffHtml = await buildDiffHtml(oldPath, newPath);

    return {
      ok: true,
      diffHtml,
      outputName: "diff_output.html",
      outputDir: path.dirname(newPath),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

ipcMain.handle("save-diff", async (_event, payload) => {
  try {
    const { diffHtml, defaultPath } = payload;

    const result = await dialog.showSaveDialog({
      title: "Save Diff HTML",
      defaultPath,
      filters: [{ name: "HTML Files", extensions: ["html"] }],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    const fs = require("fs");
    fs.writeFileSync(result.filePath, diffHtml, "utf8");
    return { canceled: false, savedPath: result.filePath };
  } catch (error) {
    return {
      canceled: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
