// A flat plane
const geometry = new THREE.PlaneGeometry( 10, 10 );
const material = new THREE.MeshStandardMaterial( { color: 0xeeeeee, side: THREE.DoubleSide } );
const mesh = new THREE.Mesh( geometry, material );
mesh.rotation.x = -Math.PI / 2; // Rotate to be flat
scene.add( mesh );