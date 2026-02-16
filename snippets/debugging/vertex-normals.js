// ============================================================================
// VERTEX NORMALS HELPER
// ============================================================================
// Shows the direction of vertex normals as colored lines.
// Useful for debugging lighting and shading issues.
//
// HOW TO USE IN YOUR CODE:
// 1. Add the import at the top of your file
// 2. After creating your mesh, add the two lines shown below
// ============================================================================

// Step 1: Add this import at the top of your file
import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';

// Step 2: After you create and add your mesh, add these two lines:
const normalsHelper = new VertexNormalsHelper(mesh, 0.3, 0xff0000);
scene.add(normalsHelper);

// That's it! You'll see red lines showing the normal directions.

// ============================================================================
// PARAMETER GUIDE
// ============================================================================

// VertexNormalsHelper(mesh, length, color)
//
// mesh - the mesh object you want to visualize
// length - how long the lines should be (0.1 to 5.0)
// color - hex color for the lines (0xff0000 = red)

// ============================================================================
// TIPS
// ============================================================================

// Adjust line length for your mesh size:
new VertexNormalsHelper(mesh, 0.2, 0xff0000);  // Small objects
new VertexNormalsHelper(mesh, 0.5, 0xff0000);  // Medium objects
new VertexNormalsHelper(mesh, 2.0, 0xff0000);  // Large objects

// Try different colors for visibility:
new VertexNormalsHelper(mesh, 0.3, 0xff0000);  // Red
new VertexNormalsHelper(mesh, 0.3, 0x00ff00);  // Green
new VertexNormalsHelper(mesh, 0.3, 0xffff00);  // Yellow

// Remove helper when done debugging:
scene.remove(normalsHelper);

// ============================================================================
// WHY NORMALS MATTER
// ============================================================================

// Normals control how light bounces off surfaces.
// Wrong normals = weird lighting!

// This helper solves:
// ✓ Model appears black or too dark
// ✓ Lighting looks backwards
// ✓ Imported models have strange shading
// ✓ Custom geometry doesn't look right
