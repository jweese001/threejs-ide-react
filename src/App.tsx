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

const defaultCode = `// A fairly random example scene
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

// Set up the scene, camera, and renderer
let camera, scene, renderer;
let controls;
let loadedModel;
let torus, torus2, torus3, torus4;
let toriToAnimate = []; // Declare the array here

function init() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Create the WebGL renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    document.body.appendChild(renderer.domElement);
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';

    // Set up the camera
    const fov = 60;
    const aspect = w / h;
    const near = 0.1;
    const far = 100;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set( 4.5, 1, -0.5 );

    // Create the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x34c0eb); //light blue

    // Add OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.03;
    controls.target.set(0, 1, 0);

    // Add lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(3, 10, 10);
    scene.add(dirLight);

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
    scene.add( torus, torus2, torus3, torus4 );
    
    // 2. Add them to the animation array
    toriToAnimate.push(torus, torus2, torus3, torus4);


    // Load the .obj model
    const loader = new OBJLoader();
    loader.load(
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
            scene.add( object );

            loadedModel = object; //Assign the loaded object to variable
        },
        function ( xhr ) {
            console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        function ( error ) {
            console.error( 'An error happened loading the .obj model', error );
        }
    );

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

    // Check if the model has been loaded before trying to animate it
    if (loadedModel) {
        loadedModel.rotation.y += -0.004;
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
  const editorRef = useRef<EditorRef>(null);
  const monacoEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isIframeReady, setIsIframeReady] = useState(false);

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

  const runCode = useCallback(() => {
    if (iframeRef.current && isIframeReady) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'executeCode', code },
        window.location.origin
      );
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
            id: messageIdCounter,
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

## Running the Scene

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

## Note

This scene uses Three.js v0.157.0 loaded from CDN.
`;

      zip.file('README.md', readme);

      // Fetch and add assets
      for (const assetPath of assetPaths) {
        try {
          const response = await fetch(`/${assetPath}`);
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
