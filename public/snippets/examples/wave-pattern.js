import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================================================
// WAVE PATTERN VISUALIZATION - WITH ORBIT CONTROLS
// ============================================================================
// Animated 3D wave grid like sound/audio visualization
// Includes OrbitControls for exploring camera positions
//
// CONTROLS:
// - Left mouse: Rotate camera
// - Right mouse: Pan camera
// - Scroll wheel: Zoom in/out
// - Check console for current camera position (logged every 2 seconds)
// ============================================================================

// ============================================================================
// CONFIGURATION PARAMETERS
// ============================================================================

const GRID_SIZE = 50;                 // Number of points in grid (50x50)
const GRID_SPACING = 0.5;             // Distance between grid points
const WAVE_AMPLITUDE = 2;             // Height of waves
const WAVE_SPEED = 0.05;              // Speed of wave animation
const WAVE_FREQUENCY = 0.3;           // Frequency of waves (more = tighter)
const LINE_COLOR = 0xff1493;          // Hotpink wireframe color
const LINE_OPACITY = 0.5;             // Transparency
const BACKGROUND_COLOR = 0x1a1a1a;    // Dark background
const CAMERA_DISTANCE = 40;           // Camera distance

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

let camera, scene, renderer, controls;
let waveMesh;
let time = 0;
let lastLogTime = 0;

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

    // Add OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 100;

    createWaveGrid();

    window.addEventListener('resize', handleResize);

    // Log camera position on first load
    console.log('=== WAVE PATTERN - Camera Position Finder ===');
    console.log('Use mouse to explore different angles');
    console.log('Current camera position will be logged every 2 seconds');
    logCameraPosition();

    animate();
}

// ============================================================================
// CREATE WAVE GRID
// ============================================================================

function createWaveGrid() {
    const geometry = new THREE.PlaneGeometry(
        GRID_SIZE * GRID_SPACING,
        GRID_SIZE * GRID_SPACING,
        GRID_SIZE - 1,
        GRID_SIZE - 1
    );

    // Rotate to be horizontal
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshBasicMaterial({
        color: LINE_COLOR,
        wireframe: true,
        transparent: true,
        opacity: LINE_OPACITY
    });

    waveMesh = new THREE.Mesh(geometry, material);
    scene.add(waveMesh);
}

// ============================================================================
// UPDATE WAVE
// ============================================================================

function updateWave() {
    const positions = waveMesh.geometry.attributes.position.array;

    // Update each vertex height based on wave equation
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];

        // Create wave effect using sine waves
        const distance = Math.sqrt(x * x + z * z);
        const wave1 = Math.sin(distance * WAVE_FREQUENCY - time) * WAVE_AMPLITUDE;
        const wave2 = Math.sin(x * WAVE_FREQUENCY * 0.5 + time * 0.5) * WAVE_AMPLITUDE * 0.5;

        // Combine waves for more interesting pattern
        positions[i + 1] = wave1 + wave2;
    }

    // Tell Three.js to update the geometry
    waveMesh.geometry.attributes.position.needsUpdate = true;
    waveMesh.geometry.computeVertexNormals();

    // Increment time for animation
    time += WAVE_SPEED;
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
// LOG CAMERA POSITION
// ============================================================================

function logCameraPosition() {
    const pos = camera.position;
    const rounded = {
        x: Math.round(pos.x * 100) / 100,
        y: Math.round(pos.y * 100) / 100,
        z: Math.round(pos.z * 100) / 100
    };

    console.log('📷 Camera Position:', rounded);
    console.log(`   Copy this: camera.position.set(${rounded.x}, ${rounded.y}, ${rounded.z});`);
}

// ============================================================================
// ANIMATION LOOP
// ============================================================================

function animate() {
    requestAnimationFrame(animate);
    updateWave();

    // Update controls (required for damping)
    controls.update();

    // Log camera position every 2 seconds
    const currentTime = Date.now();
    if (currentTime - lastLogTime > 2000) {
        logCameraPosition();
        lastLogTime = currentTime;
    }

    renderer.render(scene, camera);
}

// ============================================================================
// START
// ============================================================================

init();
