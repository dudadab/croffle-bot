# README.md

<div align="center">
  <img height="150" width="150" src="./img/bot-icon-wt.png" alt="bot-icon"/>
</div>

# croffle-bot

A high-performance Discord music bot based on the Sapphire framework and `discord-player`. It provides a stable and structured development environment using Node.js 18 and TypeScript.

## 1. Project Goals

1.  **Type Safety:** Build a stable and maintainable codebase using TypeScript and the Sapphire Framework.
2.  **High Performance:** Efficient audio processing using the extractor system of `discord-player` v7.
3.  **Modular Architecture:** Ensure feature scalability by utilizing the framework's plugin and listener structure.
4.  **Modern Deployment:** Establish a consistent development and deployment environment through Yarn 4 (Berry) and Docker Multi-stage builds.

---

## 2. Tech Stack

- **Runtime:** [Node.js 18+](https://nodejs.org/)
- **Language:** TypeScript
- **Framework:** [Sapphire](https://sapphirejs.dev/)
- **Libraries:** [discord.js v14](https://discord.js.org/), [@discordjs/voice](https://github.com/discordjs/voice)
- **Music Engine:** [discord-player v7](https://discord-player.js.org/)
- **Package Manager:** Yarn 4.12.0 (Berry)
- **Audio Processing:** ffmpeg, yt-dlp
- **Infrastructure:** Docker, Docker Compose

---

## 3. Development Environment Setup

### 3.1. Native Environment Setup

- **Git clone**

```sh
git clone [repository-url]
cd [repository-directory]
```

- **Install Required Programs**
  - **Node.js 18+:** Install from the [Official Website](https://nodejs.org/)
  - **yt-dlp:** Install using `winget`, `apt`, or `dnf`
  - **ffmpeg:** Install using `winget`, `apt`, or `dnf`
- **Configure `.env` file**
  - Create a `.env` file in the project root directory and add the following content:

```ini
BOT_TOKEN="YOUR_DISCORD_BOT_TOKEN_HERE"
CLIENT_ID="YOUR_BOT_CLIENT_ID_HERE"

GUILD_ID="YOUR_TEST_SERVER_ID_HERE" # (Optional) Specific server ID for testing the bot
```

- **Setup Development Environment**

```sh
# Install dependencies
yarn install

# Run development server
yarn watch:start

# Build
yarn build

# Run bot
yarn start
```

### 3.2. Docker Compose Environment

> **Purpose:** To test in an environment identical to production without installing dependencies locally.

- **Install Docker and create the `.env` file**
- **Run the bot**

```sh
docker compose up --build -d

# Check logs
docker compose logs -f
```

---

## 4. Development Roadmap

### 4.1. Initial Prototype (Basic Streaming)

- **Goal:** Implement basic music playback and queue functionality using `@discordjs/voice`.
- **Key Tasks:**
  - [x] Set up and initialize the Sapphire Framework client.
  - [x] Integrate discord-player v7 and configure extractor loading.
  - [x] Build the basic `ping` command and event listener structure.
  - [x] Configure the Docker and Docker Compose deployment environment.
  - Implement core logic for playback control (Play, Pause, Skip, Queue).
- **Key Feature Implementation:**
  - [ ] `!join`/`!leave`: Join/leave a voice channel.
  - [ ] `!play <url>`/`!p <url>`: Play music from a URL.
  - **Queue Management**
    - [ ] `!skip`: Skip the currently playing song.
    - [ ] `!skipto <queue_number>`: Skip to a specific song in the queue (skipping all songs in between).
    - [ ] `!playnext <url>`: Play a song immediately after the current one (priority queue).
    - [ ] `!pause`/`!resume`: Pause and resume playback.
    - [ ] `!remove <queue_number>`: Remove a specific song from the queue.
    - [ ] `!clear`: Clear the queue, but keep the current song playing.
    - [ ] `!stop`: Stop playback and clear the queue.
    - [ ] `!queue`/`!list`: Display the current queue.
  - **Information & Status**
    - [ ] `!help`: Display all available commands and their usage.
    - [ ] `!ping`: Display the bot's current latency.

---

## 5. Team Development Rules

### 5.1. Branching Strategy

- **GitHub Flow:** We follow the GitHub Flow. Fork the main repository, develop on your fork, and then create a Pull Request (PR).

### 5.2. Workflow

1.  Fetch from `upstream` to check for the latest code.
2.  Update your local `master` branch from `upstream/master` (via `merge` or `pull`).
3.  Push changes to your forked repository (`origin`) to keep it synchronized.
4.  Create a new branch from `master` to work on your feature.
5.  Once development is complete, create a Pull Request from your feature branch (e.g., `<user>/feat/<branch>`) to `Team-Croffle/master`.

### 5.3. Commit Convention

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Changes to documentation
- `refactor`: Code refactoring
- `style`: Code style changes (formatting, etc.)

---

## 6. License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
