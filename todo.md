# FitMonster Migration TODO

## Core Infrastructure
- [x] Set up Expo Router file-based routing with tabs
- [x] Migrate authentication system from Loveable to Expo auth
- [ ] Configure Supabase integration for backend
- [ ] Set up i18n for multi-language support
- [x] Configure theme system with light/dark mode

## Screens
- [x] Home screen with monster display and daily stats
- [x] Camera/Food scanner with AI food recognition
- [x] Workout tracker with exercise logging
- [x] Battle arena with matchmaking
- [x] Dashboard with analytics and trends
- [x] Authentication screen (login/signup)
- [ ] Pokedex screen (monster collection)
- [ ] Guild/Social screen with friends and chat
- [ ] Map screen with quests
- [ ] Profile/Settings screen

## Components
- [x] Bottom navigation bar with 5 tabs
- [ ] Monster card with animations
- [ ] Add log dialog for quick entries
- [ ] Camera capture component
- [ ] Workout animation component
- [ ] Feeding animation component
- [ ] Swipe card for matchmaking
- [ ] Calendar view with heatmap
- [ ] Weekly trends chart
- [ ] Quest card component
- [ ] Chat room component
- [ ] Friends list component
- [ ] Health integration card
- [ ] Daily suggestion card
- [ ] Egg hatch dialog
- [ ] Match popup

## Data Layer
- [x] Game data types and models
- [x] Workout data types and models
- [ ] Matching data types and models
- [x] Food/nutrition types and models
- [ ] User profile types
- [ ] Monster evolution system

## Hooks
- [ ] useAuth for authentication
- [ ] useGame for monster state management
- [ ] useWorkoutLogs for exercise tracking
- [ ] useFoodLogs for nutrition tracking
- [ ] useFoodAnalysis for AI food recognition
- [ ] useFriends for social features
- [ ] useChatMessages for messaging
- [ ] useDailySuggestion for quest system

## Services
- [ ] Health service for device health data integration
- [ ] Food analysis service (AI/API integration)
- [ ] Battle service for PvP functionality
- [ ] Notification service for push notifications

## Assets
- [x] Generate custom app logo
- [x] Migrate monster images
- [x] Set up splash screen
- [x] Configure app icons for iOS/Android

## Features
- [ ] User authentication with email
- [ ] Monster evolution based on activity
- [ ] Food scanning with AI recognition
- [ ] Workout logging with timer
- [ ] Battle system with matchmaking
- [ ] Social features (friends, chat, guilds)
- [ ] Daily quests and challenges
- [ ] Achievement system
- [ ] Leaderboards
- [ ] Health data integration
- [ ] Offline support with sync
- [ ] Push notifications
- [ ] Multi-language support

## Testing & Polish
- [ ] Test all user flows end-to-end
- [ ] Add haptic feedback to interactions
- [ ] Optimize animations for performance
- [ ] Test offline functionality
- [ ] Test on iOS and Android
- [ ] Verify dark mode styling
- [ ] Check accessibility features


## New Features to Implement (from live app)

### Authentication & User Management
- [x] Complete authentication page with sign in/sign up toggle
- [x] Social login (Google, Apple) integration
- [ ] Email/password authentication (backend integration needed)
- [x] Trainer name field for signup
- [ ] Forgot password functionality
- [ ] User profile with trainer name display

### Home Page Enhancements
- [x] Personalized greeting with trainer name
- [x] Gradient stats card (Health Score, Steps, Net EXP)
- [x] Tab navigation (Home, Daily Tasks, History)
- [x] Enhanced monster card with multiple badges
- [x] Monster stats display (strength, defense, agility icons)
- [x] Evolution progress bar
- [x] "View All" monsters functionality
- [x] Hatch Egg feature for multiple monsters
- [x] Daily Quests section with colored cards
- [x] Quest progress tracking with coin rewards
- [x] Quick action buttons with proper styling

### Camera/Food Page Enhancements
- [x] AI food analysis integration
- [x] "Open Camera" functionality
- [x] "Choose from Gallery" option
- [x] Food nutrition display after analysis
- [x] Feed monster animation after food logging

