import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================================================
// FLOATING SHAPES - SEQUENTIAL ROTATION GRID
// ============================================================================
// Grid of boxes with staggered sequential rotation animation
// Creates a mesmerizing domino/wave effect with alternating color cycles
//
// ANIMATION:
// - Shapes rotate sequentially in a wave pattern (4x4x4 grid = 64 boxes)
// - Each shape changes color as it completes its rotation
// - First cycle: hotpink → baby blue
// - Second cycle: baby blue → hotpink
// - Color wave alternates with each complete sequence
// - For each row of 4 cubes (along Z-axis), one random cube turns solid
// - Solid cubes are 50% transparent (vs 100% opaque wireframes)
// - Solid cubes build progressively throughout the cycle (16 total)
// - Solid cubes persist until they begin their next rotation
// - Pattern resets and randomizes with each new cycle
//
// CONTROLS:
// - Left mouse: Rotate camera
// - Right mouse: Pan camera
// - Scroll wheel: Zoom in/out (can zoom very close to individual cubes)
// - Check console for current camera position (logged every 2 seconds)
// ============================================================================

// ============================================================================
// CONFIGURATION PARAMETERS
// ============================================================================

const GRID_SIZE = 4;                  // Grid dimensions (4x4x4)
const SHAPE_SIZE = 0.4;               // Size of each box
const SPACING = 0.05;                 // Space between shapes
const ROTATION_AMOUNT = Math.PI * 2;  // Full rotation (360 degrees)
const ROTATION_DURATION = 2.0;        // Seconds per shape rotation
const DELAY_BETWEEN_SHAPES = 0.1;     // Seconds delay before next shape starts
const HOTPINK_COLOR = 0xff1493;       // Hotpink wireframe
const BABYBLUE_COLOR = 0x89cff0;      // Baby blue wireframe
const LINE_OPACITY = 1.0;             // Transparency (1.0 = fully opaque)
const BACKGROUND_COLOR = 0x1a1a1a;    // Dark background
const GROUP_ROTATION_SPEED = 0.002;   // Speed of whole group rotation

// Animation axis options (set to true to animate on that axis)
const ANIMATE_X = false;
const ANIMATE_Y = true;
const ANIMATE_Z = false;

const CAMERA_Z = 12;                  // Camera distance

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

let camera, scene, renderer, controls;
let shapes = [];
let shapeGroup;
let time = 0;
let sequenceDuration;
let lastLogTime = 0;
let currentTargetColor = BABYBLUE_COLOR;  // First cycle turns shapes blue
let previousCycleTime = 0;
let solidCubesThisCycle = new Set();  // Track which cubes are solid this cycle

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(BACKGROUND_COLOR);

    camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    camera.position.z = CAMERA_Z;
    camera.position.y = 2;
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
    controls.minDistance = 1;  // Allow camera to get much closer
    controls.maxDistance = 50;

    createShapeGrid();

    // Calculate total sequence duration
    const totalShapes = GRID_SIZE * GRID_SIZE * GRID_SIZE;
    sequenceDuration = (totalShapes * DELAY_BETWEEN_SHAPES) + ROTATION_DURATION;

    window.addEventListener('resize', handleResize);

    // Select initial solid cubes
    selectRandomSolidCubes();

    // Log camera position on first load
    console.log('=== FLOATING SHAPES - Camera Position Finder ===');
    console.log('Use mouse to explore different angles');
    console.log('Current camera position will be logged every 2 seconds');
    logCameraPosition();

    animate();
}

// ============================================================================
// CREATE SHAPE GRID
// ============================================================================

function createShapeGrid() {
    // Create a group to hold all shapes
    shapeGroup = new THREE.Group();

    const geometry = new THREE.BoxGeometry(SHAPE_SIZE, SHAPE_SIZE, SHAPE_SIZE);
    const material = new THREE.MeshBasicMaterial({
        color: HOTPINK_COLOR,  // Start with hotpink
        wireframe: true,
        transparent: true,
        opacity: LINE_OPACITY
    });

    // Calculate grid offset to center it
    const totalSize = (GRID_SIZE - 1) * (SHAPE_SIZE * 2 + SPACING);
    const offset = totalSize / 2;

    let shapeIndex = 0;

    // Create grid
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let z = 0; z < GRID_SIZE; z++) {
                const mesh = new THREE.Mesh(geometry, material.clone());

                // Position in grid
                mesh.position.x = (x * (SHAPE_SIZE * 2 + SPACING)) - offset;
                mesh.position.y = (y * (SHAPE_SIZE * 2 + SPACING)) - offset;
                mesh.position.z = (z * (SHAPE_SIZE * 2 + SPACING)) - offset;

                // Store animation data and grid coordinates
                mesh.userData.index = shapeIndex;
                mesh.userData.gridX = x;
                mesh.userData.gridY = y;
                mesh.userData.gridZ = z;
                mesh.userData.startTime = shapeIndex * DELAY_BETWEEN_SHAPES;
                mesh.userData.currentRotation = { x: 0, y: 0, z: 0 };
                mesh.userData.targetRotation = { x: 0, y: 0, z: 0 };

                shapeGroup.add(mesh);
                shapes.push(mesh);

                shapeIndex++;
            }
        }
    }

    scene.add(shapeGroup);
}

