// main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;
const isAdmin = process.argv.includes('--admin');

function createCanvasWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    titleBarStyle: 'hidden',
  });

  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, 'dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

function createAdminWindow() {
  const adminWindow = new BrowserWindow({
    width: 520,
    height: 780,
    minWidth: 420,
    minHeight: 600,
    title: 'TapNow Agent 控制台',
    webPreferences: {
      preload: path.join(__dirname, 'admin', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0a0b0d',
  });

  adminWindow.loadFile(path.join(__dirname, 'admin', 'index.html'));
  adminWindow.setMenuBarVisibility(false);

  if (isDev || process.argv.includes('--dev')) {
    adminWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(() => {
  if (isAdmin) {
    createAdminWindow();
  } else {
    createCanvasWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (isAdmin) createAdminWindow();
      else createCanvasWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
