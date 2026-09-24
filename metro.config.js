// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// react-native-appwrite imports the pre-SDK-54 `expo-file-system` API (readAsStringAsync, ...).
// That API now lives at `expo-file-system/legacy`, so redirect only that package's import.
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo-file-system' && context.originModulePath.includes('react-native-appwrite')) {
    return context.resolveRequest(context, 'expo-file-system/legacy', platform);
  }
  return upstreamResolveRequest
    ? upstreamResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

// Lottie animations are shipped as .lottie/.json assets.
config.resolver.assetExts.push('lottie');

module.exports = config;
