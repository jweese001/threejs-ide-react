import * as THREE from 'three';

// ============================================================================
// PULSING GRID
// ============================================================================
// A grid with pulsing points like a heartbeat monitor or data visualization
// Perfect for healthcare/medical or tech monitoring themes
// ============================================================================

// ============================================================================
// CONFIGURATION PARAMETERS
// ============================================================================

const GRID_SIZE = 20;                 // Number of grid points (20x20)
const GRID_SPACING = 1;               // Distance between points
const PULSE_AMPLITUDE = 0.5;          // Height of pulses
const PULSE_SPEED = 2;                // Speed of pulse waves
const PULSE_FREQUENCY = 0.5;          // How often pulses occur
const POINT_SIZE = 0.15;              // Size of grid points
const POINT_COLOR = 0xff1493;         // Hotpink
const LINE_COLOR = 0xff69b4;          // Lighter pink for grid lines
const POINT_OPACITY = 0.8;            // Transparency of points
const LINE_OPACITY = 0.3;             // Transparency of lines
const BACKGROUND_COLOR = 0x1a1a1a;    // Dark background
const CAMERA_DISTANCE = 0;           // Camera distance

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

let camera, scene, renderer;
let points, gridLines;
let time = 0;

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(BACKGROUND_COLOR);

    camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    camera.position.set(CAMERA_DISTANCE, CAMERA_DISTANCE, CAMERA_DISTANCE);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);

    document.body.appendChild(renderer.domElement);
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';

    createGrid();
    createPoints();

    window.addEventListener('resize', handleResize);
    animate();
}

// ============================================================================
// CREATE GRID LINES
// ============================================================================

function createGrid() {
    const material = new THREE.LineBasicMaterial({
        color: LINE_COLOR,
        transparent: true,
        opacity: LINE_OPACITY
    });

    const lineGeometry = new THREE.BufferGeometry();
    const positions = [];

    const halfSize = (GRID_SIZE * GRID_SPACING) / 2;

    // Horizontal lines
    for (let i = 0; i <= GRID_SIZE; i++) {
        const y = (i * GRID_SPACING) - halfSize;
        positions.push(-halfSize, 0, y, halfSize, 0, y);
    }

    // Vertical lines
    for (let i = 0; i <= GRID_SIZE; i++) {
        const x = (i * GRID_SPACING) - halfSize;
        positions.push(x, 0, -halfSize, x, 0, halfSize);
    }

    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    gridLines = new THREE.LineSegments(lineGeometry, material);
    scene.add(gridLines);
}

// ============================================================================
// CREATE PULSING POINTS
// ============================================================================

function createPoints() {
    const pointCount = (GRID_SIZE + 1) * (GRID_SIZE + 1);
    const positions = new Float32Array(pointCount * 3);
    const colors = new Float32Array(pointCount * 3);
    const sizes = new Float32Array(pointCount);

    const halfSize = (GRID_SIZE * GRID_SPACING) / 2;
    const color = new THREE.Color(POINT_COLOR);

    let index = 0;
    for (let i = 0; i <= GRID_SIZE; i++) {
        for (let j = 0; j <= GRID_SIZE; j++) {
            const x = (i * GRID_SPACING) - halfSize;
            const z = (j * GRID_SPACING) - halfSize;

            positions[index * 3] = x;
            positions[index * 3 + 1] = 0;
            positions[index * 3 + 2] = z;

            colors[index * 3] = color.r;
            colors[index * 3 + 1] = color.g;
            colors[index * 3 + 2] = color.b;

            sizes[index] = POINT_SIZE;

            index++;
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: POINT_SIZE,
        vertexColors: true,
        transparent: true,
        opacity: POINT_OPACITY,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending
    });

    points = new THREE.Points(geometry, material);
    scene.add(points);
}

// ============================================================================
// UPDATE PULSING POINTS
// ============================================================================

function updatePulse() {
    const positions = points.geometry.attributes.position.array;
    const sizes = points.geometry.attributes.size.array;

    let index = 0;
    for (let i = 0; i <= GRID_SIZE; i++) {
        for (let j = 0; j <= GRID_SIZE; j++) {
            const x = positions[index * 3];
            const z = positions[index * 3 + 2];

            // Calculate distance from center for radial pulse
            const distance = Math.sqrt(x * x + z * z);

            // Create pulse wave emanating from center
            const pulse = Math.sin(distance * PULSE_FREQUENCY - time * PULSE_SPEED) * PULSE_AMPLITUDE;

            // Add secondary pulse for heartbeat effect
            const heartbeat = Math.sin(time * PULSE_SPEED * 2) * 0.2;

            // Update Y position (height)
            positions[index * 3 + 1] = Math.max(0, pulse + heartbeat);

            // Make points grow/shrink with pulse
            sizes[index] = POINT_SIZE * (1 + pulse * 0.5);

            index++;
        }
    }

    points.geometry.attributes.position.needsUpdate = true;
    points.geometry.attributes.size.needsUpdate = true;

    time += 0.016; // Approximate delta time for 60fps
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
    updatePulse();

    // Optional: Slowly rotate the grid
    // Uncomment to enable:
    // gridLines.rotation.y += 0.001;
    // points.rotation.y += 0.001;

    renderer.render(scene, camera);
}

// ============================================================================
// START
// ============================================================================

init();
