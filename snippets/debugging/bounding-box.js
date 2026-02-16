// ============================================================================
// BOUNDING BOX HELPER
// ============================================================================
// Shows a wireframe box around an object to visualize its size and position.
// Useful for debugging object dimensions, collision detection, and positioning.
//
// HOW TO USE IN YOUR CODE:
// After creating your mesh, add the two lines shown below
// ============================================================================

// Add this after you create and add your mesh:
const boxHelper = new THREE.BoxHelper(mesh, 0xffff00);
scene.add(boxHelper);

// That's it! You'll see a yellow box outlining your object.

// ============================================================================
// PARAMETER GUIDE
// ============================================================================

// BoxHelper(object, color)
//
// object - the mesh or group you want to visualize
// color - hex color for the box lines (0xffff00 = yellow)

// ============================================================================
// TIPS
// ============================================================================

// Common colors:
new THREE.BoxHelper(mesh, 0xffff00);  // Yellow (default, good visibility)
new THREE.BoxHelper(mesh, 0xff0000);  // Red
new THREE.BoxHelper(mesh, 0x00ff00);  // Green
new THREE.BoxHelper(mesh, 0x00ffff);  // Cyan

// Update box if object moves or changes:
boxHelper.update();

// Works with groups too:
const group = new THREE.Group();
group.add(mesh1);
group.add(mesh2);
scene.add(group);
const groupBox = new THREE.BoxHelper(group, 0xff00ff);
scene.add(groupBox);

// Remove helper when done debugging:
scene.remove(boxHelper);

// ============================================================================
// WHY USE THIS?
// ============================================================================

// Bounding boxes help you understand object size and position in 3D space.

// This helper solves:
// ✓ Objects not appearing (check if box is visible)
// ✓ Collision detection setup (see actual boundaries)
// ✓ Unexpected object size (imported models scaled wrong)
// ✓ Positioning issues (see where object really is)
