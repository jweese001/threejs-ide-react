import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

class AnimatedSprite {
    constructor(scene, config) {
        if (!scene || !config) {
            console.error("AnimatedSprite: 'scene' and 'config' parameters are required.");
            return;
        }
        this.scene = scene;
        this.texture = config.texture;
        this.initialPosition = config.initialPosition || new THREE.Vector3(0, 0, 0);
        this.velocity = config.velocity || new THREE.Vector3(0, 0, 0);
        this.scale = config.scale || new THREE.Vector3(1, 1, 1);
        this.startTime = config.startTime || 0;
        this.duration = config.duration || 5;
        this.isScreenSpace = config.isScreenSpace || false;
        this.camera = config.camera || null;
        this.totalTime = 0;
        this.elapsedDuration = 0;
        this.isActive = true;
        const material = new THREE.SpriteMaterial({ map: this.texture, transparent: true, alphaTest: 0.1 });
        this.sprite = new THREE.Sprite(material);
        this.sprite.scale.copy(this.scale);
        this.sprite.position.copy(this.initialPosition);
        if (this.isScreenSpace && this.camera) {
            this.camera.add(this.sprite);
        } else {
            this.scene.add(this.sprite);
        }
    }
    update(deltaTime) {
        if (!this.isActive) return;
        this.totalTime += deltaTime;
        if (this.totalTime < this.startTime) return;
        this.elapsedDuration += deltaTime;
        if (this.elapsedDuration > this.duration) {
            this.destroy();
            return;
        }
        const displacement = this.velocity.clone().multiplyScalar(deltaTime);
        this.sprite.position.add(displacement);
    }
    destroy() {
        if (!this.isActive) return;
        if (this.sprite.parent) {
            this.sprite.parent.remove(this.sprite);
        }
        this.sprite.material.dispose();
        this.isActive = false;
    }
}


// Set up the scene, camera, and renderer
let camera, scene, renderer, composer;
let controls;
const animatedSprites = [];
const clock = new THREE.Clock();

// Object to hold all celestial bodies for animation
const solarSystem = {};
let cameraFollowTarget = null;
const cameraOrbitPivot = new THREE.Object3D();

// --- STARFIELD FUNCTION --- 
function getStarfield({ numStars = 5000, textureURL = '/images/whiteDot32.png' } = {}) {
  function randomSpherePoint() {
    const radius = Math.random() * 4000 + 1000; // Stars are further out
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    let x = radius * Math.sin(phi) * Math.cos(theta);
    let y = radius * Math.sin(phi) * Math.sin(theta);
    let z = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  }
  const verts = [];
  for (let i = 0; i < numStars; i += 1) {
    verts.push(...randomSpherePoint().toArray());
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.5,
    map: new THREE.TextureLoader().load(textureURL),
    transparent: true
  });
  const points = new THREE.Points(geo, mat);
  return points;
}

// Helper function for easing camera animation
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Camera animation state
let isCameraAnimating = false;
let cameraAnimationStartTime = 0;
const cameraAnimationDuration = 1000; // 1 second
let cameraStartPos = new THREE.Vector3();
let cameraEndPos = new THREE.Vector3();
let cameraStartLookAt = new THREE.Vector3();
let cameraEndLookAt = new THREE.Vector3();

// Helper function to create planets and their trails
function createPlanet(name, radius, color, distanceFromSun, maxTrailPoints = 500, persistenceOrbits = 1) {
    const geometry = new THREE.IcosahedronGeometry(radius, 3);
    const material = new THREE.MeshBasicMaterial({ color, wireframe: true });
    const mesh = new THREE.Mesh(geometry, material);

    const orbit = new THREE.Object3D();
    orbit.add(mesh);
    mesh.position.x = distanceFromSun;

    scene.add(orbit);

    // Create camera null
    const cameraNull = new THREE.Object3D();
    mesh.add(cameraNull);
    cameraNull.position.set(0, radius * 2, radius * 5); // Position above and behind the planet

    // Create the trail line
    const trailPoints = [];
    const trailGeometry = new THREE.BufferGeometry().setFromPoints(trailPoints);
    const trailMaterial = new THREE.LineBasicMaterial({ color: color, depthTest: false });
    const trailLine = new THREE.Line(trailGeometry, trailMaterial);
    trailLine.frustumCulled = false;
    scene.add(trailLine);

    solarSystem[name] = { mesh, orbit, trailPoints, trailLine, orbitsCompleted: 0, lastOrbitRotationY: 0, maxTrailPoints, persistenceOrbits, cameraNull };
}

