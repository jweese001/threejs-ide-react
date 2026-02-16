import * as THREE from 'three';

let camera, scene, renderer, inkPlane;
const clouds = [];

function init() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, w / h, 1, 2000);
    renderer = new THREE.WebGLRenderer({ antialias: true });

    camera.position.z = 250;
    renderer.setSize(w, h);

    document.body.appendChild(renderer.domElement);
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';

    // --- INK STAIN BACKGROUND --- //
    const inkVertexShader = `
        void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const inkFragmentShader = `
        uniform vec2 resolution;
        uniform float time;

        // A simple random function
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        // Perlin noise (simplified for ink-like effect)
        float noise(vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);

            // Four corners in 2D of a tile
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));

            // Smooth Interpolation
            vec2 u = f * f * (3.0 - 2.0 * f);

            return mix(a, b, u.x) +
                   (c - a) * u.y * (1.0 - u.x) +
                   (d - b) * u.x * u.y;
        }

        void main() {
            vec2 st = gl_FragCoord.xy / resolution.xy;
            st.x *= resolution.x / resolution.y; // Correct aspect ratio

            // Adjust these values to control the ink stain appearance
            float inkDensity = noise(st * 5.0 + time * 0.05); // Scale and animate noise
            inkDensity += noise(st * 10.0 + time * 0.02) * 0.5;
            inkDensity += noise(st * 20.0 + time * 0.01) * 0.25;

            // Invert and power to make it darker and more contrasted
            inkDensity = 1.0 - inkDensity;
            inkDensity = pow(inkDensity, 2.0); // Increase contrast

            // Map to shades of grey to black
            vec3 color = vec3(inkDensity * 0.2288 + 0.1712); // Range from 0.1712 to 0.4

                    gl_FragColor = vec4( color, 1.0 );

                }
    `;

    const inkMaterial = new THREE.ShaderMaterial({
        uniforms: {
            resolution: { value: new THREE.Vector2(w, h) },
            time: { value: 0.0 }
        },
        vertexShader: inkVertexShader,
        fragmentShader: inkFragmentShader
    });

    inkPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), inkMaterial);
    inkPlane.position.z = -200; // Place it behind the nebula
    scene.add(inkPlane);
    // --- END OF INK STAIN BACKGROUND --- //


    // --- NEBULA BACKGROUND --- //
    const loader = new THREE.TextureLoader();
    loader.load(
        "/images/smoke.png",
        function(texture) {
            console.log('Texture loaded! Creating nebula...');
            const cloudGeometry = new THREE.PlaneGeometry(500, 500);
            const colors = [0x2B2B2B, 0x222222, 0x333333, 0x111111];

            for (let p = 0; p < 80; p++) {
                const cloudMaterial = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 0.6,
                    blending: THREE.AdditiveBlending,
                    side: THREE.DoubleSide,
                    color: colors[p % colors.length],
                    depthWrite: false
                });

                let cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
                cloud.position.set(
                    (Math.random() - 0.5) * 1000,
                    (Math.random() - 0.5) * 400,
                    Math.random() * -500 - 100
                );
                cloud.rotation.z = Math.random() * 2 * Math.PI;
                scene.add(cloud);
                clouds.push(cloud);
            }
            console.log('Added', clouds.length, 'nebula clouds');
        },
        undefined,
        function(error) {
            console.error('Texture load error:', error);
        }
    );
    // --- END OF NEBULA BACKGROUND --- //

    window.addEventListener('resize', handleResize);
    animate();
    handleResize();
}

function handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if(camera && renderer) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        // Update shader resolution uniform
        if (inkPlane && inkPlane.material && inkPlane.material.uniforms && inkPlane.material.uniforms.resolution) {
            inkPlane.material.uniforms.resolution.value.set(w, h);
        }

        // Resize inkPlane to cover the screen based on camera frustum
        if (inkPlane) {
            const distance = Math.abs(camera.position.z - inkPlane.position.z);
            const vFOV = camera.fov * Math.PI / 180; // convert vertical fov to radians
            const planeHeight = 2 * Math.tan(vFOV / 2) * distance;
            const planeWidth = planeHeight * camera.aspect;

            inkPlane.scale.set(planeWidth, planeHeight, 1);
        }
    }
}

function animate() {
    requestAnimationFrame(animate);

    // Animate nebula clouds
    for (const cloud of clouds) {
        cloud.rotation.z -= 0.0005;
    }

    // Update shader time uniform for animation
    scene.children.forEach(child => {
        if (child.material && child.material.uniforms && child.material.uniforms.time) {
            child.material.uniforms.time.value += 0.09;
        }
    });

    renderer.render(scene, camera);
}

init();