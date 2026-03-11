// Shim for react-native-ping — only needed for network printers (not Bluetooth)
export default {
  start: () => Promise.resolve(0),
};
