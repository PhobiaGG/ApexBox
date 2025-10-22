# Fixes to Implement

## 1. Groups Screen - Crew Leaderboard Display
- Add crew leaderboard under the crew selector
- Show members with rankings
- Add "Leave Crew" and "View Details" buttons

## 2. Improved Crew Picker Modal
- Better visual design
- Scrollable list
- Not stacked text

## 3. Improved State Picker Modal  
- Grid layout instead of stacked text
- Better visual design
- Scrollable

## 4. Global Leaderboard Improvements
- Round numbers to 2 decimal places (72.35 instead of 72.34843299390)
- Better card layout: profile on left, rank in center, value big and bold on right
- Show user's state rank if not in top 50

## 5. Fix Maximum Update Depth Error
- Fix SessionDetailScreen useEffect dependency
- Likely caused by hasGPS state update triggering re-render
