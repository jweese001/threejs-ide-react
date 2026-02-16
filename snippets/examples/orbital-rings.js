import * as THREE from 'three';

// ============================================================================
// ORBITAL RINGS
// ============================================================================
// Concentric rotating rings like atoms, orbits, or loading animations
// Clean, elegant, and hypnotic
// ============================================================================

// ============================================================================
// CONFIGURATION PARAMETERS
// ============================================================================

const RING_COUNT = 6;                 // Number of concentric rings
const RING_RADIUS_START = 2;          // Smallest ring radius
const RING_RADIUS_INCREMENT = 1.5;    // Spacing between rings
const RING_COLOR = 0xff1493;          // Hotpink
const RING_OPACITY = 0.6;             // Transparency
const RING_THICKNESS = 0.05;          // Thickness of ring tube
const ROTATION_SPEED = 0.005;         // How fast rings rotate
const BACKGROUND_COLOR = 0x1a1a1a;    // Dark background
const CAMERA_Z = 20;                  // Camera distance

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

let camera, scene, renderer;
let rings = [];

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(BACKGROUND_COLOR);

    camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    camera.position.z = CAMERA_Z;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);

    document.body.appendChild(renderer.domElement);
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';

    createRings();

    window.addEventListener('resize', handleResize);
    animate();
}

// ============================================================================
// CREATE ORBITAL RINGS
// ============================================================================

function createRings() {
    for (let i = 0; i < RING_COUNT; i++) {
        const radius = RING_RADIUS_START + (i * RING_RADIUS_INCREMENT);

        // Create torus geometry (donut shape)
        const geometry = new THREE.TorusGeometry(
            radius,           // Radius of the ring
            RING_THICKNESS,   // Thickness of the tube
            16,               // Radial segments
            100               // Tubular segments
        );

        const material = new THREE.MeshBasicMaterial({
            color: RING_COLOR,
            transparent: true,
            opacity: RING_OPACITY,
            wireframe: true
        });

        const ring = new THREE.Mesh(geometry, material);

        // Random initial rotation
        ring.rotation.x = Math.random() * Math.PI * 2;
        ring.rotation.y = Math.random() * Math.PI * 2;

        // Store rotation axis and speed (each ring rotates differently)
        ring.userData.rotationAxis = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();

        ring.userData.rotationSpeed = ROTATION_SPEED * (1 + Math.random() * 0.5);

        scene.add(ring);
        rings.push(ring);
    }
}

// ============================================================================
// UPDATE RINGS
// ============================================================================

function updateRings() {
    rings.forEach((ring, index) => {
        // Rotate each ring around its unique axis
        ring.rotateOnWorldAxis(
            ring.userData.rotationAxis,
            ring.userData.rotationSpeed
        );

        // Optional: Add subtle pulsing effect
        // const pulse = Math.sin(Date.now() * 0.001 + index) * 0.05 + 1;
        // ring.scale.set(pulse, pulse, pulse);
    });
}

// ============================================================================
// RESIZE HANDLER
// ============================================================================

function handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}

// ============================================================================
// ANIMATION LOOP
// ============================================================================

function animate() {
    requestAnimationFrame(animate);
    updateRings();

    // Optional: Slowly rotate camera view
    // Uncomment to enable:
    // camera.position.x = Math.sin(Date.now() * 0.0001) * 5;
    // camera.position.y = Math.cos(Date.now() * 0.0001) * 5;
    // camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
}

// ============================================================================
// START
// ============================================================================

init();
