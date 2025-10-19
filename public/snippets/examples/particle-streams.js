import * as THREE from 'three';

// ============================================================================
// PARTICLE STREAMS
// ============================================================================
// Flowing particle streams like data transmission or energy flow
// Perfect for tech/data visualization backgrounds
// ============================================================================

// ============================================================================
// CONFIGURATION PARAMETERS
// ============================================================================

const STREAM_COUNT = 200;               // Number of particle streams
const PARTICLES_PER_STREAM = 30;     // Particles in each stream
const PARTICLE_SIZE = 0.15;           // Size of each particle
const PARTICLE_COLOR = 0xff1493;      // Hotpink particles
const PARTICLE_OPACITY = 0.6;         // Transparency
const STREAM_SPEED = 0.002;            // How fast particles flow
const STREAM_LENGTH = 20;             // Length of the stream path
const BACKGROUND_COLOR = 0x1a1a1a;    // Dark background
const CAMERA_Z = 15;                  // Camera distance

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

let camera, scene, renderer;
let particleSystems = [];

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

    createStreams();

    window.addEventListener('resize', handleResize);
    animate();
}

// ============================================================================
// CREATE PARTICLE STREAMS
// ============================================================================

function createStreams() {
    for (let s = 0; s < STREAM_COUNT; s++) {
        const positions = new Float32Array(PARTICLES_PER_STREAM * 3);
        const colors = new Float32Array(PARTICLES_PER_STREAM * 3);
        const sizes = new Float32Array(PARTICLES_PER_STREAM);

        const color = new THREE.Color(PARTICLE_COLOR);

        // Initialize particles along the stream path
        for (let i = 0; i < PARTICLES_PER_STREAM; i++) {
            const t = i / PARTICLES_PER_STREAM;

            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;

            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            // Particles fade out at the end of stream
            sizes[i] = PARTICLE_SIZE * (1 - t);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: PARTICLE_SIZE,
            vertexColors: true,
            transparent: true,
            opacity: PARTICLE_OPACITY,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const particleSystem = new THREE.Points(geometry, material);

        // Create unique path for this stream
        // Random starting position and direction
        particleSystem.userData.pathOrigin = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 5 - 5
        );

        particleSystem.userData.pathDirection = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            Math.random() + 0.5  // Always flow toward camera
        ).normalize();

        particleSystem.userData.offset = Math.random() * Math.PI * 2;
        particleSystem.userData.progress = 0;

        scene.add(particleSystem);
        particleSystems.push(particleSystem);
    }
}

// ============================================================================
// UPDATE STREAMS
// ============================================================================

function updateStreams() {
    particleSystems.forEach(system => {
        const positions = system.geometry.attributes.position.array;
        const origin = system.userData.pathOrigin;
        const direction = system.userData.pathDirection;
        const offset = system.userData.offset;

        // Update progress
        system.userData.progress += STREAM_SPEED;

        for (let i = 0; i < PARTICLES_PER_STREAM; i++) {
            const t = (i / PARTICLES_PER_STREAM + system.userData.progress) % 1;
            const distance = t * STREAM_LENGTH;

            // Create curved path with sine wave
            const curveAmount = Math.sin(t * Math.PI * 4 + offset) * 0.5;

            positions[i * 3] = origin.x + direction.x * distance + curveAmount;
            positions[i * 3 + 1] = origin.y + direction.y * distance + Math.sin(t * Math.PI * 2) * 0.5;
            positions[i * 3 + 2] = origin.z + direction.z * distance;
        }

        system.geometry.attributes.position.needsUpdate = true;
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
    updateStreams();
    renderer.render(scene, camera);
}

// ============================================================================
// START
// ============================================================================

init();
