// Shows the X, Y, Z axes for reference
// Red = X, Green = Y, Blue = Z
const axesHelper = new THREE.AxesHelper(5);
axesHelper.position.set(0, 0.0001, 0);
scene.add(axesHelper);

// Position
// axesHelper.position.set(0, 0, 0);
// axesHelper.position.y = 1;  // Move up

// Rotation
// axesHelper.rotation.x = Math.PI / 4;
// axesHelper.rotation.y = Math.PI / 4;

// Scale (make axes longer/shorter)
// axesHelper.scale.set(2, 2, 2);  // Double size
// axesHelper.scale.set(0.5, 0.5, 0.5);  // Half size

// Visibility
// axesHelper.visible = false;  // Hide
// axesHelper.visible = true;   // Show
