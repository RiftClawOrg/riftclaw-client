/**
 * RiftClaw Shared World Mechanics
 *
 * Common functionality shared across all worlds:
 * - Movement (WASD + Jump)
 * - Camera (3rd person)
 * - Portal detection
 * - Physics (gravity)
 */

class WorldMechanics {
  constructor(camera, canvas) {
    this.camera = camera;
    this.canvas = canvas;

    // Input state
    this.keys = {};
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };

    // Camera
    this.yaw = 0;
    this.pitch = 0;

    // 3rd person camera
    this.cameraOffset = new THREE.Vector3(0, 2, 5); // Behind and above player
    this.cameraSmoothness = 0.1;

    // Physics
    this.playerPosition = new THREE.Vector3(0, 1.6, 5);
    this.playerVelocity = new THREE.Vector3(0, 0, 0);
    this.isGrounded = false;
    this.gravity = -20;
    this.jumpForce = 8;
    this.groundLevel = 1.6;

    // Portal detection
    this.onPortalEnter = null;
    this.portalTriggered = false;

    this.setupControls();
  }

  setupControls() {
    const canvas = this.canvas;

    canvas.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;

      // Prevent default for game keys
      if (['w', 'a', 's', 'd', ' ', 'space'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    });

    canvas.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
      canvas.focus();
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.previousMousePosition.x;
        const deltaY = e.clientY - this.previousMousePosition.y;

        this.yaw -= deltaX * 0.005;
        this.pitch -= deltaY * 0.005;
        this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });
  }

  update(delta) {
    this.updateMovement(delta);
    this.updatePhysics(delta);
    this.updateCamera();
  }

  updateMovement(delta) {
    const speed = 8;
    const direction = new THREE.Vector3();

    if (this.keys['w']) direction.z -= 1;
    if (this.keys['s']) direction.z += 1;
    if (this.keys['a']) direction.x -= 1;
    if (this.keys['d']) direction.x += 1;

    // Normalize and apply rotation
    if (direction.length() > 0) {
      direction.normalize();
      direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

      this.playerVelocity.x = direction.x * speed;
      this.playerVelocity.z = direction.z * speed;
    } else {
      // Deceleration
      this.playerVelocity.x *= 0.8;
      this.playerVelocity.z *= 0.8;
    }

    // Jump
    if (this.keys[' '] && this.isGrounded) {
      this.playerVelocity.y = this.jumpForce;
      this.isGrounded = false;
    }
  }

  updatePhysics(delta) {
    // Apply gravity
    this.playerVelocity.y += this.gravity * delta;

    // Update position
    this.playerPosition.x += this.playerVelocity.x * delta;
    this.playerPosition.y += this.playerVelocity.y * delta;
    this.playerPosition.z += this.playerVelocity.z * delta;

    // Ground collision
    if (this.playerPosition.y <= this.groundLevel) {
      this.playerPosition.y = this.groundLevel;
      this.playerVelocity.y = 0;
      this.isGrounded = true;
    }
  }

  updateCamera() {
    // Calculate desired camera position (3rd person)
    const offset = this.cameraOffset.clone();

    // Rotate offset by yaw
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    // Add pitch rotation (looking up/down)
    const pitchOffset = new THREE.Vector3(0, Math.sin(this.pitch) * 3, -Math.cos(this.pitch) * 2);
    offset.add(pitchOffset);

    const targetPosition = this.playerPosition.clone().add(offset);

    // Smooth camera follow
    this.camera.position.lerp(targetPosition, this.cameraSmoothness);

    // Look at player
    this.camera.lookAt(this.playerPosition);
  }

  checkPortalCollisions(portals) {
    if (this.portalTriggered) return;

    const portalRadius = 2.5;

    for (const portal of portals) {
      const portalPos = portal.position;
      const distance = this.playerPosition.distanceTo(portalPos);

      if (distance < portalRadius) {
        console.log('[Mechanics] Player entered portal:', portal.userData?.name);
        this.portalTriggered = true;

        if (this.onPortalEnter) {
          this.onPortalEnter(portal.userData?.name, portal.userData?.url);
        }
        break;
      }
    }
  }

  setOnPortalEnter(callback) {
    this.onPortalEnter = callback;
  }

  getPlayerPosition() {
    return this.playerPosition;
  }

  resetPortalTrigger() {
    this.portalTriggered = false;
  }

  focus() {
    this.canvas.focus();
  }
}

// Export for use
if (typeof module !== 'undefined') {
  module.exports = WorldMechanics;
}
