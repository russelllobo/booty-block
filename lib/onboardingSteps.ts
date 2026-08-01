export const ONBOARDING_STEP_TOTAL = 29;

export const HIDDEN_ONBOARDING_STEPS = {
  welcome: {
    key: 'welcome',
    title: 'Block your apps until you grow your booty',
    index: 0,
  },
  goals: {
    key: 'goals',
    title: 'What goals do you want to achieve using BootyBlock?',
    index: 0,
  },
  timeSinkApps: {
    key: 'time_sink_apps',
    title: 'Which apps take most of your time?',
    index: 0,
  },
  habitFriction: {
    key: 'habit_friction',
    title: 'What usually makes it hard to quit?',
    index: 0,
  },
  usageFeelings: {
    key: 'usage_feelings',
    title: 'How does using these apps for too long make you feel?',
    index: 0,
  },
  currentState: {
    key: 'current_state',
    title: 'Current state',
    index: 0,
  },
} as const;

export const ONBOARDING_STEPS = {
  doomscrollingProblem: {
    key: 'doomscrolling_problem',
    title: 'social media addiction is taking you away from the body you want',
    index: 1,
  },
  squatTimeSolution: {
    key: 'squat_time_solution',
    title: 'BootyBlock helps you turn screen time into Squat Time.',
    index: 2,
  },
  unlockAppsExplainer: {
    key: 'unlock_apps_explainer',
    title: 'Do your squats, unlock your apps',
    index: 3,
  },
  profileName: {
    key: 'profile_name',
    title: 'What should we call you?',
    index: 4,
  },
  ageRange: {
    key: 'age_range',
    title: 'How old are you?',
    index: 5,
  },
  currentDailyScreenTime: {
    key: 'current_daily_screen_time',
    title: 'How much time do you spend on your phone every day?',
    index: 6,
  },
  lifetimeProjection: {
    key: 'lifetime_projection',
    title: 'Lifetime screen time projection',
    index: 7,
  },
  squatTimeTrade: {
    key: 'squat_time_trade',
    title: 'Trade screen time for squat time',
    index: 8,
  },
  reclaimedTime: {
    key: 'reclaimed_time',
    title: 'Give years back to your body',
    index: 9,
  },
  previousMethods: {
    key: 'previous_methods',
    title: 'What have you already tried?',
    index: 10,
  },
  methodFeedback: {
    key: 'method_feedback',
    title: 'Why previous methods did not stick',
    index: 11,
  },
  exerciseLink: {
    key: 'exercise_link',
    title: 'Exercise changes the reward loop',
    index: 12,
  },
  scrollUnlock: {
    key: 'scroll_unlock',
    title: 'Squat to unlock scrolling',
    index: 13,
  },
  setupPhone: {
    key: 'setup_1',
    title: 'Put your phone on the floor',
    index: 14,
  },
  setupSquat: {
    key: 'setup_2',
    title: 'Step back and squat',
    index: 15,
  },
  setupTips: {
    key: 'setup_3',
    title: 'Tips for better detection',
    index: 16,
  },
  calibrationSquatCheck: {
    key: 'calibration_squat_check',
    title: 'Do one squat',
    index: 17,
  },
  routineReminder: {
    key: 'routine_reminder',
    title: 'Choose your daily reminder',
    index: 18,
  },
  exerciseFrequency: {
    key: 'exercise_frequency',
    title: 'How often do you currently exercise?',
    index: 19,
  },
  finishSetupIntro: {
    key: 'finish_setup_intro',
    title: 'Finish setting up Booty Block',
    index: 20,
  },
  screenTimePermission: {
    key: 'screen_time_permission',
    title: 'Connect Bootyblock to Screen Time, Securely.',
    index: 21,
  },
  notificationPermission: {
    key: 'notification_permission',
    title: 'allow Booty Block to send you notifications',
    index: 22,
  },
  socialProof: {
    key: 'social_proof',
    title: 'Booty Block was designed for women like you',
    index: 23,
  },
  calculatingWellbeingPlan: {
    key: 'calculating_wellbeing_plan',
    title: 'Calculating your first-week plan',
    index: 24,
  },
  firstWeekWellbeingPlan: {
    key: 'first_week_wellbeing_plan',
    title: 'Your first-week wellbeing plan',
    index: 25,
  },
  subscriptionPaywall: {
    key: 'subscription_paywall',
    title: 'Bootyblock Pro paywall',
    index: 26,
  },
  oneTimeOfferPaywall: {
    key: 'one_time_offer_paywall',
    title: 'Bootyblock Pro one-time offer',
    index: 27,
  },
  homeScreen: {
    key: 'home_screen',
    title: 'Home',
    index: 28,
  },
  blockedAppsPicker: {
    key: 'blocked_apps_picker',
    title: 'Blocked apps',
    index: 29,
  },
} as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[keyof typeof ONBOARDING_STEPS];
