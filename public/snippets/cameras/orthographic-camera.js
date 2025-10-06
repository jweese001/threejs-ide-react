// A camera that uses orthographic projection.
// Objects appear the same size regardless of their distance from the camera.
// Useful for 2D games or technical drawings.
// OrthographicCamera(left, right, top, bottom, near, far)
const left = window.innerWidth / - 2;
const right = window.innerWidth / 2;
const top = window.innerHeight / 2;
const bottom = window.innerHeight / - 2;
const near = 1;
const far = 1000;
const camera = new THREE.OrthographicCamera( left, right, top, bottom, near, far );
camera.position.z = 5;