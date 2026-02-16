// Creates a starfield as a THREE.Points object
function getStarfield({ numStars = 500, textureURL = '/images/whiteDot32.png' } = {}) {
  function randomSpherePoint() {
    const radius = Math.random() * 25 + 25;
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    let x = radius * Math.sin(phi) * Math.cos(theta);
    let y = radius * Math.sin(phi) * Math.sin(theta);
    let z = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  }
  const verts = [];
  for (let i = 0; i < numStars; i += 1) {
    verts.push(...randomSpherePoint().toArray());
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.2,
    map: new THREE.TextureLoader().load(textureURL),
    transparent: true
  });
  const points = new THREE.Points(geo, mat);
  return points;
}