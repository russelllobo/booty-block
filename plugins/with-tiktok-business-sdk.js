const { withAppDelegate, withInfoPlist, withPodfile, withXcodeProject } = require('@expo/config-plugins');

const POD_LINE = "  pod 'TikTokBusinessSDK'";
const ATT_DESCRIPTION =
  'bootyblock uses app activity data to measure TikTok ads and improve subscription campaign performance.';

function addPod(src) {
  if (src.includes("pod 'TikTokBusinessSDK'")) {
    return src;
  }

  return src.replace(/(target ['"]Bootyblock['"] do\n)/, `$1${POD_LINE}\n`);
}

function addLinkerFlag(value, flag) {
  const inherited = '"$(inherited)"';
  const quotedFlag = `"${flag}"`;

  if (Array.isArray(value)) {
    const next = value
      .filter((item) => item !== '$(inherited)' && item !== flag)
      .map((item) => (item === inherited || item === quotedFlag ? item : item));
    if (!next.includes(inherited)) next.unshift(inherited);
    if (!next.includes(quotedFlag)) next.push(quotedFlag);
    return next;
  }

  if (typeof value === 'string') {
    const parts = value.split(/\s+/).filter(Boolean);
    const next = parts.filter((item) => item !== '$(inherited)' && item !== flag);
    if (!next.includes(inherited)) next.unshift(inherited);
    if (!next.includes(quotedFlag)) next.push(quotedFlag);
    return next;
  }

  return [inherited, quotedFlag];
}

function addLinkerFlags(project) {
  const configs = project.pbxXCBuildConfigurationSection();
  for (const [key, configuration] of Object.entries(configs)) {
    if (key.endsWith('_comment') || !configuration?.buildSettings) continue;

    const buildSettings = configuration.buildSettings;
    buildSettings.OTHER_LDFLAGS = addLinkerFlag(buildSettings.OTHER_LDFLAGS, '-ObjC');
    buildSettings.OTHER_LDFLAGS = addLinkerFlag(buildSettings.OTHER_LDFLAGS, '-lc++');
  }
}

function addAppDelegateInitialization(src) {
  let next = src;

  if (!next.includes('import TikTokBusinessSDK')) {
    next = next.replace('import React\n', 'import React\nimport TikTokBusinessSDK\n');
  }

  if (!next.includes('initializeTikTokBusinessSdk()')) {
    next = next.replace(
      '    reactNativeFactory = factory\n',
      '    reactNativeFactory = factory\n\n    initializeTikTokBusinessSdk()\n',
    );
  }

  if (!next.includes('private func initializeTikTokBusinessSdk()')) {
    next = next.replace(
      '\nclass ReactNativeDelegate: ExpoReactNativeFactoryDelegate {',
      `
private func initializeTikTokBusinessSdk() {
  guard
    let appId = Bundle.main.object(forInfoDictionaryKey: "TikTokAppID") as? String,
    let tiktokAppId = Bundle.main.object(forInfoDictionaryKey: "TikTokBusinessAppID") as? String,
    let appSecret = Bundle.main.object(forInfoDictionaryKey: "TikTokAppSecret") as? String,
    !appId.isEmpty,
    !tiktokAppId.isEmpty,
    !appSecret.isEmpty
  else {
    #if DEBUG
    print("TikTokBusinessSDK is not configured. Set TIKTOK_APP_SECRET before building.")
    #endif
    return
  }

  guard let config = TikTokConfig(accessToken: appSecret, appId: appId, tiktokAppId: tiktokAppId) else {
    return
  }

  #if DEBUG
  config.enableDebugMode()
  #endif

  TikTokBusiness.initializeSdk(config) { success, error in
    #if DEBUG
    if let error {
      print("TikTokBusinessSDK failed to initialize: \\(error.localizedDescription)")
    } else if success {
      print("TikTokBusinessSDK initialized")
    }
    #endif
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {`,
    );
  }

  return next;
}

module.exports = function withTikTokBusinessSdk(config, options = {}) {
  const appId = options.appId ?? process.env.TIKTOK_APP_ID;
  const tiktokAppId = options.tiktokAppId ?? process.env.TIKTOK_BUSINESS_APP_ID;
  const appSecret = process.env[options.appSecretEnvVar ?? 'TIKTOK_APP_SECRET'];

  config = withInfoPlist(config, (configWithInfoPlist) => {
    const infoPlist = configWithInfoPlist.modResults;
    infoPlist.NSUserTrackingUsageDescription = options.userTrackingPermission ?? ATT_DESCRIPTION;

    if (appId) infoPlist.TikTokAppID = String(appId);
    if (tiktokAppId) infoPlist.TikTokBusinessAppID = String(tiktokAppId);
    if (appSecret) infoPlist.TikTokAppSecret = String(appSecret);

    return configWithInfoPlist;
  });

  config = withPodfile(config, (configWithPodfile) => {
    configWithPodfile.modResults.contents = addPod(configWithPodfile.modResults.contents);
    return configWithPodfile;
  });

  config = withXcodeProject(config, (configWithXcodeProject) => {
    addLinkerFlags(configWithXcodeProject.modResults);
    return configWithXcodeProject;
  });

  return withAppDelegate(config, (configWithAppDelegate) => {
    configWithAppDelegate.modResults.contents = addAppDelegateInitialization(
      configWithAppDelegate.modResults.contents,
    );
    return configWithAppDelegate;
  });
};
