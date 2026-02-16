// An icosahedron shape
const geometry = new THREE.IcosahedronGeometry( 1, 0 );
const material = new THREE.MeshStandardMaterial( { color: 0x00ff00 } );
const mesh = new THREE.Mesh( geometry, material );
scene.add( mesh );