/**
 * RiftClaw Traveler - Renderer Main
 * 
 * Handles UI, relay communication, and world switching
 */

// State
let passport = null;
let inventory = [];
let currentWorld = 'limbo';
let isConnected = false;

// DOM Elements
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const loadingSubtext = document.getElementById('loading-subtext');
const toastContainer = document.getElementById('toast-container');
const connectionStatus = document.getElementById('connection-status');
const currentWorldEl = document.getElementById('current-world');
const worldTypeEl = document.getElementById('world-type');
const limboContainer = document.getElementById('limbo-container');
const externalContainer = document.getElementById('external-container');
const worldWebview = document.getElementById('world-webview');
const inventoryOverlay = document.getElementById('inventory-overlay');
const passportOverlay = document.getElementById('passport-overlay');
const helpOverlay = document.getElementById('help-overlay');
const inventoryGrid = document.getElementById('inventory-grid');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');

// Initialize
async function init() {
  console.log('[Renderer] RiftWalker initializing...');
  console.log('[Renderer] User agent:', navigator.userAgent);
  console.log('[Renderer] Platform:', navigator.platform);

  showLoading('Connecting to relay...', 'Establishing secure connection');

  // Load passport
  try {
    passport = await window.rift.getPassport();
    if (!passport || !passport.agent_id) {
      console.warn('[Renderer] No valid passport found, will use guest mode');
      showToast('Running in guest mode - some features limited', 'warning');
    } else {
      console.log('[Renderer] Passport loaded:', passport.agent_id);
      console.log('[Renderer] Agent name:', passport.agent_name);
      console.log('[Renderer] Home world:', passport.home_world);
    }
  } catch (err) {
    console.error('[Renderer] Failed to load passport:', err);
    showToast('Failed to load passport - some features may not work', 'error');
  }

  // Load inventory
  try {
    inventory = await window.rift.getInventory();
    console.log('[Renderer] Inventory loaded:', inventory.length, 'items');
    updateInventoryUI();
  } catch (err) {
    console.error('[Renderer] Failed to load inventory:', err);
    inventory = [];
  }

  // Setup event listeners
  setupRelayListeners();
  setupUIListeners();
  setupKeyboardShortcuts();

  // Generate inventory slots
  generateInventorySlots();

  // Initialize Limbo (local renderer, no iframe)
  initLimbo();

  hideLoading();
  showToast('Welcome to Limbo!', 'success');
  console.log('[Renderer] Initialization complete');
}

// Setup relay event listeners
function setupRelayListeners() {
  window.rift.onRelayConnected((event) => {
    console.log('[Renderer] Relay connected');
    isConnected = true;
    connectionStatus.classList.remove('disconnected');
    connectionStatus.classList.add('connected');
    showToast('Connected to relay', 'success');
  });
  
  window.rift.onRelayDisconnected((event) => {
    console.log('[Renderer] Relay disconnected');
    isConnected = false;
    connectionStatus.classList.remove('connected');
    connectionStatus.classList.add('disconnected');
    showToast('Connection lost — reconnecting...', 'error');
  });
  
  window.rift.onRelayError((event, message) => {
    console.error('[Renderer] Relay error:', message);
    showToast('Connection error: ' + message, 'error');
  });
  
  window.rift.onRelayMessage((event, message) => {
    handleRelayMessage(message);
  });
}

