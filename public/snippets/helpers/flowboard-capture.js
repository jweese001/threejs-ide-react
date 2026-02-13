// WebGLRenderer configured for FlowBoard capture
// Use this instead of the default renderer when sending scenes to FlowBoard
// The preserveDrawingBuffer option allows canvas.toDataURL() to capture the frame

renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true  // Required for FlowBoard capture
});
