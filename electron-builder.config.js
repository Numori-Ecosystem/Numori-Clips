/**
 * @type {import('electron-builder').Configuration}
 */
export default {
  appId: 'clips.numori.app',
  productName: 'Numori Clips',
  directories: {
    output: 'dist-electron',
  },
  files: ['.output/public/**/*', 'electron/**/*', 'icons/**/*', 'package.json'],
  icon: 'icons/icon.png',
  mac: {
    category: 'public.app-category.productivity',
    icon: 'icons/icon.icns',
    target: ['dmg'],
  },
  win: {
    icon: 'icons/icon.ico',
    target: ['nsis'],
  },
  linux: {
    icon: 'icons',
    target: ['rpm'],
    category: 'Utility',
    extraResources: [
      {
        from: 'icons',
        to: 'icons',
        filter: ['**/*.png'],
      },
      {
        from: 'resources/gnome-extension',
        to: 'gnome-extension',
      },
    ],
  },
  flatpak: {
    runtime: 'org.freedesktop.Platform',
    runtimeVersion: '25.08',
    sdk: 'org.freedesktop.Sdk',
    base: 'org.electronjs.Electron2.BaseApp',
    baseVersion: '25.08',
  },
}
