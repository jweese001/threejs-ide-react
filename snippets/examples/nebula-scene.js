import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let camera, scene, renderer, controls;
const clouds = [];

function init() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, w / h, 1, 2000);
    renderer = new THREE.WebGLRenderer({ antialias: true });

    camera.position.z = 100;
    renderer.setSize(w, h);
    scene.background = new THREE.Color(0x070C30);

    document.body.appendChild(renderer.domElement);
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';

    // --- NEBULA BACKGROUND --- //
    const loader = new THREE.TextureLoader();
    loader.load(
        "/images/smoke3.png",
        function(texture) {
            console.log('Texture loaded! Creating nebula...');
            const cloudGeometry = new THREE.PlaneGeometry(500, 500);
            const colors = [0x8844ff, 0xff4488, 0x4488ff, 0xff8844];

            for (let p = 0; p < 80; p++) {
                const cloudMaterial = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 0.6,
                    blending: THREE.AdditiveBlending,
                    side: THREE.DoubleSide,
                    color: colors[p % colors.length],
                    depthWrite: false
                });

                let cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
                cloud.position.set(
                    (Math.random() - 0.5) * 1000,
                    (Math.random() - 0.5) * 400,
                    Math.random() * -500 - 100
                );
                cloud.rotation.z = Math.random() * 2 * Math.PI;
                scene.add(cloud);
                clouds.push(cloud);
            }
            console.log('Added', clouds.length, 'nebula clouds');
        },
        undefined,
        function(error) {
            console.error('Texture load error:', error);
        }
    );
    // --- END OF NEBULA BACKGROUND --- //


    //
    // --- ADD FOREGROUND OBJECTS HERE ---
    // For example:
    // const geometry = new THREE.BoxGeometry(10, 10, 10);
    // const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    // const mesh = new THREE.Mesh(geometry, material);
    // scene.add(mesh);
    //


    // --- GENERAL SCENE SETUP ---
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.03;

    window.addEventListener('resize', handleResize);
    animate();
}

function handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if(camera && renderer) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // Animate nebula clouds
    for (const cloud of clouds) {
        cloud.rotation.z -= 0.0005;
    }

    //
    // --- ADD CUSTOM ANIMATIONS HERE ---
    // For example:
    // if (mesh) {
    //   mesh.rotation.y += 0.01;
    // }
    //

    renderer.render(scene, camera);
}

init();
