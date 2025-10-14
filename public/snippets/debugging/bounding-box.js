// Creates a visible wireframe box around an object
// to help debug its size and position.
//
// Usage:
// 1. Add this function to your code.
// 2. Call it with your scene and the object you want to inspect:
//    addBoundingBox(scene, myObject);

function addBoundingBox(scene, object) {
  const boxHelper = new THREE.BoxHelper(object, 0xffff00); // Yellow box
  scene.add(boxHelper);
}
