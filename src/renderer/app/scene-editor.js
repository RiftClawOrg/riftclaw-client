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
    
    // Scene info
    this.sceneName = 'Limbo';
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
      <!-- Menu Bar -->
      <div class="editor-menu-bar">
        <span class="editor-title">🎨 Scene Editor</span>
        <span class="editor-scene-name" id="editor-scene-name">📁 Limbo</span>
        
        <!-- File Menu -->
        <div class="editor-menu">
          <button class="editor-menu-btn">File</button>
          <div class="editor-menu-dropdown">
            <button id="editor-new">🆕 New Scene</button>
            <button id="editor-save">💾 Save Scene</button>
            <button id="editor-load">📂 Load Scene</button>
            <hr>
            <button id="editor-close">✕ Close Editor</button>
          </div>
        </div>

        <!-- Tools Menu -->
        <div class="editor-menu">
          <button class="editor-menu-btn">Tools</button>
          <div class="editor-menu-dropdown">
            <button data-mode="translate" class="${this.transformMode === 'translate' ? 'active' : ''}">↔️ Move Tool (T)</button>
            <button data-mode="rotate" class="${this.transformMode === 'rotate' ? 'active' : ''}">🔄 Rotate Tool (R)</button>
            <button data-mode="scale" class="${this.transformMode === 'scale' ? 'active' : ''}">📏 Scale Tool (S)</button>
            <hr>
            <button id="editor-duplicate">📋 Duplicate (Ctrl+D)</button>
            <button id="editor-delete" class="danger">🗑️ Delete (Del)</button>
          </div>
        </div>

        <!-- Entities Menu -->
        <div class="editor-menu">
          <button class="editor-menu-btn">Entities</button>
          <div class="editor-menu-dropdown">
            <button id="editor-add-portal">🌀 Portal</button>
            <button id="editor-add-light">💡 Light</button>
            <button id="editor-add-particles">✨ Particles</button>
          </div>
        </div>

        <!-- Objects Menu -->
        <div class="editor-menu">
          <button class="editor-menu-btn">Objects</button>
          <div class="editor-menu-dropdown">
            <button id="editor-add-crystal">💎 Crystal</button>
            <button id="editor-add-platform">⬜ Platform</button>
            <button id="editor-add-chair">🪑 Chair</button>
            <button id="editor-add-desk">📝 Desk</button>
            <hr>
            <button id="editor-import-model">📥 Import 3D Model...</button>
          </div>
        </div>

        <!-- View Menu -->
        <div class="editor-menu">
          <button class="editor-menu-btn">View</button>
          <div class="editor-menu-dropdown">
            <button id="editor-toggle-grid">⊞ Toggle Grid</button>
            <button id="editor-toggle-stars">✦ Toggle Stars</button>
            <button id="editor-reset-camera">📷 Reset Camera</button>
          </div>
        </div>

        <div class="editor-spacer"></div>
        
        <span class="editor-help-text">Press E to exit</span>
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
        <span class="editor-hint">Click to select • Drag handles to transform</span>
      </div>

      <!-- Hidden file input for load -->
      <input type="file" id="editor-file-input" accept=".json" style="display: none;">
      <input type="file" id="editor-model-input" accept=".glb,.gltf,.obj" style="display: none;">
    `;

    document.body.appendChild(overlay);
    this.ui = overlay;

    // Setup event listeners
    this.setupUIListeners();
  }

  setupUIListeners() {
    const self = this;
    
    // Helper to safely add listener
    const onClick = (id, callback) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log(`[SceneEditor] Clicked: ${id}`);
          callback();
        });
      } else {
        console.warn(`[SceneEditor] Element not found: ${id}`);
      }
    };
    
    // Setup menu toggle behavior (click to open/close)
    this.ui.querySelectorAll('.editor-menu').forEach(menu => {
      const btn = menu.querySelector('.editor-menu-btn');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Close other menus
          this.ui.querySelectorAll('.editor-menu').forEach(m => {
            if (m !== menu) m.classList.remove('active');
          });
          // Toggle this menu
          menu.classList.toggle('active');
          console.log('[SceneEditor] Menu toggled:', menu.classList.contains('active'));
        });
      }
      
      // Close menu when clicking outside
      document.addEventListener('click', () => {
        menu.classList.remove('active');
      });
    });

    // Tool mode buttons (in dropdown)
    this.ui.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setTransformMode(e.target.dataset.mode);
      });
    });

    // File menu
    onClick('editor-new', () => this.newScene());
    onClick('editor-save', () => this.saveScene());
    onClick('editor-load', () => this.loadScene());
    onClick('editor-close', () => this.toggle());

    // Entities menu
    onClick('editor-add-portal', () => this.addPortal());
    onClick('editor-add-light', () => this.addLight());
    onClick('editor-add-particles', () => this.addParticles());

    // Objects menu
    onClick('editor-add-crystal', () => this.addCrystal());
    onClick('editor-add-platform', () => this.addPlatform());
    onClick('editor-add-chair', () => this.addChair());
    onClick('editor-add-desk', () => this.addDesk());
    onClick('editor-import-model', () => this.importModel());

    // Tools menu
    onClick('editor-duplicate', () => this.duplicateSelected());
    onClick('editor-delete', () => this.deleteSelected());

    // View menu
    onClick('editor-toggle-grid', () => this.toggleGrid());
    onClick('editor-toggle-stars', () => this.toggleStars());
    onClick('editor-reset-camera', () => this.resetCamera());

    // File inputs
    const fileInput = document.getElementById('editor-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileLoad(e));
    }
    
    const modelInput = document.getElementById('editor-model-input');
    if (modelInput) {
      modelInput.addEventListener('change', (e) => this.handleModelImport(e));
    }
  }

  createGizmo() {
    // Create container for all gizmo types
    this.gizmoContainer = new THREE.Group();
    this.gizmoContainer.visible = false;
    this.worldRenderer.scene.add(this.gizmoContainer);

    // Create Translate Gizmo (arrows)
    this.translateGizmo = new THREE.Group();

    // X axis arrow (red)
    this.translateGizmo.add(this.createArrow('x', 0xff0000, new THREE.Vector3(1, 0, 0)));
    // Y axis arrow (green)
    this.translateGizmo.add(this.createArrow('y', 0x00ff00, new THREE.Vector3(0, 1, 0)));
    // Z axis arrow (blue)
    this.translateGizmo.add(this.createArrow('z', 0x0000ff, new THREE.Vector3(0, 0, 1)));

    this.gizmoContainer.add(this.translateGizmo);

    // Create Rotate Gizmo (rings)
    this.rotateGizmo = new THREE.Group();

    // X ring (red) - rotation around X axis
    this.rotateGizmo.add(this.createRing('x', 0xff0000, new THREE.Vector3(1, 0, 0)));
    // Y ring (green) - rotation around Y axis
    this.rotateGizmo.add(this.createRing('y', 0x00ff00, new THREE.Vector3(0, 1, 0)));
    // Z ring (blue) - rotation around Z axis
    this.rotateGizmo.add(this.createRing('z', 0x0000ff, new THREE.Vector3(0, 0, 1)));

    this.gizmoContainer.add(this.rotateGizmo);

    // Create Scale Gizmo (boxes)
    this.scaleGizmo = new THREE.Group();

    // X box (red)
    this.scaleGizmo.add(this.createBox('x', 0xff0000, new THREE.Vector3(1, 0, 0)));
    // Y box (green)
    this.scaleGizmo.add(this.createBox('y', 0x00ff00, new THREE.Vector3(0, 1, 0)));
    // Z box (blue)
    this.scaleGizmo.add(this.createBox('z', 0x0000ff, new THREE.Vector3(0, 0, 1)));
    // Center box (white) - uniform scale
    this.scaleGizmo.add(this.createCenterBox());

    this.gizmoContainer.add(this.scaleGizmo);

    // Reference to active gizmo
    this.gizmo = this.translateGizmo;
  }

  createArrow(axis, color, direction) {
    const group = new THREE.Group();
    group.userData = { axis: axis, type: 'arrow' };

    // Shaft
    const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8);
    const shaftMat = new THREE.MeshBasicMaterial({ color: color });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);

    // Position shaft along axis
    shaft.position.copy(direction).multiplyScalar(0.4);
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    group.add(shaft);

    // Arrow head (cone)
    const headGeo = new THREE.ConeGeometry(0.12, 0.3, 8);
    const headMat = new THREE.MeshBasicMaterial({ color: color });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.copy(direction).multiplyScalar(0.95);
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    group.add(head);

    return group;
  }

  createRing(axis, color, normal) {
    const ringGeo = new THREE.TorusGeometry(1.2, 0.04, 8, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: color });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.userData = { axis: axis, type: 'ring' };

    // Orient ring perpendicular to axis
    ring.lookAt(normal);

    return ring;
  }

  createBox(axis, color, direction) {
    const boxGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
    const boxMat = new THREE.MeshBasicMaterial({ color: color });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.copy(direction).multiplyScalar(1.2);
    box.userData = { axis: axis, type: 'box' };

    return box;
  }

  createCenterBox() {
    const boxGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const boxMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.userData = { axis: 'all', type: 'center' };

    return box;
  }

  updateGizmoVisibility() {
    if (!this.gizmoContainer) return;

    // Show/hide based on transform mode
    this.translateGizmo.visible = this.transformMode === 'translate';
    this.rotateGizmo.visible = this.transformMode === 'rotate';
    this.scaleGizmo.visible = this.transformMode === 'scale';

    // Update reference to active gizmo
    if (this.transformMode === 'translate') this.gizmo = this.translateGizmo;
    else if (this.transformMode === 'rotate') this.gizmo = this.rotateGizmo;
    else if (this.transformMode === 'scale') this.gizmo = this.scaleGizmo;
    
    // Make sure gizmo and its children are visible and interactive
    if (this.gizmo) {
      this.gizmo.traverse((child) => {
        if (child.isMesh) {
          child.visible = true;
        }
      });
    }
  }

  showUI() {
    this.ui.classList.remove('hidden');
    // Force update scene tree and refresh all UI elements
    setTimeout(() => {
      this.updateSceneTree();
      this.updateStatus('Editor active - Select an object to edit');
    }, 100);
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

    // Update gizmo visibility
    this.updateGizmoVisibility();

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
    if (this.gizmo && this.gizmo.visible) {
      const gizmoIntersects = this.raycaster.intersectObjects(this.gizmo.children, true);
      if (gizmoIntersects.length > 0) {
        // Find the object with axis data (might be a child mesh)
        let target = gizmoIntersects[0].object;
        while (target && !target.userData.axis && target.parent) {
          target = target.parent;
        }
        if (target && target.userData.axis) {
          console.log('[SceneEditor] Clicked gizmo axis:', target.userData.axis);
          this.startDrag(target.userData.axis);
          return;
        }
      }
    }

    // Check for object intersection
    const objects = this.getEditableObjects();
    console.log('[SceneEditor] Click detected, checking', objects.length, 'objects');
    const intersects = this.raycaster.intersectObjects(objects, true);

    if (intersects.length > 0) {
      // Find the root object (portal group, crystal, etc.)
      let target = intersects[0].object;
      console.log('[SceneEditor] Intersected:', target.name || target.type, 'at distance', intersects[0].distance);
      while (target.parent && target.parent !== this.worldRenderer.scene) {
        target = target.parent;
      }
      console.log('[SceneEditor] Selected root object:', target.userData?.name || target.name || 'unnamed');
      this.selectObject(target);
    } else {
      console.log('[SceneEditor] No intersection, deselecting');
      this.deselectAll();
    }
  }

  getEditableObjects() {
    // Return all editable objects in the scene
    const objects = [];
    
    // Floor
    if (this.worldRenderer.floor) {
      this.worldRenderer.floor.userData.type = 'floor';
      this.worldRenderer.floor.userData.name = 'Floor';
      objects.push(this.worldRenderer.floor);
    }
    
    // Portal
    if (this.worldRenderer.portal) {
      this.worldRenderer.portal.userData.type = 'portal';
      this.worldRenderer.portal.userData.name = this.worldRenderer.portal.userData.name || 'The Rift Portal';
      objects.push(this.worldRenderer.portal);
    }
    
    // Crystals
    if (this.worldRenderer.crystals) {
      this.worldRenderer.crystals.forEach((crystal, i) => {
        crystal.userData.type = 'crystal';
        crystal.userData.name = crystal.userData.name || `Crystal ${i + 1}`;
        objects.push(crystal);
      });
    }
    
    // Lights
    if (this.worldRenderer.lights) {
      this.worldRenderer.lights.forEach((light, i) => {
        light.userData.type = 'light';
        light.userData.name = light.userData.name || `Light ${i + 1}`;
        objects.push(light);
      });
    }
    
    // Stars (as a group)
    if (this.worldRenderer.stars) {
      this.worldRenderer.stars.userData.type = 'stars';
      this.worldRenderer.stars.userData.name = 'Starfield';
      objects.push(this.worldRenderer.stars);
    }
    
    // Grid/Floor
    if (this.worldRenderer.gridHelper) {
      this.worldRenderer.gridHelper.userData.type = 'grid';
      this.worldRenderer.gridHelper.userData.name = 'Grid';
      objects.push(this.worldRenderer.gridHelper);
    }
    
    // Player Mesh
    if (this.worldRenderer.playerMesh) {
      this.worldRenderer.playerMesh.userData.type = 'player';
      this.worldRenderer.playerMesh.userData.name = 'Player Avatar';
      objects.push(this.worldRenderer.playerMesh);
    }
    
    return objects;
  }

  selectObject(object) {
    this.deselectAll();
    this.selectedObject = object;
    this.selectedObjects = [object];

    console.log('[SceneEditor] Selecting object:', object.userData?.name || 'unnamed', 'at position:', object.position);

    // Show gizmo container at object position
    this.gizmoContainer.position.copy(object.position);
    this.gizmoContainer.rotation.copy(object.rotation);
    
    // Make sure gizmo container is in the scene and visible
    if (!this.gizmoContainer.parent) {
      this.worldRenderer.scene.add(this.gizmoContainer);
    }
    this.gizmoContainer.visible = true;
    
    // Update gizmo visibility based on current mode
    this.updateGizmoVisibility();

    // Highlight object
    this.highlightObject(object, true);

    // Update UI
    this.updatePropertiesPanel();
    this.updateSceneTree();

    this.updateStatus(`Selected: ${object.userData?.displayName || object.userData?.name || 'Object'}`);
  }

  deselectAll() {
    if (this.selectedObject) {
      this.highlightObject(this.selectedObject, false);
    }

    this.selectedObject = null;
    this.selectedObjects = [];
    this.gizmoContainer.visible = false;

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
    this.dragStartRotation = this.selectedObject.rotation.clone();
    this.dragStartScale = this.selectedObject.scale.clone();
    this.dragStartMouse = { x: this.mouse.x, y: this.mouse.y };

    if (this.transformMode === 'translate') {
      // Create invisible plane for dragging
      const planeGeometry = new THREE.PlaneGeometry(100, 100);
      const planeMaterial = new THREE.MeshBasicMaterial({ visible: false });
      this.dragPlane = new THREE.Mesh(planeGeometry, planeMaterial);
      this.dragPlane.lookAt(this.worldRenderer.camera.position);
      this.dragPlane.position.copy(this.selectedObject.position);
      this.worldRenderer.scene.add(this.dragPlane);
    }
  }

  handleDrag(event, canvas) {
    if (!this.isDragging || !this.selectedObject) return;

    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const deltaX = this.mouse.x - this.dragStartMouse.x;
    const deltaY = this.mouse.y - this.dragStartMouse.y;

    if (this.transformMode === 'translate') {
      this.handleTranslateDrag();
    } else if (this.transformMode === 'rotate') {
      this.handleRotateDrag(deltaX, deltaY);
    } else if (this.transformMode === 'scale') {
      this.handleScaleDrag(deltaX, deltaY);
    }

    this.updatePropertiesPanel();
  }

  handleTranslateDrag() {
    this.raycaster.setFromCamera(this.mouse, this.worldRenderer.camera);
    const intersects = this.raycaster.intersectObject(this.dragPlane);

    if (intersects.length > 0) {
      const point = intersects[0].point;

      // Move along selected axis
      if (this.dragAxis === 'x') this.selectedObject.position.x = point.x;
      if (this.dragAxis === 'y') this.selectedObject.position.y = point.y;
      if (this.dragAxis === 'z') this.selectedObject.position.z = point.z;

      // Update gizmo position
      this.gizmoContainer.position.copy(this.selectedObject.position);
    }
  }

  handleRotateDrag(deltaX, deltaY) {
    const sensitivity = 3;

    if (this.dragAxis === 'x') {
      this.selectedObject.rotation.x = this.dragStartRotation.x + deltaY * sensitivity;
    } else if (this.dragAxis === 'y') {
      this.selectedObject.rotation.y = this.dragStartRotation.y + deltaX * sensitivity;
    } else if (this.dragAxis === 'z') {
      this.selectedObject.rotation.z = this.dragStartRotation.z + deltaX * sensitivity;
    }

    // Update gizmo rotation to match
    this.gizmoContainer.rotation.copy(this.selectedObject.rotation);
  }

  handleScaleDrag(deltaX, deltaY) {
    const sensitivity = 2;
    const delta = (deltaX + deltaY) * sensitivity;

    if (this.dragAxis === 'all') {
      // Uniform scale
      const scale = Math.max(0.1, 1 + delta);
      this.selectedObject.scale.setScalar(scale * this.dragStartScale.x);
    } else {
      // Axis scale
      const scale = Math.max(0.1, 1 + delta);
      if (this.dragAxis === 'x') this.selectedObject.scale.x = scale * this.dragStartScale.x;
      if (this.dragAxis === 'y') this.selectedObject.scale.y = scale * this.dragStartScale.y;
      if (this.dragAxis === 'z') this.selectedObject.scale.z = scale * this.dragStartScale.z;
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

  // Update scene name display
  updateSceneName(name) {
    this.sceneName = name;
    const nameEl = document.getElementById('editor-scene-name');
    if (nameEl) {
      nameEl.textContent = '📁 ' + name;
    }
  }

  // New Scene
  newScene() {
    // Confirm if there are unsaved changes
    const objects = this.getEditableObjects();
    if (objects.length > 1) {
      if (!confirm('Create new scene? Unsaved changes will be lost.')) {
        return;
      }
    }

    // Ask for scene name
    const sceneName = prompt('Enter scene name:', 'My World');
    if (!sceneName) return;

    // Clear all objects
    this.getEditableObjects().forEach(obj => {
      this.worldRenderer.scene.remove(obj);
    });

    // Clear arrays
    this.worldRenderer.crystals = [];
    if (this.worldRenderer.lights) this.worldRenderer.lights = [];

    // Create minimum required objects:
    // 1. Floor
    this.createFloor();
    
    // 2. The Rift Portal
    this.createDefaultPortal();
    
    // 3. Avatar (player) is handled by mechanics

    // Update scene name
    this.updateSceneName(sceneName);

    // Reset camera
    this.worldRenderer.mechanics.playerPosition.set(0, 1.6, 5);

    this.deselectAll();
    this.updateSceneTree();
    this.updateStatus(`New scene "${sceneName}" created with floor, avatar, and portal`);
  }

  createFloor() {
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a15,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.userData = { name: 'Floor', type: 'floor' };
    this.worldRenderer.scene.add(floor);
    this.worldRenderer.floor = floor;
  }

  createDefaultPortal() {
    const portal = this.worldRenderer.createPortal();
    portal.position.set(0, 2, -10);
    portal.userData = {
      name: 'The Rift',
      url: 'https://rift.riftclaw.com',
      type: 'portal'
    };
    this.worldRenderer.scene.add(portal);
    this.worldRenderer.portal = portal;
  }

  // New object types (placeholders for now)
  addParticles() {
    this.updateStatus('Particles: Coming soon!');
  }

  addPlatform() {
    const geometry = new THREE.BoxGeometry(2, 0.2, 2);
    const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const platform = new THREE.Mesh(geometry, material);
    platform.position.set(0, 1, 0);
    platform.userData = { name: 'Platform', type: 'platform' };
    this.worldRenderer.scene.add(platform);
    this.worldRenderer.crystals.push(platform);
    this.selectObject(platform);
    this.updateSceneTree();
    this.updateStatus('Added platform');
  }

  addChair() {
    this.updateStatus('Chair: Coming soon! (Need 3D model)');
  }

  addDesk() {
    this.updateStatus('Desk: Coming soon! (Need 3D model)');
  }

  importModel() {
    document.getElementById('editor-model-input').click();
  }

  handleModelImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    this.updateStatus(`Importing ${file.name}... (Coming soon!)`);
  }

  // View menu actions
  toggleGrid() {
    if (this.worldRenderer.gridHelper) {
      this.worldRenderer.gridHelper.visible = !this.worldRenderer.gridHelper.visible;
      this.updateStatus(this.worldRenderer.gridHelper.visible ? 'Grid visible' : 'Grid hidden');
    }
  }

  toggleStars() {
    if (this.worldRenderer.stars) {
      this.worldRenderer.stars.visible = !this.worldRenderer.stars.visible;
      this.updateStatus(this.worldRenderer.stars.visible ? 'Stars visible' : 'Stars hidden');
    }
  }

  resetCamera() {
    // Reset camera to default position
    this.worldRenderer.mechanics.playerPosition.set(0, 1.6, 5);
    this.worldRenderer.mechanics.yaw = 0;
    this.worldRenderer.mechanics.pitch = 0;
    this.updateStatus('Camera reset');
  }

  // UI Updates
  updateSceneTree() {
    const tree = document.getElementById('editor-scene-tree');
    if (!tree) return;
    
    const objects = this.getEditableObjects();

    // Icon mapping for different object types
    const getIcon = (type) => {
      switch(type) {
        case 'portal': return '🌀';
        case 'floor': return '⬜';
        case 'crystal': return '💎';
        case 'light': return '💡';
        case 'platform': return '⬜';
        case 'stars': return '✦';
        case 'grid': return '⊞';
        default: return '📦';
      }
    };

    if (objects.length === 0) {
      tree.innerHTML = '<p class="no-selection">No objects in scene</p>';
      return;
    }

    tree.innerHTML = objects.map((obj, i) => `
      <div class="scene-item ${obj === this.selectedObject ? 'selected' : ''}" data-index="${i}">
        ${getIcon(obj.userData.type)} ${obj.userData.displayName || obj.userData.name || 'Object'}
      </div>
    `).join('');

    // Add click handlers
    tree.querySelectorAll('.scene-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(item.dataset.index);
        if (objects[index]) {
          this.selectObject(objects[index]);
        }
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
      name: this.sceneName,
      version: '1.0',
      exportedAt: new Date().toISOString(),
      objects: objects
    };
  }

  importSceneData(data) {
    // Update scene name
    if (data.name) {
      this.updateSceneName(data.name);
    }

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
