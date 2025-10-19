import * as THREE from 'three';

// ============================================================================
// PARTICLE NETWORK DATA VISUALIZATION
// ============================================================================
// An abstract animated particle network showing interconnected nodes with
// dynamic line connections. Perfect for representing data flow, network
// architecture, or technological connectivity.
//
// CUSTOMIZATION GUIDE:
// - Adjust PARTICLE_COUNT for density (more = denser network)
// - Change CONNECTION_DISTANCE to control how far lines reach
// - Modify PARTICLE_COLOR and LINE_COLOR for different themes
// - Adjust DRIFT_SPEED for faster/slower animation
// - Change PARTICLE_SIZE for larger/smaller nodes
// ============================================================================

// ============================================================================
// CONFIGURATION PARAMETERS
// ============================================================================

// Particle Settings
const PARTICLE_COUNT = 200;           // Number of nodes in the network
const PARTICLE_SIZE = 3;              // Size of each particle (pixels)
const PARTICLE_COLOR = 'hotpink';      // Blue color for particles (hex)
const PARTICLE_OPACITY = 0.3;         // Transparency of particles (0-1)

// Connection Settings
const CONNECTION_DISTANCE = 120;      // Max distance to draw lines between nodes
const LINE_COLOR = 0x60a5fa;          // Lighter blue for connection lines
const LINE_OPACITY = 0.1;             // Transparency of lines (0-1)
const LINE_WIDTH = 1;                 // Thickness of connection lines

// Animation Settings
const DRIFT_SPEED = 0.3;              // Speed of particle drift (higher = faster)
const DRIFT_RANGE = 200;              // How far particles can drift from origin

// Scene Settings
const BACKGROUND_COLOR = 0x2b2b2b;    // Dark background for visibility
const CAMERA_Z = 400;                 // Camera distance (higher = zoomed out)
const FOV = 60;                       // Field of view (degrees)

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

let camera, scene, renderer;
let particles = [];                    // Array to store particle data
let particlesMesh;                     // Three.js mesh for all particles
let linesMesh;                         // Three.js mesh for connection lines

// Each particle has: position, velocity, originalPosition
// We use BufferGeometry for performance with many particles

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Create scene with grey background
    scene = new THREE.Scene();
    scene.background = new THREE.Color(BACKGROUND_COLOR);

    // Create camera
    camera = new THREE.PerspectiveCamera(FOV, w / h, 1, 2000);
    camera.position.z = CAMERA_Z;

    // Create renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Add canvas to page
    document.body.appendChild(renderer.domElement);
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';

    // Generate particles
    createParticles();

    // Create line mesh (will be updated each frame)
    createLines();

    // Handle window resize
    window.addEventListener('resize', handleResize);

    // Start animation loop
    animate();
}

// ============================================================================
// PARTICLE CREATION
// ============================================================================

function createParticles() {
    // Arrays to hold particle geometry data
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    // Color for particles (converted to RGB 0-1 range)
    const color = new THREE.Color(PARTICLE_COLOR);

    // Generate random positions for each particle
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Random position in a cube centered at origin
        const x = (Math.random() - 0.5) * 600;
        const y = (Math.random() - 0.5) * 400;
        const z = (Math.random() - 0.5) * 400;

        // Store position in geometry array
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        // Store color in geometry array
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        // Create particle data object for animation
        particles.push({
            // Current position (will be updated)
            position: new THREE.Vector3(x, y, z),

            // Random velocity for drift animation
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * DRIFT_SPEED,
                (Math.random() - 0.5) * DRIFT_SPEED,
                (Math.random() - 0.5) * DRIFT_SPEED
            ),

            // Original position to drift around
            originalPosition: new THREE.Vector3(x, y, z)
        });
    }

    // Create BufferGeometry for efficient rendering
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Create material for particles
    const material = new THREE.PointsMaterial({
        size: PARTICLE_SIZE,
        vertexColors: true,
        transparent: true,
        opacity: PARTICLE_OPACITY,
        sizeAttenuation: true,      // Particles get smaller with distance
        blending: THREE.AdditiveBlending,  // Glowing effect
        depthWrite: false
    });

    // Create Points mesh and add to scene
    particlesMesh = new THREE.Points(geometry, material);
    scene.add(particlesMesh);
}

