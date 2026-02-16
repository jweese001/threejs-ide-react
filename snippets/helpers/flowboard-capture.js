// Complete scene template with FlowBoard capture & camera presets support
// Includes: preserveDrawingBuffer, global exports for renderer/camera/scene/controls

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

// ========== CHANGE MODEL HERE ==========
const MODEL_URL = '/models/spiked.obj';
// =======================================

let camera, scene, renderer, controls;

function init() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(w, h);
    document.body.appendChild(renderer.domElement);
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';

    camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    camera.position.z = 5;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
    hemiLight.position.set(0, 1, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Load OBJ
    const loader = new OBJLoader();
    loader.load(
        MODEL_URL,
        (obj) => {
            obj.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshLambertMaterial({ color: 0x888888 });
                }
            });
            scene.add(obj);
        },
        (xhr) => console.log((xhr.loaded / xhr.total * 100).toFixed(0) + '% loaded'),
        (err) => console.error('Load error:', err)
    );

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.03;

    // Expose globals for FlowBoard capture & camera presets
    window.renderer = renderer;
    window.camera = camera;
    window.scene = scene;
    window.controls = controls;

    window.addEventListener('resize', handleResize);
    animate();
}

function handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (camera && renderer) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

init();
