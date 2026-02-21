# Scenes

This folder contains JSON scene files for RiftWalker worlds.

## File Format

Scenes are stored as JSON files with the following structure:

```json
{
  "name": "Scene Name",
  "description": "Scene description",
  "version": "1.0.0",
  "metadata": {
    "author": "Author Name",
    "created": "2026-02-21",
    "tags": ["tag1", "tag2"]
  },
  "settings": {
    "backgroundColor": "#050510",
    "fog": { "color": "#050510", "density": 0.02 },
    "ambientLight": { "color": "#404060", "intensity": 0.5 }
  },
  "spawnPoint": {
    "position": { "x": 0, "y": 1.6, "z": 5 },
    "rotation": { "x": 0, "y": 0, "z": 0 }
  },
  "objects": [...],
  "portals": [...]
}
```

## Included Scenes

### limbo.json
The starting area for all travelers. A quiet void with a single portal to The Rift.

### the-rift.json
The central hub connecting all worlds. Features multiple portals arranged in a circle.

## Creating New Scenes

1. Copy one of the existing scene files as a template
2. Modify the objects, portals, and settings
3. Save with a new name (e.g., `my-world.json`)
4. Load in the Scene Editor (press 'E' in Limbo)

## Scene Editor

Use the in-game Scene Editor to:
- Create new objects
- Position and rotate objects
- Add portals
- Save scenes to JSON files

Press **'E'** while in Limbo to open the Scene Editor.
