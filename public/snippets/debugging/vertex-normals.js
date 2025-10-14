// Shows the vertex normals on a mesh's geometry as small lines.
// This is essential for debugging lighting issues.
//
// Usage:
// 1. Add this function to your code.
// 2. Call it with your scene and the mesh you want to inspect:
//    visualizeNormals(scene, myMesh);

function visualizeNormals(scene, object) {
  // The '2' is the length of the normal lines
  const normalsHelper = new THREE.VertexNormalsHelper(object, 2, 0x00ff00); // Green lines
  scene.add(normalsHelper);
}
