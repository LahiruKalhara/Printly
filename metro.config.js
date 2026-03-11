const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Shim react-native-ping — only needed for network printers, not Bluetooth
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native-ping': path.resolve(__dirname, 'shims/react-native-ping.js'),
};

module.exports = config;
