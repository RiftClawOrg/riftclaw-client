const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const WebSocket = require('ws');

// Configuration
const config = {
  RELAY_URL: 'wss://relay.riftclaw.com',
  DEFAULT_WORLD_URL: 'https://rift.riftclaw.com',  // The Rift server
  APP_NAME: 'RiftWalker',
  VERSION: '1.0.0'
};

// Encrypted storage for passport
const store = new Store({
  encryptionKey: 'riftclaw-passport-v1',
  name: 'passport'
});

// Global state
let mainWindow = null;
let relayClient = null;
let currentWorld = 'limbo';

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    title: config.APP_NAME,
    icon: path.join(__dirname, '../renderer/assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: true
    },
    show: false // Show when ready
  });

  // Load renderer
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Connect to relay
    connectToRelay();
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (relayClient) {
      relayClient.close();
    }
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Connect to RiftClaw Relay
function connectToRelay() {
  console.log(`[Relay] Connecting to ${config.RELAY_URL}...`);

  relayClient = new WebSocket(config.RELAY_URL);

  relayClient.on('open', () => {
    console.log('[Relay] Connected!');
    
    // Register as client
    const passport = getPassport();
    relayClient.send(JSON.stringify({
      type: 'register_client',
      agent_id: passport.agent_id,
      client_version: config.VERSION
    }));

    // Notify renderer
    if (mainWindow) {
      mainWindow.webContents.send('relay-connected');
    }
  });

  relayClient.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log(`[Relay] Received: ${message.type}`);
      
      // Forward to renderer
      if (mainWindow) {
        mainWindow.webContents.send('relay-message', message);
      }
    } catch (err) {
      console.error('[Relay] Failed to parse message:', err.message);
    }
  });

  relayClient.on('close', () => {
    console.log('[Relay] Disconnected');
    if (mainWindow) {
      mainWindow.webContents.send('relay-disconnected');
    }
    
    // Auto-reconnect
    setTimeout(connectToRelay, 5000);
  });

  relayClient.on('error', (err) => {
    console.error('[Relay] Error:', err.message);
    if (mainWindow) {
      mainWindow.webContents.send('relay-error', err.message);
    }
  });
}

// Get or create passport
function getPassport() {
  let passport = store.get('passport');
  
  if (!passport) {
    passport = {
      agent_id: `traveler-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agent_name: 'Traveler',
      home_world: 'the-rift',
      created_at: Date.now()
    };
    store.set('passport', passport);
    console.log('[Passport] Created:', passport.agent_id);
  }
  
  return passport;
}

// Update passport
function updatePassport(updates) {
  const passport = getPassport();
  const updated = { ...passport, ...updates };
  store.set('passport', updated);
  return updated;
}

// IPC Handlers
ipcMain.handle('get-passport', () => {
  return getPassport();
});

ipcMain.handle('update-passport', (event, updates) => {
  return updatePassport(updates);
});

ipcMain.handle('get-inventory', () => {
  return store.get('inventory', []);
});

ipcMain.handle('set-inventory', (event, inventory) => {
  store.set('inventory', inventory);
  return inventory;
});

ipcMain.handle('send-to-relay', (event, message) => {
  if (relayClient && relayClient.readyState === WebSocket.OPEN) {
    relayClient.send(JSON.stringify(message));
    return { success: true };
  }
  return { success: false, error: 'Not connected to relay' };
});

ipcMain.handle('get-current-world', () => {
  return currentWorld;
});

ipcMain.handle('set-current-world', (event, worldId) => {
  currentWorld = worldId;
  console.log(`[World] Changed to: ${worldId}`);
  return currentWorld;
});

// Launcher placeholder
ipcMain.handle('launch-minecraft', (event, serverIp, token) => {
  console.log(`[Launcher] Minecraft: ${serverIp}`);
  console.log(`[Launcher] Token: ${token?.substring(0, 8)}...`);
  // TODO: Implement with child_process.spawn or shell.openExternal
  return { success: false, message: 'Launcher not yet implemented' };
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

console.log(`[Main] ${config.APP_NAME} v${config.VERSION} starting...`);
