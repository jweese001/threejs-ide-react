import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Declare variables in the main scope
let camera, scene, renderer, controls, sphere, particleMesh;
let mouseX = 0;
let mouseY = 0;

// Load Texture
const loader = new THREE.TextureLoader();
const whiteDot = loader.load('/images/whiteDot32.png');

function init() {
    // Sizes, window/scene resize
    const sizes = {
        width: window.innerWidth,
        height: window.innerHeight
    }

    // Scene
    scene = new THREE.Scene();

    // Objects in the scene
    // The Sphere for THREE.PointsMaterial
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    // The Particle Field
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCnt = 10000;
    const posArray = new Float32Array(particlesCnt * 3);

    for(let i = 0; i < particlesCnt * 3; i++) {
        // Distribute points randomly in a 10x10x10 cube
        posArray[i] = (Math.random() - 0.5) * 10;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));


    // Materials
    const geoMaterial = new THREE.PointsMaterial({
        size: 0.003
    });
    const fieldMaterial = new THREE.PointsMaterial({
        size: 0.01, // Particle size
        map: whiteDot,
        transparent: true,
        color: 0xe1b095, 
        blending: THREE.AdditiveBlending // Not sure about this need to research use
    });

    // Mesh
    sphere = new THREE.Points(geometry, geoMaterial);
    particleMesh = new THREE.Points(particlesGeometry, fieldMaterial);
    scene.add(sphere, particleMesh);

    // Lights
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(2, 3, 4);
    scene.add(pointLight);

    // Camera
    camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
    camera.position.z = 2;
    scene.add(camera);

    // Renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(new THREE.Color(0x00001b), 1); // Set solid background
    document.body.appendChild(renderer.domElement);
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';

    // Mouse Listener
    document.addEventListener('mousemove', onDocumentMouseMove);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Handle Resizingresizing of scene to fit window
    window.addEventListener('resize', () => {
        sizes.width = window.innerWidth;
        sizes.height = window.innerHeight;
        camera.aspect = sizes.width / sizes.height;
        camera.updateProjectionMatrix();
        renderer.setSize(sizes.width, sizes.height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

    animate();
}

function onDocumentMouseMove(event) {
    // Normalize mouse position from -1 to 1
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
}

const clock = new THREE.Clock();

function animate()
{
    const elapsedTime = clock.getElapsedTime();

    // Update objects
    sphere.rotation.y = .5 * elapsedTime;
    
    // Gently rotate particles based on mouse position
    if (particleMesh) {
        particleMesh.rotation.y = -mouseX * 0.2;
        particleMesh.rotation.x = mouseY * 0.2;
    }

    controls.update();
    renderer.render(scene, camera);
    window.requestAnimationFrame(animate);
}

init();