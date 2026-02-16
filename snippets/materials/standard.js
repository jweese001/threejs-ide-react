// A physically-based material (shiny or rough)
const material = new THREE.MeshStandardMaterial( {
    color: 0xffffff,
    roughness: 0.5, // 0 is shiny, 1 is matte
    metalness: 0.5  // 0 is non-metallic, 1 is metallic
} );