// Replaces all materials in the scene with a wireframe material.
// Helps diagnose if a problem is with geometry or materials/lighting.
//
// Usage:
// 1. Add this function to your code.
// 2. Call it to turn on wireframe: setGlobalWireframe(scene, true);
// 3. Call it again to turn off and restore original materials: setGlobalWireframe(scene, false);

function setGlobalWireframe(scene, enabled = true) {
  scene.traverse((child) => {
    if (child.isMesh && child.material) {
      if (enabled) {
        // Avoid overwriting if it's already been done
        if (!child.userData.originalMaterial) {
          child.userData.originalMaterial = child.material;
        }
        child.material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          wireframe: true
        });
      } else if (child.userData.originalMaterial) {
        // Restore the original material only if it was saved
        child.material = child.userData.originalMaterial;
        delete child.userData.originalMaterial;
      }
    }
  });
}
