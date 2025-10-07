// A cylinder shape.
// CylinderGeometry(radiusTop, radiusBottom, height, radialSegments)
const radiusTop = 1;
const radiusBottom = 1;
const height = 2;
const radialSegments = 32;
const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);

const material = new THREE.MeshStandardMaterial({ color: 0x00ff00, wireframe: true });
const cylinder = new THREE.Mesh(geometry, material);
cylinder.position.y = 1; // Position it so the base is on the grid
scene.add(cylinder);