// A cone shape.
// ConeGeometry(radius, height, radialSegments)
const radius = 1;
const height = 2;
const radialSegments = 32;
const geometry = new THREE.ConeGeometry(radius, height, radialSegments);

const material = new THREE.MeshStandardMaterial({ color: 0x00ff00, wireframe: true });
const cone = new THREE.Mesh(geometry, material);
cone.position.y = 1; // Position it so the base is on the grid
scene.add(cone);