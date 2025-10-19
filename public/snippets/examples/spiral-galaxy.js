import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================================================
// SPIRAL GALAXY - ORGANIC & DYNAMIC
// ============================================================================
// Custom spiral galaxy with particle motion - balance of structure and chaos
// ============================================================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 120, 70);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;

// ============================================================================
// GALAXY PARAMETERS
// ============================================================================

const PARTICLE_COUNT = 20000;
const NUM_ARMS = 3;

// ============================================================================
// CREATE GALAXY
// ============================================================================

const positions = [];
const sizes = [];
const colors = [];
const alphas = [];
const shifts = []; // For particle motion

for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Radius with concentration toward center (no separate sphere)
    const radius = Math.pow(Math.random(), 10) * 55;

    // Determine which arm this particle belongs to
    const armIndex = Math.floor(Math.random() * NUM_ARMS);
    const armAngle = (armIndex / NUM_ARMS) * Math.PI * 2;

    // Logarithmic spiral
    const spiralTightness = 5.6;
    const spiralOffset = Math.log(radius / 5 + 1) * spiralTightness;

    // Base angle with spiral
    const baseAngle = armAngle + spiralOffset;

    // Scatter - wider for organic look but still shows arms
    const armWidth = 1.2;
    const scatter = (Math.random() - 0.5) * armWidth;

    // Add noise for organic clustering
    const noise = Math.sin(baseAngle * 4) * Math.cos(radius * 0.2) * 2;

    const angle = baseAngle + scatter + noise * 0.2;

    // Convert to cartesian
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);

    // Y position - flattened disk, thinner at edges
    const diskThickness = Math.pow(1 - (radius / 55), 1.5) * 4;
    const y = (Math.random() - 0.5) * diskThickness;

    positions.push(x, y, z);

    // Size variation
    const sizeVar = Math.random() * 2.5 + 0.4;
    sizes.push(sizeVar);

    // Color based on radius - pink to purple to blue
    const colorT = Math.min(radius / 55, 1);
    let r, g, b;

    if (colorT < 0.25) {
        // Core: bright white/pink
        const t = colorT / 0.25;
        r = 1.0;
        g = 0.7 - (t * 0.3);
        b = 0.9 - (t * 0.1);
    } else if (colorT < 0.55) {
        // Inner: hot pink to magenta
        const t = (colorT - 0.25) / 0.3;
        r = 1.0 - (t * 0.2);
        g = 0.4 - (t * 0.1);
        b = 0.85 + (t * 0.05);
    } else {
        // Outer: purple to blue
        const t = (colorT - 0.55) / 0.45;
        r = 0.7 - (t * 0.4);
        g = 0.3 - (t * 0.1);
        b = 0.85 - (t * 0.25);
    }

    colors.push(r, g, b);

    // Alpha variation for depth
    const alpha = 0.3 + Math.random() * 0.7;
    alphas.push(alpha);

    // Particle motion shifts (like the example)
    shifts.push(
        Math.random() * Math.PI,
        Math.random() * Math.PI * 2,
        (Math.random() * 0.9 + 0.1) * Math.PI * 0.20,
        Math.random() * 0.5 + 0.2
    );
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
geometry.setAttribute('alpha', new THREE.Float32BufferAttribute(alphas, 1));
geometry.setAttribute('shift', new THREE.Float32BufferAttribute(shifts, 4));

// ============================================================================
// CUSTOM SHADER WITH PARTICLE MOTION
// ============================================================================

const PI2 = Math.PI * 2;

const material = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0 }
    },
    vertexShader: `
        uniform float time;
        attribute float size;
        attribute vec3 color;
        attribute float alpha;
        attribute vec4 shift;

        varying vec3 vColor;
        varying float vAlpha;

        void main() {
            vColor = color;
            vAlpha = alpha;

            vec3 pos = position;

            // Add particle motion (from example)
            float t = time;
            float moveT = mod(shift.x + shift.z * t, ${PI2.toFixed(10)});
            float moveS = mod(shift.y + shift.z * t, ${PI2.toFixed(10)});
            pos += vec3(cos(moveS) * sin(moveT), cos(moveT), sin(moveS) * sin(moveT)) * shift.w;

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = size * 3.0 * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
            // Circular gradient for smooth glow
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);

            // Soft falloff
            float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;

            gl_FragColor = vec4(vColor, alpha);
        }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
});

const galaxy = new THREE.Points(geometry, material);
galaxy.rotation.x = -Math.PI / 5;
scene.add(galaxy);

// ============================================================================
// RESIZE HANDLER
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

function animate() {
    requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();
    material.uniforms.time.value = elapsed * Math.PI * 0.5;

    // Slow rotation
    galaxy.rotation.y = elapsed * 0.01;

    controls.update();
    renderer.render(scene, camera);
}

animate();

// ============================================================================
// CUSTOMIZATION NOTES:
// ============================================================================
// - NUM_ARMS: number of spiral arms (2-4 recommended)
// - spiralTightness: 0.4 = loose, 0.8 = tight (line 46)
// - armWidth: 0.8 = tight arms, 1.5 = loose/organic (line 54)
// - noise influence: controls organic clustering (line 60)
// - No separate sphere - all particles follow same distribution
// - Particle motion adds life and dynamics
// - Balance between visible spiral structure and organic randomness
// ============================================================================
