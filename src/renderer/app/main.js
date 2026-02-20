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
const inventoryGrid = document.getElementById('inventory-grid');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');

// Initialize
async function init() {
  console.log('[Renderer] RiftWalker initializing...');

  showLoading('Connecting to relay...', 'Establishing secure connection');

  // Load passport
  passport = await window.rift.getPassport();
  console.log('[Renderer] Passport loaded:', passport.agent_id);

  // Load inventory
  inventory = await window.rift.getInventory();
  updateInventoryUI();

  // Setup event listeners
  setupRelayListeners();
  setupUIListeners();
  setupKeyboardShortcuts();

  // Generate inventory slots
  generateInventorySlots();

  // Focus the limbo iframe so WASD works
  setTimeout(() => {
    const limboFrame = document.getElementById('limbo-frame');
    if (limboFrame) {
      limboFrame.focus();
      console.log('[Renderer] Limbo frame focused');
    }
  }, 1000);

  hideLoading();
  showToast('Welcome to RiftWalker!', 'success');
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
      const errorMessages = {
        'low_reputation': 'Handoff rejected: Low reputation',
        'invalid_signature': 'Handoff rejected: Invalid passport signature',
        'passport_expired': 'Handoff rejected: Passport expired',
        'invalid_inventory': 'Handoff rejected: Invalid inventory data',
        'processing_error': 'Handoff rejected: Server error',
        'server_full': 'Handoff rejected: World is full',
        'banned': 'Handoff rejected: You are banned from this world'
      };
      const errorMsg = errorMessages[message.reason] || `Handoff rejected: ${message.reason}`;
      showToast(errorMsg, 'error');
      console.error('[Handoff] Rejected:', message.reason, message.message);
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
  
  const { scene, passport: newPassport } = message;
  
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
  if (scene) {
    loadWorld(scene);
  }
  
  hideLoading();
  showToast(`Welcome to ${scene?.name || 'new world'}!`, 'success');
}

// Load a world (scene JSON)
function loadWorld(scene) {
  console.log('[Renderer] Loading world:', scene.name);
  
  // Update UI
  currentWorld = scene.name || 'Unknown';
  currentWorldEl.textContent = currentWorld;
  worldTypeEl.textContent = 'Remote';
  worldTypeEl.classList.remove('local');
  worldTypeEl.classList.add('remote');
  
  // Switch to webview for external worlds
  limboContainer.classList.remove('active');
  externalContainer.classList.add('active');
  
  // Load the world URL
  if (scene.url || scene.world_url) {
    worldWebview.src = scene.url || scene.world_url;
  }
  
  // Track world change
  window.rift.setCurrentWorld(currentWorld);
  
  updateInventoryUI();
}

// Travel to a world
async function travelToWorld(targetWorld, targetUrl) {
  // Check connection directly with main process
  const connected = await window.rift.isRelayConnected();

  if (!connected) {
    console.error('[Travel] Not connected to relay');
    showToast('Not connected to relay - please wait...', 'error');
    return;
  }
  
  showLoading(`Traveling to ${targetWorld}...`, 'Initializing handoff sequence');
  
  // Prepare passport with inventory
  const handoffPassport = {
    ...passport,
    source_world: currentWorld,
    target_world: targetWorld,
    target_url: targetUrl,
    timestamp: Date.now() / 1000,
    inventory: JSON.stringify(inventory)
  };
  
  // Send handoff request
  const result = await window.rift.sendToRelay({
    type: 'handoff_request',
    agent_id: passport.agent_id,
    source_world: currentWorld,
    target_world: targetWorld,
    passport: handoffPassport
  });
  
  if (!result.success) {
    hideLoading();
    showToast('Failed to send travel request', 'error');
  }
}

// Return to Limbo
function returnToLimbo() {
  externalContainer.classList.remove('active');
  limboContainer.classList.add('active');
  
  currentWorld = 'Limbo';
  currentWorldEl.textContent = currentWorld;
  worldTypeEl.textContent = 'Local';
  worldTypeEl.classList.remove('remote');
  worldTypeEl.classList.add('local');
  
  worldWebview.src = '';
  
  window.rift.setCurrentWorld('limbo');
  
  showToast('Returned to Limbo', 'success');
}

// Go to The Rift (home)
function goHome() {
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

  // Home button
  document.getElementById('btn-home').addEventListener('click', goHome);

  // Focus limbo frame when clicked (for WASD)
  document.getElementById('limbo-frame').addEventListener('click', () => {
    document.getElementById('limbo-frame').focus();
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
    if (e.target.tagName === 'INPUT') return;
    
    switch (e.key.toLowerCase()) {
      case 'i':
        toggleInventory();
        break;
      case 'p':
        togglePassport();
        break;
      case 'h':
        goHome();
        break;
      case 'o':
        returnToLimbo();
        break;
      case 's':
        toggleSettings();
        break;
      case 'escape':
        inventoryOverlay.classList.add('hidden');
        passportOverlay.classList.add('hidden');
        document.getElementById('settings-overlay').classList.add('hidden');
        break;
    }
  });
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

// Listen for messages from Limbo iframe
window.addEventListener('message', (e) => {
  if (e.data.type === 'travel') {
    travelToWorld(e.data.world, e.data.url);
  } else if (e.data.type === 'chat') {
    sendChat();
  }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
