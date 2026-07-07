const { expo: appConfig } = require("./app.json");

const iosBuildNumber = process.env.BOOTYBLOCK_IOS_BUILD_NUMBER;

module.exports = ({ config }) => {
  const expoConfig = {
    ...config,
    ...appConfig,
    ios: {
      ...config.ios,
      ...appConfig.ios,
    },
  };

  if (iosBuildNumber) {
    expoConfig.ios.buildNumber = iosBuildNumber;
  }

  return expoConfig;
};
