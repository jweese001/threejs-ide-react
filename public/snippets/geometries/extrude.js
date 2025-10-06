// Creates a 3D shape by extruding a 2D shape along a path.
const length = 0.5, width = 0.5;
const shape = new THREE.Shape();
shape.moveTo( -width, -length );
shape.lineTo( -width, length );
shape.lineTo( width, length );
shape.lineTo( width, -length );
shape.lineTo( -width, -length );

const extrudeSettings = {
    steps: 2,
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelOffset: 0,
    bevelSegments: 1
};

const geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );