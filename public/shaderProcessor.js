/**
 * Shader Processor for FlowBoard
 *
 * Processes images with GPU shaders using Three.js EffectComposer.
 * Runs in the IDE's preview iframe.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ============================================
// SHADER DEFINITIONS
// ============================================

/**
 * Vignette Shader
 * Darkens the edges of the image
 * Uniforms: intensity (0-1), softness (0-1)
 */
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    intensity: { value: 0.5 },
    softness: { value: 0.5 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float intensity;
    uniform float softness;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Calculate distance from center
      vec2 center = vec2(0.5, 0.5);
      float dist = distance(vUv, center);

      // Create vignette effect
      float vignette = smoothstep(0.8 - softness * 0.5, 0.5 - softness * 0.3, dist);
      vignette = mix(1.0, vignette, intensity);

      gl_FragColor = vec4(color.rgb * vignette, color.a);
    }
  `,
};

/**
 * Kawase Blur Shader
 * Fast, high-quality blur that scales smoothly at any radius.
 * Uses diagonal sampling for efficient blurring.
 * Uniforms: resolution (vec2), offset (distance between samples)
 */
const KawaseBlurShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    offset: { value: 0.5 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float offset;
    varying vec2 vUv;

    void main() {
      vec2 texelSize = 1.0 / resolution;
      vec2 halfTexel = texelSize * 0.5;
      vec2 uv = vUv;

      // Sample at diagonal corners with the given offset
      vec4 sum = vec4(0.0);
      sum += texture2D(tDiffuse, uv + vec2(-offset - 0.5, -offset - 0.5) * texelSize);
      sum += texture2D(tDiffuse, uv + vec2(-offset - 0.5,  offset + 0.5) * texelSize);
      sum += texture2D(tDiffuse, uv + vec2( offset + 0.5, -offset - 0.5) * texelSize);
      sum += texture2D(tDiffuse, uv + vec2( offset + 0.5,  offset + 0.5) * texelSize);

      gl_FragColor = sum * 0.25;
    }
  `,
};

// Keep old BlurShader for reference but we'll use Kawase instead
const BlurShader = KawaseBlurShader;

/**
 * Halftone Shader
 * Creates a classic comic book dot pattern
 * Uniforms: dotSize, scale, angle
 */
const HalftoneShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    dotSize: { value: 4.0 },
    scale: { value: 1.0 },
    angle: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float dotSize;
    uniform float scale;
    uniform float angle;
    varying vec2 vUv;

    float pattern(vec2 uv, float a) {
      float s = sin(a);
      float c = cos(a);
      vec2 rotated = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y) * scale;
      return (sin(rotated.x * dotSize) * sin(rotated.y * dotSize)) * 4.0;
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));

      vec2 pixelCoord = vUv * resolution;
      float p = pattern(pixelCoord, angle);

      // Threshold based on luminance
      float threshold = gray * 10.0 - 5.0 + p;
      vec3 halftone = vec3(step(0.0, threshold));

      // Mix with original color for colored halftone
      vec3 result = mix(vec3(0.0), color.rgb * 1.5, halftone);

      gl_FragColor = vec4(result, color.a);
    }
  `,
};

// ============================================
// SHADER PROCESSOR CLASS
// ============================================

class ShaderProcessor {
  constructor() {
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.composer = null;
    this.canvas = null;
  }

  /**
   * Initialize the offscreen renderer
   */
  init(width, height) {
    // Create offscreen canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      preserveDrawingBuffer: true,
      alpha: true,
    });
    this.renderer.setSize(width, height);

    // Create simple scene with fullscreen quad
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Create a plane that fills the view
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
  }

  /**
   * Process an image with the specified shader
   * @param {string} imageDataUrl - Base64 encoded image
   * @param {string} shaderType - 'vignette', 'blur', or 'halftone'
   * @param {object} uniforms - Shader-specific parameters
   * @returns {Promise<string>} - Processed image as base64
   */
  async process(imageDataUrl, shaderType, uniforms = {}) {
    return new Promise((resolve, reject) => {
      // Load the image
      const image = new Image();
      image.crossOrigin = 'anonymous';

      image.onload = () => {
        try {
          const width = image.width;
          const height = image.height;

          // Initialize renderer at image size
          this.init(width, height);

          // Create texture from image
          const texture = new THREE.Texture(image);
          texture.needsUpdate = true;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;

          // Update the plane material to show the texture
          const plane = this.scene.children[0];
          plane.material = new THREE.MeshBasicMaterial({ map: texture });
          plane.material.needsUpdate = true;

          // Create composer
          this.composer = new EffectComposer(this.renderer);

          // Add render pass (renders the textured plane)
          const renderPass = new RenderPass(this.scene, this.camera);
          this.composer.addPass(renderPass);

          // Add shader pass based on type
          this.addShaderPass(shaderType, uniforms, width, height);

          // Render
          this.composer.render();

          // Get result
          const result = this.canvas.toDataURL('image/png');

          // Cleanup
          this.dispose();

          resolve(result);
        } catch (error) {
          this.dispose();
          reject(error);
        }
      };

      image.onerror = () => {
        reject(new Error('Failed to load image for shader processing'));
      };

      image.src = imageDataUrl;
    });
  }

  /**
   * Add the appropriate shader pass to the composer
   */
  addShaderPass(shaderType, uniforms, width, height) {
    switch (shaderType) {
      case 'vignette': {
        const pass = new ShaderPass(VignetteShader);
        pass.uniforms.intensity.value = uniforms.intensity ?? 0.5;
        pass.uniforms.softness.value = uniforms.softness ?? 0.5;
        this.composer.addPass(pass);
        break;
      }

      case 'blur': {
        const radius = uniforms.radius ?? 4.0;

        // Kawase blur: use multiple passes with increasing offsets
        // More passes = smoother blur, offset controls spread
        // For radius 1-10: 3-5 passes, radius 10-50: 5-8 passes, 50+: 8-12 passes
        const numPasses = Math.min(12, Math.max(3, Math.ceil(radius / 8) + 2));

        for (let i = 0; i < numPasses; i++) {
          const pass = new ShaderPass(KawaseBlurShader);
          pass.uniforms.resolution.value.set(width, height);
          // Offset increases with each pass, scaled by radius
          // This creates a smooth, high-quality blur
          pass.uniforms.offset.value = i * (radius / numPasses) * 0.5;
          this.composer.addPass(pass);
        }
        break;
      }

      case 'halftone': {
        const pass = new ShaderPass(HalftoneShader);
        pass.uniforms.resolution.value.set(width, height);
        pass.uniforms.dotSize.value = uniforms.dotSize ?? 4.0;
        pass.uniforms.scale.value = uniforms.scale ?? 1.0;
        pass.uniforms.angle.value = (uniforms.angle ?? 0) * Math.PI / 180;
        this.composer.addPass(pass);
        break;
      }

      default:
        console.warn(`Unknown shader type: ${shaderType}`);
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    if (this.canvas) {
      this.canvas = null;
    }
    this.scene = null;
    this.camera = null;
  }
}

// Create and export singleton instance
const shaderProcessor = new ShaderProcessor();

// Expose to window for use in preview.html message handler
window.shaderProcessor = shaderProcessor;

export { shaderProcessor, ShaderProcessor, VignetteShader, KawaseBlurShader, BlurShader, HalftoneShader };
