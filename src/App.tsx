import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import Editor, { EditorRef } from './components/Editor.tsx';
import Preview from './components/Preview.tsx';
import SnippetDrawer from './components/SnippetDrawer.tsx';
import Resizer from './components/Resizer.tsx';
import StatusBar from './components/StatusBar.tsx';
import ErrorOverlay from './components/ErrorOverlay.tsx';
import ShortcutsModal from './components/ShortcutsModal.tsx';
import CheatsheetModal from './components/CheatsheetModal.tsx';
import ConsolePanel, { ConsoleMessage } from './components/ConsolePanel.tsx';
import type * as Monaco from 'monaco-editor';
import JSZip from 'jszip';
import LZString from 'lz-string';
import { parseImports, getImportSummary } from './utils/importParser';
import { resolveImports, checkVersionConflicts, getResolutionSummary } from './utils/cdnResolver';
import { generateImportmap, importmapToJSON, getUserImports } from './utils/importmapGenerator';

interface ErrorInfo {
  message: string;
  lineno?: number;
  colno?: number;
  stack?: string;
}

interface MessageData {
  type: string;
  payload?: ErrorInfo;
  code?: string;
}

const defaultCode = `import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';


let camera, scene, renderer, controls;
const clouds = [];
let loadedModel;
let torus, torus2, torus3, torus4;
let toriToAnimate = []; // Declare the array here
let centralGroup;

let isPulsing = false;
const minScale = new THREE.Vector3(1, 1, 1);
const maxScale = new THREE.Vector3(1.02, 1.02, 1.02);
let targetScale = maxScale.clone();

function init() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, w / h, 1, 2000);
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });

    //camera.position.x = 1;
    //camera.position.y = 3;
    camera.position.z = 6;
    //camera.rotation.x = 6;
    renderer.setSize(w, h);
    scene.background = new THREE.Color(0x070C30);

    document.body.appendChild(renderer.domElement);
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';

    centralGroup = new THREE.Group();
    centralGroup.position.y = -1;
    centralGroup.rotation.x = 0.8

    scene.add(centralGroup);

    // --- NEBULA BACKGROUND --- //
    const nebulaGroup = new THREE.Group();
    nebulaGroup.position.x = 500; // Move the whole group 500 units to the right
    scene.add(nebulaGroup);

    const loader = new THREE.TextureLoader();
    loader.load(
        "/images/smoke3.png",
        function(texture) {
            console.log('Texture loaded! Creating nebula...');
            const cloudGeometry = new THREE.PlaneGeometry(500, 500);
            const colors = [0x8844ff, 0xff4488, 0x4488ff, 0xff8844];

            for (let p = 0; p < 160; p++) {
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
                    (Math.random() - 0.7) * 2000,
                    (Math.random() - 0.8) * 400,
                    Math.random() * -800 - 200
                );
                cloud.rotation.z = Math.random() * 2 * Math.PI;
                nebulaGroup.add(cloud);
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


    //
    // --- ADD FOREGROUND OBJECTS HERE ---
    // Make Torus
    const geometry = new THREE.TorusGeometry(2.16, 0.024, 8, 64);
    const material = new THREE.MeshBasicMaterial({
        color: 0xF2D8E6,
        wireframe: true
        });

    torus = new THREE.Mesh( geometry, material );
    torus.position.y = 1;
    torus.rotation.x = Math.PI / 2;

    torus2 = new THREE.Mesh( geometry, material );
    torus2.position.y = 1;
    torus2.rotation.x = Math.PI / 1;

    torus3 = new THREE.Mesh( geometry, material );
    torus3.position.y = 1;
    torus3.rotation.x = Math.PI / 4;

    torus4 = new THREE.Mesh( geometry, material );
    torus4.position.y = 1;
    torus4.rotation.x = Math.PI / -4;

    //Add all tori to the scene
    centralGroup.add( torus, torus2, torus3, torus4 );

    // 2. Add them to the animation array
    toriToAnimate.push(torus, torus2, torus3, torus4);

    // Load the .obj model
    const objLoader = new OBJLoader();
    objLoader.load(
        '/models/spiked.obj',
        function ( object ) {

            const mainMaterial = new THREE.MeshBasicMaterial({
                color: 'hotpink',
            });

            object.traverse( function ( child ) {
                if ( child.isMesh && !child.userData.isWireframe ) {
                    child.material = mainMaterial;

                    const wireframeMaterial = new THREE.MeshBasicMaterial({
                        color: 'white',
                        wireframe: true
                    });

                    const wireframe = new THREE.Mesh( child.geometry, wireframeMaterial );
                    wireframe.userData.isWireframe = true;
                    wireframe.scale.setScalar(1.001);
                    child.add( wireframe );
                }
            });

            object.position.y = -0.5;
            centralGroup.add( object );

            loadedModel = object; //Assign the loaded object to variable
        },
        function ( xhr ) {
            console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        function ( error ) {
            console.error( 'An error happened loading the .obj model', error );
        }
    ) // --- END OF NEBULA BACKGROUND ---

    // Creates a starfield as a THREE.Points object
        function getStarfield({ numStars = 1000, textureURL = '/images/whiteDot32.png' } = {}) {
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
    scene.add(getStarfield());

    // --- GENERAL SCENE SETUP ---
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.03;

    window.addEventListener('keydown', (event) => {
        if (event.code === 'KeyP') { // Let's use the 'P' key
            isPulsing = !isPulsing;
            // Reset to min scale when stopping the pulse
            if (!isPulsing) {
                targetScale.copy(minScale);
            }
        }
    });

    // Expose globals for FlowBoard capture & camera presets
    window.renderer = renderer;
    window.camera = camera;
    window.scene = scene;
    window.controls = controls;

    window.addEventListener('resize', handleResize);
    animate();
}

function handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if(camera && renderer) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // Animate nebula clouds
    for (const cloud of clouds) {
        cloud.rotation.z -= 0.0005;
    }

    // Check if the model has been loaded before trying to animate it
    if (loadedModel) {
        loadedModel.rotation.y += -0.004;
        centralGroup.rotation.y += -0.001;

        if (isPulsing) {
            // Move the scale a little bit towards the target on each frame
            loadedModel.scale.lerp(targetScale, 0.5);

            // If we're close enough to the target, switch the target
            if (loadedModel.scale.distanceTo(targetScale) < 0.01) {
                if (targetScale.equals(maxScale)) {
                    targetScale.copy(minScale);
                } else {
                    targetScale.copy(maxScale);
                }
            }
        } else {
            // If not pulsing, smoothly return to the minimum scale
            loadedModel.scale.lerp(minScale, 0.05);
        }
    }

    for (const torus of toriToAnimate) {
        torus.rotation.x += -0.005;
        torus.rotation.z += -0.5;
    };


    renderer.render(scene, camera);
}

init();`;

