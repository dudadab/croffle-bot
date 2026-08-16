# README.md

<div align="center">
  <img height="150" width="150" src="./docs/img/bot-icon-wt.png" alt="bot-icon"/>
</div>

# pipit-hub

Sapphire 프레임워크와 `discord-player`를 기반으로 한 Discord 봇 **Pipit**입니다.  
코드베이스는 하나이며, 역할(`ROLE=main` / `ROLE=edge`)에 따라 홈랩 메인 노드와 외부 서버 노드로 나눠 동작합니다.

**1.0 초점:** YouTube 기반 노래봇 + 명령어를 받을 채팅창 지정.

## 1. 프로젝트 목표

1. **Type Safety:** TypeScript와 Sapphire Framework로 안정적이고 유지보수하기 쉬운 코드베이스 구축
2. **High Performance:** `discord-player` v7 익스트랙터로 효율적인 오디오 처리
3. **Role-based Modules:** 같은 제품에서 role / feature flag로 기능 on/off (메인 음악·알림, 엣지 healthcheck 등)
4. **Modern Deployment:** Yarn 4(Berry)와 Docker Multi-stage 빌드로 일관된 개발·배포 환경 구축

---

## 2. 기술 스택

- **Runtime:** [Node.js 18+](https://nodejs.org/ko/)
- **Language:** TypeScript
- **Framework:** [Sapphire](https://sapphirejs.dev/)
- **Libraries:** [discord.js v14](https://discord.js.org/), [@discordjs/voice](https://github.com/discordjs/voice)
- **Music Engine:** [discord-player v7](https://discord-player.js.org/)
- **Package Manager:** Yarn 4.18.0 (Berry)
- **Audio Processing:** ffmpeg (`ffmpeg-static` 번들, 시스템 PATH의 ffmpeg도 가능)
- **Infrastructure:** Docker, Docker Compose

---

## 3. 개발 환경 설정

### 3.1. 네이티브 환경 설정

- **Git clone**

```sh
git clone [repository-url]
cd pipit-hub
```

- **필수 프로그램 설치**
  - **Node.js 18+:** [Official](https://nodejs.org/ko) 에서 설치
  - **ffmpeg:** `winget`, `apt`, `dnf`를 활용하여 설치
- `.env` **파일 설정**
  - 프로젝트 루트에 `.env` (또는 개발용 `.env.development.local`)를 두고 다음을 설정합니다.

```ini
BOT_TOKEN="YOUR_DISCORD_BOT_TOKEN_HERE"
ROLE="main" # main | edge (기본값 main)

# main 전용 (선택)
YOUTUBE_COOKIE="YOUR_YOUTUBE_COOKIE_HERE"

# 메시지 명령 허용 채널 (선택; 미설정 시 모든 채널)
COMMAND_CHANNEL_ID="YOUR_CHANNEL_ID_HERE"
```

> 노드별로 Discord 토큰을 분리하고, 외부(edge) 노드에는 최소 권한·최소 시크릿만 두는 것을 권장합니다.
> `yarn start:dev`는 `--env-file=.env.development.local`을 사용합니다.

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

> **목적:** 로컬에 별도 종속성 설치 없이 배포 환경과 동일한 상태에서 테스트

- **Docker 설치 및 `.env` 파일 생성**
- **봇 실행**

```sh
docker compose up --build -d

# 로그 확인
docker compose logs -f
```

---

## 4. 개발 로드맵

### 4.1. 1.0 — 메인 홈랩 노래봇

- **목표:** YouTube 기반 재생·큐와 명령 채널 지정
- **기반 작업:**
  - [x] Sapphire Framework 클라이언트 설정 및 초기화
  - [x] discord-player v7 통합 및 익스트랙터 로드 설정
  - [x] 기본 ping 명령어 및 이벤트 리스너 구조 구축
  - [x] Docker 및 Docker Compose 배포 환경 구성
- **주요 기능:**
  - [ ] 명령어를 받을 채팅창 지정
  - [ ] `!join`/`!leave`: 음성 채널 입장/퇴장
  - [ ] `!play <url>`/`!p <url>`: URL 기반 음악 재생
  - **노래 큐(Queue) 관리**
    - [ ] `!skip`: 현재 재생 중인 노래 건너뛰기
    - [ ] `!skipto <큐 번호>`: 특정 번호 노래까지 스킵
    - [ ] `!playnext <url>`: 바로 다음 재생 (우선 예약)
    - [ ] `!pause`/`!resume`: 일시 정지 및 재개
    - [ ] `!remove <큐 번호>`: 큐에서 특정 항목 삭제
    - [ ] `!clear`: 현재 곡은 유지하고 큐 초기화
    - [ ] `!stop`: 재생 중지 및 큐 초기화
    - [ ] `!queue`/`!list`: 현재 큐 출력
  - **정보 및 상태**
    - [ ] `!help`: 명령어와 사용법 출력
    - [ ] `!ping`: 지연 시간 확인

### 4.2. 이후 — 메인 확장

- [ ] 웹 대시보드
- [ ] 지정 채널에 레포 PR / Issue 알림 (reviewer 멘션, GitHub Actions 또는 webhook)
- [ ] 메인 홈랩 상시 가동 운영

### 4.3. 이후 — 외부 서버(edge) 봇

- [ ] 서비스 healthcheck → 다운 시 알림
- [ ] 메인 홈랩 서버 상태 알림
- [ ] 점검 전·후 안내 (내부망 점검 서버 API 호출, token 등으로 보호)

---

## 5. 팀 개발 규칙

### 5.1. 브랜치 전략

- **GitHub Flow:** 메인 레포지토리를 Fork 하여 개발한 후 PR을 생성합니다.

### 5.2. 작업 흐름

1. `upstream`에서 `fetch` 하여 최신 코드가 있는지 확인
2. `upstream`의 `master`(또는 기본 브랜치)로부터 로컬 브랜치를 업데이트(`merge`/`pull`)
3. fork 된 `origin`에 push하여 동기화
4. 기능 브랜치를 분기하여 작업
5. 완료 후 feature 브랜치에서 메인 레포의 기본 브랜치로 PR 생성

### 5.3. Commit Convention

- `feat`: 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정 (README 등)
- `refactor`: 코드 리팩토링
- `style`: 코드 스타일 수정 (포매팅)

---

## 6. 라이선스

이 프로젝트는 MIT 라이선스에 따라 라이선스가 부여됩니다. 자세한 내용은 [LICENSE](./LICENSE) 파일을 참조하세요.

영문 README: [docs/README-en.md](./docs/README-en.md)
