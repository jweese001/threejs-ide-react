// A material that uses a texture to define the object's appearance
// No lights are needed in the scene for this material.
const textureLoader = new THREE.TextureLoader();
const matcapTexture = textureLoader.load( 'assets/matcap_01.webp' );
const material = new THREE.MeshMatcapMaterial( { matcap: matcapTexture } );