export const ONBOARDING_STEP_TOTAL = 31;

export const ONBOARDING_STEPS = {
  welcome: {
    key: 'welcome',
    title: 'Block your apps until you grow your booty',
    index: 1,
  },
  profileName: {
    key: 'profile_name',
    title: 'What should we call you?',
    index: 2,
  },
  goals: {
    key: 'goals',
    title: 'What goals do you want to achieve using BootyBlock?',
    index: 3,
  },
  currentDailyScreenTime: {
    key: 'current_daily_screen_time',
    title: 'How much time do you spend on your phone every day?',
    index: 4,
  },
  goalDailyScreenTime: {
    key: 'goal_daily_screen_time',
    title: 'How much time would you like to spend instead?',
    index: 5,
  },
  timeSinkApps: {
    key: 'time_sink_apps',
    title: 'Which apps take most of your time?',
    index: 6,
  },
  habitFriction: {
    key: 'habit_friction',
    title: 'What usually makes it hard to quit?',
    index: 7,
  },
  usageFeelings: {
    key: 'usage_feelings',
    title: 'How does using these apps for too long make you feel?',
    index: 8,
  },
  currentState: {
    key: 'current_state',
    title: 'Current state',
    index: 9,
  },
  ageRange: {
    key: 'age_range',
    title: 'How old are you?',
    index: 10,
  },
  calculatingProjection: {
    key: 'calculating_projection',
    title: 'Calculating your projection',
    index: 11,
  },
  resultComparison: {
    key: 'result_comparison',
    title: 'Your screen dependence score',
    index: 12,
  },
  projectionWarning: {
    key: 'projection_warning',
    title: 'Lifetime screen time projection',
    index: 13,
  },
  reclaimedTime: {
    key: 'reclaimed_time',
    title: 'Time you could reclaim',
    index: 14,
  },
  previousMethods: {
    key: 'previous_methods',
    title: 'What have you already tried?',
    index: 15,
  },
  methodFeedback: {
    key: 'method_feedback',
    title: 'Why previous methods did not stick',
    index: 16,
  },
  replacementScience: {
    key: 'replacement_science',
    title: 'Replacement beats restriction',
    index: 17,
  },
  exerciseLink: {
    key: 'exercise_link',
    title: 'Exercise changes the reward loop',
    index: 18,
  },
  scrollUnlock: {
    key: 'scroll_unlock',
    title: 'Squat to unlock scrolling',
    index: 19,
  },
  routineReminder: {
    key: 'routine_reminder',
    title: 'Choose your daily reminder',
    index: 20,
  },
  setupPhone: {
    key: 'setup_1',
    title: 'Put your phone on the floor',
    index: 21,
  },
  setupSquat: {
    key: 'setup_2',
    title: 'Step back and squat',
    index: 22,
  },
  setupTips: {
    key: 'setup_3',
    title: 'Tips for better detection',
    index: 23,
  },
  calibrationSquatCheck: {
    key: 'calibration_squat_check',
    title: 'Do one squat',
    index: 24,
  },
  exerciseFrequency: {
    key: 'exercise_frequency',
    title: 'How often do you currently exercise?',
    index: 25,
  },
  finishSetupIntro: {
    key: 'finish_setup_intro',
    title: 'Finish setting up Booty Block',
    index: 26,
  },
  screenTimePermission: {
    key: 'screen_time_permission',
    title: 'Connect Bootyblock to Screen Time, Securely.',
    index: 27,
  },
  notificationPermission: {
    key: 'notification_permission',
    title: 'Allow Bootyblock to send you notifications',
    index: 28,
  },
  calculatingWellbeingPlan: {
    key: 'calculating_wellbeing_plan',
    title: 'Calculating your first-week plan',
    index: 29,
  },
  firstWeekWellbeingPlan: {
    key: 'first_week_wellbeing_plan',
    title: 'Your first-week wellbeing plan',
    index: 30,
  },
  blockedAppsPicker: {
    key: 'blocked_apps_picker',
    title: 'Blocked apps',
    index: 31,
  },
} as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[keyof typeof ONBOARDING_STEPS];
