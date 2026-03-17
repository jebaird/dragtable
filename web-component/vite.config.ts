import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/dragtable.ts'),
      name: 'DragTable',
      fileName: (format) => `dragtable.${format === 'es' ? 'js' : 'umd.js'}`
    },
    rollupOptions: {
      output: {
        // Ensure CSS is extracted
        assetFileNames: 'dragtable.[ext]'
      }
    }
  }
});
