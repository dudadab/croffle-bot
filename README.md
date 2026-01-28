# README.md

<div align="center">
  <img height="150" width="150" src="./docs/img/bot-icon-wt.png" alt="bot-icon"/>
</div>

# croffle-bot

Sapphire 프레임워크와 `discord-player`를 기반으로 한 고성능 디스코드 음악 봇입니다. Node.js 18와 TypeScript를 사용하여 안정적이고 구조화된 개발 환경을 제공합니다.

## 1. 프로젝트 목표

1. **Type Safety:** TypeScript와 Sapphire Framework를 활용하여 안정성있고 유지보수가 용이한 코드베이스 구축
2. **High Performance:** `discord-player` v7의 익스트랙터 시스템을 활용한 효율적인 오디오 처리
3. **Modular Architecture:** 프레임워크 기반의 플러그인 및 리스너 구조를 활용하여 기능 확장성 확보
4. **Modern Deployment:** Yarn 4(Berry)와 Docker Multi-stage 빌드를 통한 일관된 개발 및 배포 환경 구축

---

## 2. 기술 스택

- **Runtime:** [Node.js 18+](https://nodejs.org/ko/)
- **Language:** TypeScript
- **Framework:** [Sapphire](https://sapphirejs.dev/)
- **Libraries:** [discord.js v14](https://discord.js.org/), [@discordjs/voice](https://github.com/discordjs/voice)
- **Music Engine:** [discord-player v7](https://discord-player.js.org/)
- **Package Manager:** Yarn 4.12.0 (Berry)
- **Audio Processing:** ffmpeg, yt-dlp
- **Infrastructure:** Docker, Docker Compose

---

## 3. 개발 환경 설정

### 3.1. 네이티브 환경 설정

- **Git clone**

```sh
git clone [repository-url]
cd [repository-directory]
```

- **필수 프로그램 설치**
  - **Node.js 18+:** [Official](https://nodejs.org/ko) 에서 설치
  - **yt-dlp:** `winget`, `apt`, `dnf`를 활용하여 설치
  - **ffmpeg:** `winget`, `apt`, `dnf`를 활용하여 설치
- `.env` **파일 설정**
  - 프로젝트 루트 리렉토리에서 `.env`를 생성하여 다음 내용을 추가

```ini
BOT_TOKEN="YOUR_DISCORD_BOT_TOKEN_HERE"
CLIENT_ID="YOUR_BOT_CLIENT_ID_HERE"

GUILD_ID="YOUR_TEST_SERVER_ID_HERE" # (Optional) 봇을 테스트할 특정 서버 ID
```

- **개발 환경 설정**

```sh
# 의존성 설치
yarn install

# 개발 서버 실행
yarn watch:start

# 빌드
yarn build

# 봇 실행
yarn start
```

### 3.2. Docker Compose 환경

> **목적:** 로컬 환경에 별도의 종속성 설치 없이 배포 환경과 동일한 상태에서 테스트

- **Docker 설치 및 `.env` 파일 생성**
- **봇 실행**

```sh
docker compose up --build -d

# 로그 확인
docker compose logs -f
```

---

## 4. 개발 로드맵

### 4.1. 초기 프로토타입 (Basic Streaming)

- **목표:** `@discordjs/voice`를 사용하여 기본적인 음악 재생 및 큐 기능 구현
- **주요 작업:**
  - [x] Sapphire Framework 클라이언트 설정 및 초기화
  - [x] discord-player v7 통합 및 익스트랙터 로드 설정
  - [x] 기본 ping 명령어 및 이벤트 리스너 구조 구축
  - [x] Docker 및 Docker Compose 배포 환경 구성
  - 재생 제어 (Play, Pause, Skip, Queue) 핵심 로직 구현
- **주요 기능 구현:**
  - [ ] `!join`/`!leave`: 음성 채널 입장/퇴장
  - [ ] `!play <url>`/`!p <url>`: URL 기반 음악 재생
  - **노래 큐(Queue) 관리**
    - [ ] `!skip`: 현재 재생 중인 노래 건너뛰기
    - [ ] `!skipto <큐 번호>`: 특정 번호 노래까지 노래 스킵 (중간 노래 모두 스킵)
    - [ ] `!playnext <url>`: 바로 다음 재생 (우선 예약)
    - [ ] `!pause`/`!resume`: 재생 일시 정지 및 재개
    - [ ] `!remove <큐 번호>`: 큐에서 특정 번호 목록 삭제
    - [ ] `!clear`: 현재 재생 중 곡은 놔두고 큐 초기화
    - [ ] `!stop`: 재생 중지 및 큐 초기화
    - [ ] `!queue`/`!list`: 현재 큐 리스트 출력
  - 정보 및 상태 확인
    - [ ] `!help`: 봇이 가진 모든 명령어와 사용법 출력
    - [ ] `!ping`: 봇의 현재 반응 속도 출력 (지연 시간 확인)

---

## 5. 팀 개발 규칙

### 5.1. 브랜치 전략

- **GitHub Flow:** 메인 레포지토리를 Fork 하여 개발한 후 PR(Pull Request)을 생성합니다.

### 5.2. 작업 흐름

1. `upstream`에서 `fetch` 하여 최신 코드가 있는지 확인
2. `upstream`의 `master`로부터 로컬의 `master`를 업데이트(`merge`/`pull`)
3. 각 개발자의 fork 된 레포지토리인 `origin`에 push하여 동기화
4. 브랜치를 분기하여 작업을 수행
5. 개발이 완료되면 `<user>/feat/<branch>`로부터 `Team-Croffle/master`로 PR을 생성

### 5.3. Commit Convention

- `feat`: 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정 (README 등)
- `refactor`: 코드 리팩토링
- `style`: 코드 스타일 수정 (포매팅)

---

## 6. 라이선스

이 프로젝트는 MIT 라이선스에 따라 라이선스가 부여됩니다. 자세한 내용은 [LICENSE](./LICENSE) 파일을 참조하세요.
