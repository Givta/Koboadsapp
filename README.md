# KoboAds — Mobile App (Expo SDK 57)

Full front-end structure for the KoboAds app, matching the onboarding, home,
create-ad, my ads, earn, and profile screens. All data is mocked locally
(`src/data/mockData.ts` + `src/context/AppContext.tsx`) so the whole app is
clickable end-to-end with no backend yet.

## 1. Install dependencies

From inside this folder, let Expo resolve SDK-57-correct versions
(don't just `npm install` the pinned numbers in package.json blindly —
run this so Expo can align them to 57):

```bash
npx expo install @expo/vector-icons @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context
npm install
```

## 2. Run in Expo Go

```bash
npx expo start
```

Scan the QR code with Expo Go (SDK 57 build) on your Android/iOS device,
or press `a` / `i` for an emulator, or `w` for web.

## Project structure

```
src/
  theme/          colors, spacing, type scale
  types/          shared TypeScript types
  data/           mock data (campaigns, ads, transactions, referrals)
  context/        AppContext — auth + wallet + campaigns state (mock backend)
  components/     Button, Card, Input, Badge, ProgressBar, StatCard,
                  QuickAction, CampaignListItem, StepIndicator, ScreenHeader,
                  EmptyState
  navigation/     RootNavigator (stack) + MainTabs (bottom tabs w/ center
                  "+" button that opens the Create Ad modal)
  screens/
    Onboarding/   swipeable intro
    Auth/         Login, Register (Exchange vs Paid choice)
    Home/         wallet card, stats, quick actions, recent campaigns
    CreateAd/     4-step wizard: Ad Details → Targeting → Budget → Review
    MyAds/        campaign list w/ All/Active/Paused/Completed tabs
    CampaignDetail/  per-campaign stats, pause/resume
    Earn/         watch-ads-to-earn, daily limit tracker
    Profile/      profile hub + Personal Info, Wallet & Transactions,
                  Withdrawal History, Referral Program, Settings, Support
```

## Wiring up a real backend later

Everything that talks to "data" goes through `useApp()` from
`src/context/AppContext.tsx`. Swap the mock state/actions in there for real
API calls (Firebase Auth/Firestore, or your Node.js API) and the screens
don't need to change.
