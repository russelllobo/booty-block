Pod::Spec.new do |s|
  s.name           = 'BootyblockTikTok'
  s.version        = '1.0.0'
  s.summary        = 'Bootyblock TikTok App Events bridge'
  s.description    = 'A small Expo module that forwards selected Bootyblock events to TikTokBusinessSDK.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4',
    :tvos => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'TikTokBusinessSDK'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
