// A sphere shape
const geometry = new THREE.SphereGeometry( 1, 32, 16 );
const material = new THREE.MeshStandardMaterial( { color: 0x00ff00 } );
const mesh = new THREE.Mesh( geometry, material );
scene.add( mesh );