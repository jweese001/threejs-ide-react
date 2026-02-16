// Complete scene with OBJ model loading
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

let camera, scene, renderer, controls;

function init() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Create the WebGL renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    document.body.appendChild(renderer.domElement);
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';

    // Set up the camera
    camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.set(3, 2, 3);

    // Create the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    // Add OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Load the OBJ model
    const loader = new OBJLoader();
    loader.load(
        '/models/spiked.obj',
        function (object) {
            // Apply material to the model
            const material = new THREE.MeshStandardMaterial({
                color: 0xff6b6b,
                roughness: 0.3,
                metalness: 0.7,
            });

            object.traverse(function (child) {
                if (child.isMesh) {
                    child.material = material;
                }
            });

            object.position.y = -0.5;
            scene.add(object);
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error('Error loading OBJ model:', error);
        }
    );

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
