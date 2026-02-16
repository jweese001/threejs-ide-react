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

/**
 * Sharpen Shader
 * Enhances edges and details using unsharp mask technique
 * Uniforms: amount (0-2)
 */
const SharpenShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    amount: { value: 0.5 },
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
    uniform float amount;
    varying vec2 vUv;

    void main() {
      vec2 texelSize = 1.0 / resolution;

      // Sample center and neighboring pixels
      vec4 center = texture2D(tDiffuse, vUv);
      vec4 top = texture2D(tDiffuse, vUv + vec2(0.0, texelSize.y));
      vec4 bottom = texture2D(tDiffuse, vUv - vec2(0.0, texelSize.y));
      vec4 left = texture2D(tDiffuse, vUv - vec2(texelSize.x, 0.0));
      vec4 right = texture2D(tDiffuse, vUv + vec2(texelSize.x, 0.0));

      // Laplacian edge detection kernel
      vec4 laplacian = center * 4.0 - top - bottom - left - right;

      // Add sharpening
      vec4 result = center + laplacian * amount;

      gl_FragColor = vec4(clamp(result.rgb, 0.0, 1.0), center.a);
    }
  `,
};

/**
 * Chromatic Aberration Shader
 * Separates RGB channels for lens distortion effect
 * Uniforms: offset (pixel distance), angle (direction in radians)
 */
const ChromaticShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    offset: { value: 5.0 },
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
    uniform float offset;
    uniform float angle;
    varying vec2 vUv;

    void main() {
      vec2 texelSize = 1.0 / resolution;
      vec2 dir = vec2(cos(angle), sin(angle)) * texelSize * offset;

      // Sample each channel with offset
      float r = texture2D(tDiffuse, vUv + dir).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - dir).b;
      float a = texture2D(tDiffuse, vUv).a;

      gl_FragColor = vec4(r, g, b, a);
    }
  `,
};

/**
 * Noise/Grain Shader
 * Adds film grain texture
 * Uniforms: intensity (0-1), scale (grain size)
 */
const NoiseShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    intensity: { value: 0.3 },
    scale: { value: 1.0 },
    time: { value: 0.0 },
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
    uniform float intensity;
    uniform float scale;
    uniform float time;
    varying vec2 vUv;

    // Simple noise function
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Generate noise based on pixel position and scale
      vec2 noiseCoord = vUv * resolution / scale;
      float noise = random(noiseCoord + time) * 2.0 - 1.0;

      // Apply noise as luminance variation
      vec3 result = color.rgb + vec3(noise * intensity);

      gl_FragColor = vec4(clamp(result, 0.0, 1.0), color.a);
    }
  `,
};

/**
 * Posterize Shader
 * Reduces the number of color levels
 * Uniforms: levels (2-32)
 */
const PosterizeShader = {
  uniforms: {
    tDiffuse: { value: null },
    levels: { value: 8.0 },
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
    uniform float levels;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Quantize each channel to the specified number of levels
      vec3 result = floor(color.rgb * levels) / (levels - 1.0);

      gl_FragColor = vec4(result, color.a);
    }
  `,
};

/**
 * Color Adjustment Shader
 * Adjusts brightness, contrast, and saturation
 * Uniforms: brightness (-1 to 1), contrast (0-2), saturation (0-2)
 */
