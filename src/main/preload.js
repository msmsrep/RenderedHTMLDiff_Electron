const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  pickHtmlFile: () => ipcRenderer.invoke("pick-html-file"),
  generateDiff: (oldPath, newPath) =>
    ipcRenderer.invoke("generate-diff", { oldPath, newPath }),
  saveDiff: (diffHtml, defaultPath) =>
    ipcRenderer.invoke("save-diff", { diffHtml, defaultPath }),
});
