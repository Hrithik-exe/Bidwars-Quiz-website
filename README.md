# 🎯 Bidding Quiz - Multiplayer Quiz Game

A real-time multiplayer quiz game with bidding mechanics, room management, and spectator mode.

## 🌐 Live Demo

Visit the live game: [https://hrithik-exe.github.io/Bidwars-Quiz-website/](https://hrithik-exe.github.io/Bidwars-Quiz-website/)

## ✨ Features

### Room Management System
- **Create Rooms**: Generate unique 6-character room codes
- **Join Rooms**: Enter room codes to join existing games
- **Multi-Room Support**: Multiple games can run simultaneously
- **Room Codes**: Easy-to-share codes using base-32 alphabet (no ambiguous characters)

### Gameplay Features
- **Bidding Mechanic**: Players bid points to answer questions
- **Spinning Wheel**: Random topic selection with enhanced animations
- **10 Rounds**: Complete game with scoring and leaderboard
- **Real-time Updates**: Firebase-powered live game state

### Admin & Spectator Mode
- **Spectator Mode**: Admins can observe games without participating
- **View-Only Access**: Spectators see all game data but cannot submit bids/answers
- **Admin Controls**: Manual cleanup and game management

### Automatic Cleanup
- **10-Minute Inactivity**: Rooms automatically terminate after inactivity
- **Cost Optimization**: Reduces Firebase storage costs
- **User Cleanup**: Removes player records after games finish

### Enhanced Wheel
- **Visual Feedback**: Distinct colors for used/available topics
- **Smooth Animations**: Realistic physics with cubic-bezier easing
- **Accessibility**: ARIA labels and screen reader support
- **Performance**: Hardware-accelerated CSS transforms

## 🚀 Getting Started

### Play the Game

1. Visit [room-selection.html](https://hrithik-exe.github.io/Bidwars-Quiz-website/bidding-quiz/room-selection.html)
2. Choose to **Create Room** or **Join Room**
3. Share the room code with friends
4. Start playing!

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/Hrithik-exe/Bidwars-Quiz-website.git
cd Bidwars-Quiz-website
