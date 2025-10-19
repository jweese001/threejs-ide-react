import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================================================
// FLOW FIELD PARTICLES
// ============================================================================
// Particles flowing through a 3D vector field
// Smooth, organic movement like smoke, water, or energy streams
// ============================================================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 0, 50);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 20;
controls.maxDistance = 100;

// ============================================================================
// FLOW FIELD PARAMETERS
// ============================================================================

const PARTICLE_COUNT = 8000;
const FLOW_SPEED = 0.05;
const FLOW_SCALE = 0.08;      // How zoomed in the flow field is
const FIELD_COMPLEXITY = 1.2;  // Complexity of the flow pattern
const TRAIL_LENGTH = 100;      // How long particle trails are
const BOUNDS = 40;             // Bounding box size

// Colors: blue-purple gradient
const COLOR_START = new THREE.Color(0x4a90e2);  // Blue
const COLOR_MID = new THREE.Color(0x7b68ee);    // Purple
const COLOR_END = new THREE.Color(0xff1493);    // Pink

// ============================================================================
// PARTICLE SYSTEM
// ============================================================================

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        // Random position within bounds
        this.position = new THREE.Vector3(
            (Math.random() - 0.5) * BOUNDS,
            (Math.random() - 0.5) * BOUNDS,
            (Math.random() - 0.5) * BOUNDS
        );

        this.velocity = new THREE.Vector3(0, 0, 0);
        this.life = 0;
        this.maxLife = Math.random() * TRAIL_LENGTH + TRAIL_LENGTH * 0.5;
    }

    update(time) {
        // Calculate flow field force at particle position
        const force = getFlowFieldForce(
            this.position.x,
            this.position.y,
            this.position.z,
            time
        );

        // Apply force to velocity
        this.velocity.add(force);

        // Damping for smooth trails
        this.velocity.multiplyScalar(0.95);

        // Update position
        this.position.add(this.velocity);

        // Increment life
        this.life++;

        // Reset if too old or out of bounds
        if (this.life > this.maxLife || this.isOutOfBounds()) {
            this.reset();
        }
    }

    isOutOfBounds() {
        const limit = BOUNDS * 0.6;
        return Math.abs(this.position.x) > limit ||
               Math.abs(this.position.y) > limit ||
               Math.abs(this.position.z) > limit;
    }

    getColor() {
        // Color based on depth (z position)
        const t = (this.position.z / BOUNDS + 0.5);
        if (t < 0.5) {
            return COLOR_START.clone().lerp(COLOR_MID, t * 2);
        } else {
            return COLOR_MID.clone().lerp(COLOR_END, (t - 0.5) * 2);
        }
    }

    getAlpha() {
        // Fade in and out based on life
        const fadeIn = Math.min(this.life / 20, 1);
        const fadeOut = Math.min((this.maxLife - this.life) / 20, 1);
        return Math.min(fadeIn, fadeOut) * 0.6;
    }
}

// ============================================================================
// FLOW FIELD FUNCTION
// ============================================================================

function getFlowFieldForce(x, y, z, time) {
    // 3D flow field using trigonometric functions
    // Creates smooth, organic flowing patterns

    const scale = FLOW_SCALE;
    const t = time * 0.0005;

    // Multiple layers of sine/cosine for complexity
    const fx = Math.sin(y * scale + t) * Math.cos(z * scale * FIELD_COMPLEXITY) +
               Math.sin((x + y) * scale * 0.5) * 0.5;

    const fy = Math.cos(x * scale + t) * Math.sin(z * scale * FIELD_COMPLEXITY) +
               Math.cos((y + z) * scale * 0.5) * 0.5;

    const fz = Math.sin(x * scale) * Math.cos(y * scale + t * FIELD_COMPLEXITY) +
               Math.sin((z + x) * scale * 0.5) * 0.5;

    return new THREE.Vector3(fx, fy, fz).multiplyScalar(FLOW_SPEED);
}

// ============================================================================
// CREATE PARTICLES
// ============================================================================

const particles = [];
for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
}

// Setup geometry
const positions = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);
const alphas = new Float32Array(PARTICLE_COUNT);
const sizes = new Float32Array(PARTICLE_COUNT);

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

// ============================================================================
// SHADER MATERIAL
// ============================================================================

const material = new THREE.ShaderMaterial({
    vertexShader: `
        attribute float alpha;
        attribute float size;
        attribute vec3 color;

        varying vec3 vColor;
        varying float vAlpha;

        void main() {
            vColor = color;
            vAlpha = alpha;

            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
            // Circular gradient
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;

            gl_FragColor = vec4(vColor, alpha);
        }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
});

const particleSystem = new THREE.Points(geometry, material);
scene.add(particleSystem);

// ============================================================================
// WINDOW RESIZE
// ============================================================================

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================================
// ANIMATION
// ============================================================================

const clock = new THREE.Clock();
let time = 0;

function animate() {
    requestAnimationFrame(animate);

    time += clock.getDelta() * 1000;

    // Update all particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles[i].update(time);

        // Update geometry attributes
        const pos = particles[i].position;
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;

        const color = particles[i].getColor();
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        alphas[i] = particles[i].getAlpha();
        sizes[i] = 2 + Math.random();
    }

    // Mark attributes for update
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.alpha.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;

    // Slow rotation of the whole field
    particleSystem.rotation.y += 0.0002;
    particleSystem.rotation.x = Math.sin(time * 0.0001) * 0.1;

    controls.update();
    renderer.render(scene, camera);
}

animate();

// ============================================================================
// CUSTOMIZATION NOTES:
// ============================================================================
// - PARTICLE_COUNT: 5000-15000 for performance vs density
// - FLOW_SPEED: 0.02-0.1 for slower/faster flow
// - FLOW_SCALE: 0.05-0.15 for larger/smaller flow patterns
// - FIELD_COMPLEXITY: 0.8-2.0 for simple/complex patterns
// - TRAIL_LENGTH: 50-200 for short trails/long streams
// - Colors: Adjust COLOR_START, COLOR_MID, COLOR_END for different gradients
// - getFlowFieldForce(): Modify math for different flow patterns
//   * Try Perlin noise for more organic flow
//   * Add curl noise for turbulent vortices
//   * Combine multiple fields for layered effects
// ============================================================================
