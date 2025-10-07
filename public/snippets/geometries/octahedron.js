// An octahedron (8 faces).
// OctahedronGeometry(radius, detail)
const radius = 1;
const detail = 0; // Setting detail > 0 subdivides the geometry.
const geometry = new THREE.OctahedronGeometry(radius, detail);
const material = new THREE.MeshStandardMaterial( { color: 0x00ff00 } );
const mesh = new THREE.Mesh( geometry, material );
scene.add( mesh );