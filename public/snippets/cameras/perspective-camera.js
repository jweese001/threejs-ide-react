// Replaces the scene's camera with a PerspectiveCamera.
// This is the most common camera, mimicking the human eye.
// PerspectiveCamera(fov, aspect, near, far)
const fov = 75; // Field of View
const aspect = window.innerWidth / window.innerHeight;
const near = 0.1; // Near clipping plane
const far = 1000; // Far clipping plane
camera = new THREE.PerspectiveCamera( fov, aspect, near, far );
camera.position.z = 5;