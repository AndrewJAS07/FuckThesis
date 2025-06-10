// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add any custom configuration here
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json'];
config.resolver.assetExts = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

// WORKAROUND: Disable package.json "exports" field resolution
// This is a workaround for libraries that are not yet compatible with this feature,
// which is enabled by default in React Native 0.79.
// See https://docs.expo.dev/changelog/sdk-53/#the-packagejsonexports-field-is-now-enabled-by-default-in-metro-bundler
config.resolver.unstable_enablePackageExports = false;

module.exports = config; 