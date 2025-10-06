// A hemisphere light with arguments (sky color, ground color, intensity)
    const hemiLight = new THREE.HemisphereLight(0xb1b1ff, 0xb97a20, 1);
    //hemiLight.position.set(100, 200, 2);
    scene.add(hemiLight);