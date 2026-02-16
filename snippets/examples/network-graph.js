import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================================================
// NETWORK GRAPH VISUALIZATION
// ============================================================================
// Connected nodes with glowing edges - neural network / data network aesthetic
// Nodes pulse, connections light up when data flows
// ============================================================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a15);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 0, 80);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.3;

// ============================================================================
// NETWORK PARAMETERS
// ============================================================================

const NODE_COUNT = 60;
const CONNECTION_DISTANCE = 50;
const SPHERE_RADIUS = 70;

// Colors
const NODE_COLOR = new THREE.Color(0x4a9eff);
const CONNECTION_COLOR = new THREE.Color(0xff1493);
const ACTIVE_COLOR = new THREE.Color(0x00ffff);

// ============================================================================
// NODE CLASS
// ============================================================================

class Node {
    constructor(position) {
        this.position = position.clone();
        this.originalPosition = position.clone();
        this.connections = [];
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.pulseSpeed = 0.5 + Math.random() * 0.5;
        this.activity = 0;
    }

    update(time) {
        // Gentle floating motion
        const offset = Math.sin(time * 0.0005 + this.pulsePhase) * 0.5;
        this.position.y = this.originalPosition.y + offset;

        // Pulse activity
        const pulse = (Math.sin(time * 0.001 * this.pulseSpeed + this.pulsePhase) + 1) * 0.5;
        this.activity = pulse;
    }
}

// ============================================================================
// CREATE NODES
// ============================================================================

const nodes = [];

// Distribute nodes in a sphere
for (let i = 0; i < NODE_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = SPHERE_RADIUS * (0.7 + Math.random() * 0.3);

    const position = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
    );

    nodes.push(new Node(position));
}

// ============================================================================
// CREATE CONNECTIONS
// ============================================================================

const connections = [];

for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
        const distance = nodes[i].position.distanceTo(nodes[j].position);

        if (distance < CONNECTION_DISTANCE) {
            connections.push({
                from: nodes[i],
                to: nodes[j],
                activity: 0,
                flowDirection: Math.random() > 0.5 ? 1 : -1,
                flowSpeed: 0.5 + Math.random() * 1.5
            });
        }
    }
}

console.log(`Network: ${nodes.length} nodes, ${connections.length} connections`);

// ============================================================================
// CREATE NODE GEOMETRY
// ============================================================================

const nodeGeometry = new THREE.SphereGeometry(0.5, 8, 8);
const nodeMaterial = new THREE.MeshBasicMaterial({
    color: NODE_COLOR,
    transparent: true,
    opacity: 0.8
});

const nodeGroup = new THREE.Group();
const nodeMeshes = [];

nodes.forEach(node => {
    const mesh = new THREE.Mesh(nodeGeometry, nodeMaterial.clone());
    mesh.position.copy(node.position);
    nodeGroup.add(mesh);
    nodeMeshes.push(mesh);
});

scene.add(nodeGroup);

// ============================================================================
// CREATE CONNECTION LINES
// ============================================================================

const linePositions = [];
const lineColors = [];
const lineAlphas = [];

connections.forEach(() => {
    // Each connection needs 2 points
    linePositions.push(0, 0, 0, 0, 0, 0);
    lineColors.push(1, 1, 1, 1, 1, 1);
    lineAlphas.push(0.3, 0.3);
});

const lineGeometry = new THREE.BufferGeometry();
lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
lineGeometry.setAttribute('alpha', new THREE.Float32BufferAttribute(lineAlphas, 1));

const lineMaterial = new THREE.ShaderMaterial({
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

const lineSystem = new THREE.LineSegments(lineGeometry, lineMaterial);
scene.add(lineSystem);

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

    const delta = clock.getDelta();
    time += delta * 1000;

    // Update nodes
    nodes.forEach((node, i) => {
        node.update(time);
        nodeMeshes[i].position.copy(node.position);

        // Scale based on activity
        const scale = 1 + node.activity * 0.3;
        nodeMeshes[i].scale.setScalar(scale);

        // Glow based on activity
        nodeMeshes[i].material.opacity = 0.6 + node.activity * 0.4;
    });

    // Update connections
    const positions = lineGeometry.attributes.position.array;
    const colors = lineGeometry.attributes.color.array;
    const alphas = lineGeometry.attributes.alpha.array;

    connections.forEach((conn, i) => {
        // Update positions
        positions[i * 6] = conn.from.position.x;
        positions[i * 6 + 1] = conn.from.position.y;
        positions[i * 6 + 2] = conn.from.position.z;
        positions[i * 6 + 3] = conn.to.position.x;
        positions[i * 6 + 4] = conn.to.position.y;
        positions[i * 6 + 5] = conn.to.position.z;

        // Flow activity along connections
        conn.activity = (Math.sin(time * 0.001 * conn.flowSpeed) + 1) * 0.5;

        // Color based on activity
        const activity = conn.activity;
        const color = CONNECTION_COLOR.clone().lerp(ACTIVE_COLOR, activity);

        colors[i * 6] = color.r;
        colors[i * 6 + 1] = color.g;
        colors[i * 6 + 2] = color.b;
        colors[i * 6 + 3] = color.r;
        colors[i * 6 + 4] = color.g;
        colors[i * 6 + 5] = color.b;

        // Alpha based on activity
        const baseAlpha = 0.2;
        const alpha = baseAlpha + activity * 0.6;
        alphas[i * 2] = alpha;
        alphas[i * 2 + 1] = alpha;
    });

    lineGeometry.attributes.position.needsUpdate = true;
    lineGeometry.attributes.color.needsUpdate = true;
    lineGeometry.attributes.alpha.needsUpdate = true;

    controls.update();
    renderer.render(scene, camera);
}

animate();

// ============================================================================
// CUSTOMIZATION NOTES:
// ============================================================================
// - NODE_COUNT: 40-100 for density (affects connections exponentially)
// - CONNECTION_DISTANCE: 15-25 for sparse/dense network
// - SPHERE_RADIUS: size of the network sphere
// - NODE_COLOR, CONNECTION_COLOR, ACTIVE_COLOR: customize palette
// - controls.autoRotate: set to false to disable rotation
// - Node distribution: currently spherical, can be changed to:
//   * Grid: structured layout
//   * Cube: box formation
//   * Random cloud: organic cluster
// - Connection logic: distance-based (proximity connections)
//   * Could add: random connections, hub nodes, clusters
// ============================================================================
