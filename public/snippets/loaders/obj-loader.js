// Load and display an OBJ model
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import * as THREE from 'three';

const loader = new OBJLoader();

loader.load(
    '/models/spiked.obj',
    function (object) {
        // Success callback - object loaded
        console.log('Model loaded successfully');

        // Apply a material to the loaded object
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
        });

        object.traverse(function (child) {
            if (child.isMesh) {
                child.material = material;
            }
        });

        // Position the object
        object.position.set(0, 0, 0);

        // Add to scene (assumes 'scene' variable exists)
        scene.add(object);
    },
    function (xhr) {
        // Progress callback
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
        // Error callback
        console.error('An error occurred loading the OBJ model:', error);
    }
);
