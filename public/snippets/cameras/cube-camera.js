// Creates 6 cameras that render to a WebGLCubeRenderTarget.
// Used for creating environment maps and reflections.
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget( 128, { format: THREE.RGBFormat, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter } );
const cubeCamera = new THREE.CubeCamera( 1, 1000, cubeRenderTarget );