### Workout Page Enhancements
- [x] Manual log workout feature
- [x] Sync steps from device health
- [x] Workout type filter pills (Running, Weight Training, Yoga, Basketball)
- [x] Exercise grid with MET values
- [x] Best workout tracking
- [x] Workout completion counter
- [x] EXP calculation from workouts

### Battle Page Enhancements
- [x] Swipe-based matchmaking (Tinder-style)
- [x] Match/Friends tab navigation
- [x] Opponent cards with fitness streak badges
- [x] Match percentage calculation
- [x] Today's swipes limit (50/50)
- [x] Three swipe actions (Reject, Super Like, Like)
- [x] Super Like with coin cost
- [x] Random Wild Battle option
- [x] Nearby opponents counter
- [x] Distance and online status display

### Dashboard Page Enhancements
- [x] Today's steps with goal progress (10,000 steps)
- [x] Burned calories calculation
- [x] Net EXP breakdown (Nutrition + Workout)
- [x] Calorie surplus/deficit indicator
- [x] Step bonus effects (EXP bonus, Protein efficiency)
- [x] Daily calorie need display (1800 kcal)
- [x] Protein intake tracking (0g/100g)
- [x] Monster growth status card
- [x] Evolution stage indicator
- [x] Daily quest progress list

### Data & State Management
- [ ] User profile data persistence
- [ ] Monster team management (multiple monsters)
- [ ] Quest system with progress tracking
- [ ] Coin/currency system
- [ ] Fitness streak tracking
- [ ] Match history and friends list
- [ ] Daily stats aggregation
- [ ] EXP calculation system
- [ ] Evolution system based on progress

### UI/UX Improvements
- [ ] Gradient backgrounds on cards
- [ ] Colored progress bars
- [ ] Badge system (level, type, status)
- [ ] Swipe gesture support
- [ ] Tab navigation components
- [ ] Settings menu in header
- [ ] Multi-language support (Chinese/English)
- [ ] Responsive card layouts
- [ ] Icon system for stats
- [ ] Coin reward indicators


## Database & API (Completed)
- [x] Database schema with 10 tables (profiles, monsters, workouts, dailyStats, foodLogs, quests, userQuests, battles, matchSwipes, friendships)
- [x] Database migrations applied successfully
- [x] Database helper functions for all CRUD operations
- [x] tRPC API endpoints for profile management
- [x] tRPC API endpoints for monster management
- [x] tRPC API endpoints for workout tracking
- [x] tRPC API endpoints for food logging
- [x] tRPC API endpoints for quest system
- [x] tRPC API endpoints for daily stats
- [x] Seeded 6 initial daily quests


## AI Food Analysis Feature
- [x] Read server LLM docs and understand multimodal capabilities
- [x] Create server-side food analysis tRPC endpoint with LLM
- [x] Add image picker (camera + gallery) to food scanner screen
- [x] Upload food photo and send to AI for analysis
- [x] Display nutrition results (calories, protein, carbs, fat)
- [x] Save food log to database after analysis
- [x] Feed monster flow after logging food (EXP reward alert)
- [ ] Show recent food logs on the food scanner screen


## User Feedback - Round 2
- [x] Fix monster image background (remove transparent/checkered background)
- [x] Make "Hatch Egg" button functional with egg hatching flow
- [x] Make "Manual Log" button functional with workout entry form
- [x] Make "Sync Steps" button functional with step counter
- [x] Add PvP battle scenes/actions (Attack, Defend, Special)
- [x] Fix all non-working buttons across the app
- [x] Add chat system after matching a friend (text messaging)
- [x] Add photo sharing in chat
- [x] Add phone call capability in chat (UI + placeholder)
- [x] Add video call capability in chat (UI + placeholder)


## User Feedback - Round 3
- [x] Fix monster image background - add themed gradient background (not transparent/checkered)
- [x] Fix Hatch Egg - hatched monster must add to "My Monster Team" list
- [x] Fix "View All" button - open full monster collection view
- [x] Add battle action animations (Attack/Defend/Special) under 1 second each
- [x] Switch entire app to light theme matching green/mint color scheme
- [x] Add Home/Daily Tasks/History tab navigation on home screen
- [x] Implement AI Daily Tasks tab with workout/diet suggestions and completion tracking
- [x] Implement History tab with Calories In/Burned, Workout Duration, Avg Protein stats
- [x] Add "Add Record" button in History tab
- [x] Add Daily Calorie Trend chart in History tab
- [x] Add Calories/Macros/Workout sub-tabs in History
- [x] Test all buttons and flows thoroughly before delivery


