/**
 * Scene Editor
 *
 * In-world editor for customizing Limbo and creating new worlds
 * Press 'E' to toggle editor mode
 */

class SceneEditor {
  constructor(worldRenderer) {
    this.worldRenderer = worldRenderer;
    this.isActive = false;
    this.selectedObject = null;
    this.selectedObjects = [];
    this.transformMode = 'translate'; // translate, rotate, scale
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.dragPlane = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Gizmo for transformation
    this.gizmo = null;

    // Editor UI elements
    this.ui = null;
  }

  init() {
    this.createUI();
    this.createGizmo();
    console.log('[SceneEditor] Initialized');
  }

  toggle() {
    this.isActive = !this.isActive;

    if (this.isActive) {
      this.showUI();
      console.log('[SceneEditor] Activated');
    } else {
      this.hideUI();
      this.deselectAll();
      console.log('[SceneEditor] Deactivated');
    }

    return this.isActive;
  }

  createUI() {
    // Create editor overlay
    const overlay = document.createElement('div');
    overlay.id = 'scene-editor-overlay';
    overlay.className = 'scene-editor-overlay hidden';
    overlay.innerHTML = `
      <!-- Top Bar -->
      <div class="editor-top-bar">
        <span class="editor-title">🎨 Scene Editor</span>
        <div class="editor-tools">
          <button class="editor-btn ${this.transformMode === 'translate' ? 'active' : ''}" data-mode="translate" title="Move (T)">↔️ Move</button>
          <button class="editor-btn ${this.transformMode === 'rotate' ? 'active' : ''}" data-mode="rotate" title="Rotate (R)">🔄 Rotate</button>
          <button class="editor-btn ${this.transformMode === 'scale' ? 'active' : ''}" data-mode="scale" title="Scale (S)">📏 Scale</button>
        </div>
        <div class="editor-actions">
          <button id="editor-add-portal" class="editor-btn" title="Add Portal">🌀 Portal</button>
          <button id="editor-add-crystal" class="editor-btn" title="Add Crystal">💎 Crystal</button>
          <button id="editor-add-light" class="editor-btn" title="Add Light">💡 Light</button>
          <button id="editor-duplicate" class="editor-btn" title="Duplicate (Ctrl+D)">📋 Duplicate</button>
          <button id="editor-delete" class="editor-btn danger" title="Delete (Del)">🗑️ Delete</button>
        </div>
        <div class="editor-file">
          <button id="editor-save" class="editor-btn primary" title="Save Scene">💾 Save</button>
          <button id="editor-load" class="editor-btn" title="Load Scene">📂 Load</button>
          <button id="editor-export" class="editor-btn" title="Export JSON">📤 Export</button>
        </div>
        <button id="editor-close" class="editor-btn" title="Close Editor (E)">✕ Close</button>
      </div>

      <!-- Left Panel - Scene Tree -->
      <div class="editor-panel editor-left">
        <h4>📋 Scene Objects</h4>
        <div id="editor-scene-tree" class="scene-tree"></div>
      </div>

      <!-- Right Panel - Properties -->
      <div class="editor-panel editor-right">
        <h4>⚙️ Properties</h4>
        <div id="editor-properties" class="properties-panel">
          <p class="no-selection">Select an object to edit</p>
        </div>
      </div>

      <!-- Bottom Bar - Status -->
      <div class="editor-bottom-bar">
        <span id="editor-status">Ready</span>
        <span class="editor-help">Click to select • Drag to move • E to exit</span>
      </div>

      <!-- Hidden file input for load -->
      <input type="file" id="editor-file-input" accept=".json" style="display: none;">
    `;

    document.body.appendChild(overlay);
    this.ui = overlay;

    // Setup event listeners
    this.setupUIListeners();
  }

