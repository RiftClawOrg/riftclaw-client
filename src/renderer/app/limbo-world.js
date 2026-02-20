/**
 * Limbo World Renderer
 *
 * Renders the Limbo starting area locally (no iframe)
 * Simple scene with portal to The Rift
 */

class LimboWorldRenderer {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.portal = null;
    this.crystals = [];
    this.mechanics = null;
    this.onTravel = null;
    this.playerMesh = null; // Visual representation of player
  }

  init() {
    // Clear container
    this.container.innerHTML = '';

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'limbo-canvas';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.tabIndex = 0;
    this.container.appendChild(canvas);

    // Three.js setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050510);
    this.scene.fog = new THREE.FogExp2(0x050510, 0.02);

    this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Build world
    this.buildWorld();

    // Setup shared mechanics (3rd person + jumping)
    this.mechanics = new WorldMechanics(this.camera, canvas);
    this.mechanics.setOnPortalEnter((name, url) => {
      if (this.onTravel) this.onTravel(name, url);
    });

    // Create player visual
    this.createPlayerVisual();

    // Start render loop
    this.animate();

    // Handle resize
    window.addEventListener('resize', () => this.onResize());

    console.log('[LimboWorld] Initialized with shared mechanics');
  }

  createPlayerVisual() {
    // Simple player representation (glowing cube)
    const geometry = new THREE.BoxGeometry(0.5, 1.8, 0.5);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00d5ff,
      emissive: 0x00d5ff,
      emissiveIntensity: 0.5
    });
    this.playerMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.playerMesh);
  }

  buildWorld() {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a15,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    // Grid
    const gridHelper = new THREE.GridHelper(50, 50, 0x00d5ff, 0x1a1a2a);
    this.scene.add(gridHelper);

    // Portal to The Rift
    this.portal = this.createPortal();
    this.portal.position.set(0, 2, -10);
    this.scene.add(this.portal);

    // Portal label (above portal)
    this.createLabel('The Rift →', 0, 5.5, -10);

    // Floating crystals
    this.createCrystals();

    // Ambient starfield
    this.createStarfield();

    // Portal glow effect
    this.createPortalGlow();
  }

  createPortal() {
    const portalGroup = new THREE.Group();

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

    // Portal particles
    const particleCount = 50;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 2 + Math.random() * 0.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x00d5ff,
      size: 0.05,
      transparent: true,
      opacity: 0.8
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    portalGroup.add(particles);

    // Store references for animation and portal data
    portalGroup.userData = {
      frame,
      center,
      particles,
      name: 'The Rift',
      url: 'https://rift.riftclaw.com'
    };

    return portalGroup;
  }

  createLabel(text, x, y, z) {
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
        (Math.random() - 0.5) * 20,
        1 + Math.random() * 3,
        (Math.random() - 0.5) * 20 - 5
      );
      crystal.userData = {
        speed: 0.5 + Math.random() * 0.5,
        offset: Math.random() * Math.PI * 2
      };
      this.scene.add(crystal);
      this.crystals.push(crystal);
    }
  }

  createStarfield() {
    const starCount = 1000;
    const starGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Random position in sphere around scene
      const radius = 50 + Math.random() * 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Star colors (white, cyan, light blue)
      const colorChoice = Math.random();
      if (colorChoice < 0.7) {
        // White
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
      } else if (colorChoice < 0.85) {
        // Cyan
        colors[i * 3] = 0;
        colors[i * 3 + 1] = 0.8;
        colors[i * 3 + 2] = 1;
      } else {
        // Light blue
        colors[i * 3] = 0.5;
        colors[i * 3 + 1] = 0.7;
        colors[i * 3 + 2] = 1;
      }
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });

    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.stars);
  }

  createPortalGlow() {
    // Create a point light at portal position
    this.portalLight = new THREE.PointLight(0x00d5ff, 2, 20);
    this.portalLight.position.copy(this.portal.position);
    this.scene.add(this.portalLight);

    // Create glow sprite
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');

    // Draw radial gradient glow
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(0, 213, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(0, 213, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 213, 255, 0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    this.portalGlow = new THREE.Sprite(spriteMaterial);
    this.portalGlow.position.copy(this.portal.position);
    this.portalGlow.scale.set(8, 8, 1);
    this.scene.add(this.portalGlow);

    // Store initial intensity for pulsing
    this.portalGlowIntensity = 2;
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const time = Date.now() * 0.001;
    const delta = 0.016;

    // Update shared mechanics (movement, jumping, 3rd person camera)
    if (this.mechanics) {
      this.mechanics.update(delta);

      // Update player visual position
      if (this.playerMesh) {
        const pos = this.mechanics.getPlayerPosition();
        this.playerMesh.position.copy(pos);
      }

      // Check portal collisions
      if (this.portal) {
        this.mechanics.checkPortalCollisions([this.portal]);
      }
    }

    // Animate stars (slow rotation)
    if (this.stars) {
      this.stars.rotation.y += 0.0002;
      this.stars.rotation.x += 0.0001;
    }

    // Animate portal
    if (this.portal) {
      const { frame, center, particles } = this.portal.userData;
      frame.rotation.z += 0.01;
      center.material.opacity = 0.3 + Math.sin(time * 2) * 0.1;
      particles.rotation.y += 0.005;

      // Pulse portal glow
      if (this.portalGlow && this.portalLight) {
        const pulse = 0.5 + Math.sin(time * 3) * 0.5;
        this.portalLight.intensity = 1 + pulse;
        this.portalGlow.material.opacity = 0.3 + pulse * 0.3;
        this.portalGlow.scale.setScalar(6 + pulse * 2);
      }
    }

    // Animate crystals
    this.crystals.forEach(crystal => {
      crystal.position.y = 2 + Math.sin(time * crystal.userData.speed + crystal.userData.offset) * 0.5;
      crystal.rotation.x += 0.01;
      crystal.rotation.y += 0.02;
    });

    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  setOnTravel(callback) {
    this.onTravel = callback;
  }

  destroy() {
    window.removeEventListener('resize', () => this.onResize());
    this.renderer.dispose();
    this.container.innerHTML = '';
  }
}

// Export for use
if (typeof module !== 'undefined') {
  module.exports = LimboWorldRenderer;
}
