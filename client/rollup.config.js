import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import postcss from 'rollup-plugin-postcss';
import replace from 'rollup-plugin-replace';
import commonjs from '@rollup/plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import path from 'path';

const production = !process.env.ROLLUP_WATCH;
console.log('production=', production);

// Function to spawn the sirv-cli development server as another process
// Recommended from the svelte starter template
function serve() {
  let server;

  function toExit() {
    if (server) server.kill(0);
  }

  return {
    writeBundle() {
      if (server) return;
      server = require('child_process').spawn(
        'npm',
        ['run', 'start', '--', '--dev'],
        {
          stdio: ['ignore', 'inherit', 'inherit'],
          shell: true,
        }
      );

      process.on('SIGTERM', toExit);
      process.on('exit', toExit);
    },
  };
}

export default {
  input: 'src/main.js',
  output: {
    sourcemap: true,
    format: 'iife',
    name: 'app',
    file: 'public/bundle.js',
    inlineDynamicImports: true
  },
  plugins: [
    // Allow the usage of a variable called DEV_MODE throughout the codebase that
    // evalutes to true when the app is compiled for development, but false when
    // the app is compiled for production. This allows dynamic rendering or logic based upon whether
    // the app is in production or development
    replace({
      DEV_MODE: !production,
    }),
    svelte({
      compilerOptions: { dev: !production },
    }),
    postcss({ extract: path.resolve('public/bundle.css') }),
    resolve({ browser: true, dedupe: ['svelte'] }),
    commonjs(),

    // In dev mode, call `npm run start` once
    // the bundle has been generated
    !production && serve(),

    // Watch the `public` directory and refresh the
    // browser on changes when not in production
    !production && livereload('public'),

    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production && terser(),
  ],
  watch: {
    clearScreen: false,
  },
};
