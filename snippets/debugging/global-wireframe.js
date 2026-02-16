// ============================================================================
// GLOBAL WIREFRAME TOGGLE
// ============================================================================
// Converts all materials in the scene to wireframe mode.
// Helps diagnose if problems are with geometry or materials/lighting.
//
// HOW TO USE IN YOUR CODE:
// 1. Copy the function below into your code
// 2. Call it to toggle wireframe mode on/off
// ============================================================================

// Add this function to your code:
function setGlobalWireframe(scene, enabled = true) {
  scene.traverse((child) => {
    if (child.isMesh && child.material) {
      if (enabled) {
        // Save original material
        if (!child.userData.originalMaterial) {
          child.userData.originalMaterial = child.material;
        }
        // Replace with wireframe
        child.material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          wireframe: true
        });
      } else if (child.userData.originalMaterial) {
        // Restore original material
        child.material = child.userData.originalMaterial;
        delete child.userData.originalMaterial;
      }
    }
  });
}

// Turn wireframe ON:
setGlobalWireframe(scene, true);

// Turn wireframe OFF (restore original materials):
setGlobalWireframe(scene, false);

// ============================================================================
// TIPS
// ============================================================================

// Use different wireframe colors:
child.material = new THREE.MeshBasicMaterial({
  color: 0x00ff00,  // Green wireframe
  wireframe: true
});

// Toggle with keyboard (add to your code):
window.addEventListener('keydown', (e) => {
  if (e.key === 'w') {
    wireframeEnabled = !wireframeEnabled;
    setGlobalWireframe(scene, wireframeEnabled);
  }
});

// Apply to specific object only:
function setWireframe(object, enabled) {
  if (!object.userData.originalMaterial) {
    object.userData.originalMaterial = object.material;
  }
  object.material = enabled
    ? new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
    : object.userData.originalMaterial;
}

// ============================================================================
// WHY USE THIS?
// ============================================================================

// Wireframe mode shows the raw geometry without materials or lighting.

// This helper solves:
// ✓ Is the geometry correct? (see the mesh structure)
// ✓ Are materials causing the problem? (wireframe bypasses them)
// ✓ Is lighting the issue? (wireframe doesn't need lights)
// ✓ Check polygon count (see how dense the mesh is)
