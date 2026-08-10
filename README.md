# KoboAds — Mobile Advertising Platform

> A React Native + Expo prototype for a two-sided mobile advertising marketplace — businesses create and run ad campaigns, everyday users earn Kobo (rewards) by watching those ads on their phones.

---

## What Is This?

KoboAds is a concept I designed and prototyped for the Nigerian market: a platform where small businesses can run affordable mobile ad campaigns, and where regular Nigerians earn real money by watching ads on their phones during idle time.

The two sides of the marketplace:
- **Businesses (Exchangers)** — create targeted ad campaigns with defined budgets, set daily limits, and track impressions in real-time
- **Earners** — watch ads during their free time, accumulate Kobo rewards, and withdraw to their bank account via Paystack

This repo is the **complete frontend prototype** — all 14 screens, full navigation, and every user flow is clickable end-to-end. All data is mocked locally so the entire app works without a backend.

---

## Screenshots

> *(Add screenshots: onboarding, home wallet card, create-ad wizard, earn screen, profile)*

---

## Features

- 🎬 **Onboarding** — Swipeable intro explaining both sides of the platform
- 🔐 **Auth** — Register as Exchange (advertiser) or Earner (viewer)
- 🏠 **Home** — Wallet card, quick stats, quick actions, recent campaigns
- 📢 **Create Ad** — 4-step wizard: Ad Details → Targeting → Budget → Review
- 📊 **My Ads** — Campaign list with All / Active / Paused / Completed tabs and per-campaign stats
- 📺 **Earn** — Watch-ads-to-earn screen with daily limit tracker
- 👤 **Profile** — Personal info, wallet and transactions, withdrawal history, referral program, settings, support

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (SDK 57) |
| Language | TypeScript |
| State | React Context API (mock backend) |
| Navigation | React Navigation (Stack + Tab) |
| UI | Custom component library |
| Storage | Mock (AsyncStorage-ready) |
| Payments | Paystack (integration planned) |

---

## Project Structure

```
KoboAds/
├── src/
│   ├── theme/               # Colors, spacing, typography scale
│   ├── types/               # Shared TypeScript interfaces
│   ├── data/
│   │   └── mockData.ts      # Mock campaigns, ads, transactions, referrals
│   ├── context/
│   │   └── AppContext.tsx   # Auth + wallet + campaigns state (mock backend)
│   ├── components/          # Reusable UI library
│   │   ├── Button
│   │   ├── Card
│   │   ├── Input
│   │   ├── Badge
│   │   ├── ProgressBar
│   │   ├── StatCard
│   │   ├── QuickAction
│   │   ├── CampaignListItem
│   │   ├── StepIndicator
│   │   ├── ScreenHeader
│   │   └── EmptyState
│   ├── navigation/
│   │   └── RootNavigator.tsx   # Stack + MainTabs (bottom tabs with centre + button)
│   └── screens/
│       ├── Onboarding/         # Swipeable intro
│       ├── Auth/               # Login, Register (Exchange vs Earner)
│       ├── Home/               # Wallet card, stats, quick actions
│       ├── CreateAd/           # 4-step ad creation wizard
│       ├── MyAds/              # Campaign management
│       ├── CampaignDetail/     # Per-campaign stats, pause/resume
│       ├── Earn/               # Ad viewing + earnings tracker
│       └── Profile/            # Profile, wallet, withdrawals, referrals
├── app.json
├── package.json
└── README.md
```

---

## Getting Started

### Install

```bash
git clone https://github.com/unusualdan/koboads.git
cd koboads

# Let Expo align SDK 57 dependencies
npx expo install @expo/vector-icons \
  @react-navigation/native \
  @react-navigation/native-stack \
  @react-navigation/bottom-tabs \
  react-native-screens \
  react-native-safe-area-context

npm install
```

### Run

```bash
npx expo start
```

Scan the QR with **Expo Go** on your Android or iOS device, or press:
- `a` — Android emulator
- `i` — iOS simulator
- `w` — Web browser

---

## Wiring Up a Real Backend

Every screen talks to data exclusively through `useApp()` from `src/context/AppContext.tsx`. The mock state and actions in that file are the only thing that needs to change to connect a real backend:

```typescript
// Replace mock state with real API calls
const login = async (phone: string, password: string) => {
  // const user = mockUsers.find(...)  ← remove this
  const user = await api.auth.login(phone, password)  // ← add this
  setUser(user)
}
```

Screens, navigation, and components remain completely unchanged. The context is the only integration point.

**Planned backend stack:**
- Node.js + Express + TypeScript
- Firebase Firestore
- Paystack (deposits and withdrawals)
- Firebase Cloud Messaging (ad delivery notifications)

---

## Roadmap

- [x] Complete frontend prototype (all screens, navigation, mock data)
- [x] Node.js backend with Firebase
- [x] Paystack payment integration
- [x] Real ad delivery system
- [] Play Store release

---

## License

ISC © Opeyemi Daniel Atoyebi
