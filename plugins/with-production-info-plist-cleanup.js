const { withInfoPlist } = require('@expo/config-plugins');

const DEV_CLIENT_LOCAL_NETWORK_DESCRIPTION =
  'Expo Dev Launcher uses the local network to discover and connect to development servers running on your computer.';

module.exports = function withProductionInfoPlistCleanup(config) {
  return withInfoPlist(config, (configWithInfoPlist) => {
    const infoPlist = configWithInfoPlist.modResults;

    if (infoPlist.NSLocalNetworkUsageDescription === DEV_CLIENT_LOCAL_NETWORK_DESCRIPTION) {
      delete infoPlist.NSLocalNetworkUsageDescription;
    }

    if (Array.isArray(infoPlist.NSBonjourServices)) {
      infoPlist.NSBonjourServices = infoPlist.NSBonjourServices.filter(
        (service) => String(service).toLowerCase().replace(/\.$/, '') !== '_expo._tcp'
      );

      if (infoPlist.NSBonjourServices.length === 0) {
        delete infoPlist.NSBonjourServices;
      }
    }

    delete infoPlist.NSMicrophoneUsageDescription;
    delete infoPlist.NSMotionUsageDescription;

    if (Array.isArray(infoPlist.CFBundleURLTypes)) {
      infoPlist.CFBundleURLTypes = infoPlist.CFBundleURLTypes.map((urlType) => ({
        ...urlType,
        CFBundleURLSchemes: Array.isArray(urlType.CFBundleURLSchemes)
          ? urlType.CFBundleURLSchemes.filter((scheme) => !String(scheme).startsWith('exp+'))
          : urlType.CFBundleURLSchemes,
      })).filter(
        (urlType) =>
          !Array.isArray(urlType.CFBundleURLSchemes) || urlType.CFBundleURLSchemes.length > 0
      );
    }

    return configWithInfoPlist;
  });
};
