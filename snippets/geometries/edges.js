// This is not a visible geometry on its own.
// It's a helper that takes another geometry and creates data representing its edges.
// Useful for creating wireframe-style outlines.
const boxGeom = new THREE.BoxGeometry(1, 1, 1);
const edges = new THREE.EdgesGeometry( boxGeom );
const line = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { color: 0xffffff } ) );
scene.add( line );