// Handle incoming relay messages
function handleRelayMessage(message) {
  switch (message.type) {
    case 'welcome':
      console.log('[Relay] Welcome from', message.relay_name);
      break;
      
    case 'handoff_confirm':
      handleHandoffConfirm(message);
      break;
      
    case 'handoff_rejected':
      hideLoading();
      
      // Detailed error messages with explanations
      const errorMessages = {
        'low_reputation': {
          title: 'Access Denied: Low Reputation',
          detail: 'Your reputation score is too low to enter this world. Complete quests or help other players to increase your reputation.'
        },
        'invalid_signature': {
          title: 'Passport Error: Invalid Signature',
          detail: 'Your passport signature could not be verified. Try restarting the client or regenerating your passport.'
        },
        'passport_expired': {
          title: 'Passport Expired',
          detail: 'Your passport has expired. A new passport will be generated automatically on restart.'
        },
        'invalid_inventory': {
          title: 'Inventory Error',
          detail: 'Your inventory data appears corrupted. Try clearing your inventory or restarting the client.'
        },
        'processing_error': {
          title: 'Server Error',
          detail: 'The destination world encountered an error processing your request. The world may be restarting or experiencing issues.'
        },
        'server_full': {
          title: 'World Full',
          detail: 'The destination world has reached maximum capacity. Try again in a few minutes.'
        },
        'banned': {
          title: 'Access Denied: Banned',
          detail: 'You have been banned from this world. Contact the world administrator for more information.'
        },
        'invalid_passport': {
          title: 'Invalid Passport',
          detail: 'Your passport is missing required fields. Try regenerating your passport by restarting the client.'
        },
        'target_unreachable': {
          title: 'World Unreachable',
          detail: 'Cannot connect to the destination world. The world may be offline or experiencing network issues.'
        },
        'world_offline': {
          title: 'World Offline',
          detail: 'The destination world is currently offline. The Rift server may not be running or the world is under maintenance.'
        }
      };
      
      const errorInfo = errorMessages[message.reason] || {
        title: `Handoff Rejected: ${message.reason}`,
        detail: message.message || 'No additional details provided by the server.'
      };
      
      const errorMsg = `${errorInfo.title}\n\n${errorInfo.detail}`;
      showToast(errorInfo.title, 'error');
      
      console.error('[Handoff] Rejected:', {
        reason: message.reason,
        message: message.message,
        target_world: message.target_world,
        timestamp: new Date().toISOString()
      });
      
      // Show detailed error in alert for debugging
      if (message.message) {
        console.error('[Handoff] Server message:', message.message);
      }
      break;
      
    case 'chat':
      addChatMessage(message.from, message.channel, message.message);
      break;
      
    case 'inventory_update':
      inventory = message.items;
      updateInventoryUI();
      showToast('Inventory updated', 'success');
      break;
      
    case 'error':
      showToast('Error: ' + message.message, 'error');
      break;
  }
}

// Handle handoff confirm (arrival at new world)
function handleHandoffConfirm(message) {
  console.log('[Renderer] Handoff confirmed:', message);

  const { scene, passport: newPassport, target_world, target_url } = message;

  // Update passport with new inventory
  if (newPassport) {
    passport = newPassport;
    if (newPassport.inventory) {
      try {
        inventory = JSON.parse(newPassport.inventory);
        window.rift.setInventory(inventory);
      } catch (e) {
        console.error('[Renderer] Failed to parse inventory:', e);
      }
    }
  }

  // Load the new world
  let worldScene = scene;

  // If no scene provided, create default for The Rift
  if (!worldScene && target_world === 'the-rift') {
    console.log('[Renderer] No scene data, creating default for The Rift');
    worldScene = createDefaultRiftScene();
  }

  if (worldScene) {
    console.log('[Renderer] Loading world scene:', worldScene);
    loadWorld(worldScene);
    hideLoading();
    showToast(`Welcome to ${worldScene.name || target_world}!`, 'success');
  } else {
    console.error('[Renderer] No scene data and no default available');
    hideLoading();
    showToast('Arrived but no world data received', 'warning');
  }
}

// Create default scene for The Rift
function createDefaultRiftScene() {
  return {
    name: 'The Rift',
    description: 'Central hub for all travelers',
    spawn_point: { x: 0, y: 1.6, z: 5 },
    portals: [
      { id: 'portal_limbo', name: 'Limbo', url: 'local' },
      { id: 'portal_arena', name: 'Arena', url: 'https://arena.riftclaw.com' },
      { id: 'portal_forest', name: 'Forest', url: 'https://forest.riftclaw.com' }
    ]
  };
}

