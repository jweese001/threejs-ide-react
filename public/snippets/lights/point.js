// A light that shines from a single point in all directions
const pointLight = new THREE.PointLight( 0xffffff, 1, 100 );
pointLight.position.set( 5, 5, 5 );
scene.add( pointLight );