# RiftClaw Traveler

> **Electron client for the RiftClaw metaverse**

The official desktop client for traveling between RiftClaw worlds.

## 🎯 What It Does

- **Local Limbo world** - Starting area with portal to The Rift
- **Webview for external worlds** - Sandboxed rendering
- **Passport management** - Persistent identity across worlds
- **Inventory UI** - 64-slot inventory with visual overlay
- **Relay connection** - WebSocket to RiftClaw Relay
- **Chat system** - Global chat across worlds
- **Travel animations** - Loading overlays and transitions

## 🏗️ Architecture

```
┌────────────────────────────────────────────┐
│  Main Process (Node.js)                    │
│  ├── WebSocket to wss://relay.riftclaw.com │
│  ├── Encrypted passport storage            │
│  └── IPC handlers                          │
└──────────────┬─────────────────────────────┘
               │ IPC
┌──────────────▼─────────────────────────────┐
│  Renderer Process (Chromium)               │
│  ├── Limbo (Local Three.js)                │
│  ├── External worlds (Webview)             │
│  ├── Inventory overlay                     │
│  ├── Passport card                         │
│  └── Chat panel                            │
└────────────────────────────────────────────┘
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## 🎮 Controls

| Key | Action |
|-----|--------|
| `WASD` | Move (in Limbo - click in world first) |
| `Mouse` | Look around (click-drag) |
| `Click` | Interact / Travel through portal |
| `I` | Toggle inventory |
| `P` | Toggle passport |
| `S` | Toggle settings |
| `H` | Go to The Rift (home) |
| `O` | Return to Limbo |
| `Enter` | Focus chat |
| `Esc` | Close overlays |

## 📁 Project Structure

```
src/
├── main/
│   └── index.js          # Main process
├── preload/
│   └── index.js          # Secure API bridge
└── renderer/
    ├── index.html        # App shell
    ├── main.js           # Renderer logic
    ├── styles/
    │   └── main.css      # UI styles
    ├── app/
    │   └── main.js       # UI handlers
    └── worlds/
        └── limbo/        # Local starting world
            └── index.html
```

## 🔒 Security

- **Context isolation enabled** - Renderer isolated from Node
- **Preload bridge** - Only exposed APIs available
- **Webview sandbox** - External worlds can't access Electron APIs
- **URL whitelist** - Only riftclaw.com domains allowed
- **Encrypted storage** - Passport stored securely

## 🌍 Worlds

### Limbo (Local)
- Default starting area
- Single portal to The Rift
- No persistence needed
- Local Three.js rendering

### The Rift (Remote)
- Central hub server (headless API)
- Client renders The Rift locally using scene JSON
- Multiple portals to other worlds
- Persistent inventory
- Connected via relay

### External Worlds
- Arena, Forest, Minecraft, etc.
- Loaded in sandboxed webview
- Scene JSON protocol
- Inventory sync on travel

## 🌍 World Rendering

The client handles two types of worlds:

1. **Local Worlds** (Limbo, The Rift)
   - Rendered locally with Three.js
   - Scene JSON from server describes portals/assets
   - Client builds 3D scene dynamically

2. **External Worlds**
   - Loaded in sandboxed webview
   - World provides its own HTML/Three.js
   - Communicates via postMessage

## 🛠️ Development

```bash
# Development with hot reload
npm run dev

# Build for Linux
npm run build:linux

# Build for Windows
npm run build:win

# Build for macOS
npm run build:mac
```

## ⚙️ Configuration

Edit `src/main/index.js`:

```javascript
const config = {
  RELAY_URL: 'wss://relay.riftclaw.com',
  DEFAULT_WORLD_URL: 'https://rift.riftclaw.com',  // The Rift server URL
  APP_NAME: 'RiftWalker',
  VERSION: '1.0.0'
};
```

**Note:** `DEFAULT_WORLD_URL` is the full URL to your riftclaw-server instance. The `goHome()` function in `src/renderer/app/main.js` uses this URL to travel to The Rift.

## 📡 Protocol

The client communicates with the relay using the RiftClaw protocol:

### Outgoing
- `register_client` - Connect to relay
- `handoff_request` - Request travel
- `chat` - Send message

### Incoming
- `handoff_confirm` - Arrived at world
- `handoff_rejected` - Travel failed
- `inventory_update` - Inventory changed
- `chat` - Received message

## 🚢 Deployment

### Linux (AppImage)
```bash
npm run build:linux
# Output: dist/RiftClaw-Traveler-1.0.0.AppImage
```

### Windows
```bash
npm run build:win
# Output: dist/RiftClaw Traveler Setup 1.0.0.exe
```

### macOS
```bash
npm run build:mac
# Output: dist/RiftClaw Traveler-1.0.0.dmg
```

## 🤝 Contributing

Part of the RiftClaw ecosystem. See main repo for guidelines.

## 📄 License

MIT - See LICENSE file

---

**Travel safely, traveler** 🦞🌌
