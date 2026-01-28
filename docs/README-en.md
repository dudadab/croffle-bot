# README.md

<div align="center">
<img height="150" width="150" src="./img/bot-icon-wt.png" alt="bot-icon"/>
</div>

# croffle-bot

A Discord music bot project built on **Node.js** and **TypeScript**. It utilizes `discord.js` and the `@discordjs/voice` library, implementing high-performance audio streaming capabilities via `ffmpeg` and `yt-dlp`.

## 1. Project Objectives

1. **Type Safety:** Ensure code stability and maintainability by adopting TypeScript to prevent runtime errors.
2. **Process Management:** Efficient control of external processes (`ffmpeg`, `yt-dlp`) utilizing Node.js `child_process` and asynchronous processing.
3. **Stream Architecture:** Implement high-performance streaming through direct control of `prism-media` and audio pipelines.
4. **Environment Consistency:** Ensure consistency in development and deployment environments using Docker & Docker Compose.

---

## 2. Tech Stack

- **Language:** TypeScript (Node.js)
- **Core Libraries:**
  - `discord.js`: Discord API integration
  - `@discordjs/voice`: Discord Voice Channel and Audio control
  - `prism-media`: Audio transcoding and stream processing
- **Audio Processing:** `ffmpeg`, `yt-dlp`
- **Package Manager:** `npm`
- **Containerization:** Docker, Docker Compose

---

## 3. Development Environment Setup

### 3.1. Native Environment Setup

- **Git clone**

```sh
git clone <repository-url>
cd <repository-directory>
```

- **Prerequisites Installation**
- **Node.js 22+:** Install from [Official Site](https://nodejs.org/en)
- **yt-dlp:** Install using `winget`, `apt`, or `dnf`
- **ffmpeg:** Install using `winget`, `apt`, or `dnf`
- **.env Configuration**
  - Create a `.env` file in the project root directory and add the following:

```ini
BOT_TOKEN="YOUR_DISCORD_BOT_TOKEN_HERE"
CLIENT_ID="YOUR_BOT_CLIENT_ID_HERE"

GUILD_ID="YOUR_TEST_SERVER_ID_HERE" # (Optional) Specific Server ID for bot testing
```

- **Install Dependencies**

```sh
npm install
```

- **Run Bot**

```sh
npm dev
```

### 3.2. Docker Compose Environment

> **Purpose:** Test in an environment identical to production without installing `ffmpeg` or `yt-dlp` locally.

- **Install Docker & Create `.env` file**
- **Run Bot**

```sh
docker compose up --build -d
```

- **Check Logs**

```sh
docker compose logs -f
```

- **Stop**

```sh
docker compose down
```

---

## 4. Development Roadmap

### 4.1. Initial Prototype (Basic Streaming)

- **Goal:** Implement basic music playback and queue functionality using `@discordjs/voice`.
- **Key Tasks:**
  - Implement Command Handler.
  - Modularize `AudioPlayer` and `VoiceConnection` state management.
  - Implement core logic for playback control (Play, Pause, Skip, Queue).

- **Key Features:**
  - [ ] `!join`/`!leave`: Join/Leave voice channel
  - [ ] `!play <url>`/`!p <url>`: Play music based on URL
  - **Song Queue Management**
    - [ ] `!skip`: Skip the currently playing song
    - [ ] `!skipto <index>`: Skip to a specific song number (skipping all intermediate songs)
    - [ ] `!playnext <url>`: Play immediately next (Priority reservation)
    - [ ] `!pause`/`!resume`: Pause and Resume playback
    - [ ] `!remove <index>`: Remove a specific song from the queue
    - [ ] `!clear`: Clear the queue (keeping the current song playing)
    - [ ] `!stop`: Stop playback and clear the queue
    - [ ] `!queue`/`!list`: Display the current queue list
  - Info and Status
    - [ ] `!help`: Display all bot commands and usage
    - [ ] `!ping`: Display bot's current response latency

### 4.2. Modularization & Direct ffmpeg/yt-dlp Control

- **Goal:** Switch to direct `ffmpeg` control for enhanced stability.
- **Key Tasks:**
  - Implement a Custom Audio Resource connecting `yt-dlp` and `ffmpeg`.
  - Strengthen resource release logic to prevent memory leaks.
  - Support for Lyrics and Playlists.

- **Key Features:**
  - [ ] Optimize `yt-dlp` Wrapper module
  - [ ] Support `ffmpeg` audio filters (Bass Boost, etc.)
  - [ ] Implement error handling and automatic reconnection logic

---

## 5. Team Development Rules

**5.1. Branch Strategy**

- **GitHub Flow:** The `main` branch is protected. All feature additions must be worked on in Feature branches and submitted via PR.

**5.2. Workflow**

1. `fetch` from `upstream` to check for the latest code.
2. Update (`merge`/`pull`) local `master` from `upstream`'s `master`.
3. Push to `origin` (your forked repository) to synchronize.
4. Create a branch to perform your work.
5. Once development is complete, create a PR from `<user>/feat/<branch>` to `Team-Croffle/master`.

**5.3. Commit Convention**

- `feat`: Add new features
- `fix`: Bug fixes
- `docs`: Documentation changes (README, etc.)
- `refactor`: Code refactoring
- `style`: Code style changes (formatting)
