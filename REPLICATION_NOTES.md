# FitMonster Replication Notes

## Authentication Page Observations

### Design Elements
- **Logo**: Green circular icon with dumbbell/fitness symbol
- **Title**: "FitMonster" with tagline "Raise your fitness monster 💪"
- **Language**: Uses Chinese text "養成你的健身精靈" (Raise your fitness monster)
- **Background**: Light gray/white clean background

### Authentication Features
1. **Social Login Options**:
   - Continue with Google
   - Continue with Apple

2. **Email/Password Login**:
   - Email input field
   - Password input field
   - "Forgot password?" link
   - "Sign In" button (green/teal color)

3. **Sign Up**:
   - "Don't have an account? Sign up now" link

4. **Legal**:
   - Terms of Service and Privacy Policy agreement text

### UI/UX Details
- Centered card layout with rounded corners
- Green/teal primary color (#0a7ea4 or similar)
- Clean, modern design
- Mobile-responsive layout
- Form validation expected

## Next Steps
- Test the app after authentication to see all features
- Document all screens and functionality
- Check data persistence and state management
- Identify all API integrations


## Sign Up Page Observations

### Additional Fields
- **Trainer Name**: Username/display name field (required for signup)
- Same social login options (Google, Apple)
- Same email/password fields
- "Sign Up" button (green/teal)
- "Already have an account? Sign in" link

### Key Features to Implement
1. Toggle between Sign In / Sign Up modes
2. Trainer Name field only appears in Sign Up mode
3. Social authentication (Google, Apple)
4. Email/password authentication
5. Form validation
6. Password reset functionality


## Complete Feature List from Live App

### Home Page Features
- Personalized greeting with trainer name
- Stats card with gradient background showing:
  - Health Score
  - Today's Steps
  - Net EXP
- Tab navigation: Home, Daily Tasks, History
- Monster Team section with "View All" option
- Monster card displays:
  - Level badge, Type badge, Status badges
  - Monster name and image
  - HP bar (green) with current/max values
  - EXP bar with progress
  - Three stat icons (meat/strength, shield/defense, lightning/agility)
  - Evolution progress bar
- "Hatch Egg" button for additional monsters
- Quick action buttons:
  - Photo Feed (Scan Food Analysis)
  - Quick Battle (PvP Matching)
- Daily Quests section:
  - Progress counter (X/3 Completed)
  - Quest cards with colored backgrounds
  - Quest icon, title, description
  - Progress bar
  - Coin reward indicator

### Camera/Photo Feed Page
- Title: "Photo Feed"
- Subtitle: "AI analyzes food nutrition to feed your monster"
- Large placeholder area with fork/knife icon
- Instructions: "Take or upload food photo" / "AI will automatically analyze nutrition"
- Two action buttons:
  - "Open Camera" (primary green button)
  - "Choose from Gallery" (secondary button with green text)

### Workout Page
- Title: "Workout" with "Start Training 💪"
- Current EXP display: "0 EXP"
- Action buttons:
  - "Manual Log"
  - "Sync Steps"
- Monster display card showing:
  - Monster image and name
  - Level and XP progress bar
  - Best workout type
- Quick workout type filters (pills):
  - Running, Weight Training, Yoga, Basketball
- Exercise grid with cards showing:
  - Icon, name, MET value
  - Examples: Running (MET 8), Cycling (MET 7.5), Swimming (MET 7), Walking (MET 3.5), Hiking (MET 6), Jump Rope (MET 10)
- Bottom stats section:
  - Completed count
  - EXP earned
  - Steps count

### Battle/PvP Page
- Title: "PvP Battle"
- Tab navigation: Match, Friends
- "Swipe Match to Find Opponents!" banner with "6 nearby" indicator
- Today's Swipes counter: "50/50"
- Swipe card showing opponent:
  - Fitness streak badge ("24 Hour Fitness")
  - Match percentage ("85% Match")
  - Monster image
  - Trainer name, distance, online status
  - Level badge
  - Today's EXP display
  - Monster type and stats (Colossus Lv.18)
  - Three stat values displayed
- Three swipe action buttons:
  - Left (X) - Reject
  - Middle (Star) - Super Like with coin cost
  - Right (Heart) - Like
- "Random Wild Battle" button (purple)

### Dashboard Page
- Title: "Today's Fitness Overview"
- Subtitle: "Track your health progress 📊"
- Two stat cards:
  - Today's Steps (with goal progress bar: 10,000 steps)
  - Burned Calories (with formula display)
- Today's Net EXP card showing:
  - Total net EXP
  - Calorie Surplus indicator
  - Nutrition EXP breakdown
  - Workout EXP breakdown
  - Intake vs Burned calories
  - Balance state indicator
- Step Bonus Effects card:
  - EXP Bonus multiplier
  - Protein Efficiency multiplier
  - Explanatory text
- Today's Nutrition card:
  - Daily Calorie Need (1800 kcal)
  - Protein Intake progress bar (0g / 100g)
- Monster Growth Status card:
  - Monster image and name
  - Level
  - EXP progress bar
  - Evolution Progress
  - Stage indicator
  - Three stat values
- Daily Quest Progress:
  - List of quests with progress bars
  - Coin rewards shown
  - Examples: Protein Champion, Walking Master, Feeding Expert

### Additional Features Observed
- Multi-language support (Chinese/English)
- Settings icon in top right
- Consistent bottom navigation across all pages
- Gradient backgrounds on key cards
- Progress bars with different colors
- Badge system for monster status
- Coin/currency system
- MET (Metabolic Equivalent) values for exercises
- Swipe-based matchmaking (like dating apps)
- Friend system
- Quest/achievement system
- Monster evolution stages
- Multiple monster types (Bodybuilder, Physique, Powerlifter)