## User Feedback - Round 4
- [x] Add animation/effect to "Feed Monster & Save Log" button on food scanner
- [x] Fix workout category filter pills stretching too tall when selected
- [x] Fix History tab "Add Record" button - opens proper form modal
- [x] Add sample/demo data to all screens so features are visible


## User Feedback - Round 5
- [x] Fix Feed Monster animation — must show visible celebration effect when saving food log
- [x] Change "Hi, Trainer!" greeting to display actual username
- [x] Add workout exercise detail page with duration slider, Outdoor/Gym bonus, EXP/calorie preview, and "Start Training" button
- [x] Add monster action buttons on Home (Train, Feed, Battle) to choose which monster to use


## User Feedback - Round 6
- [x] Create sign in/login page matching screenshot design
- [x] Add Google OAuth login button (Continue with Google)
- [x] Add Apple OAuth login button (Continue with Apple)
- [x] Add email/password login form
- [x] Add "Forgot password?" link and flow
- [x] Add "Sign up now" link and sign up page
- [x] Show FitMonster logo and branding at top of auth page
- [x] Add Terms of Service and Privacy Policy footer text

## User Feedback - Round 7
- [x] Add social media sharing buttons to login page for brand visibility
- [x] Include share options for Twitter/X, Facebook, WhatsApp, and generic More
- [x] Use native share sheet or direct deep links for each platform

## User Feedback - Round 8
- [x] Add logout button on home page top-right corner
- [x] After logout, redirect user to login page
- [x] New users must register/login first before accessing the app (auth gating)

## User Feedback - Round 9
- [x] Update app logo with user-provided fitmonsterlogo.png
- [x] Copy logo to all required locations (icon, splash, favicon, android foreground)
- [x] Update app.config.ts logoUrl with S3 URL

## Bug Fix - Round 9b
- [x] Fix corrupted/empty icon.png causing Syntax Error in Expo preview

## Audit - Round 10
- [x] Audit all screens and functions for broken/non-working features
- [x] Fix all identified issues
- [x] Fix Daily Tasks Workout/Diet toggle - add state management and content switching
- [x] Fix Daily Tasks completion progress bar - connect to actual progress instead of hardcoded 0%
- [x] Fix History tab view toggle icons (📊📅📋) - make functional with chart/calendar/list views
- [x] Fix sharing on native - use Share API instead of Sharing.shareAsync with URL

## User Feedback - Round 11
- [x] Create shared activity context/store for cross-screen fitness data
- [x] Wire food logging (camera screen) to update protein intake and meal count in shared state
- [x] Wire workout completion (workout screen) to update workout duration and EXP in shared state
- [x] Wire steps sync (workout screen) to update step count in shared state
- [x] Update Home screen quests to read real-time progress from shared state
- [x] Update Daily Tasks completion progress bar to reflect actual task completion
- [x] Update History tab stats to reflect real accumulated data
- [x] Persist shared activity data with AsyncStorage so it survives app restarts

## User Feedback - Round 12
- [x] Fix Apple login — shows "Authentication successful! Redirecting..." but stays on login page
- [x] Remove "Coming Soon" from email login — let users sign in/sign up with username+password locally
- [x] After email sign in/sign up, navigate user into the app immediately

## Bug Fix - Round 13
- [x] Fix logout button on Home page — replaced Alert.alert with Modal-based confirmation dialog

## Bug Fix - Round 14
- [x] Fix logout not redirecting to login page after confirmation — converted to shared AuthContext

## User Feedback - Round 15
- [x] Build auto-logging workout tracking page — tapping an exercise (e.g. Running) opens a timer page that auto-logs duration, calories, EXP
- [x] Build friend matching system — users send friend requests, both must accept, friends appear in friends list
- [x] Build nearby users map — show user location and nearby FitMonster users (with location sharing consent)
- [x] Integrate friends list into Battle tab for PvP battles
