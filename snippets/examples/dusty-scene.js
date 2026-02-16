import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Set up the scene, camera, and renderer
let camera, scene, renderer, composer;
let controls;
let dustEffect;

// Perturbation variables
let perturbation = 0;
const PERTURBATION_DECAY = 0.95; // How quickly the effect fades

// This function simulates the door slam
function slamDoor() {
  perturbation = 1.5; // Set the initial strength of the disturbance
}

// This will trigger the effect after 2 seconds for demonstration
setTimeout(slamDoor, 2000);

// Event Listener triggers the partical "disturbance"
  window.addEventListener('keydown', (event) => {                                                                
     if (event.code === 'Space') {                                                                                     
       console.log('Spacebar pressed, triggering dust animation!');                                                    
        slamDoor();                                                                                                     
      }                                                                                                                 
  });

function createDust({
  numParticles = 5000,
  size = 0.01, // Increased size slightly for texture
  boxSize = 30
} = {}) {
  const vertices = [];
  for (let i = 0; i < numParticles; i++) {
    const x = (Math.random() - 0.5) * boxSize;
    const y = Math.random() * boxSize;
    const z = (Math.random() - 0.5) * boxSize;
    vertices.push(x, y, z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load('/images/whiteDot64.png');

  const material = new THREE.PointsMaterial({
    size: size,
    map: texture,
    color: 'white',
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const dust = new THREE.Points(geometry, material);
  scene.add(dust);

  // Return the dust object
  return dust;
}

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
    const fov = 60;
    const aspect = w / h;
    const near = 0.1;
    const far = 100;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set( 0, 15, 15 );

    // Create the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111); // Dark background

    // Add OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.03;

    // Add a simple light so we can see potential objects
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    // Create the dust effect
    dustEffect = createDust();

    // --- Post-processing --- //
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0;
    bloomPass.strength = 1.2; // Intensity of the glow
    bloomPass.radius = 0.5;
    composer.addPass(bloomPass);
   
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
        composer.setSize(w, h); // Also resize the composer
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // Check if there's any perturbation to apply
    if (perturbation > 0.001) {
      // Get the position attribute from our dust geometry
      const positions = dustEffect.geometry.attributes.position.array;

      // Loop through every vertex (each vertex has x, y, z components)
      for (let i = 0; i < positions.length; i += 3) {
        // Add a small random value to each component, scaled by the perturbation strength
        const px = (Math.random() - 0.5) * perturbation;
        const py = (Math.random() - 0.5) * perturbation;
        const pz = (Math.random() - 0.5) * perturbation;

        positions[i] += px;
        positions[i + 1] += py;
        positions[i + 2] += pz;
      }

      // IMPORTANT: Tell Three.js that the positions have been updated
      dustEffect.geometry.attributes.position.needsUpdate = true;

      // Decay the perturbation effect over time
      perturbation *= PERTURBATION_DECAY;
    }


    // We can keep the gentle rotation for ambient movement
    dustEffect.rotation.y += 0.0002;

    composer.render();
}

init();
