module.exports = function (api) {
  api.cache(true);
  return {
    // Con Reanimated 4 (Expo SDK 54) `babel-preset-expo` ya añade el plugin de worklets;
    // no hay que declarar 'react-native-reanimated/plugin' a mano.
    presets: ['babel-preset-expo'],
  };
};
