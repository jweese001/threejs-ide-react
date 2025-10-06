// The most advanced physically-based material.
// Use this for realistic surfaces.
const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.5,  // 0 is non-metallic, 1 is metallic
    roughness: 0.5,  // 0 is shiny, 1 is matte
    ior: 1.5,        // Index of Refraction (for glass-like materials)
    transmission: 1, // 0 is opaque, 1 is fully transparent/transmissive
    thickness: 0.5   // Thickness of the transmissive volume
});