# App Review notes

Bootyblock uses Apple’s Family Controls, Managed Settings, and Device Activity frameworks to let an individual user select and temporarily block apps on their own device.

Review flow:

1. Launch Bootyblock and complete the introductory screens.
2. Grant Screen Time access when prompted.
3. Choose at least one app or category in Apple’s native picker.
4. Grant Camera access and complete one calibration squat.
5. From the home screen, choose an unlock duration and complete the requested squats.
6. The selected apps are unblocked for the earned duration and automatically blocked again when it expires.

Camera processing:

- Human pose detection runs entirely on the device.
- Camera video is not recorded, retained, or uploaded.
- The app does not use the microphone.

Notifications:

- Bootyblock may ask for notification permission for local, on-device reminders/status related to blocking and unlock sessions.
- The app does not use remote push notifications for marketing or tracking.

No account or login is required. All app preferences and session state are stored locally on the device.

Family Controls distribution entitlement is configured for the main app and all three extensions. If the shield action cannot deep-link back to the app due to iOS limitations, the shield copy instructs the reviewer/user to manually open Bootyblock.
