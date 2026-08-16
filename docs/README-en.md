# README.md

<div align="center">
  <img height="150" width="150" src="./img/bot-icon-wt.png" alt="bot-icon"/>
</div>

# pipit-hub

**Pipit** is a Discord bot built with the Sapphire framework and `discord-player`.  
One codebase runs in role-based modes (e.g. `ROLE=main` / `ROLE=edge`): a main home-lab node and external server nodes.

**1.0 focus:** YouTube music bot + a designated command channel.

## 1. Project Goals

1. **Type Safety:** Stable, maintainable codebase with TypeScript and the Sapphire Framework.
2. **High Performance:** Efficient audio via the `discord-player` v7 extractor system.
3. **Role-based Modules:** Enable/disable features with roles / feature flags (main music & alerts, edge healthchecks, etc.).
4. **Modern Deployment:** Consistent dev and deploy via Yarn 4 (Berry) and Docker multi-stage builds.

---

## 2. Tech Stack

- **Runtime:** [Node.js 18+](https://nodejs.org/)
- **Language:** TypeScript
- **Framework:** [Sapphire](https://sapphirejs.dev/)
- **Libraries:** [discord.js v14](https://discord.js.org/), [@discordjs/voice](https://github.com/discordjs/voice)
- **Music Engine:** [discord-player v7](https://discord-player.js.org/)
- **Package Manager:** Yarn 4.18.0 (Berry)
- **Audio Processing:** ffmpeg (via bundled `ffmpeg-static`, or system PATH)
- **Infrastructure:** Docker, Docker Compose

---

## 3. Development Environment Setup

### 3.1. Native Environment Setup

- **Git clone**

```sh
git clone [repository-url]
cd pipit-hub
```

- **Install required programs**
  - **Node.js 18+:** [Official Website](https://nodejs.org/)
  - **ffmpeg:** Install with `winget`, `apt`, or `dnf`
- **Configure `.env`**
  - Create a root `.env` (or `.env.development.local` for `yarn start:dev`):

```ini
BOT_TOKEN="YOUR_DISCORD_BOT_TOKEN_HERE"
ROLE="main" # main | edge (default main)

# main only (optional)
YOUTUBE_COOKIE="YOUR_YOUTUBE_COOKIE_HERE"

# optional; when set, message commands are limited to this channel
COMMAND_CHANNEL_ID="YOUR_CHANNEL_ID_HERE"
```

> Prefer separate Discord tokens per node, and keep edge nodes on least privilege / minimal secrets.
> `yarn start:dev` loads `--env-file=.env.development.local`.

- **Setup**

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

> **Purpose:** Test in a production-like environment without installing local dependencies.

- **Install Docker and create the `.env` file**
- **Run the bot**

```sh
docker compose up --build -d

# Check logs
docker compose logs -f
```

---

## 4. Development Roadmap

### 4.1. 1.0 — Main home-lab music bot

- **Goal:** YouTube playback/queue and a designated command channel
- **Foundation:**
  - [x] Set up and initialize the Sapphire Framework client.
  - [x] Integrate discord-player v7 and configure extractor loading.
  - [x] Build the basic `ping` command and event listener structure.
  - [x] Configure Docker and Docker Compose deployment.
- **Key features:**
  - [ ] Designate the chat channel that accepts commands
  - [ ] `!join`/`!leave`: Join/leave a voice channel
  - [ ] `!play <url>`/`!p <url>`: Play music from a URL
  - **Queue**
    - [ ] `!skip`: Skip the current song
    - [ ] `!skipto <queue_number>`: Skip to a specific queue item
    - [ ] `!playnext <url>`: Play next (priority)
    - [ ] `!pause`/`!resume`: Pause and resume
    - [ ] `!remove <queue_number>`: Remove a queue item
    - [ ] `!clear`: Clear the queue, keep the current song
    - [ ] `!stop`: Stop playback and clear the queue
    - [ ] `!queue`/`!list`: Show the queue
  - **Info**
    - [ ] `!help`: List commands and usage
    - [ ] `!ping`: Show latency

### 4.2. Later — Main expansions

- [ ] Web dashboard
- [ ] PR / Issue alerts to a designated channel (reviewer mentions, GitHub Actions or webhook)
- [ ] Always-on operation on the main home lab

### 4.3. Later — External (edge) bot

- [ ] Service healthchecks → alert on downtime
- [ ] Main home-lab status alerts
- [ ] Pre/post maintenance notices (internal maintenance server API calls, secured with tokens)

---

## 5. Team Development Rules

### 5.1. Branching Strategy

- **GitHub Flow:** Fork the main repository, develop on your fork, then open a Pull Request.

### 5.2. Workflow

1. Fetch from `upstream` for the latest code.
2. Update your local default branch from `upstream` (`merge` / `pull`).
3. Push to your fork (`origin`) to stay in sync.
4. Branch off to work on a feature.
5. Open a PR from your feature branch to the main repository’s default branch.

### 5.3. Commit Convention

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `style`: Code style changes (formatting, etc.)

---

## 6. License

This project is licensed under the MIT License. See the [LICENSE](../LICENSE) file for details.

Korean README: [../README.md](../README.md)
