import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================================================
// DNA DOUBLE HELIX
// ============================================================================
// Elegant rotating double helix with glowing ribbons and connecting base pairs
// Science/biotech/research aesthetic
// ============================================================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 0, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 15;
controls.maxDistance = 60;

// ============================================================================
// HELIX PARAMETERS
// ============================================================================

const HELIX_RADIUS = 5;
const HELIX_HEIGHT = 40;
const HELIX_TURNS = 6;
const SEGMENTS_PER_TURN = 40;
const TOTAL_SEGMENTS = HELIX_TURNS * SEGMENTS_PER_TURN;

// Colors
const STRAND_COLOR_1 = new THREE.Color(0x00d4ff); // Cyan
const STRAND_COLOR_2 = new THREE.Color(0xff1493); // Pink
const BASE_PAIR_COLOR = new THREE.Color(0x9966ff); // Purple

// ============================================================================
// CREATE HELIX STRANDS
// ============================================================================

function createStrand(offset, color) {
    const positions = [];
    const colors = [];
    const alphas = [];

    for (let i = 0; i <= TOTAL_SEGMENTS; i++) {
        const t = i / TOTAL_SEGMENTS;
        const angle = t * Math.PI * 2 * HELIX_TURNS + offset;
        const y = (t - 0.5) * HELIX_HEIGHT;

        const x = Math.cos(angle) * HELIX_RADIUS;
        const z = Math.sin(angle) * HELIX_RADIUS;

        positions.push(x, y, z);
        colors.push(color.r, color.g, color.b);
        alphas.push(1);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('alpha', new THREE.Float32BufferAttribute(alphas, 1));

    const material = new THREE.ShaderMaterial({
        vertexShader: `
            attribute float alpha;
            varying vec3 vColor;
            varying float vAlpha;

            void main() {
                vColor = color;
                vAlpha = alpha;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vAlpha;

            void main() {
                gl_FragColor = vec4(vColor, vAlpha);
            }
        `,
        transparent: true,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        linewidth: 2
    });

    return new THREE.Line(geometry, material);
}

// Create a group to hold the entire helix
const helixGroup = new THREE.Group();
scene.add(helixGroup);

const strand1 = createStrand(0, STRAND_COLOR_1);
const strand2 = createStrand(Math.PI, STRAND_COLOR_2);

helixGroup.add(strand1);
helixGroup.add(strand2);

// ============================================================================
// CREATE SPHERE NODES ON STRANDS
// ============================================================================

const nodeSpheres1 = [];
const nodeSpheres2 = [];
const nodeGeometry = new THREE.SphereGeometry(0.3, 8, 8);

for (let i = 0; i < TOTAL_SEGMENTS; i += 4) {
    const t = i / TOTAL_SEGMENTS;
    const angle1 = t * Math.PI * 2 * HELIX_TURNS;
    const angle2 = angle1 + Math.PI;
    const y = (t - 0.5) * HELIX_HEIGHT;

    // Strand 1 nodes
    const material1 = new THREE.MeshBasicMaterial({
        color: STRAND_COLOR_1,
        transparent: true,
        opacity: 0.9
    });
    const sphere1 = new THREE.Mesh(nodeGeometry, material1);
    sphere1.position.set(
        Math.cos(angle1) * HELIX_RADIUS,
        y,
        Math.sin(angle1) * HELIX_RADIUS
    );
    helixGroup.add(sphere1);
    nodeSpheres1.push(sphere1);

    // Strand 2 nodes
    const material2 = new THREE.MeshBasicMaterial({
        color: STRAND_COLOR_2,
        transparent: true,
        opacity: 0.9
    });
    const sphere2 = new THREE.Mesh(nodeGeometry, material2);
    sphere2.position.set(
        Math.cos(angle2) * HELIX_RADIUS,
        y,
        Math.sin(angle2) * HELIX_RADIUS
    );
    helixGroup.add(sphere2);
    nodeSpheres2.push(sphere2);
}

// ============================================================================
// CREATE BASE PAIR CONNECTIONS
// ============================================================================

const basePairCount = nodeSpheres1.length;
const basePairPositions = [];
const basePairColors = [];
const basePairAlphas = [];

for (let i = 0; i < basePairCount; i++) {
    const pos1 = nodeSpheres1[i].position;
    const pos2 = nodeSpheres2[i].position;

    basePairPositions.push(pos1.x, pos1.y, pos1.z, pos2.x, pos2.y, pos2.z);
    basePairColors.push(
        BASE_PAIR_COLOR.r, BASE_PAIR_COLOR.g, BASE_PAIR_COLOR.b,
        BASE_PAIR_COLOR.r, BASE_PAIR_COLOR.g, BASE_PAIR_COLOR.b
    );
    basePairAlphas.push(0.6, 0.6);
}

const basePairGeometry = new THREE.BufferGeometry();
basePairGeometry.setAttribute('position', new THREE.Float32BufferAttribute(basePairPositions, 3));
basePairGeometry.setAttribute('color', new THREE.Float32BufferAttribute(basePairColors, 3));
basePairGeometry.setAttribute('alpha', new THREE.Float32BufferAttribute(basePairAlphas, 1));

const basePairMaterial = new THREE.ShaderMaterial({
    vertexShader: `
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
            vColor = color;
            vAlpha = alpha;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
            gl_FragColor = vec4(vColor, vAlpha);
        }
    `,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending
});

const basePairs = new THREE.LineSegments(basePairGeometry, basePairMaterial);
helixGroup.add(basePairs);

// ============================================================================
// CREATE PARTICLE GLOW EFFECT
// ============================================================================

const glowParticles = [];
const glowGeometry = new THREE.BufferGeometry();
const glowPositions = new Float32Array(100 * 3);
const glowColors = new Float32Array(100 * 3);
const glowSizes = new Float32Array(100);
const glowAlphas = new Float32Array(100);

for (let i = 0; i < 100; i++) {
    glowParticles.push({
        progress: Math.random(),
        speed: 0.1 + Math.random() * 0.2,
        strand: Math.random() > 0.5 ? 1 : 2
    });
    glowSizes[i] = 0.5 + Math.random() * 0.5;
}

glowGeometry.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3));
glowGeometry.setAttribute('color', new THREE.BufferAttribute(glowColors, 3));
glowGeometry.setAttribute('size', new THREE.BufferAttribute(glowSizes, 1));
glowGeometry.setAttribute('alpha', new THREE.BufferAttribute(glowAlphas, 1));

