/**
 * @type {import('electron-builder').Configuration}
 */
export default {
  appId: 'clips.numori.app',
  productName: 'Numori Clips',
  directories: {
    output: 'dist-electron',
  },
  files: ['.output/public/**/*', 'electron/**/*', 'package.json'],
  icon: 'icons/icon.png',
  mac: {
    category: 'public.app-category.productivity',
    icon: 'icons/icon.icns',
    target: ['dmg', 'zip'],
  },
  win: {
    icon: 'icons/icon.ico',
    target: ['nsis', 'portable'],
  },
  linux: {
    icon: 'icons',
    target: [
      'rpm',
      'AppImage',
    ],
    category: 'Utility',
  },
  flatpak: {
    runtime: 'org.freedesktop.Platform',
    runtimeVersion: '25.08',
    sdk: 'org.freedesktop.Sdk',
    base: 'org.electronjs.Electron2.BaseApp',
    baseVersion: '25.08',
  },
}