const ColorAdjustShader = {
  uniforms: {
    tDiffuse: { value: null },
    brightness: { value: 0.0 },
    contrast: { value: 1.0 },
    saturation: { value: 1.0 },
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
    uniform float brightness;
    uniform float contrast;
    uniform float saturation;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Brightness
      vec3 result = color.rgb + brightness;

      // Contrast (pivot around 0.5)
      result = (result - 0.5) * contrast + 0.5;

      // Saturation
      float gray = dot(result, vec3(0.299, 0.587, 0.114));
      result = mix(vec3(gray), result, saturation);

      gl_FragColor = vec4(clamp(result, 0.0, 1.0), color.a);
    }
  `,
};

/**
 * Chroma Key Shader
 * Removes a solid color background for compositing
 * Uniforms: keyColor (RGB 0-1), tolerance (0-1), softness (0-0.5), spill (0-1)
 */
const ChromaKeyShader = {
  uniforms: {
    tDiffuse: { value: null },
    keyColor: { value: new THREE.Vector3(0, 1, 0) }, // Green screen default
    tolerance: { value: 0.3 },
    softness: { value: 0.1 },
    spill: { value: 0.5 },
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
    uniform vec3 keyColor;
    uniform float tolerance;
    uniform float softness;
    uniform float spill;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Calculate color distance from key color
      float dist = distance(color.rgb, keyColor);

      // Create alpha mask with soft edge
      float alpha = smoothstep(tolerance - softness, tolerance + softness, dist);

      // Spill suppression - reduce the key color component in edge pixels
      vec3 result = color.rgb;
      if (alpha > 0.0 && alpha < 1.0) {
        // For pixels on the edge, reduce the key color's influence
        // Find which channel of keyColor is dominant
        float maxKey = max(keyColor.r, max(keyColor.g, keyColor.b));
        if (maxKey > 0.0) {
          vec3 spillMask = keyColor / maxKey;
          // Reduce the spill color proportionally
          vec3 spillReduction = result * spillMask * spill * (1.0 - alpha);
          result = result - spillReduction;
          result = clamp(result, 0.0, 1.0);
        }
      }

      // Output with true alpha transparency
      gl_FragColor = vec4(result, alpha);
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

      case 'sharpen': {
        const pass = new ShaderPass(SharpenShader);
        pass.uniforms.resolution.value.set(width, height);
        pass.uniforms.amount.value = uniforms.amount ?? 0.5;
        this.composer.addPass(pass);
        break;
      }

      case 'chromatic': {
        const pass = new ShaderPass(ChromaticShader);
        pass.uniforms.resolution.value.set(width, height);
        pass.uniforms.offset.value = uniforms.offset ?? 5.0;
        pass.uniforms.angle.value = (uniforms.angle ?? 0) * Math.PI / 180;
        this.composer.addPass(pass);
        break;
      }

      case 'noise': {
        const pass = new ShaderPass(NoiseShader);
        pass.uniforms.resolution.value.set(width, height);
        pass.uniforms.intensity.value = uniforms.intensity ?? 0.3;
        pass.uniforms.scale.value = uniforms.scale ?? 1.0;
        pass.uniforms.time.value = Math.random() * 1000; // Random seed for noise
        this.composer.addPass(pass);
        break;
      }

      case 'posterize': {
        const pass = new ShaderPass(PosterizeShader);
        pass.uniforms.levels.value = uniforms.levels ?? 8.0;
        this.composer.addPass(pass);
        break;
      }

      case 'colorAdjust': {
        const pass = new ShaderPass(ColorAdjustShader);
        pass.uniforms.brightness.value = uniforms.brightness ?? 0.0;
        pass.uniforms.contrast.value = uniforms.contrast ?? 1.0;
        pass.uniforms.saturation.value = uniforms.saturation ?? 1.0;
        this.composer.addPass(pass);
        break;
      }

      case 'chromaKey': {
        const pass = new ShaderPass(ChromaKeyShader);
        // keyColor comes as [r, g, b] array from FlowBoard
        const keyColor = uniforms.keyColor ?? [0, 1, 0];
        pass.uniforms.keyColor.value.set(keyColor[0], keyColor[1], keyColor[2]);
        pass.uniforms.tolerance.value = uniforms.tolerance ?? 0.3;
        pass.uniforms.softness.value = uniforms.softness ?? 0.1;
        pass.uniforms.spill.value = uniforms.spill ?? 0.5;
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

export {
  shaderProcessor,
  ShaderProcessor,
  VignetteShader,
  KawaseBlurShader,
  BlurShader,
  HalftoneShader,
  SharpenShader,
  ChromaticShader,
  NoiseShader,
  PosterizeShader,
  ColorAdjustShader,
  ChromaKeyShader,
};
