const { withEntitlementsPlist } = require('@expo/config-plugins');

module.exports = function withLocalNotificationsOnly(config) {
  return withEntitlementsPlist(config, (configWithEntitlements) => {
    delete configWithEntitlements.modResults['aps-environment'];
    return configWithEntitlements;
  });
};