function createSaturnMoon(name, radius, color, distanceFromSaturn, maxTrailPoints = 3000, persistenceOrbits = 1) {
    const geometry = new THREE.IcosahedronGeometry(radius, 1);
    const material = new THREE.MeshBasicMaterial({ color, wireframe: true });
    const mesh = new THREE.Mesh(geometry, material);

    const orbit = new THREE.Object3D();
    solarSystem.saturn.mesh.add(orbit);
    orbit.add(mesh);
    mesh.position.x = distanceFromSaturn;

    // Create the trail line
    const trailPoints = [];
    const trailGeometry = new THREE.BufferGeometry().setFromPoints(trailPoints);
    const trailMaterial = new THREE.LineBasicMaterial({ color: color, depthTest: false });
    const trailLine = new THREE.Line(trailGeometry, trailMaterial);
    trailLine.frustumCulled = false;
    scene.add(trailLine);

    solarSystem[name] = { mesh, orbit, trailPoints, trailLine, orbitsCompleted: 0, lastOrbitRotationY: 0, maxTrailPoints, persistenceOrbits, cameraNull: null };
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
    const far = 5000;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    const distance = 133;
    const angle = 33 * Math.PI / 180;
    camera.position.set(0, distance * Math.sin(angle), distance * Math.cos(angle));

    // Create the scene
    scene = new THREE.Scene();
    scene.add(cameraOrbitPivot);

    // Add Starfield
    const starfield = getStarfield();
    scene.add(starfield);

    // Post-processing
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0;
    bloomPass.strength = 1.0; // intensity of glow
    bloomPass.radius = 0.4;
    composer.addPass(bloomPass);

    // Add OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.03;

    // --- SATELLITE CONFIG ---
    const satelliteConfig = {
        imagePath: '/images/satellite_256.png', // USE RELATIVE PATH
        startTime: 0,
        duration: 20,
        initialPosition: new THREE.Vector3(-90, 15, -30),
        velocity: new THREE.Vector3(20, 15, -200),
        scale: new THREE.Vector3(10, 10, 10),
    };

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        satelliteConfig.imagePath, 
        (texture) => {
            const sprite = new AnimatedSprite(scene, {
                texture: texture,
                initialPosition: satelliteConfig.initialPosition,
                velocity: satelliteConfig.velocity,
                scale: satelliteConfig.scale,
                startTime: satelliteConfig.startTime,
                duration: satelliteConfig.duration,
                isScreenSpace: false, // Set to false to move in world space
                camera: camera
            });
            animatedSprites.push(sprite);
        },
        undefined,
        (error) => {
            console.error('An error occurred loading the satellite texture:', error);
        }
    );

    // --- Create Celestial Bodies ---
    const EARTH_RADIUS = 0.5;
    const EARTH_DISTANCE = 40;

    // Sun
    const sunGeometry = new THREE.IcosahedronGeometry(10, 3);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 'gold', wireframe: true });
    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sunMesh);
    const sunCameraNull = new THREE.Object3D();
    sunMesh.add(sunCameraNull);
    sunCameraNull.position.set(0, 10 * 2, 10 * 5); // Position above and behind the sun
    solarSystem['sun'] = { mesh: sunMesh, cameraNull: sunCameraNull };

    // Create Planets (maxTrailPoints, persistenceOrbits)
    createPlanet('mercury', EARTH_RADIUS * 0.38, 'grey', EARTH_DISTANCE * 0.4, 300, 2);
    createPlanet('venus', EARTH_RADIUS * 0.95, 'sandybrown', EARTH_DISTANCE * 0.7, 600, 2);
    createPlanet('earth', EARTH_RADIUS, 'blue', EARTH_DISTANCE, 800, 3);
    createPlanet('mars', EARTH_RADIUS * 0.53, 'red', EARTH_DISTANCE * 1.5, 1000, 3);
    createPlanet('jupiter', EARTH_RADIUS * 4.5, 'orange', EARTH_DISTANCE * 3.2, 1500, 1);
    createPlanet('uranus', EARTH_RADIUS * 2.0, 'lightblue', EARTH_DISTANCE * 6.0,5200, 2);
    createPlanet('neptune', EARTH_RADIUS * 1.9, 'darkblue', EARTH_DISTANCE * 7.5, 8000, 4);
    createPlanet('pluto', EARTH_RADIUS * 0.18, 'burlywood', EARTH_DISTANCE * 9.0, 14200, 4);


    // Saturn (special case with rings)
    const saturnOrbit = new THREE.Object3D();
    const saturnGeometry = new THREE.IcosahedronGeometry(EARTH_RADIUS * 4.0, 3);
    const saturnMaterial = new THREE.MeshBasicMaterial({ color: 'palegoldenrod', wireframe: true });
    const saturnMesh = new THREE.Mesh(saturnGeometry, saturnMaterial);
    saturnOrbit.add(saturnMesh);
    saturnMesh.position.x = EARTH_DISTANCE * 4.5;
    scene.add(saturnOrbit);
    const ringGeometry = new THREE.TorusGeometry(EARTH_RADIUS * 4.0 * 1.5, 0.7, 2, 100);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: '#FFFFFF', wireframe: true });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.rotation.x = Math.PI / 2;
    saturnMesh.add(ringMesh);
    const saturnCameraNull = new THREE.Object3D();
    saturnMesh.add(saturnCameraNull);
    saturnCameraNull.position.set(0, EARTH_RADIUS * 4.0 * 2, EARTH_RADIUS * 4.0 * 5);
    const saturnTrailPoints = [];
    const saturnTrailGeo = new THREE.BufferGeometry().setFromPoints(saturnTrailPoints);
    const saturnTrailMat = new THREE.LineBasicMaterial({ color: 'palegoldenrod' });
    const saturnTrailLine = new THREE.Line(saturnTrailGeo, saturnTrailMat);
    saturnTrailLine.frustumCulled = false;
    scene.add(saturnTrailLine);
    solarSystem['saturn'] = { mesh: saturnMesh, orbit: saturnOrbit, trailPoints: saturnTrailPoints, trailLine: saturnTrailLine, orbitsCompleted: 0, lastOrbitRotationY: 0, maxTrailPoints: 1800, persistenceOrbits: 1, cameraNull: saturnCameraNull };

    // Saturn's Moons
    createSaturnMoon('saturn_moon_1', 0.03, '#add8e6', 2.3);
    createSaturnMoon('saturn_moon_2', 0.03, '#87ceeb', 2.5);
    createSaturnMoon('saturn_moon_3', 0.03, '#87cefa', 2.8);
    createSaturnMoon('saturn_moon_4', 0.03, '#00bfff', 3.1);
    createSaturnMoon('saturn_moon_5', 0.03, '#1e90ff', 3.4);
    createSaturnMoon('saturn_moon_6', 0.03, '#6495ed', 3.7);


    // Moon for Earth
    const moonOrbit = new THREE.Object3D();
    solarSystem.earth.mesh.add(moonOrbit);
    const moonGeometry = new THREE.IcosahedronGeometry(EARTH_RADIUS * 0.25, 3);
    const moonMaterial = new THREE.MeshBasicMaterial({ color: 'lightgrey', wireframe: true });
    const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    moonMesh.position.x = 2;
    moonOrbit.add(moonMesh);
    const moonCameraNull = new THREE.Object3D();
    moonMesh.add(moonCameraNull);
    moonCameraNull.position.set(0, EARTH_RADIUS * 0.05 * 2, EARTH_RADIUS * 0.05 * 5);
    const moonTrailPoints = [];
    const moonTrailGeo = new THREE.BufferGeometry().setFromPoints(moonTrailPoints);
    const moonTrailMat = new THREE.LineBasicMaterial({ color: 'lightgrey' });
    const moonTrailLine = new THREE.Line(moonTrailGeo, moonTrailMat);
    moonTrailLine.frustumCulled = false;
    scene.add(moonTrailLine);
    solarSystem['moon'] = { mesh: moonMesh, orbit: moonOrbit, trailPoints: moonTrailPoints, trailLine: moonTrailLine, orbitsCompleted: 0, lastOrbitRotationY: 0, maxTrailPoints: 610, persistenceOrbits: 5, cameraNull: moonCameraNull };

    // --- Jupiter Moons ---
    const JUPITER_RADIUS = EARTH_RADIUS * 4.5;
    const JUPITER_MOON_DISTANCE_SCALE = JUPITER_RADIUS * 5;

    // Io
    const ioOrbit = new THREE.Object3D();
    solarSystem.jupiter.mesh.add(ioOrbit);
    const ioGeometry = new THREE.IcosahedronGeometry(JUPITER_RADIUS * 0.025, 3);
    const ioMaterial = new THREE.MeshBasicMaterial({ color: 'orange', wireframe: true });
    const ioMesh = new THREE.Mesh(ioGeometry, ioMaterial);
    ioMesh.position.x = JUPITER_MOON_DISTANCE_SCALE * 0.3;
    ioOrbit.add(ioMesh);
    const ioCameraNull = new THREE.Object3D();
    ioMesh.add(ioCameraNull);
    ioCameraNull.position.set(0, JUPITER_RADIUS * 0.025 * 2, JUPITER_RADIUS * 0.025 * 5);
    const ioTrailPoints = [];
    const ioTrailGeo = new THREE.BufferGeometry().setFromPoints(ioTrailPoints);
    const ioTrailMat = new THREE.LineBasicMaterial({ color: 'orange' });
    const ioTrailLine = new THREE.Line(ioTrailGeo, ioTrailMat);
    ioTrailLine.frustumCulled = false;
    scene.add(ioTrailLine);
    solarSystem['io'] = { mesh: ioMesh, orbit: ioOrbit, trailPoints: ioTrailPoints, trailLine: ioTrailLine, orbitsCompleted: 0, lastOrbitRotationY: 0, maxTrailPoints: 1800, persistenceOrbits: 1, cameraNull: ioCameraNull };

    // Europa
    const europaOrbit = new THREE.Object3D();
    solarSystem.jupiter.mesh.add(europaOrbit);
    const europaGeometry = new THREE.IcosahedronGeometry(JUPITER_RADIUS * 0.022, 3);
    const europaMaterial = new THREE.MeshBasicMaterial({ color: 'lightgrey', wireframe: true });
    const europaMesh = new THREE.Mesh(europaGeometry, europaMaterial);
    europaMesh.position.x = JUPITER_MOON_DISTANCE_SCALE * 0.35;
    europaOrbit.add(europaMesh);
    const europaCameraNull = new THREE.Object3D();
    europaMesh.add(europaCameraNull);
    europaCameraNull.position.set(0, JUPITER_RADIUS * 0.022 * 2, JUPITER_RADIUS * 0.022 * 5);
    const europaTrailPoints = [];
    const europaTrailGeo = new THREE.BufferGeometry().setFromPoints(europaTrailPoints);
    const europaTrailMat = new THREE.LineBasicMaterial({ color: 'lightgrey' });
    const europaTrailLine = new THREE.Line(europaTrailGeo, europaTrailMat);
    europaTrailLine.frustumCulled = false;
    scene.add(europaTrailLine);
    solarSystem['europa'] = { mesh: europaMesh, orbit: europaOrbit, trailPoints: europaTrailPoints, trailLine: europaTrailLine, orbitsCompleted: 0, lastOrbitRotationY: 0, maxTrailPoints: 1700, persistenceOrbits: 2, cameraNull: europaCameraNull };

    // --- Mars Moons ---
    const MARS_RADIUS = EARTH_RADIUS * 0.53;
    const MARS_MOON_DISTANCE_SCALE = MARS_RADIUS * 10;

    // Phobos
    const phobosOrbit = new THREE.Object3D();
    solarSystem.mars.mesh.add(phobosOrbit);
    const phobosGeometry = new THREE.IcosahedronGeometry(MARS_RADIUS * 0.003 * 100, 1);
    const phobosMaterial = new THREE.MeshBasicMaterial({ color: 'darkgrey', wireframe: true });
    const phobosMesh = new THREE.Mesh(phobosGeometry, phobosMaterial);
    phobosMesh.position.x = MARS_MOON_DISTANCE_SCALE * 0.2;
    phobosOrbit.add(phobosMesh);
    const phobosCameraNull = new THREE.Object3D();
    phobosMesh.add(phobosCameraNull);
    phobosCameraNull.position.set(0, MARS_RADIUS * 0.003 * 100 * 2, MARS_RADIUS * 0.003 * 100 * 5);
    const phobosTrailPoints = [];
    const phobosTrailGeo = new THREE.BufferGeometry().setFromPoints(phobosTrailPoints);
    const phobosTrailMat = new THREE.LineBasicMaterial({ color: 'darkgrey' });
    const phobosTrailLine = new THREE.Line(phobosTrailGeo, phobosTrailMat);
    phobosTrailLine.frustumCulled = false;
    scene.add(phobosTrailLine);
    solarSystem['phobos'] = { mesh: phobosMesh, orbit: phobosOrbit, trailPoints: phobosTrailPoints, trailLine: phobosTrailLine, orbitsCompleted: 0, lastOrbitRotationY: 0, maxTrailPoints: 740, persistenceOrbits: 1, cameraNull: phobosCameraNull };

    // Deimos
    const deimosOrbit = new THREE.Object3D();
    solarSystem.mars.mesh.add(deimosOrbit);
    const deimosGeometry = new THREE.IcosahedronGeometry(MARS_RADIUS * 0.001 * 100, 1);
    const deimosMaterial = new THREE.MeshBasicMaterial({ color: 'lightgrey', wireframe: true });
    const deimosMesh = new THREE.Mesh(deimosGeometry, deimosMaterial);
    deimosMesh.position.x = MARS_MOON_DISTANCE_SCALE * 0.4;
    deimosOrbit.add(deimosMesh);
    const deimosCameraNull = new THREE.Object3D();
    deimosMesh.add(deimosCameraNull);
    deimosCameraNull.position.set(0, MARS_RADIUS * 0.001 * 100 * 2, MARS_RADIUS * 0.001 * 100 * 5);
    const deimosTrailPoints = [];
    const deimosTrailGeo = new THREE.BufferGeometry().setFromPoints(deimosTrailPoints);
    const deimosTrailMat = new THREE.LineBasicMaterial({ color: 'lightgrey' });
    const deimosTrailLine = new THREE.Line(deimosTrailGeo, deimosTrailMat);
    deimosTrailLine.frustumCulled = false;
    scene.add(deimosTrailLine);
    solarSystem['deimos'] = { mesh: deimosMesh, orbit: deimosOrbit, trailPoints: deimosTrailPoints, trailLine: deimosTrailLine, orbitsCompleted: 0, lastOrbitRotationY: 0, maxTrailPoints: 770, persistenceOrbits: 1, cameraNull: deimosCameraNull };

    // --- UI for Planet Selection ---
    const uiContainer = document.createElement('div');
    uiContainer.style.position = 'absolute';
    uiContainer.style.bottom = '20px';
    uiContainer.style.left = '20px';
    uiContainer.style.padding = '8px';
    uiContainer.style.backgroundColor = 'rgba(0,0,0,0.5)';
    uiContainer.style.borderRadius = '5px';
    uiContainer.style.color = 'white';
    uiContainer.style.fontFamily = 'sans-serif';
    uiContainer.style.fontSize = '13px';
    uiContainer.style.maxHeight = 'calc(100vh - 40px)';
    uiContainer.style.overflowY = 'auto';
    document.body.appendChild(uiContainer);

    const celestialBodyNamesForUI = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

    const resetButton = document.createElement('div');
    resetButton.textContent = 'Reset';
    resetButton.style.padding = '4px';
    resetButton.style.cursor = 'pointer';
    resetButton.style.borderBottom = '1px solid #555';
    resetButton.addEventListener('mouseenter', () => resetButton.style.backgroundColor = 'rgba(255,255,255,0.2)');
    resetButton.addEventListener('mouseleave', () => resetButton.style.backgroundColor = 'transparent');
    resetButton.addEventListener('click', () => {
        window.parent.postMessage({ type: 'reset' }, window.location.origin);
    });
    uiContainer.appendChild(resetButton);

    celestialBodyNamesForUI.forEach(name => {
        const body = solarSystem[name];
        if (body) {
            const button = document.createElement('div');
            button.textContent = name.charAt(0).toUpperCase() + name.slice(1);
            button.style.padding = '4px';
            button.style.cursor = 'pointer';
            button.style.borderBottom = '1px solid #555';
            button.addEventListener('mouseenter', () => button.style.backgroundColor = 'rgba(255,255,255,0.2)');
            button.addEventListener('mouseleave', () => button.style.backgroundColor = 'transparent');

            button.addEventListener('click', () => {
                const targetBody = solarSystem[name];
                if (targetBody) {
                    if (cameraFollowTarget === name) {
                        cameraFollowTarget = null;
                        controls.enabled = true;
                    } else {
                        cameraFollowTarget = name;
                        controls.enabled = false;
                        if (targetBody.mesh) {
                            targetBody.mesh.add(cameraOrbitPivot);
                            cameraOrbitPivot.rotation.set(0, 0, 0);
                        }
                    }
                }
            });
            uiContainer.appendChild(button);
        }
    });

    // --- End Creation ---

    // Add event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('message', (event) => {
        if (event.data.type === 'resize') {
            handleResize();
        }
    });

    // Start the animation loop
    animate();
}

function handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    if(camera && renderer) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        composer.setSize(w, h);
    }
}

const planetNames = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'moon', 'io', 'europa', 'phobos', 'deimos', 'saturn_moon_1', 'saturn_moon_2', 'saturn_moon_3', 'saturn_moon_4', 'saturn_moon_5', 'saturn_moon_6'];

function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();
    for (let i = animatedSprites.length - 1; i >= 0; i--) {
        animatedSprites[i].update(deltaTime);
        if (!animatedSprites[i].isActive) {
            animatedSprites.splice(i, 1);
        }
    }

    // Rotations
    solarSystem.sun.mesh.rotation.y += 0.0005;
    solarSystem.mercury.mesh.rotation.y += 0.01;
    solarSystem.venus.mesh.rotation.y -= 0.008; // Retrograde
    solarSystem.earth.mesh.rotation.y += 0.01;
    solarSystem.mars.mesh.rotation.y += 0.012;
    solarSystem.jupiter.mesh.rotation.y += 0.025;
    solarSystem.saturn.mesh.rotation.y += 0.022;
    solarSystem.uranus.mesh.rotation.y -= 0.015; // Retrograde
    solarSystem.neptune.mesh.rotation.y += 0.018;
    solarSystem.pluto.mesh.rotation.y += 0.005;
    solarSystem.moon.mesh.rotation.y += 0.03;
    solarSystem.io.mesh.rotation.y += 0.05; // Io rotation
    solarSystem.europa.mesh.rotation.y += 0.03; // Europa rotation
    solarSystem.phobos.mesh.rotation.y += 0.08; // Phobos rotation
    solarSystem.deimos.mesh.rotation.y += 0.02; // Deimos rotation

    // Orbits
    solarSystem.mercury.orbit.rotation.y += 0.04;
    solarSystem.venus.orbit.rotation.y += 0.015;
    solarSystem.earth.orbit.rotation.y += 0.01;
    solarSystem.mars.orbit.rotation.y += 0.008;
    solarSystem.jupiter.orbit.rotation.y += 0.004;
    solarSystem.saturn.orbit.rotation.y += 0.002;
    solarSystem.uranus.orbit.rotation.y += 0.001;
    solarSystem.neptune.orbit.rotation.y += 0.0005;
    solarSystem.pluto.orbit.rotation.y += 0.0002;
    solarSystem.moon.orbit.rotation.y += 0.02;
    solarSystem.io.orbit.rotation.y += 0.08; // Io orbit speed
    solarSystem.europa.orbit.rotation.y += 0.04; // Europa orbit speed
    solarSystem.phobos.orbit.rotation.y += 0.15; // Phobos orbit speed
    solarSystem.deimos.orbit.rotation.y += 0.07; // Deimos orbit speed
    solarSystem.saturn_moon_1.orbit.rotation.y += 0.1;
    solarSystem.saturn_moon_2.orbit.rotation.y += 0.12;
    solarSystem.saturn_moon_3.orbit.rotation.y += 0.14;
    solarSystem.saturn_moon_4.orbit.rotation.y += 0.16;
    solarSystem.saturn_moon_5.orbit.rotation.y += 0.18;
    solarSystem.saturn_moon_6.orbit.rotation.y += 0.2;


    // Camera Animation
    if (cameraFollowTarget) {
        const targetBody = solarSystem[cameraFollowTarget];
        if (targetBody && targetBody.mesh) {
            cameraOrbitPivot.rotation.y += 0.005; // Slow orbit

            const offset = new THREE.Vector3(0, targetBody.mesh.geometry.parameters.radius * 2, targetBody.mesh.geometry.parameters.radius * 0.2);
            const worldPosition = cameraOrbitPivot.localToWorld(offset.clone());
            camera.position.lerp(worldPosition, 0.06);

            const targetLookAt = new THREE.Vector3();
            targetBody.mesh.getWorldPosition(targetLookAt);
            controls.target.copy(targetLookAt);
            camera.lookAt(targetLookAt);
        }
    } else {
        controls.update();
    }

    // Update the trails
    const worldPos = new THREE.Vector3();
    const twoPi = 2 * Math.PI;

    for (const name of planetNames) {
        const planet = solarSystem[name];
        
        // Track orbit completion
        const currentRotationY = planet.orbit.rotation.y;
        if (currentRotationY < planet.lastOrbitRotationY) { // Detect a full rotation (crossing 0/2PI)
            planet.orbitsCompleted++;
        }
        planet.lastOrbitRotationY = currentRotationY;

        // Clear trail after N orbits
        if (planet.orbitsCompleted >= planet.persistenceOrbits) {
            planet.trailPoints.length = 0; // Clear array efficiently
            planet.orbitsCompleted = 0; // Reset counter
        }

        // Add points to trail if not cleared
        if (planet.trailPoints.length === 0 || planet.orbitsCompleted < planet.persistenceOrbits) {
            planet.mesh.getWorldPosition(worldPos);
            planet.trailPoints.push(worldPos.clone());

            if (planet.trailPoints.length > planet.maxTrailPoints) {
                planet.trailPoints.shift();
            }
        }

        planet.trailLine.geometry.setFromPoints(planet.trailPoints);
        planet.trailLine.geometry.attributes.position.needsUpdate = true; // Important for updates
    }

    composer.render();
}

init();