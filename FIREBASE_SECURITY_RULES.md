# Firebase Security Rules Documentation

## Overview

This document describes the Firebase Realtime Database security rules for the Bidding Quiz application, with a focus on the presence system for player disconnect detection.

## Presence System Rules

### Read Access
- **Rule**: All users can read presence data for any room
- **Rationale**: Players need to see who is online in their room for game coordination

### Write Access
- **Rule**: Only authenticated users can write presence data, and only for their own player ID or if they are an admin
- **Implementation**: `auth != null && (auth.uid == $playerId || root.child('rooms').child($roomId).child('players').child(auth.uid).child('isAdmin').val() == true)`
- **Rationale**: Prevents unauthorized users from manipulating presence data

### Data Validation

The presence data structure is validated to ensure data integrity:

#### Required Fields
All presence records must contain the following fields:
- `online` (boolean)
- `lastSeen` (number > 0)
- `connectedAt` (number > 0)
- `playerId` (non-empty string)
- `playerName` (non-empty string)

#### Field Validation Rules

1. **online**
   - Type: Boolean
   - Validation: Must be true or false
   - Purpose: Indicates current connection status

2. **lastSeen**
   - Type: Number
   - Validation: Must be greater than 0
   - Purpose: Timestamp of last heartbeat (milliseconds since epoch)

3. **connectedAt**
   - Type: Number
   - Validation: Must be greater than 0
   - Purpose: Timestamp when player connected (milliseconds since epoch)

4. **playerId**
   - Type: String
   - Validation: Must be non-empty
   - Purpose: Unique identifier for the player

5. **playerName**
   - Type: String
   - Validation: Must be non-empty
   - Purpose: Display name of the player

## Deployment

To deploy these security rules to Firebase:

1. Install Firebase CLI if not already installed:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project (if not already done):
   ```bash
   firebase init database
   ```

4. Deploy the rules:
   ```bash
   firebase deploy --only database
   ```

## Testing Security Rules

You can test the security rules using the Firebase Console:
1. Go to Firebase Console → Realtime Database → Rules
2. Click on "Rules Playground" tab
3. Test read/write operations with different authentication states

## Security Considerations

1. **Authentication Required**: All write operations require authentication to prevent anonymous users from manipulating presence data

2. **Player Ownership**: Players can only modify their own presence data (unless they are admins)

3. **Data Integrity**: Strict validation ensures presence data maintains the correct structure and types

4. **Admin Override**: Admins can modify any presence data in their room for management purposes

5. **Read Transparency**: All presence data is readable to enable real-time disconnect detection and UI updates

## Future Enhancements

Consider implementing these additional security measures:

1. **Rate Limiting**: Add rate limiting to prevent heartbeat spam
2. **Timestamp Validation**: Validate that timestamps are within reasonable ranges
3. **Room Existence Check**: Validate that the room exists before allowing presence writes
4. **Player Existence Check**: Validate that the player exists in the room before allowing presence writes

## Related Files

- `database.rules.json` - Firebase security rules configuration
- `bidding-quiz/js/presence-tracker.js` - Client-side presence management
- `bidding-quiz/js/disconnect-detector.js` - Disconnect detection logic
