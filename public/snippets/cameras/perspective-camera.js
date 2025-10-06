// The most common camera type, mimics the human eye.
// Objects further away appear smaller.
// PerspectiveCamera(fov, aspect, near, far)
const fov = 75; // Field of View
const aspect = window.innerWidth / window.innerHeight;
const near = 0.1; // Near clipping plane
const far = 1000; // Far clipping plane
const camera = new THREE.PerspectiveCamera( fov, aspect, near, far );
camera.position.z = 5;