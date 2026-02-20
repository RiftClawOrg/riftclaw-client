const { contextBridge, ipcRenderer } = require('electron');

/**
 * RiftClaw Preload Script
 * 
 * Exposes safe APIs to the renderer process
 * Maintains context isolation for security
 */

contextBridge.exposeInMainWorld('rift', {
  // Passport
  getPassport: () => ipcRenderer.invoke('get-passport'),
  updatePassport: (updates) => ipcRenderer.invoke('update-passport', updates),
  
  // Inventory
  getInventory: () => ipcRenderer.invoke('get-inventory'),
  setInventory: (inventory) => ipcRenderer.invoke('set-inventory', inventory),
  
  // Relay
  sendToRelay: (message) => ipcRenderer.invoke('send-to-relay', message),
  
  // Relay event listeners
  onRelayConnected: (callback) => ipcRenderer.on('relay-connected', callback),
  onRelayDisconnected: (callback) => ipcRenderer.on('relay-disconnected', callback),
  onRelayError: (callback) => ipcRenderer.on('relay-error', callback),
  onRelayMessage: (callback) => ipcRenderer.on('relay-message', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // World tracking
  getCurrentWorld: () => ipcRenderer.invoke('get-current-world'),
  setCurrentWorld: (worldId) => ipcRenderer.invoke('set-current-world', worldId),
  
  // Launcher
  launchMinecraft: (serverIp, token) => ipcRenderer.invoke('launch-minecraft', serverIp, token),
  
  // App info
  version: '1.0.0'
});

console.log('[Preload] RiftClaw API exposed');