  setupUIListeners() {
    // Tool mode buttons
    this.ui.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setTransformMode(e.target.dataset.mode);
      });
    });

    // Add object buttons
    document.getElementById('editor-add-portal').addEventListener('click', () => this.addPortal());
    document.getElementById('editor-add-crystal').addEventListener('click', () => this.addCrystal());
    document.getElementById('editor-add-light').addEventListener('click', () => this.addLight());

    // Action buttons
    document.getElementById('editor-duplicate').addEventListener('click', () => this.duplicateSelected());
    document.getElementById('editor-delete').addEventListener('click', () => this.deleteSelected());

    // File buttons
    document.getElementById('editor-save').addEventListener('click', () => this.saveScene());
    document.getElementById('editor-load').addEventListener('click', () => this.loadScene());
    document.getElementById('editor-export').addEventListener('click', () => this.exportScene());

    // Close button
    document.getElementById('editor-close').addEventListener('click', () => this.toggle());

    // File input
    document.getElementById('editor-file-input').addEventListener('change', (e) => this.handleFileLoad(e));
  }

  createGizmo() {
    // Create transformation gizmo
    this.gizmo = new THREE.Group();

    // X axis (red)
    const xGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1);
    const xMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const xAxis = new THREE.Mesh(xGeometry, xMaterial);
    xAxis.rotation.z = -Math.PI / 2;
    xAxis.position.x = 0.5;
    xAxis.userData = { axis: 'x' };
    this.gizmo.add(xAxis);

    // Y axis (green)
    const yGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1);
    const yMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const yAxis = new THREE.Mesh(yGeometry, yMaterial);
    yAxis.position.y = 0.5;
    yAxis.userData = { axis: 'y' };
    this.gizmo.add(yAxis);

    // Z axis (blue)
    const zGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1);
    const zMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const zAxis = new THREE.Mesh(zGeometry, zMaterial);
    zAxis.rotation.x = Math.PI / 2;
    zAxis.position.z = 0.5;
    zAxis.userData = { axis: 'z' };
    this.gizmo.add(zAxis);

    // Initially hidden
    this.gizmo.visible = false;
    this.worldRenderer.scene.add(this.gizmo);
  }

  showUI() {
    this.ui.classList.remove('hidden');
    this.updateSceneTree();
  }

  hideUI() {
    this.ui.classList.add('hidden');
  }

  setTransformMode(mode) {
    this.transformMode = mode;

    // Update UI
    this.ui.querySelectorAll('[data-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    this.updateStatus(`Mode: ${mode}`);
  }

  // Selection
  handleClick(event, canvas) {
    if (!this.isActive) return;

    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.worldRenderer.camera);

    // Check for gizmo intersection first
    if (this.gizmo.visible) {
      const gizmoIntersects = this.raycaster.intersectObjects(this.gizmo.children);
      if (gizmoIntersects.length > 0) {
        this.startDrag(gizmoIntersects[0].object.userData.axis);
        return;
      }
    }

    // Check for object intersection
    const objects = this.getEditableObjects();
    const intersects = this.raycaster.intersectObjects(objects, true);

    if (intersects.length > 0) {
      // Find the root object (portal group, crystal, etc.)
      let target = intersects[0].object;
      while (target.parent && target.parent !== this.worldRenderer.scene) {
        target = target.parent;
      }
      this.selectObject(target);
    } else {
      this.deselectAll();
    }
  }

  getEditableObjects() {
    // Return all editable objects in the scene
    const objects = [];
    if (this.worldRenderer.portal) objects.push(this.worldRenderer.portal);
    if (this.worldRenderer.crystals) objects.push(...this.worldRenderer.crystals);
    return objects;
  }

  selectObject(object) {
    this.deselectAll();
    this.selectedObject = object;
    this.selectedObjects = [object];

    // Show gizmo at object position
    this.gizmo.position.copy(object.position);
    this.gizmo.visible = true;

    // Highlight object
    this.highlightObject(object, true);

    // Update UI
    this.updatePropertiesPanel();
    this.updateSceneTree();

    this.updateStatus(`Selected: ${object.userData.name || 'Object'}`);
  }

  deselectAll() {
    if (this.selectedObject) {
      this.highlightObject(this.selectedObject, false);
    }

    this.selectedObject = null;
    this.selectedObjects = [];
    this.gizmo.visible = false;

    this.updatePropertiesPanel();
    this.updateSceneTree();
  }

  highlightObject(object, highlight) {
    // Add/remove highlight effect
    object.traverse((child) => {
      if (child.material) {
        if (highlight) {
          child.userData.originalEmissive = child.material.emissive?.clone();
          if (child.material.emissive) {
            child.material.emissive.setHex(0xffff00);
          }
        } else if (child.userData.originalEmissive) {
          child.material.emissive.copy(child.userData.originalEmissive);
        }
      }
    });
  }

  // Transformation
  startDrag(axis) {
    this.isDragging = true;
    this.dragAxis = axis;
    this.dragStartPosition = this.selectedObject.position.clone();

    // Create invisible plane for dragging
    const planeGeometry = new THREE.PlaneGeometry(100, 100);
    const planeMaterial = new THREE.MeshBasicMaterial({ visible: false });
    this.dragPlane = new THREE.Mesh(planeGeometry, planeMaterial);

    // Orient plane to face camera
    this.dragPlane.lookAt(this.worldRenderer.camera.position);
    this.dragPlane.position.copy(this.selectedObject.position);

    this.worldRenderer.scene.add(this.dragPlane);
  }

  handleDrag(event, canvas) {
    if (!this.isDragging || !this.selectedObject) return;

    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.worldRenderer.camera);

    const intersects = this.raycaster.intersectObject(this.dragPlane);
    if (intersects.length > 0) {
      const point = intersects[0].point;

      if (this.transformMode === 'translate') {
        // Move along selected axis
        if (this.dragAxis === 'x') this.selectedObject.position.x = point.x;
        if (this.dragAxis === 'y') this.selectedObject.position.y = point.y;
        if (this.dragAxis === 'z') this.selectedObject.position.z = point.z;

        // Update gizmo position
        this.gizmo.position.copy(this.selectedObject.position);
      }

      this.updatePropertiesPanel();
    }
  }

  endDrag() {
    this.isDragging = false;
    this.dragAxis = null;

    if (this.dragPlane) {
      this.worldRenderer.scene.remove(this.dragPlane);
      this.dragPlane = null;
    }
  }

  // Object Creation
  addPortal() {
    const portal = this.worldRenderer.createPortal();
    portal.position.set(0, 2, 0);
    portal.userData = {
      name: 'New Portal',
      url: 'https://example.com',
      type: 'portal'
    };
    this.worldRenderer.scene.add(portal);

    // Add to crystals array for tracking (TODO: create separate array)
    if (!this.worldRenderer.crystals) this.worldRenderer.crystals = [];
    this.worldRenderer.crystals.push(portal);

    this.selectObject(portal);
    this.updateSceneTree();
    this.updateStatus('Added portal');
  }

  addCrystal() {
    const crystalGeometry = new THREE.OctahedronGeometry(0.3);
    const crystalMaterial = new THREE.MeshStandardMaterial({
      color: 0xff00ff,
      emissive: 0xff00ff,
      emissiveIntensity: 0.3
    });
    const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
    crystal.position.set(0, 2, 0);
    crystal.userData = {
      name: 'Crystal',
      type: 'crystal',
      speed: 0.5,
      offset: Math.random() * Math.PI * 2
    };
    this.worldRenderer.scene.add(crystal);
    this.worldRenderer.crystals.push(crystal);

    this.selectObject(crystal);
    this.updateSceneTree();
    this.updateStatus('Added crystal');
  }

  addLight() {
    const light = new THREE.PointLight(0x00d5ff, 2, 20);
    light.position.set(0, 3, 0);
    light.userData = {
      name: 'Light',
      type: 'light',
      color: '#00d5ff',
      intensity: 2,
      distance: 20
    };
    this.worldRenderer.scene.add(light);

    // Add visual representation
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.2),
      new THREE.MeshBasicMaterial({ color: 0x00d5ff })
    );
    sphere.userData = { isVisual: true };
    light.add(sphere);

    this.selectObject(light);
    this.updateSceneTree();
    this.updateStatus('Added light');
  }

  // Actions
  duplicateSelected() {
    if (!this.selectedObject) return;

    const obj = this.selectedObject.clone();
    obj.position.x += 2;
    obj.userData.name = (obj.userData.name || 'Object') + ' (Copy)';
    this.worldRenderer.scene.add(obj);

    if (obj.userData.type === 'crystal') {
      this.worldRenderer.crystals.push(obj);
    }

    this.selectObject(obj);
    this.updateSceneTree();
    this.updateStatus('Duplicated object');
  }

  deleteSelected() {
    if (!this.selectedObject) return;

    // Don't delete the main portal
    if (this.selectedObject === this.worldRenderer.portal) {
      this.updateStatus('Cannot delete the main portal');
      return;
    }

    this.worldRenderer.scene.remove(this.selectedObject);

    // Remove from crystals array
    const index = this.worldRenderer.crystals.indexOf(this.selectedObject);
    if (index > -1) {
      this.worldRenderer.crystals.splice(index, 1);
    }

    this.deselectAll();
    this.updateSceneTree();
    this.updateStatus('Deleted object');
  }

  // UI Updates
  updateSceneTree() {
    const tree = document.getElementById('editor-scene-tree');
    const objects = this.getEditableObjects();

    tree.innerHTML = objects.map((obj, i) => `
      <div class="scene-item ${obj === this.selectedObject ? 'selected' : ''}" data-index="${i}">
        ${obj.userData.type === 'portal' ? '🌀' : '💎'} 
        ${obj.userData.name || 'Object'}
      </div>
    `).join('');

    // Add click handlers
    tree.querySelectorAll('.scene-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        this.selectObject(objects[index]);
      });
    });
  }

  updatePropertiesPanel() {
    const panel = document.getElementById('editor-properties');

    if (!this.selectedObject) {
      panel.innerHTML = '<p class="no-selection">Select an object to edit</p>';
      return;
    }

    const pos = this.selectedObject.position;
    const rot = this.selectedObject.rotation;
    const scale = this.selectedObject.scale;

    panel.innerHTML = `
      <div class="property-group">
        <label>Name</label>
        <input type="text" id="prop-name" value="${this.selectedObject.userData.name || ''}">
      </div>
      ${this.selectedObject.userData.url !== undefined ? `
      <div class="property-group">
        <label>URL</label>
        <input type="text" id="prop-url" value="${this.selectedObject.userData.url || ''}">
      </div>
      ` : ''}
      <div class="property-group">
        <label>Position</label>
        <div class="vector-input">
          <input type="number" id="prop-pos-x" value="${pos.x.toFixed(2)}" step="0.1">
          <input type="number" id="prop-pos-y" value="${pos.y.toFixed(2)}" step="0.1">
          <input type="number" id="prop-pos-z" value="${pos.z.toFixed(2)}" step="0.1">
        </div>
      </div>
      <div class="property-group">
        <label>Rotation</label>
        <div class="vector-input">
          <input type="number" id="prop-rot-x" value="${(rot.x * 180 / Math.PI).toFixed(0)}" step="15">
          <input type="number" id="prop-rot-y" value="${(rot.y * 180 / Math.PI).toFixed(0)}" step="15">
          <input type="number" id="prop-rot-z" value="${(rot.z * 180 / Math.PI).toFixed(0)}" step="15">
        </div>
      </div>
      <div class="property-group">
        <label>Scale</label>
        <div class="vector-input">
          <input type="number" id="prop-scale-x" value="${scale.x.toFixed(2)}" step="0.1">
          <input type="number" id="prop-scale-y" value="${scale.y.toFixed(2)}" step="0.1">
          <input type="number" id="prop-scale-z" value="${scale.z.toFixed(2)}" step="0.1">
        </div>
      </div>
      <button id="prop-apply" class="editor-btn primary">Apply</button>
    `;

    // Add event listeners
    document.getElementById('prop-apply').addEventListener('click', () => this.applyProperties());
  }

  applyProperties() {
    if (!this.selectedObject) return;

    // Name
    const name = document.getElementById('prop-name').value;
    this.selectedObject.userData.name = name;

    // URL
    const urlInput = document.getElementById('prop-url');
    if (urlInput) {
      this.selectedObject.userData.url = urlInput.value;
    }

    // Position
    this.selectedObject.position.set(
      parseFloat(document.getElementById('prop-pos-x').value),
      parseFloat(document.getElementById('prop-pos-y').value),
      parseFloat(document.getElementById('prop-pos-z').value)
    );

    // Rotation
    this.selectedObject.rotation.set(
      parseFloat(document.getElementById('prop-rot-x').value) * Math.PI / 180,
      parseFloat(document.getElementById('prop-rot-y').value) * Math.PI / 180,
      parseFloat(document.getElementById('prop-rot-z').value) * Math.PI / 180
    );

    // Scale
    this.selectedObject.scale.set(
      parseFloat(document.getElementById('prop-scale-x').value),
      parseFloat(document.getElementById('prop-scale-y').value),
      parseFloat(document.getElementById('prop-scale-z').value)
    );

    // Update gizmo
    this.gizmo.position.copy(this.selectedObject.position);

    this.updateSceneTree();
    this.updateStatus('Properties applied');
  }

  // File Operations
  saveScene() {
    const sceneData = this.exportSceneData();
    const json = JSON.stringify(sceneData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });

    // Create download link
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'limbo-scene.json';
    a.click();

    this.updateStatus('Scene saved to file');
  }

  loadScene() {
    document.getElementById('editor-file-input').click();
  }

  handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        this.importSceneData(data);
        this.updateStatus('Scene loaded');
      } catch (err) {
        this.updateStatus('Error loading scene: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  exportScene() {
    const data = this.exportSceneData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'the-rift-scene.json';
    a.click();

    this.updateStatus('Scene exported for server');
  }

  exportSceneData() {
    const objects = [];

    // Export all editable objects
    this.getEditableObjects().forEach(obj => {
      objects.push({
        type: obj.userData.type || 'unknown',
        name: obj.userData.name,
        url: obj.userData.url,
        position: {
          x: obj.position.x,
          y: obj.position.y,
          z: obj.position.z
        },
        rotation: {
          x: obj.rotation.x,
          y: obj.rotation.y,
          z: obj.rotation.z
        },
        scale: {
          x: obj.scale.x,
          y: obj.scale.y,
          z: obj.scale.z
        },
        userData: { ...obj.userData }
      });
    });

    return {
      name: 'Limbo',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      objects: objects
    };
  }

  importSceneData(data) {
    // Clear existing objects (except main portal)
    this.getEditableObjects().forEach(obj => {
      if (obj !== this.worldRenderer.portal) {
        this.worldRenderer.scene.remove(obj);
      }
    });
    this.worldRenderer.crystals = [];

    // Import objects
    if (data.objects) {
      data.objects.forEach(objData => {
        if (objData.type === 'portal' && objData.name === 'The Rift') {
          // Update main portal
          this.worldRenderer.portal.position.set(
            objData.position.x,
            objData.position.y,
            objData.position.z
          );
          this.worldRenderer.portal.userData.url = objData.url;
        } else if (objData.type === 'crystal') {
          // Create crystal
          this.addCrystal();
          const crystal = this.worldRenderer.crystals[this.worldRenderer.crystals.length - 1];
          crystal.position.set(objData.position.x, objData.position.y, objData.position.z);
          crystal.userData = { ...objData.userData };
        }
        // TODO: Add other object types
      });
    }

    this.updateSceneTree();
  }

  updateStatus(message) {
    const status = document.getElementById('editor-status');
    if (status) {
      status.textContent = message;
    }
    console.log('[SceneEditor]', message);
  }
}

// Export for use
if (typeof module !== 'undefined') {
  module.exports = SceneEditor;
}
