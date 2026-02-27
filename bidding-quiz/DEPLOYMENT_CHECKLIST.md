# Deployment Checklist

Complete these steps before deploying to GitHub Pages:

## Pre-Deployment

- [ ] **Firebase Setup**
  - [ ] Create Firebase project
  - [ ] Enable Realtime Database
  - [ ] Copy Firebase configuration
  - [ ] Update `js/firebase-config.js` with your credentials
  - [ ] Set up Firebase security rules

- [ ] **Security**
  - [ ] Change admin password in `js/player.js`
  - [ ] Review Firebase security rules for production
  - [ ] Remove any test/debug code

- [ ] **Testing**
  - [ ] Test locally with a web server
  - [ ] Test with multiple browser tabs (simulate multiple players)
  - [ ] Test admin controls
  - [ ] Test all game phases
  - [ ] Test timer functionality
  - [ ] Test reset functionality

- [ ] **Content Review**
  - [ ] Review all questions for accuracy
  - [ ] Check spelling and grammar
  - [ ] Verify all topics have questions
  - [ ] Test all answer choices

## Deployment Steps

- [ ] **GitHub Repository**
  - [ ] Create new GitHub repository
  - [ ] Push code to repository
  - [ ] Verify all files are uploaded

- [ ] **GitHub Pages**
  - [ ] Go to repository Settings → Pages
  - [ ] Select source branch (main)
  - [ ] Select root folder
  - [ ] Save settings
  - [ ] Wait for deployment (check Actions tab)

- [ ] **Post-Deployment Testing**
  - [ ] Visit your GitHub Pages URL
  - [ ] Test joining the game
  - [ ] Test admin login
  - [ ] Test complete game flow
  - [ ] Test on mobile devices
  - [ ] Test on different browsers

## Firebase Configuration Example

Your `js/firebase-config.js` should look like this:

```javascript
export const firebaseConfig = {
  apiKey: "AIzaSyC...",                                    // Your actual API key
  authDomain: "your-project.firebaseapp.com",             // Your project domain
  databaseURL: "https://your-project-rtdb.firebaseio.com", // Your database URL
  projectId: "your-project",                              // Your project ID
  storageBucket: "your-project.appspot.com",              // Your storage bucket
  messagingSenderId: "123456789",                         // Your sender ID
  appId: "1:123456789:web:abc123"                         // Your app ID
};
```

## Firebase Security Rules (Development)

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

## Firebase Security Rules (Production - Recommended)

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": "auth != null",
        ".write": "auth != null",
        "players": {
          "$playerId": {
            ".write": "auth.uid == $playerId || 
                       root.child('rooms').child($roomId).child('players').child(auth.uid).child('isAdmin').val() == true"
          }
        }
      }
    }
  }
}
```

**Note**: Production rules require implementing Firebase Authentication.

## Common Issues

### Issue: "Module not found" errors
**Solution**: Ensure you're using a web server, not opening HTML directly

### Issue: Firebase connection fails
**Solution**: Verify Firebase configuration and database URL

### Issue: Players can't join
**Solution**: Check that game is in "waiting" phase and Firebase rules allow writes

### Issue: Timer doesn't work
**Solution**: Check browser console for errors, verify phaseStartTime is being written

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify Firebase configuration
3. Test with Firebase Realtime Database debugger
4. Review the README.md for detailed instructions

## Final Checklist

Before sharing your game:
- [ ] Firebase is configured correctly
- [ ] Admin password is changed
- [ ] Game works end-to-end
- [ ] Mobile responsive design works
- [ ] All browsers tested
- [ ] GitHub Pages URL is accessible
- [ ] Share the URL with players!

## Your Deployment Info

Fill this out for your reference:

- **GitHub Repository**: ___________________________
- **GitHub Pages URL**: ___________________________
- **Firebase Project**: ___________________________
- **Admin Password**: ___________________________ (keep secure!)
- **Deployment Date**: ___________________________

---

**Ready to deploy?** Follow the steps in README.md!