const glowMaterial = new THREE.ShaderMaterial({
    vertexShader: `
        attribute vec3 color;
        attribute float alpha;
        attribute float size;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
            vColor = color;
            vAlpha = alpha;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * 3.0 * (150.0 / max(-mvPosition.z, 1.0));
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
            gl_FragColor = vec4(vColor, alpha);
        }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending
});

const glowSystem = new THREE.Points(glowGeometry, glowMaterial);
helixGroup.add(glowSystem);

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

function animate() {
    requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();

    // Rotate the entire helix group
    helixGroup.rotation.y = elapsed * 0.2;

    // Pulse nodes
    nodeSpheres1.forEach((sphere, i) => {
        const pulse = Math.sin(elapsed * 2 + i * 0.5) * 0.2 + 1;
        sphere.scale.setScalar(pulse);
    });
    nodeSpheres2.forEach((sphere, i) => {
        const pulse = Math.sin(elapsed * 2 + i * 0.5 + Math.PI) * 0.2 + 1;
        sphere.scale.setScalar(pulse);
    });

    // Update glow particles
    const positions = glowGeometry.attributes.position.array;
    const colors = glowGeometry.attributes.color.array;
    const alphas = glowGeometry.attributes.alpha.array;

    glowParticles.forEach((particle, i) => {
        particle.progress += particle.speed * 0.01;
        if (particle.progress > 1) particle.progress = 0;

        const t = particle.progress;
        const angle = t * Math.PI * 2 * HELIX_TURNS + (particle.strand === 1 ? 0 : Math.PI);
        const y = (t - 0.5) * HELIX_HEIGHT;

        positions[i * 3] = Math.cos(angle) * HELIX_RADIUS;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = Math.sin(angle) * HELIX_RADIUS;

        const color = particle.strand === 1 ? STRAND_COLOR_1 : STRAND_COLOR_2;
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        alphas[i] = Math.sin(t * Math.PI) * 0.8;
    });

    glowGeometry.attributes.position.needsUpdate = true;
    glowGeometry.attributes.color.needsUpdate = true;
    glowGeometry.attributes.alpha.needsUpdate = true;

    controls.update();
    renderer.render(scene, camera);
}

animate();

// ============================================================================
// CUSTOMIZATION NOTES:
// ============================================================================
// - HELIX_RADIUS: 3-8 for tighter/wider helix
// - HELIX_HEIGHT: 30-60 for shorter/taller
// - HELIX_TURNS: 4-10 for fewer/more rotations
// - STRAND_COLOR_1, STRAND_COLOR_2: customize strand colors
// - BASE_PAIR_COLOR: color of connecting rungs
// - Rotation speed: line 325 (0.1-0.5 for slow/fast)
// - Add more particle effects for energy flowing along strands
// - Could add: pulsing animations, color waves, data packets
// ============================================================================