// Load a world (scene JSON)
function loadWorld(scene) {
  console.log('[Renderer] Loading world:', scene.name, scene);

  // Update UI
  currentWorld = scene.name || 'Unknown';
  currentWorldEl.textContent = currentWorld;
  worldTypeEl.textContent = 'Remote';
  worldTypeEl.classList.remove('local');
  worldTypeEl.classList.add('remote');

  // Switch to external container
  limboContainer.classList.remove('active');
  externalContainer.classList.add('active');

  // Check if this is The Rift (render locally) or external world (load URL)
  const worldUrl = scene.url || scene.world_url;
  const isRift = scene.name?.toLowerCase().includes('rift') ||
                 currentWorld.toLowerCase().includes('rift');

  if (isRift && !worldUrl?.startsWith('http')) {
    // Render The Rift locally
    console.log('[Renderer] Rendering The Rift locally');
    renderRiftWorld(scene);
  } else if (worldUrl) {
    // Load external world in webview
    console.log('[Renderer] Loading external world URL:', worldUrl);
    worldWebview.src = worldUrl;
  } else {
    console.error('[Renderer] No world URL provided and not The Rift');
    showToast('Failed to load world - no URL', 'error');
  }

  // Track world change
  window.rift.setCurrentWorld(currentWorld);

  updateInventoryUI();
}

// World renderers
let limboRenderer = null;
let riftRenderer = null;

// Initialize Limbo on load
function initLimbo() {
  console.log('[Renderer] Initializing Limbo...');

  // Destroy previous if exists
  if (limboRenderer) {
    limboRenderer.destroy();
    limboRenderer = null;
  }

  // Create Limbo renderer
  const container = document.getElementById('limbo-container');
  limboRenderer = new LimboWorldRenderer(container);
  limboRenderer.setOnTravel((world, url) => {
    travelToWorld(world, url);
  });
  limboRenderer.init();

  // Update UI to show we're in Limbo
  currentWorld = 'Limbo';
  currentWorldEl.textContent = currentWorld;
  worldTypeEl.textContent = 'Local';
  worldTypeEl.classList.remove('remote');
  worldTypeEl.classList.add('local');

  console.log('[Renderer] Limbo initialized, UI updated');
}

// Render The Rift world locally
function renderRiftWorld(scene) {
  // Clear webview
  worldWebview.src = '';

  // Destroy previous renderer
  if (riftRenderer) {
    riftRenderer.destroy();
    riftRenderer = null;
  }

  // Create new renderer
  const container = document.getElementById('external-container');
  riftRenderer = new RiftWorldRenderer(container, scene);
  riftRenderer.setOnPortalEnter((name, url) => {
    if (name === 'Limbo' || url === 'local') {
      returnToLimbo();
    } else {
      travelToWorld(name, url);
    }
  });
  riftRenderer.init();

  console.log('[Renderer] The Rift rendered');
}

// Travel to a world
async function travelToWorld(targetWorld, targetUrl) {
  console.log(`[Travel] Initiating travel to ${targetWorld} at ${targetUrl}`);
  console.log(`[Travel] Current world: ${currentWorld}`);
  console.log(`[Travel] Passport:`, passport);
  
  // Check connection directly with main process
  const connected = await window.rift.isRelayConnected();
  console.log(`[Travel] Relay connected: ${connected}`);

  if (!connected) {
    console.error('[Travel] Not connected to relay');
    showToast('Not connected to relay - please wait...', 'error');
    return;
  }
  
  // Validate passport exists
  if (!passport || !passport.agent_id) {
    console.error('[Travel] No passport available');
    showToast('Travel failed: No passport found. Try restarting the client.', 'error');
    return;
  }
  
  showLoading(`Traveling to ${targetWorld}...`, 'Initializing handoff sequence');
  
  // Prepare passport with inventory
  const timestamp = Date.now() / 1000;
  const handoffPassport = {
    agent_id: passport.agent_id,
    agent_name: passport.agent_name || 'Traveler',
    public_key: passport.public_key || '',
    home_world: passport.home_world || 'Limbo',
    reputation: passport.reputation || 0,
    created_at: passport.created_at || timestamp,
    source_world: currentWorld,
    target_world: targetWorld,
    target_url: targetUrl,
    timestamp: timestamp,
    inventory: JSON.stringify(inventory || [])
  };
  
  console.log('[Travel] Sending handoff request:', {
    type: 'handoff_request',
    agent_id: passport.agent_id,
    source_world: currentWorld,
    target_world: targetWorld,
    passport_fields: Object.keys(handoffPassport)
  });
  
  // Send handoff request
  const result = await window.rift.sendToRelay({
    type: 'handoff_request',
    agent_id: passport.agent_id,
    source_world: currentWorld,
    target_world: targetWorld,
    passport: handoffPassport
  });
  
  console.log('[Travel] Handoff request result:', result);
  
  if (!result.success) {
    hideLoading();
    const errorDetail = result.error || 'Unknown error';
    console.error('[Travel] Failed to send handoff request:', errorDetail);
    showToast(`Travel failed: ${errorDetail}`, 'error');
  }
}

