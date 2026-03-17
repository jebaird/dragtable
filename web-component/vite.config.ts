import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      include: ['src/dragtable.ts'],
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/dragtable.ts'),
      name: 'DragTable',
      fileName: (format) => `dragtable.${format === 'es' ? 'js' : 'umd.js'}`,
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      output: {
        exports: 'named',
        assetFileNames: 'dragtable.[ext]',
      },
    },
  },
});
