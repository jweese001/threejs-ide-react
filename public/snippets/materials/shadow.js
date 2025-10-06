// A material that only receives shadows.
// It is transparent except where shadows are cast.
// Useful for creating "invisible" ground planes to catch shadows.
const material = new THREE.ShadowMaterial();
material.opacity = 0.5; // How dark the shadow is