import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/threejs-ide-react/',
  server: {
    port: 5174,  // Use 5174 to avoid conflict with FlowBoard on 5173
  },
});