// ============================================================================
// LINE CREATION
// ============================================================================

function createLines() {
    // Create empty geometry (will be filled each frame)
    const geometry = new THREE.BufferGeometry();

    // Material for connection lines
    const material = new THREE.LineBasicMaterial({
        color: LINE_COLOR,
        transparent: true,
        opacity: LINE_OPACITY,
        linewidth: LINE_WIDTH,      // Note: linewidth > 1 only works on some platforms
        blending: THREE.AdditiveBlending
    });

    // Create line segments mesh
    linesMesh = new THREE.LineSegments(geometry, material);
    scene.add(linesMesh);
}

// ============================================================================
// UPDATE CONNECTION LINES
// ============================================================================

function updateLines() {
    // This function recalculates which particles should be connected
    // based on their current distances

    const positions = [];
    const maxDistanceSq = CONNECTION_DISTANCE * CONNECTION_DISTANCE;

    // Check every pair of particles
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            // Calculate distance between particles
            const distanceSq = particles[i].position.distanceToSquared(particles[j].position);

            // If close enough, add a line between them
            if (distanceSq < maxDistanceSq) {
                // Add line start point
                positions.push(
                    particles[i].position.x,
                    particles[i].position.y,
                    particles[i].position.z
                );

                // Add line end point
                positions.push(
                    particles[j].position.x,
                    particles[j].position.y,
                    particles[j].position.z
                );
            }
        }
    }

    // Update line geometry with new positions
    linesMesh.geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3)
    );

    // Tell Three.js to update the geometry
    linesMesh.geometry.attributes.position.needsUpdate = true;
}

// ============================================================================
// PARTICLE ANIMATION
// ============================================================================

function updateParticles() {
    // Update each particle's position with drift animation
    const positions = particlesMesh.geometry.attributes.position.array;

    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];

        // Apply velocity (drift)
        particle.position.add(particle.velocity);

        // Calculate distance from original position
        const distanceFromOrigin = particle.position.distanceTo(particle.originalPosition);

        // If drifted too far, reverse direction
        if (distanceFromOrigin > DRIFT_RANGE) {
            particle.velocity.multiplyScalar(-1);
        }

        // Add slight randomness to velocity for organic movement
        particle.velocity.x += (Math.random() - 0.5) * 0.02;
        particle.velocity.y += (Math.random() - 0.5) * 0.02;
        particle.velocity.z += (Math.random() - 0.5) * 0.02;

        // Limit velocity to prevent runaway speed
        particle.velocity.clampLength(0, DRIFT_SPEED);

        // Update geometry positions array
        positions[i * 3] = particle.position.x;
        positions[i * 3 + 1] = particle.position.y;
        positions[i * 3 + 2] = particle.position.z;
    }

    // Tell Three.js to update the particle positions
    particlesMesh.geometry.attributes.position.needsUpdate = true;
}

// ============================================================================
// RESIZE HANDLER
// ============================================================================

function handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (camera && renderer) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }
}

// ============================================================================
// ANIMATION LOOP
// ============================================================================

function animate() {
    requestAnimationFrame(animate);

    // Update particle positions with drift
    updateParticles();

    // Recalculate connection lines based on new positions
    updateLines();

    // Optional: Slowly rotate entire scene for depth perception
    // Uncomment the line below to enable rotation:
    // scene.rotation.y += 0.0005;

    // Render the scene
    renderer.render(scene, camera);
}

// ============================================================================
// START THE VISUALIZATION
// ============================================================================

init();

// ============================================================================
// CUSTOMIZATION IDEAS:
// ============================================================================
// 1. Add mouse interaction - particles attracted to/repelled by cursor
// 2. Color particles based on connection count (more connected = different color)
// 3. Add pulsing animation to particles
// 4. Make line opacity vary with distance (closer = more opaque)
// 5. Add "data flow" animation along the lines
// 6. Create clusters of particles with higher density
// 7. Add subtle glow/bloom post-processing effect
// ============================================================================
