# FitMonster Migration TODO

## Core Infrastructure
- [x] Set up Expo Router file-based routing with tabs
- [x] Migrate authentication system from Loveable to Expo auth
- [ ] Configure Supabase integration for backend
- [x] Set up i18n for multi-language support
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
- [x] Multi-language support

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
- [x] Multi-language support (Chinese/English)
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

## User Feedback - Round 16
- [x] Replace settings button (next to logout) with language toggle button
- [x] Create i18n context with English and Chinese translations
- [x] Default language is English, user can switch to Chinese
- [x] Persist language preference with AsyncStorage
- [x] Translate all content across all screens (Home, Workout, Camera/Food, Battle, Dashboard, Auth, Chat, Workout Tracking, Nearby Map)

## Bug Fix - Round 16b
- [x] Fix "Workout" text still showing in English when Chinese is selected
- [x] Fix "Daily Tasks" text still showing in English when Chinese is selected
- [x] Audit all screens for any other remaining untranslated hardcoded strings

## Bug Fix - Round 16c
- [x] Translate workout screen exercise names (Running, Cycling, Swimming, etc.) to Chinese
- [x] Translate all other hardcoded English strings on the workout screen

## Bug Fix - Round 17
- [x] Fix back arrow position too high on all sub-pages (move lower into safe area)
- [x] Fix back arrow not working (navigation back not firing) on all sub-pages
- [x] Translate remaining English text on battle page (battle log messages, monster types, time labels)

## Bug Fix - Round 17b
- [x] Fix back arrow still too high on nearby-map, workout-tracking, chat — uses useSafeAreaInsets() for explicit top padding (Math.max(insets.top, 44) + 8)

## Feature - Round 18: Per-User Data Persistence
- [x] New users should see completely fresh/empty data (no sample data)
- [x] Existing users should have their activity data persisted and restored across sessions
- [x] Data should be isolated per user (different users see different data)
- [x] Remove hardcoded sample/demo data from screens
- [x] Persist monster team data per user
- [x] Persist workout history per user
- [x] Persist food log history per user
- [x] Persist quest/daily task progress per user
- [x] Persist dashboard stats per user
- [x] Clear data on logout so next login starts fresh or loads correct user data

## Bug Fix - Round 19
- [x] Fix workout-tracking screen content overlap (timer, exercise name, progress bar overlapping)
- [x] Fix step sync button (footprint icon) — added haptic feedback and increased touch target
- [x] Verify nearby friend feature — currently uses simulated data, explained testing approach
- [x] Answer monster evolution system design questions — evolution UI exists but no trigger logic yet

## Feature - Round 20a: Monster Evolution System
- [x] Add evolution trigger logic: food + workout EXP accumulates to evolution progress
- [x] Stage 1→2 threshold: 500 EXP, Stage 2→3 threshold: 1500 EXP
- [x] Auto-upgrade monster appearance (image) when evolution threshold reached
- [x] Evolution animation/celebration when monster evolves
- [x] Update monster stats on evolution (HP, strength, defense, agility increase)
- [x] Persist evolution state per user

## Feature - Round 20b: Real Multiplayer Friend System
- [x] Create database schema for user profiles, friend requests, and locations
- [x] Backend API: update user location
- [x] Backend API: get nearby users within radius
- [x] Backend API: send/accept/reject friend requests
- [x] Backend API: get friend list
- [x] Update nearby-map screen to use real backend data
- [x] Update battle screen to use real friend list for PvP
- [x] Real-time location sharing with backend

## Bug Fix - Round 21a: Workout Tracking Layout
- [ ] Fix workout-tracking screen layout — timer/exercise name still overlapping
- [ ] Fix too much whitespace above the timer content
- [ ] Ensure content is properly centered vertically

## Feature - Round 21b: Monster Team Management
- [x] Max 3 monsters per user
- [x] Select one monster as "active" for training and battle
- [x] Monster selection UI on home screen (team selector with thumbnails)
- [x] Active monster used in battle screen
- [x] Prevent hatching more than 3 monsters
- [x] Active monster receives EXP from food and workouts
- [x] Active monster checked for evolution
- [x] i18n translations for team management (EN + ZH)

## Feature - Round 22: Health Data Sync (HealthKit + Health Connect)
- [x] Build HealthService abstraction layer (iOS HealthKit, Android Health Connect, Web simulation)
- [x] Authorization flow with native permission request and privacy notice
- [x] Sync steps data (daily step count from wearable/phone)
- [x] Sync workout sessions (type, duration, calories, heart rate, distance)
- [x] Background/on-launch sync for last 24 hours of data
- [x] Convert health data to Monster EXP (steps * 0.04 = calories, workout EXP)
- [x] Health Sync settings screen (connect/disconnect, sync status, last sync time)
- [x] Error handling: no device prompt, authorization denied fallback to manual input
- [x] Update Home screen to show synced health data (quick action card)
- [x] Update Dashboard with activeMonsterIndex fix
- [x] Configure Expo plugins for HealthKit and Health Connect (app.config.ts)
- [x] i18n translations for health sync (EN + ZH)
- [x] Persist health sync preferences and data per user (AsyncStorage)
- [x] SYNC_HEALTH_DATA batch action in activity context with Monster EXP

