const { app, BrowserWindow, ipcMain } = require("electron");
const RPC = require("discord-rpc");

const clientId = "1402970787924676648";
const rpc = new RPC.Client({ transport: "ipc" });

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: __dirname + "/preload.js",
    },
  });

  win.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();
  rpc.login({ clientId }).catch(console.error);
});

rpc.on("ready", () => {
  rpc.setActivity({
    details: "Cubet Tetris",
    state: "Cubet Tetris - HOME",
    startTimestamp: new Date(),
    largeImageKey: "cubettetris",
    largeImageText: "Cubet Tetris",
    instance: false,
  });
  console.log("Rich Presence set");
  ipcMain.on("update-status", (event, data) => {
    rpc.setActivity({
      details: data.details,
      state: data.state,
      startTimestamp: new Date(),
      largeImageKey: "cubettetris",
      largeImageText: "Cubet Tetris",
      instance: false,
    });
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