// Console message patterns to ignore (noise reduction)
const CONSOLE_IGNORE_PATTERNS = [
  /context lost/i,
  /webgl.*context/i,
  /three\.webglrenderer.*context/i,
  /^\d+% loaded$/i, // Ignore "X% loaded" messages
];

// FlowBoard integration via window.opener postMessage
const FLOWBOARD_ORIGINS = [
  'http://localhost:5173',       // Local FlowBoard dev
  'https://jweese001.github.io', // GitHub Pages production
];

function App() {
  const [code, setCode] = useState(defaultCode);
  const [editorWidth, setEditorWidth] = useState(50);
  const [isEditorStowed, setIsEditorStowed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnippetDrawerOpen, setIsSnippetDrawerOpen] = useState(false);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const [consoleHeight, setConsoleHeight] = useState(200);
  const [messageIdCounter, setMessageIdCounter] = useState(0);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isCheatsheetOpen, setIsCheatsheetOpen] = useState(false);
  const [isConsoleDragging, setIsConsoleDragging] = useState(false);
  const [isFlowBoardConnected, setIsFlowBoardConnected] = useState(false);
  const editorRef = useRef<EditorRef>(null);
  const monacoEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isIframeReady, setIsIframeReady] = useState(false);

  // Handle sending capture to FlowBoard - defined first so it can be used in useEffect
  const handleSendToFlowBoard = useCallback(() => {
    console.log('📸 handleSendToFlowBoard called, iframeReady:', isIframeReady);
    if (!iframeRef.current) {
      console.warn('Preview iframe not available');
      return;
    }
    if (!isIframeReady) {
      console.warn('Preview not ready yet');
      return;
    }

    // Request canvas capture from iframe
    console.log('📸 Requesting canvas capture from iframe...');
    iframeRef.current.contentWindow?.postMessage(
      { type: 'captureCanvas' },
      window.location.origin
    );
  }, [isIframeReady]);

  // Initialize FlowBoard postMessage communication
  useEffect(() => {
    // Check if we were opened by FlowBoard
    const hasOpener = window.opener && !window.opener.closed;
    setIsFlowBoardConnected(hasOpener);

    if (hasOpener) {
      console.log('🔗 Opened by FlowBoard, connection established');
    }

    // Listen for messages from FlowBoard (opener window) and iframe
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data || {};

      // Skip logging for frequent/noisy messages
      if (type && type !== 'console') {
        console.log('📨 IDE received message:', event.origin, type);
      }

      // Handle FlowBoard capture requests
      // Accept from any origin but verify message structure (we check window.opener for security)
      if (type === 'request' && payload?.action === 'capture') {
        console.log('📸 FlowBoard capture request received from:', event.origin, 'resolution:', payload.resolution);
        // Trigger capture directly using ref
        if (iframeRef.current) {
          console.log('📸 Sending captureCanvas to iframe...');
          iframeRef.current.contentWindow?.postMessage(
            {
              type: 'captureCanvas',
              resolution: payload.resolution // Pass resolution to iframe
            },
            window.location.origin
          );
        } else {
          console.warn('❌ iframeRef not available');
        }
      }

      // Handle ping messages from FlowBoard - respond with pong
      if (type === 'ping') {
        if (window.opener && !window.opener.closed) {
          const pongMessage = {
            type: 'pong',
            payload: { connected: true },
            timestamp: Date.now(),
          };
          // Send pong to all possible FlowBoard origins
          for (const origin of FLOWBOARD_ORIGINS) {
            try {
              window.opener.postMessage(pongMessage, origin);
            } catch (e) {
              // Origin didn't match, try next
            }
          }
        }
      }

      // Handle getCamera requests - get current camera state from preview
      if (type === 'request' && payload?.action === 'getCamera') {
        console.log('📷 FlowBoard getCamera request received');
        if (iframeRef.current) {
          // Store nodeId for response
          (window as Window & { __pendingCameraNodeId?: string }).__pendingCameraNodeId = payload.nodeId;
          iframeRef.current.contentWindow?.postMessage(
            { type: 'getCameraState' },
            window.location.origin
          );
        }
      }

      // Handle loadCamera requests - set camera state in preview
      if (type === 'request' && payload?.action === 'loadCamera') {
        console.log('📷 FlowBoard loadCamera request received:', payload.cameraState);
        console.log('📷 iframeRef.current:', iframeRef.current);
        if (iframeRef.current && payload.cameraState) {
          console.log('📷 Sending setCameraState to iframe...');
          iframeRef.current.contentWindow?.postMessage(
            { type: 'setCameraState', cameraState: payload.cameraState },
            window.location.origin
          );
        } else {
          console.warn('📷 Cannot send: iframeRef or cameraState missing');
        }
      }

      // Handle shader processing requests from FlowBoard
      if (type === 'request' && payload?.action === 'applyShader') {
        console.log('🎨 FlowBoard applyShader request received:', payload.shaderType);
        if (iframeRef.current) {
          iframeRef.current.contentWindow?.postMessage(
            {
              type: 'applyShader',
              imageData: payload.imageData,
              shaderType: payload.shaderType,
              uniforms: payload.uniforms,
              nodeId: payload.nodeId,
            },
            window.location.origin
          );
        } else {
          console.warn('🎨 Cannot process shader: iframe not available');
        }
      }
      // Note: Other messages (iframe ready, console, etc.) are handled elsewhere
    };

    window.addEventListener('message', handleMessage);

    // Notify FlowBoard we're ready (if opened by it)
    if (hasOpener) {
      try {
        // Try each origin until one works
        for (const origin of FLOWBOARD_ORIGINS) {
          try {
            window.opener.postMessage({
              type: 'status',
              payload: { connected: true, mode: 'scene' },
              timestamp: Date.now(),
            }, origin);
          } catch (e) {
            // Origin didn't match, try next
          }
        }
      } catch (e) {
        console.warn('Could not send status to FlowBoard:', e);
      }
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Load code from URL or localStorage on startup
  useEffect(() => {
    // Check URL hash first
    const hash = window.location.hash;
    if (hash.startsWith('#code=')) {
      try {
        const compressed = hash.substring(6); // Remove '#code='
        const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
        if (decompressed) {
          setCode(decompressed);
          return;
        }
      } catch (error) {
        console.error('Failed to load code from URL:', error);
      }
    }

    // Fall back to localStorage
    const savedCode = localStorage.getItem('threejs-ide-code');
    if (savedCode) {
      setCode(savedCode);
    }
  }, []);

  // Auto-save code changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('threejs-ide-code', code);
    }, 1000); // Save after 1 second of no changes

    return () => clearTimeout(timeoutId);
  }, [code]);

  const runCode = useCallback(async () => {
    if (iframeRef.current && isIframeReady) {
      try {
        // Parse imports from code
        const imports = parseImports(code);

        if (imports.length > 0) {
          // Resolve imports to CDN URLs
          const resolved = await resolveImports(imports);

          // Generate importmap (exclude base imports - they're already in preview.html)
          const importmap = generateImportmap(resolved, false);

          // Get external packages (not in base importmap)
          const externalPackages = getUserImports(importmap);
          const externalCount = Object.keys(externalPackages).length;

          // Only log if external packages were loaded
          if (externalCount > 0) {
            const packageList = Object.keys(externalPackages).join(', ');
            console.log(`✨ Loaded external package${externalCount > 1 ? 's' : ''}: ${packageList}`);
          }

          // Check for version conflicts
          const warnings = checkVersionConflicts(resolved);
          if (warnings.length > 0) {
            console.warn('⚠️  Version warnings:', warnings.join('\n'));
          }

          // Send both code and importmap to iframe
          iframeRef.current.contentWindow.postMessage(
            {
              type: 'executeCode',
              code,
              importmap,
            },
            window.location.origin
          );
        } else {
          // No imports detected, send code only
          iframeRef.current.contentWindow.postMessage(
            { type: 'executeCode', code },
            window.location.origin
          );
        }
      } catch (error) {
        console.error('Failed to resolve imports:', error);
        // Fallback: send code without import resolution
        iframeRef.current.contentWindow.postMessage(
          { type: 'executeCode', code },
          window.location.origin
        );
      }
    }
  }, [code, isIframeReady]);

  // Handle messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent<MessageData>) => {
      if (event.origin !== window.location.origin) return;

      const { type, payload } = event.data;
      if (type === 'error') {
        setError(payload);
      } else if (type === 'ready') {
        setIsIframeReady(true);
      } else if (type === 'reset') {
        runCode();
      } else if (type === 'canvasCaptured') {
        // Forward captured canvas to FlowBoard via window.opener
        const captureData = payload as { imageData?: string; width?: number; height?: number; error?: string };
        if (window.opener && !window.opener.closed && captureData.imageData) {
          const message = {
            type: 'capture',
            payload: {
              imageData: captureData.imageData,
              width: captureData.width,
              height: captureData.height,
              sceneName: 'Three.js Scene',
              sceneDescription: 'Captured from Three.js IDE',
            },
            timestamp: Date.now(),
          };
          // Send to all possible FlowBoard origins
          for (const origin of FLOWBOARD_ORIGINS) {
            try {
              window.opener.postMessage(message, origin);
            } catch (e) {
              // Origin didn't match, try next
            }
          }
          console.log('📤 Sent capture to FlowBoard');
          setIsFlowBoardConnected(true);
        } else if (captureData.error) {
          console.error('Canvas capture failed:', captureData.error);
        } else if (!window.opener || window.opener.closed) {
          console.warn('FlowBoard window not available. Open IDE from FlowBoard to enable sending.');
        }
      } else if (type === 'cameraState') {
        // Forward camera state to FlowBoard
        const cameraData = payload as { position?: number[]; target?: number[]; fov?: number; error?: string };
        const pendingNodeId = (window as Window & { __pendingCameraNodeId?: string }).__pendingCameraNodeId;
        if (window.opener && !window.opener.closed && cameraData.position && pendingNodeId) {
          const message = {
            type: 'cameraState',
            payload: {
              nodeId: pendingNodeId,
              cameraState: {
                position: cameraData.position,
                target: cameraData.target,
                fov: cameraData.fov,
              },
            },
            timestamp: Date.now(),
          };
          // Send to all possible FlowBoard origins
          for (const origin of FLOWBOARD_ORIGINS) {
            try {
              window.opener.postMessage(message, origin);
            } catch (e) {
              // Origin didn't match, try next
            }
          }
          console.log('📤 Sent camera state to FlowBoard');
          delete (window as Window & { __pendingCameraNodeId?: string }).__pendingCameraNodeId;
        } else if (cameraData.error) {
          console.error('Camera state capture failed:', cameraData.error);
        }
      } else if (type === 'shaderResult') {
        // Forward shader result to FlowBoard
        const shaderData = payload as { imageData?: string; shaderType?: string; nodeId?: string; success?: boolean; error?: string };
        if (window.opener && !window.opener.closed) {
          const message = {
            type: 'shaderResult',
            payload: shaderData,
            timestamp: Date.now(),
          };
          // Send to all possible FlowBoard origins
          for (const origin of FLOWBOARD_ORIGINS) {
            try {
              window.opener.postMessage(message, origin);
            } catch (e) {
              // Origin didn't match, try next
            }
          }
          console.log('🎨 Sent shader result to FlowBoard:', shaderData.shaderType, shaderData.success ? 'success' : 'failed');
        }
      } else if (type === 'console') {
        // Handle console messages from iframe
        const { level, args } = payload as { level: 'log' | 'warn' | 'error'; args: any[] };

        // Format arguments, handling serialized Error objects
        const message = args.map(arg => {
          if (arg && typeof arg === 'object' && arg.__isError) {
            // Format error object nicely
            return `${arg.name}: ${arg.message}${arg.stack ? '\n' + arg.stack : ''}`;
          } else if (typeof arg === 'object' && arg !== null) {
            try {
              return JSON.stringify(arg, null, 2);
            } catch (e) {
              return String(arg);
            }
          }
          return String(arg);
        }).join(' ');

        // Ignore common noise messages
        const shouldIgnore = CONSOLE_IGNORE_PATTERNS.some(pattern => pattern.test(message));

        if (!shouldIgnore) {
          setConsoleMessages(prev => [...prev, {
            id: Date.now() + Math.random(), // Use timestamp + random for truly unique IDs
            type: level,
            message: message,
            timestamp: new Date(),
            args: args
          }]);
          setMessageIdCounter(prev => prev + 1);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [runCode, messageIdCounter]);

  // Run code on initial load and on subsequent changes
  useEffect(() => {
    runCode();
  }, [runCode]);

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    setError(null); // Clear error on code change
  };

  const handleClearConsole = () => {
    setConsoleMessages([]);
  };

  const handleConsoleResize = useCallback((newHeight: number) => {
    setConsoleHeight(newHeight);
  }, []);

  const handleEditorMount = (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    monacoEditorRef.current = editor;

    // Cmd/Ctrl+R to run code
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, runCode);

    // Cmd/Ctrl+Shift+R to reset to default code
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyR,
      () => {
        if (
          window.confirm(
            'Are you sure you want to reset the code to the default?'
          )
        ) {
          setCode(defaultCode);
          localStorage.removeItem('threejs-ide-code');
        }
      }
    );

    // Cmd/Ctrl+/ to show shortcuts
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash,
      () => setIsShortcutsOpen(true)
    );
  };

  const handleSnippetInsert = (snippetCode: string) => {
    if (editorRef.current) {
      editorRef.current.insertText(snippetCode);
    }
  };

  const handleResize = (newWidthPercentage: number) => {
    setEditorWidth(newWidthPercentage);
  };

  const handleStow = () => {
    setIsEditorStowed(!isEditorStowed);
    setTimeout(() => {
      if (iframeRef.current) {
        iframeRef.current.contentWindow.postMessage({ type: 'resize' }, '*');
      }
    }, 300);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (iframeRef.current) {
      iframeRef.current.contentWindow.postMessage({ type: 'resize' }, '*');
    }
  };

  const toggleSnippetDrawer = () => {
    setIsSnippetDrawerOpen(!isSnippetDrawerOpen);
  };

  const handleShareCode = () => {
    try {
      const compressed = LZString.compressToEncodedURIComponent(code);
      const url = `${window.location.origin}${window.location.pathname}#code=${compressed}`;

      // Copy to clipboard
      navigator.clipboard.writeText(url).then(() => {
        alert('Share link copied to clipboard!');
      }).catch((err) => {
        // Fallback: show the URL in a prompt
        prompt('Copy this link to share:', url);
      });
    } catch (error) {
      console.error('Failed to create share link:', error);
      alert('Failed to create share link. Please try again.');
    }
  };

  const handleExportCode = async () => {
    setIsExporting(true);

    try {
      // Extract asset paths from code
      const assetPatterns = [
        /['"`](\/?(?:models|images|textures|assets)\/[^'"`]+)['"`]/g,
        /\.load\s*\(\s*['"`](\/?[^'"`]+\.(?:obj|glb|gltf|jpg|jpeg|png|hdr|exr))['"`]/g,
      ];

      const assetPaths = new Set<string>();

      for (const pattern of assetPatterns) {
        let match;
        while ((match = pattern.exec(code)) !== null) {
          let path = match[1];
          // Remove leading slash if present
          if (path.startsWith('/')) {
            path = path.substring(1);
          }
          assetPaths.add(path);
        }
      }

      const zip = new JSZip();

      // Add index.html
      const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Three.js Scene</title>
    <script type="importmap">
    {
        "imports": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js",
            "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/"
        }
    }
    </script>
    <style>
        body { margin: 0; overflow: hidden; }
    </style>
</head>
<body>
    <script type="module">
${code}
    </script>
</body>
</html>`;

      zip.file('index.html', htmlTemplate);

      // Add README
      const readme = `# Three.js Scene Export

This is an exported Three.js scene from the 3js IDE.

## ⚠️ IMPORTANT: Production Use Warning

**This code was developed in the 3js IDE environment and requires modifications for use in production projects (Vite, Webpack, Next.js, etc.).**

### The Problem
The IDE automatically cleans up Three.js resources during development. This cleanup code is NOT included in the export. Without modifications, this code will cause:
- Memory leaks in development servers with Hot Module Replacement (HMR)
- Browser crashes after 5-10 hot reloads
- Multiple animation loops running simultaneously
- Duplicate WebGL contexts accumulating

### Required Modifications
Before using this code in a Vite/Webpack project, you MUST add:

1. **Cleanup function** - Dispose renderer, geometries, materials, textures
2. **Initialization guard** - Prevent multiple instances
3. **HMR disposal hook** - For Vite: \`import.meta.hot.dispose(() => cleanup())\`
4. **Observer management** - Disconnect ResizeObserver/IntersectionObserver

### Quick Fix Template
\`\`\`javascript
let isInitialized = false;

function cleanup() {
  // Cancel animation, disconnect observers, dispose Three.js resources
}

function init() {
  if (isInitialized) cleanup();
  // ... your init code ...
  isInitialized = true;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => cleanup());
}
\`\`\`

**For detailed implementation guide:**
See: \`EXPORTING_CODE.md\` in the 3js IDE project repository
Or: [GitHub - Three.js IDE Export Guide](https://github.com/jweese001/three-js-ide)

---

## Running the Scene (Standalone)

1. Extract this ZIP file to a folder
2. Serve the folder using a local web server (required for loading assets)
   - Using Python: \`python -m http.server 8000\`
   - Using Node.js: \`npx http-server\`
   - Using PHP: \`php -S localhost:8000\`
3. Open http://localhost:8000 in your browser

## Contents

- \`index.html\` - Main HTML file with your Three.js code
- \`models/\` - 3D model files (.obj, .glb, .gltf)
- \`images/\` - Texture and image files
- \`README.md\` - This file

## Technical Notes

- This scene uses Three.js v0.157.0 loaded from CDN
- The exported HTML is standalone and works for simple viewing
- For integration into dev environments (Vite/Webpack), see warning above
`;

      zip.file('README.md', readme);

      // Fetch and add assets
      for (const assetPath of assetPaths) {
        try {
          const response = await fetch(`${import.meta.env.BASE_URL}${assetPath}`);
          if (response.ok) {
            const blob = await response.blob();
            zip.file(assetPath, blob);
          }
        } catch (error) {
          console.warn(`Could not fetch asset: ${assetPath}`, error);
        }
      }

      // Generate and download zip
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'threejs-scene.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export scene. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="App">
      <div className="ide-container">
        <SnippetDrawer
          isOpen={isSnippetDrawerOpen}
          onClose={() => setIsSnippetDrawerOpen(false)}
          onSnippetInsert={handleSnippetInsert}
        />
        <div
          id="editor-container"
          className={isEditorStowed ? 'stowed' : ''}
          style={{ flexBasis: isEditorStowed ? '0%' : `${editorWidth}%` }}
        >
          <Editor
            ref={editorRef}
            value={code}
            onChange={handleCodeChange}
            onMount={handleEditorMount}
          />
        </div>

        <Resizer
          onResize={handleResize}
          onStow={handleStow}
          editorWidth={editorWidth}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
        />

        <div id="preview-container">
          <Preview ref={iframeRef} isDragging={isDragging || isConsoleDragging} />
          <ErrorOverlay error={error} onClose={() => setError(null)} />
        </div>
      </div>
      {isConsoleOpen && (
        <ConsolePanel
          messages={consoleMessages}
          onClear={handleClearConsole}
          height={consoleHeight}
          onResize={handleConsoleResize}
          isDragging={isConsoleDragging}
          setIsDragging={setIsConsoleDragging}
        />
      )}
      <StatusBar
        onToggleSnippets={toggleSnippetDrawer}
        isSnippetDrawerOpen={isSnippetDrawerOpen}
        onExportCode={handleExportCode}
        isExporting={isExporting}
        onShowShortcuts={() => setIsShortcutsOpen(true)}
        onToggleConsole={() => setIsConsoleOpen(!isConsoleOpen)}
        isConsoleOpen={isConsoleOpen}
        onShareCode={handleShareCode}
        onShowCheatsheet={() => setIsCheatsheetOpen(true)}
        onSendToFlowBoard={handleSendToFlowBoard}
        isFlowBoardConnected={isFlowBoardConnected}
      />
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
      <CheatsheetModal
        isOpen={isCheatsheetOpen}
        onClose={() => setIsCheatsheetOpen(false)}
      />
    </div>
  );
}

export default App;
