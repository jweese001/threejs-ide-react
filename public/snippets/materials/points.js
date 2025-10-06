// The default material used by Points.
// Can be used to control the size and color of individual points.
const material = new THREE.PointsMaterial({
    color: 0x00ff00,
    size: 0.1, // The size of each point in world units.
    sizeAttenuation: true // Whether points get smaller as they are further from the camera.
});