// ============================================================================
// SELECT RANDOM SOLID CUBES (ONE PER ROW OF 4)
// ============================================================================

function selectRandomSolidCubes() {
    solidCubesThisCycle.clear();

    // For each X,Y position, select one random cube from the 4 along the Z-axis
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            // Get all cubes at this X,Y position (4 cubes along Z)
            const cubesAtThisXY = shapes.filter(shape =>
                shape.userData.gridX === x && shape.userData.gridY === y
            );

            // Randomly pick one of the 4
            const randomIndex = Math.floor(Math.random() * cubesAtThisXY.length);
            const selectedCube = cubesAtThisXY[randomIndex];

            solidCubesThisCycle.add(selectedCube.userData.index);
        }
    }
}

// ============================================================================
// UPDATE SHAPES WITH SEQUENTIAL ROTATION
// ============================================================================

function updateShapes() {
    // Loop the sequence
    const cycleTime = time % sequenceDuration;

    // Detect when sequence restarts (cycle wraps around)
    if (cycleTime < previousCycleTime) {
        // Toggle target color for new cycle
        currentTargetColor = currentTargetColor === BABYBLUE_COLOR ? HOTPINK_COLOR : BABYBLUE_COLOR;

        // Select new random solid cubes for this cycle
        selectRandomSolidCubes();

        // Reset rotation locks for new cycle (but keep cubes solid until they rotate)
        shapes.forEach(shape => {
            shape.userData.rotationLocked = false;
            shape.userData.rotationStarted = false;
        });
    }
    previousCycleTime = cycleTime;

    shapes.forEach(shape => {
        const startTime = shape.userData.startTime;
        const endTime = startTime + ROTATION_DURATION;

        // Check if this shape should be rotating
        if (cycleTime >= startTime && cycleTime < endTime) {
            // Reset to wireframe at the start of rotation
            if (!shape.userData.rotationStarted) {
                shape.material.wireframe = true;
                shape.material.opacity = 1.0;
                shape.userData.rotationStarted = true;
            }

            // Calculate progress (0 to 1)
            const progress = (cycleTime - startTime) / ROTATION_DURATION;

            // Easing function for smooth rotation (ease-in-out)
            const eased = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            // Calculate rotation for each enabled axis
            const targetX = ANIMATE_X ? ROTATION_AMOUNT : 0;
            const targetY = ANIMATE_Y ? ROTATION_AMOUNT : 0;
            const targetZ = ANIMATE_Z ? ROTATION_AMOUNT : 0;

            // Apply rotation
            shape.rotation.x = shape.userData.currentRotation.x + (targetX * eased);
            shape.rotation.y = shape.userData.currentRotation.y + (targetY * eased);
            shape.rotation.z = shape.userData.currentRotation.z + (targetZ * eased);
        }
        // If rotation is complete, update the base rotation and color
        else if (cycleTime >= endTime) {
            if (!shape.userData.rotationLocked) {
                shape.userData.currentRotation.x += ANIMATE_X ? ROTATION_AMOUNT : 0;
                shape.userData.currentRotation.y += ANIMATE_Y ? ROTATION_AMOUNT : 0;
                shape.userData.currentRotation.z += ANIMATE_Z ? ROTATION_AMOUNT : 0;

                // Change color to current target color
                shape.material.color.setHex(currentTargetColor);

                // If this cube is selected to be solid, turn it solid now
                if (solidCubesThisCycle.has(shape.userData.index)) {
                    shape.material.wireframe = false;
                    shape.material.opacity = 0.5;  // 50% transparent
                }

                shape.userData.rotationLocked = true;
            }
        }
    });

    // Rotate the entire group slowly
    shapeGroup.rotation.y += GROUP_ROTATION_SPEED;

    time += 1/60; // Approximate delta time for 60fps
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
    updateShapes();

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

// ============================================================================
// CUSTOMIZATION NOTES:
// ============================================================================
// - Change ANIMATE_X, ANIMATE_Y, ANIMATE_Z to control rotation axes
// - Adjust ROTATION_DURATION for faster/slower individual rotations
// - Change DELAY_BETWEEN_SHAPES for faster/slower wave effect
// - Modify GRID_SIZE for more or fewer shapes (current: 4x4x4 = 64 boxes)
// - Use OrbitControls to find desired camera angle, then set in code
// - Set GROUP_ROTATION_SPEED to 0 to disable group rotation
// - Shapes start hotpink, turn baby blue on first cycle, then alternate
// - Customize HOTPINK_COLOR and BABYBLUE_COLOR for different color schemes
// - Each cycle pre-selects 16 cubes (one from each row of 4 along Z-axis)
// - Solid cubes appear progressively as the rotation wave passes through
// - Solid cubes stay until they begin rotating again (no abrupt reset)
// - Randomness: which of the 4 cubes in each row becomes solid
// - Wireframe cubes: 100% opaque, Solid cubes: 50% transparent
// - Camera can zoom very close (minDistance = 1) for detailed inspection
// ============================================================================
