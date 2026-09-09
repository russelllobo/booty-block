# BootyBlock: Squat to Scroll

React Native screen-time coach that trades movement for screen time: pick distracting apps with Apple's Screen Time picker, then earn unlock minutes by doing squats counted on-device with the camera. Video frames never leave the phone.

## Stack

- **Expo 56 + React Native + TypeScript**, file routing with `expo-router`, styling with NativeWind
- **Custom Swift Expo modules**: on-device pose-detection camera view, TikTok Business SDK binding
- **Apple Screen Time APIs** (`DeviceActivity`, `FamilyControls`) for blocking + unlock sessions (1–60 min, auto-relock)
- **Supabase** backend (waitlist, landing-page worker), **RevenueCat** subscriptions, **PostHog** analytics, **EAS** OTA updates
- Gamified onboarding funnel, streaks, mini-games, routine reminders, App Store review flow

## Run locally

```bash
npm install
npm start
```

See `AGENTS.md` for the pinned Expo docs version and OTA release process.