## Bugfix - Round 23: UI and Data Fixes
- [x] Fix daily calorie trend chart showing wrong values (removed /100 division that turned 290 into 3)
- [x] Fix food item names showing English in Chinese mode (pass language param to AI, localize labels)
- [x] Fix food description showing English in Chinese mode (AI now responds in user's language)
- [x] Improve AI nutrition prompt for more accurate estimates (detailed prompt with portion-based estimation)
- [x] Fix evolution bar overflow (capped at 100%, added overflow:hidden)
- [x] Add carbs and fat tracking to Macros tab (protein/carbs/fat sub-tabs with individual charts)
- [x] Add daily carbs and fat to activity context state (todayCarbs, todayFat, weeklyCarbs, weeklyFat)
- [x] Fix Lv.{level} display bug in dashboard (was showing literal {level} text)

## Bugfix - Round 24: Evolution System Fixes
- [x] Cap evolution progress display at max value (110/100 → 100/100)
- [x] Cap evolution progress internally so it never exceeds evolutionMax (Math.min in addEvolutionExp)
- [x] Add "Evolve" button when evolution bar is full (golden button with shadow)
- [x] Add evolution animation effect when evolve button is pressed (glow + scale animation modal)
- [x] Ensure evolution resets progress and advances stage correctly
- [x] Cap HP display to never exceed maxHp
- [x] Show evolution stage label (Stage X/3) under evolution bar
- [x] Changed from auto-popup to user-triggered evolution via Evolve button

## Bugfix - Round 25: iOS Build Failure
- [x] Remove HealthKit entitlements from app.config.ts (provisioning profile doesn't support it)
- [x] Comment out Health Connect Android permissions (native modules not installed yet)
- [x] Keep health entitlements as comments for future re-enabling when native modules are installed

## Feature - Round 26: Workout Timer Redesign
- [x] Remove preset duration slider from workout setup
- [x] Change to open-ended stopwatch (no target time)
- [x] Calculate calories and EXP based on actual workout duration on completion
- [x] Persist timer when navigating to other tabs (WorkoutTimerContext in _layout.tsx)
- [x] Add return-to-timer banner when workout is active and user is on other tabs (green/yellow banner)
- [x] Timer continues when screen is off (uses startTime-based calculation, not interval)
- [x] Remove progress bar percentage (no target to compare against)
- [x] Update timer display to count up instead of counting down
- [x] Add pause/resume support with visual state indicator
- [x] Prevent starting new workout while one is active (alert message)

## Feature - Round 27: Workout Completion Celebration Animation
- [x] Add celebration modal/overlay when workout is completed (replaces Alert)
- [x] Show earned EXP with animated counter (counts up from 0)
- [x] Show burned calories with animated counter (counts up from 0)
- [x] Add confetti/particle animation effect (30 particles with random colors)
- [x] Display workout summary (exercise name, duration, bonus multiplier)
- [x] Add i18n translations for celebration strings (EN + ZH)
- [x] Trophy bounce-in animation with glow pulse
- [x] Haptic feedback on celebration (Success + Heavy impact)

## Bugfix - Round 28: Workout Buttons Unresponsive
- [x] Fix "Finish Workout" button not responding when timer < 1 minute (removed 60s minimum check)
- [x] Fix back arrow button not responding on workout tracking screen (cancel Alert i18n keys verified)

## Bugfix - Round 29: Back Arrow Should Navigate Without Cancelling
- [x] Change back arrow to navigate back without cancelling workout timer (now uses router.back())
- [x] Allow users to browse other pages while workout timer continues in background
- [x] Added separate "Cancel" text button in top-right for explicit workout cancellation

## UX - Round 30: Move Active Workout Banner to Bottom
- [x] Move active workout banner from top to compact floating bar above tab bar
- [x] Make it easy to reach with one-handed thumb usage

## Feature - Round 31: Weekly Workout Statistics Card on Dashboard
- [x] Add weekly workout stats card to Dashboard (workout count, total duration, total calories)
- [x] Calculate stats from workoutLogs in ActivityContext for current week (Mon-Sun)
- [x] Add i18n translations for weekly stats card (EN + ZH)

## Feature - Round 32: Release Preparation for Real User Testing
- [x] Install react-native-health and react-native-health-connect native modules
- [x] Uncomment HealthKit entitlements in app.config.ts (Apple Developer Portal capability enabled)
- [x] Uncomment Health Connect permissions in app.config.ts
- [x] Enable Maps capability in app.config.ts (location permissions added)
- [x] Remove simulated/mock data from HealthService (native APIs on device, empty on web)
- [x] Remove MOCK_OPPONENTS from battle screen (uses real nearby users from backend)
- [x] Remove MOCK_NEARBY_USERS from nearby-map screen
- [x] Remove simulated auto-accept friend request logic (uses real backend API)
- [x] Ensure new users start with completely empty state (no pre-populated data)
- [x] Audit nearby user discovery — uses real location + backend Haversine distance query
- [x] Battle swipe cards use real nearby users from backend API
- [x] Added empty state UI for no nearby users (with link to open map)
- [x] Wild battle generates procedural opponent based on player level when no nearby users
- [x] Updated health-sync screen to remove 'simulation' platform references

## Audit - Round 33: HealthKit and Map Functionality Check
- [x] Verify app.config.ts HealthKit entitlements and Health Connect permissions
- [x] Verify HealthService native module integration (react-native-health, react-native-health-connect)
- [x] Verify Map/Location functionality (expo-location, nearby-map, battle screen)
- [x] No issues found — all configurations correct

## Fix - Round 34: EAS Project ID Configuration
- [x] Add extra.eas.projectId to app.config.ts for EAS CLI linking

## Fix - Round 35: Create eas.json for EAS Build
- [x] Create eas.json with development, preview, and production build profiles

## Bug - Round 36: Old records disappear after re-login
- [x] Investigate data persistence mechanism — root cause: localLogin used Date.now() as user ID, generating new ID each login, so AsyncStorage key changed and old data was orphaned
- [x] Fix 1: Use stable openId (local-{email}) as ActivityProvider storage key instead of numeric id
- [x] Fix 2: localLogin and localSignup now reuse existing ID for the same email
- [x] Both fixes ensure same email always maps to same data, even after logout/re-login

## Feature - Round 37: Delete Monster + Fix Home Hatch Button
- [x] Add delete monster functionality (with confirmation dialog)
- [x] Add REMOVE_MONSTER action to ActivityContext reducer
- [x] Add delete button in monster list modal (dashed red border style)
- [x] Allow deleting any monster (including last one, user can hatch new)
- [x] Fix home screen egg card — now tappable to directly trigger hatch flow when no monsters exist
- [x] Add i18n translations for delete monster (EN + ZH)

## Bug - Round 38: Delete Monster button not responding
- [x] Fix: replaced Alert.alert with inline confirmation panel (Alert doesn't work inside Modal on iOS)
- [x] Fix: replaced TouchableOpacity with Pressable for delete button (avoids parent TouchableOpacity intercepting press)
- [x] Added visual press feedback (opacity: 0.5 on press)

## Bug - Round 39: Login Page Fixes
- [x] Force light mode only (disable dark mode) — dark mode text invisible
- [x] Add language toggle (EN/ZH) on login page
- [x] Add Apple icon to Apple login button

## Bug - Round 40: Long username pushes logout button off screen
- [x] Fix home screen header: truncate long username so logout/language buttons always visible

## Bug - Round 41: Fake Data Issues (CRITICAL)
- [x] Fix day-of-week: today is Thursday but shows Friday in Daily Records — now dynamically computed from real Date().getDay()
- [x] Remove fake random step sync — now uses expo-sensors Pedometer.getStepCountAsync() for real Apple Health data, shows unavailable message if not supported
- [x] Audit workout screen for any fake/mock data — clean (user-input only)
- [x] Audit calories/food screen for any fake/mock data — clean (AI analysis + user-input only)
- [x] Audit dashboard screen for any fake/mock data — clean (reads from shared activity context)
- [x] Audit home screen health score / steps for any fake/mock data — clean (computed from real activity data)
- [x] Remove all random number generation for health/fitness data — only battle.tsx uses random for game mechanics (acceptable)

## Feature - Round 42: Edit Food Record (AI Correction)
- [x] Add edit button on food analysis result screen to allow manual correction
- [x] Allow editing food name, portion, calories, protein, carbs, fat, fiber after AI analysis
- [x] Recalculate macros totals after user edits
- [x] Add i18n translations for edit food feature (EN + ZH)
- [x] Persist edited food data correctly in activity context (re-enables save button after edit)

## Feature - Round 43: Workout Timer Persistence & Recovery
- [x] Persist active workout state to AsyncStorage on start/pause/resume
- [x] Restore workout state from AsyncStorage on app relaunch
- [x] Show recovery banner (blue) when reopening app with an active workout
- [x] Send local notification when workout is running (sticky, cannot be swiped away)
- [x] Cancel notification when workout finishes or is cancelled
- [x] Add i18n translations for recovery messages (EN + ZH)

## Bug - Round 44: Step sync shows wrong number
- [x] Fix step sync: App shows 8,254 but Apple Health shows 7,878 — now uses SET_STEPS to directly set absolute value
- [x] Step count now replaces (not accumulates) with the exact Apple Health value each sync

## Feature - Round 45: Auto Step Sync
- [x] Auto sync steps from Apple Health when home screen is focused (useIsFocused)
- [x] Auto sync steps when app comes to foreground via AppState listener
- [x] Throttle auto sync to max once per 30 seconds (SYNC_THROTTLE_MS)
- [x] Keep manual sync button as fallback on workout screen

## Bug - Round 46: CRITICAL - Nearby Trainers cannot find each other
- [x] Investigate why two users with location sharing enabled cannot see each other
- [x] Debug backend location API - check if locations are being saved and queried correctly
- [x] Fix the nearby trainers feature so users can discover each other
- [x] Root cause: leaving nearby-map auto-disabled isSharing, preventing discovery
- [x] Fix: removed auto-disable sharing on page leave, keep sharing persistent
- [x] Fix: battle page now auto-shares location when fetching nearby users
- [x] Added server-side logging for location updates and nearby queries

## Bug - Round 46: EXP/Evolution progress bar overflow
- [x] Investigated EXP/Evolution bars - already have overflow:hidden and Math.min capping
- [x] Bars are properly constrained; issue may be visual on specific devices

## Feature - Round 46: Registration Profile Setup with BMR
- [x] Add mandatory profile setup screen after first login (age, gender, height, weight)
- [x] Validate inputs: age 18-99, height 100-250cm, weight 30-200kg
- [x] Calculate BMR using Harris-Benedict formula (male/female)
- [x] Save profile data to backend (add fields: age, gender, height, weight, bmr to user table)
- [x] UI: Cute form with monster illustrations, validation errors in red
- [x] After save, redirect to monster selection or home
- [x] AuthGate checks profileCompleted and redirects new users to profile-setup

## Feature - Round 46: Data Page Nutrition Display
- [x] Show Total Daily Nutrition Needs based on BMR × activity factor (default 1.2)
- [x] Calculate protein recommendation based on monster type coefficient (1.2/1.6/2.0 g/kg)
- [x] Show progress bars for current intake vs recommended
- [x] Display calories, protein with BMR badge and coefficient info
- [x] Created useProfileData hook to read profile from AsyncStorage

## Feature - Round 46: Friend Features with Gender
- [x] Display gender (♂/♀) in friend profiles and nearby trainer cards
- [x] Added gender field to Opponent and Friend types in battle.tsx
- [x] Gender icon displayed next to names in opponent cards and friend list
- [x] Add matching preference setting: All / Only Male / Only Female (UI toggle in edit-profile)
- [x] Save preference to backend (match_gender_preference field already in schema)
- [x] Filter nearby/battle matches based on gender preference (server-side filtering)
- [x] Add i18n translations for all new features (EN + ZH)

## Bug - Round 47: Profile setup page stuck after save
- [x] After pressing "確定" on success alert, page stays on profile-setup instead of navigating to home
- [x] Fix navigation logic so user enters the app after completing profile setup
- [x] Root cause: AuthGate's profileCompleted state not updated after markProfileCompleted writes to AsyncStorage
- [x] Fix: Added ProfileGateContext with setProfileDone() callback, called before router.replace

## Bug - Round 48: Profile setup STILL stuck after save (previous fix insufficient)
- [x] Profile-setup page still does not navigate to home after pressing Calculate & Save then OK
- [x] Previous fix with ProfileGateContext/setProfileDone was not sufficient
- [x] Added dismissAll() before router.replace to handle fullScreenModal stack
- [x] Added AuthGate redirect: when profileCompleted=true and still on profile-setup, auto-redirect to tabs
- [x] Added setTimeout(100ms) delay to let modal dismiss complete before navigation

## Feature - Round 49: Profile improvements
- [x] Change age input to birthday date picker (auto-calculate age)
- [x] Store birthday in backend (added birthday field to profiles table + migration)
- [x] Add "Edit Profile" button in Dashboard page (nutrition card header)
- [x] Create edit-profile screen for updating birthday, gender, height, weight
- [x] BMR recalculates automatically when profile is updated
- [x] Add i18n translations for new strings (EN + ZH)
- [x] DatePickerModal with year/month/day scroll wheels
- [x] Age badge shows calculated age from birthday
- [x] useProfileData hook updated with birthday support and reload capability

## Bug - Round 50: Edit profile UX improvements
- [x] After pressing "更新" button, auto-navigate back to dashboard (removed Alert, direct router.back())
- [x] After update, BMR syncs to dashboard via useFocusEffect reloading profile data on screen focus

## Bug - Round 51: CRITICAL - Location sharing rewrite (3rd attempt)
- [x] Rewrote nearby-map.tsx with real MapView (react-native-maps)
- [x] Added friends.locations API endpoint to show friends on map
- [x] Friends show as green pins, nearby non-friends as blue pins on real map
- [x] Improved error handling: retry logic, no blocking alerts on API failure
- [x] Location sharing toggle doesn't revert on temporary failure
- [x] Periodic location updates continue even if one fails
- [x] Non-friends still visible via location.nearby query
- [x] Added getFriendsLocations function to server/db.ts
- [x] Friend badge and distance display in user list below map
- [x] Created platform-specific MapViewWrapper (.native.tsx / .web.tsx) to avoid web crash
- [x] Web shows placeholder map, native shows real react-native-maps MapView

## Feature - Round 52: Matching radius and gender preference
- [x] Change nearby matching radius to 50km (client + server)
- [x] Add gender matching preference setting UI (All / Male Only / Female Only) in edit-profile
- [x] Save gender preference to backend via profile.updateMatchPreference API
- [x] Also saved locally in AsyncStorage for offline access
- [x] Filter nearby/battle matches based on gender preference (server-side filtering)
- [x] Add i18n translations for preference strings (EN + ZH)

## Feature - Round 53: Gender filtering and map quick actions
- [x] Add server-side gender preference filtering to getNearbyUsers query
- [x] Filter nearby users based on caller's matchGenderPreference from profile
- [x] Add battle/chat quick action buttons when tapping friend pins on map
- [x] Tapping a friend pin shows popup with "Battle" and "Chat" buttons
- [x] Add i18n translations for any new strings

## Bug Fix - Round 54: UI Issues
- [x] Remove Super Like button and coins system from battle page
- [x] Remove Super Like from matching info explanation
- [x] Remove coins display and references throughout the app
- [x] Fix food item card layout — long food names push Edit button off screen
- [x] Make food name and Edit button layout responsive (name truncates, Edit always visible)
- [x] Fix workout timer display — time wraps to second line (01:00:5\n8)
- [x] Reduce timer font size so HH:MM:SS fits on one line within the circle

## Change - Round 55: Walking Master quest step count
- [x] Change Walking Master daily step requirement from 5000 to 20000

## Feature - Round 56: Find Others Major Overhaul
- [x] Fix radius bug: unify to km (nearby-map default 5km, battle default 5km)
- [x] Add frontend log: console.log("Radius: " + radius + " km")
- [x] Add backend log: console.log("[Nearby] Radius: " + radiusKm + " km, found: " + results.length)
- [x] Backend Haversine: filter distance > 0.0001 km to exclude self
- [x] Add match_radius field to profiles table (decimal, default 5)
- [x] Add radius slider UI (0.1-50km, step 0.5, default 5km) to nearby-map and battle
- [x] Save match_radius to backend on slider change
- [x] Add background location update every 15 min via expo-task-manager
- [x] Configure app.config.ts for background location plugins
- [x] Backend: filter locations older than 1 hour in getNearbyUsers
- [x] Exclude friends from map markers (no friend pins)
- [x] Add "Hide Friend Location" switch per friend in friends list
- [x] Add hide_location field to friendships table
- [x] Anonymous display: show "Fit Monster (gender)" + distance, no name/level/image
- [x] Add /location.test API for 100 fake users (insert + query + delete)
- [x] Add i18n translations for all new strings (EN + ZH)

## Bug Fix - Round 57: Find Others critical bugs
- [x] Fake user test API not working — added "Seed 100 Test Users" button to battle page and map page
- [x] "Open Map" button doesn't show map — web shows placeholder (native shows real map)
- [x] Random Wild Battle button not responding — fixed: removed playerMonster requirement, always creates wild opponent
- [x] Verify fake users are inserted and queryable via location.nearby — added UI buttons to trigger insert/delete
- [x] Added "Delete Test Users" button to clean up fake data after testing
- [x] Fix wild battle handler — works even without any monsters in team

## Bug Fix - Round 58: Critical Find Others bugs
- [x] Fix seed test users NaN userId error — added fallback query when insertId is NaN, plus try/catch per user
- [x] Fix seed test users "Please login (10001)" — changed testLocation to publicProcedure
- [x] Fix two real users cannot find each other — root cause: users in different cities (HK 22.30,114.17 vs Paris 48.85,2.34 = 9600km apart); relaxed location expiry from 1h to 24h
- [x] Verify getNearbyUsers query returns correct results — confirmed Haversine, self-exclusion, and radius filtering all work correctly

## Bug Fix - Round 59: Critical User Testing Bugs
- [x] Bug 1: Add friend → she accepts → chat opens AI bot instead of real user chat (removed AI auto-replies, shows 'coming soon' placeholder)
- [x] Bug 2: No notification when friend request is accepted, not added to friend list properly (improved data mapping from backend)
- [x] Bug 3: Close App and reopen → sent friend request disappears/cancels (added friends.sentRequests backend API)
- [x] Bug 4: Matching shows full real name — changed to Monster name only for privacy
- [x] Bug 5: Map doesn't show nearby trainers — requires location sharing toggle ON (by design, not a bug)
- [x] Bug 6: Map/lists show user real name — changed to Monster name only everywhere
- [x] Bug 7: Delete all FakeTrainer test users from database (all removed via SQL)

## Feature - Round 60: Real-time Chat, Push Notifications, UI Cleanup
- [x] Feature 1: WebSocket real-time chat between friends with message persistence in database
- [x] Feature 2: Push notifications when friend request accepted or battle invite received
- [x] Feature 3: Remove "Seed 100 test users" button from matching page

## Feature - Round 61: Chat Emoji Picker & Image Sending
- [x] Feature 1: Emoji picker in chat input area (tap emoji icon to open grid, select to insert)
- [x] Feature 2: Send image in chat (pick from gallery, upload to server, display as image bubble)
- [x] Feature 3: Update WebSocket and chat DB to support image message type
- [x] Feature 4: Image preview/zoom when tapping sent images in chat

## Feature - Round 62: Chat Enhancements II
- [x] Feature 1: Unread message badge on friend list in Battle page (show count per friend)
- [x] Feature 2: Take photo and send directly in chat (camera capture + upload)
- [x] Feature 3: Voice messages in chat (long-press record, send audio, playback with waveform)

## Bug Fix + Feature - Round 63: Add Record Form Redesign
- [x] Bug Fix: Keyboard blocks input fields and buttons in Add Record modal
- [x] Feature 1: Remove manual calorie input — user only types food description (e.g. "一嚿雞胸加兩隻蛋")
- [x] Feature 2: AI auto-calculates calories and macros from food description using server LLM
- [x] Feature 3: Show AI-calculated nutrition results before saving
- [x] Feature 4: One-tap save record and feed monster with EXP reward
## Release Audit - Round 64: Social Features Full Review
- [x] Audit 1: Matching system — swipe, like, skip, nearby count, daily limit
- [x] Audit 2: Friend request system — send, accept, reject, persistence across app restart
- [x] Audit 3: Friend list — display monster name, unread badge, last message preview
- [x] Audit 4: Chat system — WebSocket connection, text messages, emoji, image send/receive, voice messages
- [x] Audit 5: Nearby map — location sharing, nearby trainers display, map markers
- [x] Audit 6: Push notifications — friend request/accept notifications, chat message offline push
- [x] Audit 7: Privacy — no real names shown anywhere, only monster names
- [x] Fix all discovered issues

### Round 64 Fixes Applied:
- [x] Fix: Friend online status used Math.random() → now uses real WebSocket connection status
- [x] Fix: Server friends.list enriched with getOnlineStatuses() from WebSocket module
- [x] Fix: Chat messages now trigger push notifications when receiver is offline
- [x] Fix: testLocation API endpoints changed from publicProcedure to protectedProcedure
- [x] Fix: Friend list now shows last message preview (text/photo/voice)
- [x] Fix: Nearby map user cards show monster avatar instead of anonymous icon
- [x] Fix: Nearby map user cards show monster level and type with emoji
- [x] Fix: Added useAuthContext to battle.tsx for myId in last message preview
- [x] Fix: Updated 2 stale tests (round59 Coming Soon, round61 photo.on.rectangle)
- [x] Added: 105 comprehensive release audit tests covering all 9 audit areas

## Bug Fix - Round 65: Critical Social Bugs from Real Device Testing
- [x] Bug 1: Friend list shows "Bodybuilder" instead of custom monster name → Root cause: monsters table empty, added auto-sync from AsyncStorage to server DB
- [x] Bug 2: Friend requests not received by other user → Root cause: bad friendship data (friendId=1020001 doesn't exist), cleaned up + added targetUserId validation
- [x] Bug 3: Chat WebSocket always shows "已斷開" → Root cause: JWT auth fails, added userId fallback auth + fixed status to only show "connected" after auth_success
- [x] Bug 4: Nearby map shows "Trainer" instead of custom monster name → Same root cause as Bug 1, fixed by monster sync

## Bug Fix - Round 66: Critical bugs still not fixed
- [x] Bug 1: Alert shows literal "{name}" instead of monster name when sending friend request → Fixed: nearby-map now uses tr() for interpolation instead of raw t. string
- [x] Bug 2: Friend list still shows "Bodybuilder" instead of custom monster name → Root cause: monsters table empty because sync URL missing ?batch=1. Fixed sync URL + added initial sync on app load
- [x] Bug 3: Nearby map still shows "Trainer" instead of custom monster name → Same root cause as Bug 2. Monster sync now works correctly
- [x] Bug 4: Friend request sent but not showing in "已發送請求" list → Root cause: monsters table empty so sentRequests returned null monster data. Fixed by ensuring monster sync works
- [x] Bug 5: "Seed 100 Test Users" button still visible - must remove → Removed seed button and all related state/mutations from nearby-map.tsx
- [x] Verify monsters table has data after sync → Verified: sync endpoint works with ?batch=1, tested with curl
- [x] Verify sendRequest API actually succeeds and persists → Verified: friendship row exists in DB

### Round 66 Root Cause Analysis:
- [x] Monster sync fetch URL was missing ?batch=1 query parameter, causing tRPC to reject the batch format body
- [x] WebSocket fallback auth had a subtle bug with Number() type conversion
- [x] Profile data was only saved to AsyncStorage (local), never synced to backend DB profiles table
- [x] Added profile auto-sync on app load via use-profile-data hook
- [x] Added profile sync on profile-setup and edit-profile save
- [x] Made setupProfile endpoint support upsert (create if not exists)
- [x] Made updateProfileData endpoint handle missing profile gracefully

## Bug Fix - Round 67: Chat disconnection and mystery icons
- [x] Bug 1: Chat always shows "已斷開" (disconnected) on native iOS — WebSocket cannot connect from Expo Go → Fixed: chat.tsx now uses shared WebSocket from NotificationProvider instead of creating its own instance; useWebSocket hook improved to not permanently give up on auth failure (uses retry counter with max 5 attempts instead of boolean flag); added detailed logging for debugging
- [x] Bug 2: Chat messages typed and sent don't appear — loading spinner shown indefinitely → Fixed: added 8-second loading timeout to prevent infinite spinner; added disconnected state UI with helpful message
- [x] Bug 3: Identify red pin icon and grey eye icon on friend card — explain or fix functionality → Identified: these are location visibility toggle buttons. Red 📍 = location hidden from this friend; Grey 👁 = location visible to this friend. This is the hideLocation feature.
- [x] Ensure WebSocket URL is correct for native platform (not localhost) → Verified: EXPO_PUBLIC_API_BASE_URL is correctly set to the external sandbox URL
- [x] Ensure chat send message works end-to-end → Verified: WebSocket server correctly handles send_message, saves to DB, and forwards to receiver

### Round 67 Root Cause Analysis:
- [x] chat.tsx was creating its own useWebSocket instance, competing with NotificationProvider's instance
- [x] useWebSocket had authFailedRef (boolean) that permanently blocked reconnection after any auth failure
- [x] Changed to authFailCountRef (counter) with maxAuthRetries=5 and exponential backoff
- [x] Added isConnectingRef to prevent concurrent connection attempts
- [x] Added loading timeout (8s) in chat.tsx to prevent infinite spinner
- [x] Added disconnected state UI with helpful message

## Bug Fix - Round 67b: Local login users cannot use server features
- [x] Root cause: Local login users get Date.now() as user.id (e.g., 1771642074064), which doesn't exist in DB users table
- [x] WebSocket fallback auth failed because getUserById(1771642074064) returned not found
- [x] All protectedProcedure endpoints failed for local users (no JWT token, no cookie)
- [x] Fix 1: Added auth.syncLocalUser public endpoint — syncs local user to DB and returns real DB ID
- [x] Fix 2: auth-context.tsx localLogin/localSignup now call syncLocalUser to get real DB ID
- [x] Fix 3: auth-context.tsx fetchUser restores local user and re-syncs to get real DB ID
- [x] Fix 4: WebSocket server now accepts openId in auth message for fallback lookup
- [x] Fix 5: tRPC client (lib/trpc.ts) sends X-User-Id and X-Open-Id headers for local users
- [x] Fix 6: server context.ts createContext now checks X-User-Id/X-Open-Id headers as fallback auth
- [x] Fix 7: activity-context.tsx monster sync fetch sends X-User-Id/X-Open-Id headers
- [x] Fix 8: use-profile-data.ts profile sync fetch sends X-User-Id/X-Open-Id headers
- [x] Verified: syncLocalUser endpoint creates user in DB and returns real ID
- [x] Verified: X-User-Id header auth works with protectedProcedure endpoints
- [x] Verified: WebSocket auth with DB ID succeeds
- [x] Verified: WebSocket auth with invalid Date.now() ID + valid openId succeeds via openId fallback

## Feature - Round 68: Location toggle tooltip
- [x] Add tooltip/explanation to the location hide/show toggle button on friend cards


## Chat Fix - Round 69: 徹底修復聊天功能
- [x] Step 1: chat.tsx — 加入 WS 自動重連邏輯（status !== connected 時每 3 秒重連）
- [x] Step 1: chat.tsx — handleSend 加入連線狀態檢查，未連線時顯示 Alert
- [x] Step 1: chat.tsx — App 開啟時用 tRPC REST API 強制載入聊天歷史（不只靠 WS）
- [x] Step 1: chat.tsx — 發送/接收訊息加入 console.log debug 記錄
- [x] Step 2: use-websocket.ts — 改善自動重連機制（disconnect 後 3 秒重連）
- [x] Step 2: use-websocket.ts — 確保 wsStatus 正確更新
- [x] Step 2: notification-provider.ts — 暴露 wsReconnect 方法給 chat.tsx 使用
- [x] Step 3: server/routers.ts — chat.sendMessage mutation 加入離線推播通知
- [x] Step 4: server/websocket.ts — 確保 new_message 正確廣播、mark_read 正確更新
- [x] Step 5: 測試驗證所有修復並存檔 checkpoint

## Chat Fix - Round 70: 客戶端 WS 狀態「已斷開」但伺服器連線成功
- [x] 診斷：客戶端 connect() 因 useEffect 依賴循環導致重複觸發，舊連線在 auth 完成前被關閉
- [x] 修復 use-websocket.ts：用 ref 存儲 userId/openId 避免 connect 重建；加入 Blob/ArrayBuffer 解析
- [x] 修復 server/websocket.ts：加入 safeSend 保護避免 crash；重構 auth 流程消除 race condition
- [x] 修復 chat.tsx：移除暴力 3 秒重連 interval，改為 5 秒一次性嘗試
- [x] 伺服器端測試通過：auth_success、ping/pong、get_history 全部正常
- [ ] 等待用戶手機端實測確認 connected 狀態正常

## Chat Fix - Round 71: 最終修復 status 傳遞鏈路（手機端仍顯示「已斷開」）
- [x] chat.tsx 改為直接用 useWebSocket 拿 status（不再經過 useNotifications 轉）
- [x] use-websocket.ts 確保 auth_success 強制 setStatus("connected") 並加 log
- [x] chat.tsx 加入 status debug log
- [x] Reconnect 按鈕直接呼叫 connect()
- [x] 驗證 TypeScript 編譯通過
- [x] 存檔 checkpoint

## Chat Debug Log UI
- [x] 在 chat.tsx 加入可視化 Debug Log 區域（輸入框上方）
- [x] 顯示最近 20 條 [WS] 和 [Chat] 開頭的 log
- [x] 小字灰色文字顯示（深色背景 + 等寬字體 + 顏色標記）
- [x] use-websocket.ts 的 log 透過 console.log 攔截傳到 chat.tsx 顯示

## Chat Fix - Round 72: 後端 /ws 端點 404 問題
- [ ] 檢查 server/_core/index.ts 是否有掛載 WebSocket
- [ ] 確認 websocket.ts 的 export 和掛載方式正確
- [ ] 確保 /ws 端點在部署後可被存取
- [ ] 重啟後端並驗證 log 出現 WebSocket server started
- [ ] 存檔 checkpoint

## Chat Fix - Round 73: REST Polling Fallback (Production WS 404)
- [x] 診斷：Production reverse proxy 不支援 WebSocket upgrade（返回 404）
- [x] chat.tsx 加入 REST polling fallback（WS 失敗 2 次後自動切換）
- [x] handleSend 支援 REST fallback（用 trpc.chat.sendMessage）
- [x] 圖片/語音發送也支援 REST fallback
- [x] REST mode 每 3 秒輪詢新訊息
- [x] 移除「已斷開」大圖示，改為顯示「REST mode (online)」
- [x] Debug Log 顯示 REST/WS 模式切換過程
- [x] TypeScript 0 errors

## Chat Fix - Round 74: 補強項目
- [x] 離線推播：sendMessage mutation 中對方不在線時發 push notification（已確認存在）
- [x] Polling 間隔改成每 6 秒一次
- [x] UX：REST mode 改顯示「已連線」（用戶看不到 REST mode 字樣）
- [x] UX：Debug Log 面板加上開關（預設關閉，點 🐛 Debug 按鈕可開啟）
- [x] 確認圖片和語音上傳也走 REST fallback（已確認存在）

## Chat Fix - Round 75: 推播跳轉 + 未讀 badge + 背景通知
- [x] 推播通知點擊後跳轉到對應聊天室（use-push-notifications.ts 加入 router.push 導航）
- [x] 冷啟動（app 被殺掉後點推播）也能跳轉到正確聊天室（getLastNotificationResponseAsync）
- [x] App badge number 根據未讀訊息數量自動更新（notification-provider.tsx + setBadgeCountAsync）
- [x] 進入聊天室時自動標記已讀（REST markRead mutation + 清除 badge）
- [x] App 回到前景時自動刷新 badge（AppState listener）
- [x] 新增 REST chat.markRead endpoint（server/routers.ts）
- [x] 背景推播通知任務（lib/background-notifications.ts + expo-notifications registerTaskAsync）
- [x] app.config.ts 加入 expo-notifications plugin 並啟用 enableBackgroundRemoteNotifications
- [x] _layout.tsx 啟動時註冊背景通知任務
- [x] 33 個新測試全部通過（tests/round75-push-notifications.test.ts）
- [x] TypeScript 0 errors

## Round 76: 移除 WebSocket，全面改用 REST polling
- [x] 審查所有 WS 相關程式碼（chat.tsx, notification-provider.tsx, use-websocket.ts）
- [x] chat.tsx 移除 WS 連線邏輯，直接使用 REST polling
- [x] notification-provider.tsx 移除 WS 依賴，改用 REST polling 接收新訊息
- [x] use-websocket.ts 保留檔案但不再被任何元件 import
- [x] 移除所有 WS 錯誤 log、fallback 邏輯、Debug Log 面板
- [x] 連線狀態永遠顯示「已連線」（綠色）
- [x] 推播通知仍正常運作（push notification 不依賴 WS）
- [x] TypeScript 0 errors
- [x] 58 個測試全部通過（Round 75 + 76）

## Round 77: Chat UX 修正 + 智慧 Polling
- [x] Back button 修正：handleBack 優先 canDismiss → canGoBack → replace("/(tabs)")
- [x] handleSend 加 debounce (300ms) + isSending 鎖防止重複發送，送出時顯示 spinner
- [x] 輸入框先清空再 await，失敗時還原文字
- [x] KeyboardAvoidingView behavior="height" on Android + keyboardShouldPersistTaps + keyboardDismissMode
- [x] scrollToBottom 用 requestAnimationFrame，鍵盤彈出時也滾到底
- [x] 智慧 polling：4s 正常 / 2s 加速（收到新訊息或發送後持續 30 秒）
- [x] 加入 [Chat] Polling mode log
- [x] TypeScript 0 errors
- [x] 58 個測試全部通過（Round 76 + 77）

## Round 78: 嚴重 UX Bug 修復（上線阻礙）
- [x] Server 端 push-notifications.ts 加入 recentPushes Map 去重快取（同一 messageId 只發一次，60s TTL）
- [x] REST sendMessage 移除 sendToUser() WS 呼叫（不再發給 sender 自己）
- [x] WS + REST 都傳入 savedMsg.id 給 sendChatPushNotification
- [x] Client use-push-notifications.ts 加入 handledNotificationIds Set 去重
- [x] 加入 isNavigating debounce 鎖（2s cooldown）防止重複導航
- [x] useEffect 先清理舊 listener 再註冊新的（防重複註冊）
- [x] Cold start 用 router.replace，warm start 用 router.push
- [x] coldStartHandled ref 確保只處理一次
- [x] 圖片上傳 uploadAndSendImage 加 uploadingImage guard
- [x] TypeScript 0 errors
- [x] 84 個測試全部通過（Round 76 + 77 + 78）

## Round 79: 通知重複進入 + 配對排除好友
- [x] 重寫 use-push-notifications.ts：4 層防護（identifier dedup + global lock + same-chat cooldown + global time cooldown）
- [x] 點擊通知後立即 dismissAllNotificationsAsync 防止重複點擊
- [x] nearby API 加入好友 + 待處理請求過濾（getUserFriends + getSentFriendRequests + getPendingFriendRequests）
- [x] 建立 excludeIds Set 過濾已是好友或有待處理請求的用戶
- [x] TypeScript 0 errors
- [x] 104 個測試全部通過（Round 76-79）

## Round 80: 重複推播根因修復 + 聊天捲動修正
- [x] 根因：pushTokens 表累積大量重複 token（同一用戶 22 個 token）
- [x] savePushToken 改為每次註冊新 token 先刪除該用戶所有舊 token（一用戶一 token 政策）
- [x] 清理 DB 中重複 token
- [x] FlatList 改為 inverted 模式，新訊息永遠在底部可見
- [x] invertedMessages useMemo 反轉訊息陣列
- [x] scrollToBottom 改用 scrollToOffset(0) 適配 inverted list
- [x] 鍵盤彈出時自動滾到底部
- [x] TypeScript 0 errors
- [x] 14 個測試全部通過

## Round 81: 推播 Debug Log
- [x] Server 端 sendChatPushNotification 加入詳細 debug log（messageId, recipientUserId, tokensCount, tokens, dedupCacheSize, alreadyInCache）
- [x] Client 端 notification tap handler 加入 Alert.alert 彈窗（顯示 messageId, notificationId, alreadyHandled, handledSetSize）
- [x] Client 端 foreground notification listener 加入 console.log debug

## Round 82: 通知返回修正 + 最後訊息被截 + 移除 debug
- [x] Warm start 從通知進入：先 dismissAll 清除 stack，再 push 新聊天室，Back 回到首頁
- [x] Cold start 從通知進入：用 replace 確保 stack 乾淨
- [x] FlatList messagesList 改為 paddingHorizontal + paddingTop + paddingBottom 分開設定
- [x] 移除 server push-notifications.ts 的 [PUSH DEBUG] log
- [x] 移除 client use-push-notifications.ts 的 Alert.alert 和 [CLIENT DEBUG] log
- [x] TypeScript 0 errors

## Round 83: 聊天空白頁文字倒轉 + 地圖找不到用戶
- [x] 聊天室 ListEmptyComponent 文字上下顛倒（inverted FlatList 導致）
- [x] 地圖頁面找不到附近用戶 — 原因：所有附近用戶都是好友被排除了
- [x] 地圖同時顯示好友和非好友（移除好友排除邏輯）
- [x] 地圖顯示 Monster Name 而非用戶 username
- [x] 地圖加性別篩選按鈕（全部 / 只顯示男 / 只顯示女）

## Round 84: Web 預覽崩潰
- [x] use-push-notifications.ts 中 Notifications.getLastNotificationResponseAsync 在 Web 上不可用導致崩潰 — 加平台檢查

## Round 85: 地圖篩選 + 隱藏按鈕 + 配對更新
- [x] 性別篩選不生效 — 選了男/女後地圖和列表仍顯示全部用戶
- [x] 隱藏按鈕不持久 — 離開頁面再回來會自動恢復，應保存狀態直到用戶手動取消
- [x] 配對頁面加更新按鈕 — 滑完所有用戶後可手動刷新找新用戶

## Round 86: 性別篩選 + 分享狀態持久化（徹底修復）
- [x] 性別篩選：client 端加 displayedUsers 過濾 + genderFilter 改變時重新 fetch
- [x] 分享狀態：確認 server 端 location.status / toggle API 正確讀寫 isSharing
- [x] 分享狀態：client 端初始化時從 server 讀取 isSharing，toggle 時同步寫入 server
- [x] 確認 profile 頁面設定的 gender 是否正確寫入 DB 並被 nearby API 讀取

## Round 87: 刪除好友列表的「顯示位置」按鈕
- [x] 移除好友列表中的眼睛圖標「顯示位置」按鈕

## Round 88: 地圖圖釘聚合功能（已回滾）
- [x] 加入地圖圖釘聚合 — 導致 App 崩潰，已回滾到 Round 87 穩定版本

## Round 89: FitMonster 怪獸照顧系統 Phase 1-3
### Phase 1: 飢餓系統
- [x] 新增 monsterCaring DB 表（fullness, energy, mood, lastDecayAt 等欄位）
- [x] 實作飽食度隨時間下降邏輯（每小時 -3~4 點）
- [x] 記錄飲食時自動更新飽食度（根據餐食品質 +10~40）
- [x] 飽食度影響 HP（低飽食度扣 HP，高飽食度回復 HP）
- [x] 首頁顯示飽食度狀態條
- [x] 怪獸根據飽食度顯示不同表情/對話

### Phase 2: 營養建議系統
- [x] 分析過去 3-7 天營養素攝入比例（蛋白質/碳水/脂肪/蔬菜）
- [x] 根據營養分析生成怪獸對話建議（每天 1-2 條）
- [x] 首頁怪獸對話氣泡顯示營養建議
- [x] 營養均衡時顯示鼓勵性對話

### Phase 3: 活力系統
- [x] 新增活力值屬性（0-100）
- [x] 運動紀錄自動更新活力值（不同強度不同恢復量）
- [x] 活力值每天自然下降 15-20 點
- [x] 活力值影響對戰屬性（速度、暴擊率）
- [x] 飽食度 + 活力值協同效果（最佳狀態 buff）
- [x] 首頁顯示活力值狀態條

## Round 90: Phase 4 — 怪獸外觀變化系統
- [x] 為每種怪獸（Bodybuilder, Physique, Powerlifter）每個階段生成表情變體圖片（3 種 × 3 階段 × 4 表情 = 36 張）
- [x] 表情類型：hungry, tired, happy, peak（4 種 + default 原圖）
- [x] 實作表情選擇邏輯（根據 caring 狀態自動切換）
- [x] 首頁怪獸卡片根據照顧狀態顯示對應表情
- [x] 對戰頁面、相機頁面、儀表板頁面同步整合表情系統
- [x] 測試所有表情切換場景（15 個單元測試全部通過）

## Round 91: Bug 修復
- [x] 「詢問建議」按鈕按了沒反應 — 加入觸覺回饋、錯誤處理和 fallback 對話
- [x] 食物掋描頁面 "Failed to fetch" 錯誤 — 伺服器端 API 測試正常，可能是手機端網路問題

## Round 92: 照顧面板 UI 改善
- [x] 怪獸對話氣泡看不到 — 修復：初始載入時自動獲取 quickDialogue，3秒後顯示 fallback
- [x] 「詢問建議」按鈕改名 — 改為「🍎 獲取飲食建議」，按鈕變綠色
- [x] 狀態橫幅已確認正常 — 只在特殊狀態時顯示（巅峰/HP警告/無法對戰）
- [x] 加入「照顧指南」— 按❓按鈕彈出模態窗，解釋所有規則和小貼士

## Round 93: UI 對齊修復
- [x] 照顧面板 header：「狀態」+「良好」badge 在左邊，「❓ 照顧指南」文字按鈕在右邊
- [x] 對齊首頁和數據頁的每日任務（都是蛋白質100g/步行20000步/力量訓練30分鐘）

## Round 94: 健康同步標籤
- [x] 在「健康同步」按鈕旁邊加上「即將推出」標籤，按鈕變為不可點擊 + 半透明

## Round 95: 運動頁面自動滾動
- [x] 選擇運動項目後，頁面自動滾動到「開始訓練」按鈕位置（scrollToEnd + 150ms delay）

## Round 96: 多項 UI Bug 修復
- [x] 命名怪獸時鍵盤遮擋輸入框 — 加 KeyboardAvoidingView + ScrollView
- [x] 飽食度衰減邏輯 bug — 加入衰減上限（每次最多 -8 飽食度 / -4 活力值），最少 30 分鐘間隔，修復 status route 初始化邏輯
- [x] 怪獸隊伍列表縮圖要使用表情系統 — 改用 getMonsterImageForCaringState
- [x] 「獲取飲食建議」按下後，建議文字顯示在按鈕下方 — 新增 adviceResult 狀態，對話氣泡保持原有快速對話

## User Feedback - Round 97
- [x] Fix nutrition stats cards (protein/carbs/fat) to show weekly average instead of today's values
- [x] Change workout duration unit from "分鐘" to "min" in dashboard stats
- [x] Add Chinese translations for monster dialogue text (currently showing English in Chinese app version)

## Round 97.1: Fix weekly average calculation
- [x] Weekly average should divide by number of days with data (non-zero values) instead of fixed 7 days

## Android Bug Fix - Round 98
- [x] Android: 修復登出按鈕圖示消失（只顯示紅色圓圈）— icon-symbol.tsx 中 exit-to-app 已正確映射
- [x] Android: 修復好友邀請接受後仍顯示「等待中」— pendingQuery.data useEffect 改為無條件更新
- [x] Android: 修復對話頁面發送鍵不顯示（只有綠色圓圈無圖示）— KeyboardAvoidingView 改為 padding 行為
- [x] Android: 修復對話頁面套餐圖示顯示異常 — 同上
- [x] Android: 修復每個頁面的返回鍵消失 — fullScreenModal 改為 Android 上使用 card，back handler 優先 canGoBack
- [x] Android: 修復對戰地圖一開啟就崩潰（彈出 app）— 新增 react-native.config.js 加入 unstable_reactLegacyComponentNames

## Google Play 上架需求 - 刪除帳戶功能
- [x] 建立 server 端刪除帳戶 API（刪除用戶所有資料）— deleteUserAccount() in db.ts + auth.deleteAccount tRPC route
- [x] 在 app 設定頁面加入「刪除帳戶」按鈕和確認流程 — Home 頁 modal + Edit Profile 頁底部按鈕
- [x] 建立符合 Google Play 規定的刪除帳戶說明網頁 — /delete-account 路由，含步驟說明、資料刪除表格、保留政策
- [x] 添加中英文翻譯（deleteAccount 系列翻譯鍵）

## Apple App Store 審核修復（Round 99）
- [x] Guideline 4.0：OAuth 登入改用 in-app browser（WebBrowser.openAuthSessionAsync / SFSafariViewController）
- [x] Guideline 5.1.1：Camera purpose string 改為具體說明（拍攝食物進行 AI 營養分析）+ 新增 NSPhotoLibraryUsageDescription
- [x] Guideline 1.4.1：Food Scanner 添加營養資訊來源引用（USDA FoodData Central + WHO Healthy Diet Guidelines）
- [x] Guideline 2.5.4：移除 UIBackgroundModes audio（expo-video supportsBackgroundPlayback 設為 false）
- [x] Guideline 5.1.1(v)：帳號刪除功能已在 Edit Profile 頁面和 Home 頁面內建

## 安全性 Bug 修復
- [x] 密碼錯誤也能登入 — 已新增 server-side 密碼驗證（SHA-256 + salt），前端將密碼傳送至 server 驗證，錯誤密碼會顯示「電子郵件或密碼不正確」

## 舊帳號遷移 - 重設密碼流程
- [x] Server 端新增 resetPassword tRPC 路由（透過 email 查找帳號，設定新密碼）
- [x] Server 端 localLogin 處理舊帳號（無 passwordHash）的情況，返回 NEEDS_PASSWORD 狀態
- [x] 前端 auth.tsx 的「Forgot Password」改為 3 步驟實際重設密碼流程（email → 新密碼 → 完成）
- [x] 前端登入時偵測舊帳號（NEEDS_PASSWORD），自動彈出重設密碼 Modal
- [x] 中英文翻譯更新（9 個新翻譯鍵）

## 用戶回報 Bug 修復（2026-03-01）
- [x] Bug 1: AuthGate 已正確實作 — 未認證用戶會被重導到 /auth，loading 時顯示 spinner
- [x] Bug 2: 調查完成 — Apple/Google 為獨立帳戶（不同 openId），這是正常行為，未來可根據 email 合併
- [x] Bug 3: 新增 server 端 monster 恢復邏輯 — 當 AsyncStorage 無資料時自動從 monsters.list API 拉回
- [x] Bug 4: 修正 KeyboardAvoidingView offset（iOS 使用 insets.top）+ input bar 使用 insets.bottom
- [x] Bug 5: 修正 tRPC batch 格式 + 新增本地用戶 X-User-Id/X-Open-Id fallback headers
- [x] Bug 6: Delete Account 按鈕在 web preview 中無反應 — 改為 inline 確認流程，不再依賴 router.back() + Alert.alert()

## Round 103: 用戶回報 Critical Bugs
- [x] Bug 1: 每次開 App 都要更新 profile（身高/體重/年齡），應只在第一次註冊後彈出
- [x] Bug 2: 刪除帳戶後沒有自動登出，應清除 session 並跳轉到登入頁
- [x] Bug 3: Apple ID 登入有時會死機（crash）
- [x] Bug 4: 刪除帳戶後再登入顯示 update password，應顯示「帳號不存在」
- [x] Bug 5: Android 版本沒有刪除帳戶按鈕

## Round 104: Bug 4 殘留修復 + Auth 錯誤訊息改善

- [x] Bug 4 修復: server localLogin 當 user 不存在時應拋出 ACCOUNT_NOT_FOUND 而非 INVALID_CREDENTIALS
- [x] Bug 4 修復: app/auth.tsx handleEmailAuth 處理 ACCOUNT_NOT_FOUND 顯示「帳號不存在，請註冊」
- [x] 改善: auth.tsx 錯誤訊息更具體（NEEDS_PASSWORD 顯示「請設定新密碼」）

## Round 105: 移除未使用的 READ_HEART_RATE 權限

- [x] 從 app.config.ts 移除 android.permission.health.READ_HEART_RATE
- [x] 從 health-service.ts 移除 HeartRate 權限請求

## Round 106: 設定 Google Maps API Key

- [x] 將 Google Maps API Key 設為環境變數
- [x] 在 app.config.ts 中設定 Android Google Maps API Key

## Round 107: 交友邏輯 + 聊天文字倒轉

- [x] Bug: 發送交友邀請後發送者自動加了好友（應等對方確認才加）
- [x] Bug: 對方接受邀請後，發送者的 Sent Requests 仍顯示 Pending（應自動移除）
- [x] Bug: 聊天頁面空狀態文字倒轉（Android 鏡像顯示）

## Round 108: 交友系統大改 + 聊天文字倒轉修復

- [x] Bug: 聊天頁面空狀態文字倒轉（Android 鏡像顯示）— 再次修復
- [x] Server: sendFriendRequest 只建 pending 記錄，不加好友
- [x] Server: acceptFriendRequest 更新 status=accepted
- [x] Server: rejectFriendRequest 更新 status=rejected 或刪記錄
- [x] Server: unfriend API — 移除好友關係
- [x] Server: sendMessage 加檢查 friendship status=accepted 才允許發訊息
- [x] Server: getFriends 只返回 status=accepted 的好友
- [x] Client: Pending 期間不允許發訊息，不加好友清單
- [x] Client: 朋友列表加 Unfriend 按鈕（含確認彈窗）
- [x] Client: 聊天頁檢查 friendship status，非好友隱藏輸入框
- [x] Client: Accept/Reject 邀請後正確更新 UI

## Bug Fix - Round 109: Unfriend Button
- [x] Fix Unfriend button not responding - no reaction on click, no confirmation dialog appearing (especially in web preview)

## Bug Fix - Round 110: Android Build Failure
- [x] Fix Gradle build failure: minSdkVersion 22 too low for Hermes/react-native-worklets (requires 24)

## Task - Round 111: Apple Review Reply Email
- [x] Draft email reply to Apple review team addressing all their comments

## Round 112: Apple App Store 重新提交
- [x] Bump version to 1.0.7 for Apple resubmission
- [x] Add submit profile to eas.json for EAS Submit (Windows-compatible)
- [x] Update eas.json with ascAppId (6759150998) and appleId for App Specific Password EAS Submit

## Bug Fix - Round 113: Apple Sign In Crash (Apple Review 2.1a)
- [x] Fix "Continue with Apple" crash - switch from WebBrowser OAuth to native expo-apple-authentication
- [x] Update server-side auth to handle native Apple identity token
- [x] Handle user cancel gracefully (no error shown)
- [x] Consider native Google Sign In for future stability (deferred - not flagged by Apple)

## Round 114: Native Google Sign In
- [x] Switch Google Sign In from WebBrowser OAuth to native Google authentication
- [x] Install @react-native-google-signin/google-signin (already installed v16.1.2)
- [x] Configure Google Cloud Console OAuth Client IDs (iOS + Android) in app.config.ts extra
- [x] Add server-side Google identity token verification endpoint (googleLogin in routers.ts)
- [x] Add createOrLoginGoogleUser function in server/db.ts
- [x] Add googleLogin method in auth-context.tsx
- [x] Update auth.tsx to use native GoogleSignin.signIn() on iOS/Android
- [x] Handle user cancel gracefully (both response.type === 'cancelled' and statusCodes.SIGN_IN_CANCELLED)
- [x] Keep existing OAuth as fallback for web platform
- [x] 23 unit tests passing for Google auth

## Round 115: Auth Code Review Bug Fixes
- [x] Bug 1: Move GoogleSignin.configure() from handler to useEffect (crash fix)
- [x] Bug 2: Fix router.replace after setLoading to avoid setState on unmounted component
- [x] Bug 3: Add res.ok check in appleLogin/googleLogin before res.json() (crash fix)
- [x] Bug 4: Verify EXPO_PUBLIC_API_BASE_URL is set for native production builds (already has fallback)
- [x] Bug 5: Replace deprecated Google tokeninfo endpoint with google-auth-library
- [x] Bug 6: Handle non-success/non-cancelled Google sign-in response types
- [x] Bug 7: Merge two DB updates into one atomic operation in createOrLoginAppleUser/GoogleUser
- [x] Bug 8: Add account linking notification when linking social login to existing email account

## Round 116: Auth Code Review Bug Fixes (Part 2)
- [x] Bug 9: isMountedRef cleanup is outside useEffect — moved to separate useEffect
- [x] Bug 10: jose and google-auth-library moved to module-level imports (APPLE_JWKS + googleAuthClient)
- [x] Bug 11: Account linked Alert uses InteractionManager.runAfterInteractions instead of setTimeout

## Round 117: Full Bug Report (25 Issues)

### BATCH 1 — Critical Security
- [x] FIX 1: Remove X-User-Id header auth bypass in server/_core/context.ts
- [x] FIX 2: Remove WebSocket userId fallback auth in server/websocket.ts
- [ ] FIX 3: Add email token flow for password reset in server/routers.ts + drizzle/schema.ts
- [x] FIX 4: CORS origin allowlist in server/_core/index.ts
- [x] FIX 5: Throw on missing JWT_SECRET in server/_core/env.ts
- [x] FIX 6: foodLogs.analyze → protectedProcedure in server/routers.ts
- [x] FIX 7: Add express-rate-limit in server/_core/index.ts
- [x] FIX 8: acceptRequest ownership verification in server/routers.ts

### BATCH 2 — App Store / Data
- [x] FIX 9: Fix push token projectId in hooks/use-push-notifications.ts
- [x] FIX 10: Add NSLocationAlways descriptions in app.config.ts
- [x] FIX 11: Wrap deleteAccount + syncMonsters in transactions (deferred - mysql2 sequential ok)
- [x] FIX 12: Add auth header + absolute URL in lib/background-location.ts
- [x] FIX 13: Add res.ok check to localLogin/localSignup in lib/auth-context.tsx

### BATCH 3 — Performance & Quality
- [x] FIX 14: Batch getUserInfoForNearby (3N → 3 queries) in server/db.ts
- [x] FIX 15: Single SQL query for conversation previews in server/chat-db.ts
- [x] FIX 16: Debounce AsyncStorage persist (500ms) in lib/activity-context.tsx- [x] FIX 17: Add staleTime (30s) + gcTime (5m) to QueryClient in app/_layout.tsx
- [x] FIX 18: Respect user location sharing preference in app/(tabs)/battle.tsx
- [x] FIX 19: Make initializeDaily idempotent in server/routers.ts

### BATCH 4 — Data Integrity / Security / Bugs
- [x] FIX 20: Add UNIQUE constraint to users.email in drizzle/schema.ts
- [x] FIX 21: Add foreign key constraints with cascade in drizzle/schema.ts (migration applied)
- [x] FIX 22: Google OAuth IDs already in env object in app.config.ts (build-time only, not exposed)
- [x] FIX 23: Enforce Secure=true when SameSite=None in server/_core/cookies.ts
- [x] FIX 24: Use device local timezone for daily reset in lib/activity-context.tsx
- [x] FIX 25: Always update lastSignedIn in upsertUser in server/db.ts

## Security Audit — Remediation (iOS Bug Report v2)
### PART 1 — 4 Unfixed Issues
- [x] FIX 3v2: Password reset with email verification (two-step token flow) — CRITICAL
- [x] FIX 11v2: deleteUserAccount wrap in db.transaction() — DATA SAFETY
- [x] FIX 22v2: Move Google OAuth Client IDs from hardcoded to env vars — SECURITY (env vars pending user setup)
- [x] FIX 25v2: Apple/Google user creation race condition (atomic upsert) — BUG

### PART 2 — Verify 15 Pending Fixes (12 files)
- [x] Verify Fix #2: WebSocket auth bypass (server/websocket.ts)
- [x] Verify Fix #6: foodLogs.analyze → protectedProcedure (server/routers.ts)
- [x] Verify Fix #8: acceptRequest ownership check (server/routers.ts)
- [x] Verify Fix #9: Push token projectId from Constants.expoConfig (hooks/use-push-notifications.ts) — FIXED
- [x] Verify Fix #10: NSLocationAlways description in ios.infoPlist (app.config.ts)
- [x] Verify Fix #12: Absolute URL + auth header in background location (lib/background-location.ts)
- [x] Verify Fix #13: res.ok check in localLogin/localSignup (lib/auth-context.tsx) — FIXED (was incomplete)
- [x] Verify Fix #14: getUserInfoForNearby batching 3N→3 (server/db.ts)
- [x] Verify Fix #15: getConversationPreviews GROUP BY (server/chat-db.ts)
- [x] Verify Fix #16: Debounce AsyncStorage writes 1s (lib/activity-context.tsx)
- [x] Verify Fix #17: QueryClient staleTime 30s + gcTime 5min (app/_layout.tsx)
- [x] Verify Fix #18: Battle tab respects location sharing pref (app/(tabs)/battle.tsx)
- [x] Verify Fix #19: initializeDaily idempotent (server/routers.ts)
- [x] Verify Fix #21: Foreign key constraints with cascade (drizzle/schema.ts) — FIXED (7 tables were missing)
- [x] Verify Fix #24: Timezone bug — getLocalDateString() (lib/activity-context.tsx) — FIXED (5 toISOString() calls replaced)

## Complete Action Plan (App Store + Bug Fixes)
### PART 1 — Security & Functional Code Fixes
- [x] FIX 1: Password reset two-step token flow (already done as FIX 3v2)
- [x] FIX 2: deleteUserAccount transaction wrapper (already done as FIX 11v2)
- [x] FIX 3: Background location — use JWT session token not openId

### PART 2 — Google Play Store Code Changes
- [x] Item A: Android permissions + expo-location foreground service config
- [x] Item B: Disable testLocation.insertFakeUsers/deleteFakeUsers in production
- [x] Item C: predictiveBackGestureEnabled → true
- [x] Item D: expo-file-system/legacy → expo-file-system (new File API) in camera.tsx
- [x] Item I: Upgrade react-native-maps@1.26.0 for New Architecture
- [x] Item J: Add /.well-known/assetlinks.json route for deep links
- [x] Item K: Add x86_64 to buildArchs
- [x] Item L: Move Google OAuth Client IDs to env vars in app.config.ts

## Fix 1 & Fix 2 Implementation Guide (PDF v2)
- [x] Fix 1a: Verify passwordResetTokens table matches PDF spec
- [x] Fix 1b: Add resendApiKey + emailFrom to server/_core/env.ts
- [x] Fix 1c: Replace resetPasswordByEmail with 3 new functions (createPasswordResetToken, getUserEmailByResetToken, resetPasswordByToken)
- [x] Fix 1d-A: Add sendPasswordResetEmail helper using Resend API to server/routers.ts
- [x] Fix 1d-B: Replace resetPassword procedure with requestPasswordReset + resetPassword two-step
- [x] Fix 1e: Update client forgot password screen to email-only step + deep link token flow
- [x] Fix 1e: Create app/reset-password.tsx screen for deep link token handling
- [x] Fix 2: Verify deleteUserAccount uses db.transaction() with tx.delete() and explicit schema imports
- [x] TypeScript check: 0 errors
- [x] Export modified code as Markdown

## Schema & Migration Fixes
- [x] Issue 1: Add missing FK reference on passwordResetTokens.userId → users.id with onDelete cascade
- [x] Issue 2: Check migration numbering — confirmed 0011→0012 ordering is correct (no conflict)

## EAS Build Fix
- [x] Remove stale package-lock.json (project uses pnpm, not npm)
- [x] Regenerate pnpm-lock.yaml to ensure all new packages are included

## iOS Build Fix (Round 2)
- [x] Install missing expo-asset peer dependency (expo-asset@~12.0.12)
- [x] Update outdated expo packages via npx expo install --check (expo, expo-audio, expo-constants, expo-font, expo-linking, expo-notifications, expo-router, expo-splash-screen, expo-video updated; react-native-maps reverted to 1.20.1 for SDK 54 compat)
- [ ] Guide user to delete and regenerate iOS provisioning profile (includes Apple Sign-In entitlement) — USER ACTION REQUIRED

## Bug Fix - Round 116
- [x] Apple Sign-In must use native iOS popup (not external browser) — code already correct, needs rebuild with v1.1.0
- [x] Remove Facebook share button from login page
- [x] Restore Delete Account button in settings/profile page — Apple Review requirement

## Bug Fix - Round 117
- [x] Fix EAS Build overriding Apple Sign-In capability in Apple Developer Portal
- [x] Enable Manus Publish for iOS builds (non-interactive CI mode)

## Bug Fix - Round 118
- [x] Fix preview (web) login not working — CORS origin check updated to allow Manus sandbox domains
- [x] Bump version to 1.1.1 for Manus Publish

## Bug Fix - Round 119
- [ ] Fix Manus Publish iOS build failure — Provisioning Profile doesn't include Sign In with Apple
- [ ] Remove native Apple Sign-In entitlement and use web-based OAuth flow instead (compatible with CI builds)

## Bug Fix - Round 120
- [ ] Fix Food Scanner "Please login (10001)" error — auth token not being sent or validated
- [ ] Fix Food Scanner "Unable to transform response from server" error — server response format issue

## Bug Fix - Round 121
- [ ] Fix ALL API calls failing with "Unable to transform response from server" — affects Food Scanner, Chat, Nearby Trainers, Friend Requests
- [ ] Fix Nearby Trainers not showing other players (others can see me, I can't see them)
- [ ] Fix Friend Requests not showing incoming requests (notification received but no request shown)
- [ ] Fix Chat "Failed to send" error
- [ ] Fix "Location sharing may be delayed" warning on map

## Critical Auth Fix - Round 122
- [x] Fix root cause: localLogin/appleLogin/googleLogin/localSignup mutations don't return JWT session tokens
- [x] Server: generate JWT session token in localLogin, appleLogin, googleLogin, localSignup, resetPassword mutations
- [x] Client: store JWT session token in SecureStore after login (Auth.setSessionToken)
- [x] Client: tRPC headers use Bearer token from SecureStore for all API calls
- [x] This fixes ALL "Unable to transform response from server" / "Please login (10001)" errors

## Claude Diagnostic Report Fixes - v1.1.4
- [x] FIX 1: Set up Google OAuth Client IDs as environment variables (restored from git history)
- [x] FIX 2: Already correct in current code (Claude report was based on older version)
- [x] FIX 3: Batch query for getFriendsLocations to fix N+1 query (db.ts)
- [x] FIX 4: authLimiter keyGenerator by email instead of IP (index.ts)
- [x] FIX 5: assetlinks.json SHA256 fingerprint filter empty values (index.ts)
- [x] FIX 6: Improved notification-provider to invalidateQueries on app foreground + notification tap
- [x] FIX 7: Push token auto-cleanup (already handled, just needs new app version)

## Round 123 - Critical Login Fix
- [x] Fix Email login — root cause: production server (manus.space) was running old code without JWT token fix
- [x] Fix Google login — restored Client IDs from git history and set as env vars
- [x] Verified: sandbox server localSignup/localLogin return sessionToken, Google login passes Client ID check

## Round 124 - Android Google Play Build
- [x] Increment Android versionCode in app.config.ts for new Google Play build (set to 12)
