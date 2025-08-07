const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("discord", {
  updateStatus: (data) => ipcRenderer.send("update-status", data),
});