// Return to Limbo
function returnToLimbo() {
  // Destroy The Rift renderer if active
  if (riftRenderer) {
    riftRenderer.destroy();
    riftRenderer = null;
  }

  // Clear external container
  worldWebview.src = '';

  // Switch to Limbo
  externalContainer.classList.remove('active');
  limboContainer.classList.add('active');

  // Re-initialize Limbo
  initLimbo();

  currentWorld = 'Limbo';
  currentWorldEl.textContent = currentWorld;
  worldTypeEl.textContent = 'Local';
  worldTypeEl.classList.remove('remote');
  worldTypeEl.classList.add('local');

  window.rift.setCurrentWorld('limbo');

  showToast('Returned to Limbo', 'success');
}

// Go to The Rift
function goToRift() {
  travelToWorld('the-rift', 'https://rift.riftclaw.com');
}

// Settings state
let settings = {
  relayUrl: 'wss://relay.riftclaw.com',
  volume: 80,
  muteOnStartup: true,
  bookmarks: [
    { name: 'The Rift', url: 'https://rift.riftclaw.com' },
    { name: 'Arena', url: 'https://arena.riftclaw.com' }
  ]
};

// Setup UI event listeners
function setupUIListeners() {
  // Inventory button
  document.getElementById('btn-inventory').addEventListener('click', toggleInventory);
  document.getElementById('btn-close-inventory').addEventListener('click', toggleInventory);

  // Passport button
  document.getElementById('btn-passport').addEventListener('click', togglePassport);
  document.getElementById('btn-close-passport').addEventListener('click', togglePassport);

  // Settings button
  document.getElementById('btn-settings').addEventListener('click', toggleSettings);
  document.getElementById('btn-close-settings').addEventListener('click', toggleSettings);
  document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
  document.getElementById('btn-reset-settings').addEventListener('click', resetSettings);
  document.getElementById('btn-add-bookmark').addEventListener('click', addBookmark);

  // Volume slider
  document.getElementById('setting-volume').addEventListener('input', (e) => {
    document.getElementById('volume-value').textContent = e.target.value + '%';
  });

  // Home button - goes to Limbo
  document.getElementById('btn-home').addEventListener('click', () => {
    returnToLimbo();
  });

  // Rift button - goes to The Rift
  document.getElementById('btn-rift')?.addEventListener('click', () => {
    goToRift();
  });

  // Help button
  document.getElementById('btn-help')?.addEventListener('click', toggleHelp);
  document.getElementById('btn-close-help')?.addEventListener('click', toggleHelp);

  // Editor button (only works in Limbo)
  document.getElementById('btn-editor')?.addEventListener('click', () => {
    if (currentWorld === 'Limbo' && limboRenderer?.editor) {
      // Close editor if already open
      if (limboRenderer.editor.isActive) {
        limboRenderer.editor.toggle();
      } else {
        limboRenderer.editor.toggle();
      }
      console.log('[Editor] Toggled via button:', limboRenderer.editor.isActive);
    } else {
      showToast('Editor only available in Limbo', 'warning');
    }
  });

  // Chat
  document.getElementById('btn-send-chat').addEventListener('click', sendChat);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChat();
  });
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Skip if typing in an input
    if (e.target.tagName === 'INPUT') {
      if (e.key === 'Escape') {
        e.target.blur();
      }
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'i':
        toggleInventory();
        e.preventDefault();
        break;
      case 'p':
        togglePassport();
        e.preventDefault();
        break;
      case 'h':
        toggleHelp();
        e.preventDefault();
        break;
      case 'g':
        returnToLimbo();
        e.preventDefault();
        break;
      case 'r':
        goToRift();
        e.preventDefault();
        break;
      case 'o':
        returnToLimbo();
        e.preventDefault();
        break;
      case ',':
        toggleSettings();
        e.preventDefault();
        break;
      case 'e':
        // Toggle scene editor (only in Limbo)
        if (currentWorld === 'Limbo' && limboRenderer?.editor) {
          limboRenderer.editor.toggle();
        }
        e.preventDefault();
        break;
      case 'escape':
        inventoryOverlay.classList.add('hidden');
        passportOverlay.classList.add('hidden');
        helpOverlay.classList.add('hidden');
        document.getElementById('settings-overlay')?.classList.add('hidden');
        break;
    }
  });
}

