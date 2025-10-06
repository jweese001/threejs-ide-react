// A donut shape
const geometry = new THREE.TorusGeometry( 1, 0.4, 16, 100 );
const material = new THREE.MeshStandardMaterial( { color: 0xffa500 } );
const mesh = new THREE.Mesh( geometry, material );
scene.add( mesh );