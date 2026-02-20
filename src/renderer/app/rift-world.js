/**
 * The Rift World Renderer
 * 
 * Renders The Rift hub world locally based on scene JSON
 */

class RiftWorldRenderer {
  constructor(container, sceneData) {
    this.container = container;
    this.sceneData = sceneData;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.portals = [];
  }

  init() {
    // Clear container
    this.container.innerHTML = '';

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'rift-canvas';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.tabIndex = 0; // Make focusable
    this.container.appendChild(canvas);

    // Focus canvas for keyboard input
    canvas.focus();

    // Setup keyboard controls
    this.setupControls(canvas);

    // Three.js setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050510);
    this.scene.fog = new THREE.FogExp2(0x050510, 0.02);

    this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 1.6, 5);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00d5ff, 0.5);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);

    // Build world from scene data
    this.buildWorld();

    // Start render loop
    this.animate();

    // Handle resize
    window.addEventListener('resize', () => this.onResize());

    console.log('[RiftWorld] Initialized');
  }

  setupControls(canvas) {
    const keys = {};
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    // Keys that The Rift handles
    const riftKeys = ['w', 'a', 's', 'd'];

    canvas.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      keys[key] = true;

      // Only prevent default for WASD (allow other keys to bubble)
      if (riftKeys.includes(key)) {
        e.preventDefault();
      }
    });

    canvas.addEventListener('keyup', (e) => {
      keys[e.key.toLowerCase()] = false;
    });

    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
      canvas.focus();
    });

    canvas.addEventListener('mouseup', () => {
      isDragging = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        // Rotate camera
        const yaw = deltaX * 0.005;
        const pitch = deltaY * 0.005;

        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y -= yaw;
        this.camera.rotation.x -= pitch;
        this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    // Store keys for use in animate
    this.controls = { keys };

    console.log('[RiftWorld] Controls setup');
  }

  buildWorld() {
    const { sceneData } = this;

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a15,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    // Grid
    const gridHelper = new THREE.GridHelper(100, 100, 0x00d5ff, 0x1a1a2a);
    this.scene.add(gridHelper);

    // Create portals from scene data
    if (sceneData.portals && sceneData.portals.length > 0) {
      sceneData.portals.forEach((portalData, index) => {
        this.createPortal(portalData, index, sceneData.portals.length);
      });
    } else {
      // Default portal if none provided
      this.createPortal({ name: 'Limbo', url: 'local' }, 0, 1);
    }

    // Floating crystals (decoration)
    this.createCrystals();
  }

  createPortal(portalData, index, total) {
    // Position in circle
    const angle = (index / total) * Math.PI * 2;
    const radius = 10;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;

    const portalGroup = new THREE.Group();
    portalGroup.position.set(x, 2, z);

    // Portal frame
    const frameGeometry = new THREE.TorusGeometry(2, 0.2, 16, 100);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x00d5ff,
      emissive: 0x00d5ff,
      emissiveIntensity: 0.5
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    portalGroup.add(frame);

    // Portal center
    const centerGeometry = new THREE.CircleGeometry(1.8, 32);
    const centerMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    portalGroup.add(center);

    // Store portal data
    portalGroup.userData = {
      name: portalData.name,
      url: portalData.url,
      id: portalData.id
    };
    this.portals.push(portalGroup);

    this.scene.add(portalGroup);

    // Label
    this.createLabel(portalData.name, x, 4, z);
  }

  createLabel(text, x, y, z) {
    // Create text sprite
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fillRect(0, 0, 256, 64);

    context.font = 'bold 24px Arial';
    context.fillStyle = '#00d5ff';
    context.textAlign = 'center';
    context.fillText(text, 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(x, y, z);
    sprite.scale.set(4, 1, 1);

    this.scene.add(sprite);
  }

  createCrystals() {
    const crystalGeometry = new THREE.OctahedronGeometry(0.3);
    const crystalMaterial = new THREE.MeshStandardMaterial({
      color: 0xff00ff,
      emissive: 0xff00ff,
      emissiveIntensity: 0.3
    });

    for (let i = 0; i < 10; i++) {
      const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
      crystal.position.set(
        (Math.random() - 0.5) * 40,
        1 + Math.random() * 3,
        (Math.random() - 0.5) * 40
      );
      crystal.userData = {
        speed: 0.5 + Math.random() * 0.5,
        offset: Math.random() * Math.PI * 2
      };
      this.scene.add(crystal);

      // Store for animation
      if (!this.crystals) this.crystals = [];
      this.crystals.push(crystal);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const time = Date.now() * 0.001;
    const delta = 0.016; // Approx 60fps

    // Handle movement if controls are setup
    if (this.controls && this.controls.keys) {
      const speed = 5 * delta;
      const direction = new THREE.Vector3();

      if (this.controls.keys['w']) direction.z -= 1;
      if (this.controls.keys['s']) direction.z += 1;
      if (this.controls.keys['a']) direction.x -= 1;
      if (this.controls.keys['d']) direction.x += 1;

      direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camera.rotation.y);
      direction.normalize();

      this.camera.position.add(direction.multiplyScalar(speed));
    }

    // Animate portals
    this.portals.forEach((portal, i) => {
      portal.children[0].rotation.z += 0.01; // Frame rotation
      portal.children[1].material.opacity = 0.3 + Math.sin(time * 2 + i) * 0.1;
    });

    // Animate crystals
    if (this.crystals) {
      this.crystals.forEach(crystal => {
        crystal.position.y = 2 + Math.sin(time * crystal.userData.speed + crystal.userData.offset) * 0.5;
        crystal.rotation.x += 0.01;
        crystal.rotation.y += 0.02;
      });
    }

    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  getPortals() {
    return this.portals;
  }

  destroy() {
    window.removeEventListener('resize', () => this.onResize());
    this.renderer.dispose();
    this.container.innerHTML = '';
  }
}

// Export for use
if (typeof module !== 'undefined') {
  module.exports = RiftWorldRenderer;
}

// Keyboard forwarding for The Rift
// Keys that The Rift handles (WASD + mouse)
const riftKeys = ['w', 'a', 's', 'd'];

document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();

  // Forward non-rift keys to parent
  if (!riftKeys.includes(key) && window.parent !== window) {
    console.log('[RiftWorld] Forwarding key to parent:', key);
    window.parent.postMessage({ type: 'keypress', key: e.key }, '*');
  }
});

console.log('[RiftWorld] Keyboard forwarding initialized');
