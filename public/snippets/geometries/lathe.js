// Creates a 3D shape by rotating a 2D line of points around an axis.
// Useful for creating shapes like vases or lamps.
const points = [];
for ( let i = 0; i < 10; i ++ ) {
    points.push( new THREE.Vector2( Math.sin( i * 0.2 ) * 1 + 0.5, ( i - 5 ) * 0.2 ) );
}
const geometry = new THREE.LatheGeometry( points );
const material = new THREE.MeshStandardMaterial( { color: 0x00ff00, side: THREE.DoubleSide } );
const mesh = new THREE.Mesh( geometry, material );
scene.add( mesh );