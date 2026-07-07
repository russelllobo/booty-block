const appConfig = require("./app.json");

const iosBuildNumber = process.env.BOOTYBLOCK_IOS_BUILD_NUMBER;

module.exports = ({ config }) => {
  const expo = {
    ...config,
    ...appConfig.expo,
    ios: {
      ...config.ios,
      ...appConfig.expo.ios,
    },
  };

  if (iosBuildNumber) {
    expo.ios.buildNumber = iosBuildNumber;
  }

  return { expo };
};