// Toggle help overlay
function toggleHelp() {
  helpOverlay.classList.toggle('hidden');
  console.log('[Help] Toggled:', !helpOverlay.classList.contains('hidden'));
}

// Toggle inventory overlay
function toggleInventory() {
  inventoryOverlay.classList.toggle('hidden');
  if (!inventoryOverlay.classList.contains('hidden')) {
    updateInventoryUI();
  }
}

// Toggle passport overlay
function togglePassport() {
  passportOverlay.classList.toggle('hidden');
  if (!passportOverlay.classList.contains('hidden')) {
    updatePassportUI();
  }
}

// Generate inventory slots
function generateInventorySlots() {
  inventoryGrid.innerHTML = '';
  for (let i = 0; i < 64; i++) {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot empty';
    slot.dataset.index = i;
    inventoryGrid.appendChild(slot);
  }
}

// Update inventory UI
function updateInventoryUI() {
  const slots = inventoryGrid.querySelectorAll('.inventory-slot');
  
  slots.forEach((slot, i) => {
    const item = inventory[i];
    if (item) {
      slot.textContent = item.icon || '📦';
      slot.classList.remove('empty');
      slot.title = `${item.name} x${item.quantity}`;
    } else {
      slot.textContent = '';
      slot.classList.add('empty');
      slot.title = '';
    }
  });
  
  const countEl = document.getElementById('inventory-count');
  if (countEl) {
    countEl.textContent = `${inventory.length} / 64 slots`;
  }
}

// Update passport UI
function updatePassportUI() {
  if (!passport) return;

  document.getElementById('passport-name').textContent = passport.agent_name || 'Traveler';
  document.getElementById('passport-id').textContent = passport.agent_id;
  document.getElementById('passport-home').textContent = passport.home_world || 'The Rift';

  const reputation = parseFloat(passport.reputation) || 0;
  document.getElementById('passport-reputation').textContent = reputation.toFixed(1);

  // Calculate level from reputation
  const level = Math.floor(reputation / 10) + 1;
  const titles = ['Novice', 'Traveler', 'Explorer', 'Veteran', 'Master', 'Legend'];
  const title = titles[Math.min(level - 1, titles.length - 1)];
  document.getElementById('passport-level').textContent = `${level} (${title})`;
}

// Toggle settings overlay
function toggleSettings() {
  const settingsOverlay = document.getElementById('settings-overlay');
  settingsOverlay.classList.toggle('hidden');

  if (!settingsOverlay.classList.contains('hidden')) {
    loadSettingsUI();
  }
}

// Load settings into UI
function loadSettingsUI() {
  document.getElementById('setting-relay-url').value = settings.relayUrl;
  document.getElementById('setting-volume').value = settings.volume;
  document.getElementById('volume-value').textContent = settings.volume + '%';
  document.getElementById('setting-mute').checked = settings.muteOnStartup;
  renderBookmarks();
}

