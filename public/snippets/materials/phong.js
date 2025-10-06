// A shiny material that reflects light
// Good for polished surfaces.
const material = new THREE.MeshPhongMaterial({
    color: 0x00ff00,
    shininess: 100, // How shiny the material is. Default is 30.
    specular: 0x111111 // The color of the highlight.
});