# FitMonster Mobile App Design

## App Concept

FitMonster is a gamified fitness tracking mobile app where users raise virtual monsters through workouts and healthy eating habits. The app combines fitness tracking with gaming elements to motivate users to maintain an active lifestyle.

## Screen List

### Primary Screens

1. **Home Screen** - Main dashboard showing the user's monster, daily stats, and quick actions
2. **Camera/Food Scanner** - Scan food items to log nutrition and feed the monster
3. **Workout Tracker** - Log workouts and exercises with animations
4. **Battle Arena** - Compete with other users' monsters
5. **Dashboard/Stats** - Detailed analytics, trends, and progress tracking
6. **Authentication** - Login/signup with email and social auth

### Secondary Screens

7. **Pokedex** - Collection of all available monsters
8. **Guild/Social** - Friends list, chat rooms, and social features
9. **Map** - Explore locations and complete quests
10. **Profile/Settings** - User settings, language switcher, logout

## Primary Content and Functionality

### Home Screen
- **Monster Display**: Animated monster character that evolves based on user activity
- **Quick Stats**: Daily steps, calories, workout streak
- **Action Buttons**: Quick access to camera, workout, and battle
- **Daily Quests**: Gamified daily challenges
- **Monster Status**: Health, happiness, and evolution progress

### Camera/Food Scanner
- **Camera View**: Real-time camera feed for food scanning
- **AI Food Recognition**: Identify food items and estimate nutrition
- **Nutrition Display**: Calories, protein, carbs, fats breakdown
- **Feeding Animation**: Visual feedback when feeding monster
- **Food Log History**: Past meals and nutrition tracking

### Workout Tracker
- **Exercise Selection**: Browse and select workout types
- **Timer/Counter**: Track workout duration and reps
- **Workout Animation**: Visual feedback during exercises
- **Progress Tracking**: Log completed workouts
- **Monster Training**: Monster gains XP from workouts

### Battle Arena
- **Matchmaking**: Swipe-based matching with other users
- **Battle Interface**: Turn-based or real-time monster battles
- **Stats Comparison**: Compare monster stats with opponents
- **Battle History**: Record of past battles and results
- **Rewards**: Earn items and XP from victories

### Dashboard/Stats
- **Weekly Trends Chart**: Visual graphs of activity over time
- **Calendar View**: Monthly activity calendar with heatmap
- **Detailed Metrics**: Comprehensive fitness statistics
- **Achievement Badges**: Unlock and display achievements
- **Health Integration**: Sync with device health data (steps, heart rate)

## Key User Flows

### Onboarding Flow
1. User opens app → Authentication screen
2. Sign up with email/social → Create account
3. Choose starter monster → Tutorial
4. Set fitness goals → Home screen

### Food Logging Flow
1. Tap camera icon → Camera screen opens
2. Point camera at food → AI analyzes image
3. Review nutrition info → Confirm or edit
4. Save log → Feeding animation plays
5. Monster gains health/happiness → Return to home

### Workout Flow
1. Tap workout icon → Workout selection screen
2. Choose exercise type → Start workout timer
3. Complete workout → Log details (reps, duration)
4. Save workout → Monster gains XP
5. View progress → Return to home

### Battle Flow
1. Navigate to battle tab → Matchmaking screen
2. Swipe through potential opponents → Select match
3. Battle begins → Turn-based actions
4. Battle completes → Results screen
5. Earn rewards → Return to battle arena

### Social Flow
1. Navigate to guild tab → Friends list
2. View friend profiles → Compare monsters
3. Send messages → Chat room
4. Join guild events → Participate in challenges

## Color Choices

### Primary Palette
- **Primary Brand**: `#0a7ea4` (Teal Blue) - Energetic and fitness-focused
- **Background Light**: `#ffffff` (White) - Clean and modern
- **Background Dark**: `#151718` (Deep Charcoal) - Easy on eyes at night
- **Surface Light**: `#f5f5f5` (Light Gray) - Subtle elevation
- **Surface Dark**: `#1e2022` (Dark Gray) - Card backgrounds

### Accent Colors
- **Success/Health**: `#22C55E` (Green) - Positive actions, health gains
- **Warning**: `#F59E0B` (Amber) - Alerts, low stats
- **Error**: `#EF4444` (Red) - Errors, damage in battles
- **XP/Energy**: `#8B5CF6` (Purple) - Monster energy and experience

### Text Colors
- **Foreground Light**: `#11181C` (Near Black) - Primary text
- **Foreground Dark**: `#ECEDEE` (Off White) - Primary text in dark mode
- **Muted Light**: `#687076` (Gray) - Secondary text
- **Muted Dark**: `#9BA1A6` (Light Gray) - Secondary text in dark mode

## Design Principles

### Mobile-First (9:16 Portrait)
- All screens optimized for one-handed use
- Primary actions within thumb reach (bottom 1/3 of screen)
- Tab bar navigation at bottom
- Important content above the fold

### iOS Human Interface Guidelines
- Native-feeling animations and transitions
- SF Symbols for consistent iconography
- Haptic feedback for interactions
- Pull-to-refresh patterns
- Bottom sheets for modal content

### Gamification Elements
- **Visual Feedback**: Animations for all major actions
- **Progress Indicators**: XP bars, level progression
- **Rewards System**: Badges, items, monster evolution
- **Social Competition**: Leaderboards, battles, guilds
- **Daily Engagement**: Streaks, daily quests, login rewards

### Accessibility
- High contrast ratios for text
- Large touch targets (minimum 44x44 points)
- Clear visual hierarchy
- Support for system font sizes
- Dark mode support

## Navigation Structure

### Tab Bar (Bottom Navigation)
1. **Home** - Monster and daily overview
2. **Camera** - Food scanning
3. **Workout** - Exercise tracking
4. **Battle** - PvP arena
5. **Dashboard** - Stats and analytics

### Top Navigation
- **Settings Menu** (top-right) - Profile, settings, logout
- **Language Switcher** - Multi-language support
- **Notifications** - Activity alerts

### Modal Flows
- **Add Log Dialog** - Quick entry for food/workout
- **Egg Hatch** - Monster evolution animation
- **Match Popup** - Battle matchmaking
- **Quest Details** - Challenge information

## Technical Considerations

### Performance
- Lazy load images and heavy components
- Optimize animations for 60fps
- Cache frequently accessed data locally
- Minimize network requests

### Offline Support
- Store workout logs locally with AsyncStorage
- Sync when connection restored
- Show offline indicator
- Queue actions for later sync

### Platform Differences
- iOS: Use SF Symbols, native haptics
- Android: Material icons, vibration patterns
- Web: Fallback to web-safe alternatives
- Disable native features gracefully on web

## Data Storage Strategy

### Local Storage (AsyncStorage)
- User preferences and settings
- Workout logs and history
- Food logs and nutrition data
- Monster state and progress
- Offline queue

### Backend/Database (Supabase)
- User authentication and profiles
- Social features (friends, chat, guilds)
- Battle history and matchmaking
- Leaderboards and rankings
- Cross-device sync

### Health Integration
- Read step count from device
- Sync workout data with Apple Health/Google Fit
- Import heart rate and activity data
- Export FitMonster data to health apps
