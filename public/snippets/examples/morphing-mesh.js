import * as THREE from 'three';

// ============================================================================
// MORPHING MESH
// ============================================================================
// An organic, undulating surface that morphs and flows
// Hypnotic and fluid, like a living organism
// ============================================================================

// ============================================================================
// CONFIGURATION PARAMETERS
// ============================================================================

const MESH_SIZE = 20;                 // Size of the mesh
const MESH_SEGMENTS = 40;             // Detail level (higher = smoother)
const MORPH_AMPLITUDE = 3;            // Height of deformations
const MORPH_SPEED = 0.03;             // Speed of morphing
const MORPH_COMPLEXITY = 0.5;         // Frequency of deformations
const MESH_COLOR = 0xff1493;          // Hotpink color
const MESH_OPACITY = 0.5;             // Transparency
const BACKGROUND_COLOR = 0x1a1a1a;    // Dark background
const CAMERA_DISTANCE = 25;           // Camera distance

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

let camera, scene, renderer;
let mesh;
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
    camera.position.set(CAMERA_DISTANCE, CAMERA_DISTANCE * 0.5, CAMERA_DISTANCE);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);

    document.body.appendChild(renderer.domElement);
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';

    createMorphingMesh();

    window.addEventListener('resize', handleResize);
    animate();
}

// ============================================================================
// CREATE MORPHING MESH
// ============================================================================

function createMorphingMesh() {
    const geometry = new THREE.PlaneGeometry(
        MESH_SIZE,
        MESH_SIZE,
        MESH_SEGMENTS,
        MESH_SEGMENTS
    );

    const material = new THREE.MeshBasicMaterial({
        color: MESH_COLOR,
        wireframe: true,
        transparent: true,
        opacity: MESH_OPACITY,
        side: THREE.DoubleSide
    });

    mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 4;

    scene.add(mesh);
}

// ============================================================================
// UPDATE MORPHING MESH
// ============================================================================

function updateMesh() {
    const positions = mesh.geometry.attributes.position.array;

    // Apply multiple layers of sine waves to create organic movement
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];

        // Layer 1: Large rolling waves
        const wave1 = Math.sin(x * MORPH_COMPLEXITY + time) *
                     Math.cos(y * MORPH_COMPLEXITY + time * 0.7);

        // Layer 2: Faster ripples
        const wave2 = Math.sin(x * MORPH_COMPLEXITY * 2 - time * 1.5) *
                     Math.cos(y * MORPH_COMPLEXITY * 2 + time * 1.2) * 0.5;

        // Layer 3: Fine detail
        const wave3 = Math.sin((x + y) * MORPH_COMPLEXITY * 3 + time * 2) * 0.25;

        // Combine waves with amplitude
        positions[i + 2] = (wave1 + wave2 + wave3) * MORPH_AMPLITUDE;
    }

    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.geometry.computeVertexNormals();

    // Slowly rotate the mesh
    mesh.rotation.z += 0.001;

    time += MORPH_SPEED;
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
    updateMesh();

    // Optional: Orbit camera around the mesh
    // Uncomment to enable:
    // const orbitSpeed = 0.0005;
    // camera.position.x = Math.cos(time * orbitSpeed) * CAMERA_DISTANCE;
    // camera.position.z = Math.sin(time * orbitSpeed) * CAMERA_DISTANCE;
    // camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
}

// ============================================================================
// START
// ============================================================================

init();
