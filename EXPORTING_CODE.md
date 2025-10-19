# Exporting Code from Three.js IDE

## Overview

The Three.js IDE provides an excellent development environment with automatic code reloading and cleanup. However, code exported from the IDE requires modifications to run properly in standard environments (Vite, Webpack, production sites).

## Critical Issue: HMR Memory Leaks

### The Problem

The IDE's built-in hot-reload system automatically cleans up Three.js resources when code changes. When you export code to run elsewhere, this cleanup is **missing**, causing:

- **Memory leaks** - Multiple WebGL contexts accumulate
- **Duplicate canvases** - New canvas elements stack on each reload
- **Runaway animations** - Multiple `requestAnimationFrame` loops running simultaneously
- **Browser crashes** - Especially Chrome, after 5-10 hot reloads

### Real-World Impact

**Case Study: w33s3 Portfolio Site (Oct 2025)**
- Three background visualizations exported from IDE
- All three caused Chrome to crash within minutes of development
- Issue: Each HMR reload created new Three.js instances without cleanup
- Solution: Added proper cleanup hooks (see below)

## Required Modifications

Every file exported from the IDE needs these changes:

### 1. Add State Tracking
```javascript
let isInitialized = false;
let resizeObserver = null;
let intersectionObserver = null;
```

### 2. Create Cleanup Function
```javascript
function cleanup() {
    // Cancel animations
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    // Disconnect observers
    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
    }

    // Dispose renderer
    if (renderer) {
        const container = document.getElementById('container-id');
        if (container?.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
        }
        renderer.dispose();
        renderer = null;
    }

    // Dispose scene objects
    if (scene) {
        scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        scene = null;
    }

    // Clear references
    camera = null;
    isInitialized = false;
}
```

### 3. Add Initialization Guard
```javascript
function init() {
    if (isInitialized) {
        console.warn('Already initialized, cleaning up...');
        cleanup();
    }

    // ... your init code ...

    isInitialized = true;
    animate();
}
```

### 4. Add HMR Cleanup Hook (Vite)
```javascript
// At end of file
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        console.log('HMR: Cleaning up...');
        cleanup();
    });
}
```

### 5. Fix Observer Declarations

Change `const` to assignment:
```javascript
// ❌ Before
const resizeObserver = new ResizeObserver(...);

// ✅ After
resizeObserver = new ResizeObserver(...);
```

## Quick Checklist

When exporting code from the IDE:

- [ ] Added state tracking variables
- [ ] Created `cleanup()` function
- [ ] Added initialization guard in `init()`
- [ ] Set `isInitialized = true` before `animate()`
- [ ] Fixed observer declarations (remove `const`)
- [ ] Added HMR cleanup hook at end of file
- [ ] Tested with multiple hot reloads
- [ ] Verified no memory leaks in Chrome DevTools

## Testing Exported Code

### Quick Test (2 minutes)
1. Run dev server
2. Open Chrome DevTools → Console
3. Make 5-10 code changes to trigger HMR
4. Check for "HMR: Cleaning up..." messages
5. Verify only ONE canvas in DOM (Inspect Element)

### Memory Test (5 minutes)
1. Chrome DevTools → Performance → Memory
2. Take heap snapshot (baseline)
3. Make 15-20 code changes
4. Take another heap snapshot
5. Compare: memory should be stable, not growing

### Stress Test (10 minutes)
1. Make 30+ rapid code changes
2. Navigate between pages
3. Resize window repeatedly
4. Let run for 5+ minutes
5. Browser should remain responsive (no crash)

## IDE Enhancement Ideas

Future improvements to make exports safer:

1. **Export button** - Add "Export for Production" button that automatically adds cleanup code
2. **Template system** - Provide HMR-safe boilerplate when starting new scenes
3. **Warning banner** - Show reminder when copying code about cleanup requirements
4. **Snippet templates** - Include cleanup patterns in snippet library
5. **Documentation link** - Add prominent link to this guide in the IDE interface

## Reference Examples

See these files in the project for working implementations:

```
Temp/site/assets/
├── hero-background.js           # Network graph (80 nodes)
├── architecture-viz/
│   └── architecture-viz.js      # Particle network (100 particles)
└── demos-background.js          # Ink/nebula effect with textures
```

All three files include:
- Complete cleanup functions
- Initialization guards
- HMR disposal hooks
- Proper observer management

## Additional Documentation

For detailed implementation guide with code examples, testing procedures, and common patterns:

**See Obsidian Vault:** `Three.js IDE Export - HMR Cleanup Guide.md`

## Why This Matters

| Environment | Without Cleanup | With Cleanup |
|-------------|----------------|--------------|
| **Development** | Browser crashes in 5-10 reloads | Smooth HMR, no crashes |
| **Memory Usage** | Grows exponentially with each reload | Stays constant |
| **Animation Performance** | FPS drops (multiple loops) | Stable FPS (single loop) |
| **Production** | Potential memory leaks on SPA navigation | Clean transitions |

## Summary

The Three.js IDE is excellent for development, but its automatic cleanup doesn't transfer to exported code. Always add proper cleanup hooks when moving code to production environments. This takes 5 minutes per file and prevents hours of debugging crashes.

---

**Last Updated:** 2025-10-19
**Related Docs:** CLAUDE.md (Session Oct 19), Obsidian Vault cleanup guide