// Render bookmarks list
function renderBookmarks() {
  const list = document.getElementById('bookmarks-list');
  list.innerHTML = '';

  if (settings.bookmarks.length === 0) {
    list.innerHTML = '<p style="color: #888; text-align: center;">No bookmarks</p>';
    return;
  }

  settings.bookmarks.forEach((bookmark, index) => {
    const item = document.createElement('div');
    item.className = 'bookmark-item';
    item.innerHTML = `
      <div>
        <div class="bookmark-name">${escapeHtml(bookmark.name)}</div>
        <div class="bookmark-url">${escapeHtml(bookmark.url)}</div>
      </div>
      <button class="btn-delete" onclick="deleteBookmark(${index})">Delete</button>
    `;
    list.appendChild(item);
  });
}

// Add new bookmark
function addBookmark() {
  const name = prompt('Bookmark name:');
  if (!name) return;

  const url = prompt('World URL:');
  if (!url) return;

  settings.bookmarks.push({ name, url });
  renderBookmarks();
}

// Delete bookmark
function deleteBookmark(index) {
  if (confirm('Delete this bookmark?')) {
    settings.bookmarks.splice(index, 1);
    renderBookmarks();
  }
}

// Save settings
function saveSettings() {
  settings.relayUrl = document.getElementById('setting-relay-url').value;
  settings.volume = parseInt(document.getElementById('setting-volume').value);
  settings.muteOnStartup = document.getElementById('setting-mute').checked;

  // TODO: Save to storage via IPC
  console.log('[Settings] Saved:', settings);

  toggleSettings();
  showToast('Settings saved', 'success');
}

// Reset settings to defaults
function resetSettings() {
  if (confirm('Reset all settings to defaults?')) {
    settings = {
      relayUrl: 'wss://relay.riftclaw.com',
      volume: 80,
      muteOnStartup: true,
      bookmarks: [
        { name: 'The Rift', url: 'https://rift.riftclaw.com' },
        { name: 'Arena', url: 'https://arena.riftclaw.com' }
      ]
    };
    loadSettingsUI();
    showToast('Settings reset to defaults', 'success');
  }
}

// Send chat message
async function sendChat() {
  const message = chatInput.value.trim();
  if (!message) return;
  
  if (!isConnected) {
    showToast('Not connected to relay', 'error');
    return;
  }
  
  await window.rift.sendToRelay({
    type: 'chat',
    channel: 'global',
    message: message,
    agent_id: passport?.agent_id
  });
  
  addChatMessage('You', 'global', message);
  chatInput.value = '';
}

// Add chat message to UI
function addChatMessage(sender, channel, message) {
  const div = document.createElement('div');
  div.className = 'chat-message';
  div.innerHTML = `
    <span class="sender">${sender}</span>
    <span class="channel">[${channel}]</span>:
    ${escapeHtml(message)}
  `;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show loading overlay
function showLoading(text, subtext) {
  loadingText.textContent = text;
  loadingSubtext.textContent = subtext;
  loadingOverlay.classList.remove('hidden');
}

// Hide loading overlay
function hideLoading() {
  loadingOverlay.classList.add('hidden');
}

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Listen for messages from external world iframes (if any)
window.addEventListener('message', (e) => {
  console.log('[Main] Message from child:', e.data);

  if (e.data.type === 'travel') {
    travelToWorld(e.data.world, e.data.url);
  } else if (e.data.type === 'chat') {
    sendChat();
  }
});

// Handle keys forwarded from iframes
function handleForwardedKey(key) {
  const lowerKey = key.toLowerCase();
  console.log('[Main] Handling forwarded key:', key);

  switch (lowerKey) {
    case 'i':
      toggleInventory();
      break;
    case 'p':
      togglePassport();
      break;
    case 'h':
      toggleHelp();
      break;
    case 'g':
      goHome();
      break;
    case 'o':
      returnToLimbo();
      break;
    case ',':
      toggleSettings();
      break;
    case 'escape':
      inventoryOverlay.classList.add('hidden');
      passportOverlay.classList.add('hidden');
      helpOverlay.classList.add('hidden');
      document.getElementById('settings-overlay')?.classList.add('hidden');
      break;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
