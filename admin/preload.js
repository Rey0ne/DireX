/* TapNow Admin Console — Preload Script */
const { contextBridge } = require('electron');

// Expose a safe API to the renderer
contextBridge.exposeInMainWorld('adminAPI', {
  platform: process.platform,
  version: '1.0.0',
});
