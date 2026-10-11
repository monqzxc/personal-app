module.exports = ({ config }) => {
  const mapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  return {
    ...config,
    plugins: [...(config.plugins || []), ['react-native-maps', { ...(mapsKey ? { androidGoogleMapsApiKey: mapsKey } : {}) }]],
    extra: { ...config.extra, androidMapsConfigured: Boolean(mapsKey) },
  };
};
