// Used to render a scene from multiple camera perspectives.
// An array of cameras is passed to the constructor.
const anArrayOfCameras = [
    new THREE.PerspectiveCamera(50, aspect, 1, 10),
    new THREE.PerspectiveCamera(60, aspect, 1, 20)
];
const camera = new THREE.ArrayCamera( anArrayOfCameras );