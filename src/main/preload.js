const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  pickInputFile: () => ipcRenderer.invoke("pick-input-file"),
  generateDiff: (oldPath, newPath, mode) =>
    ipcRenderer.invoke("generate-diff", { oldPath, newPath, mode }),
  saveDiff: (diffHtml, defaultPath) =>
    ipcRenderer.invoke("save-diff", { diffHtml, defaultPath }),
});
