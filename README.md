# README.md

<div align="center">
  <img height="150" width="150" src="./docs/img/bot-icon-wt.png" alt="bot-icon"/>
</div>

# croffle-bot

Node.js와 TypeScript를 기반으로 구축된 디스코드 음악 봇 프로젝트입니다. `discord.js`와 `@discordjs/voice` 라이브러리를 사용하며, `ffmpeg`와 `yt-dlp`를 통해 고성능 오디오 스트리밍 기능을 구현합니다.

## 1. 프로젝트 목표

1. **Type Safety:** TypeScript를 도입하여 런타임 에러를 방지하고 코드의 안정성 및 유지보수성 확보
2. **Process Management:** Node.js의 `child_process`와 비동기 처리를 활용한 효율적인 외부 프로세스(`ffmpeg`, `yt-dlp`) 제어
3. **Stream Architecture:** `prism-media` 및 오디오 파이프라인 직접 제어를 통한 고성능 스트리밍 구현
4. **Environment Consistency:** Docker & Docker Compose를 활용하여 개발 및 배포 환경의 일관성 보장

---

## 2. 기술 스택

- **언어:** TypeScript (Node.js)
- **핵심 라이브러리:**
  - `discord.js`: 디스코드 API 연동
  - `@discordjs/voice`: 디스코드 보이스 채널 및 오디오 제어
  - `prism-media`: 오디오 트랜스코딩 및 스트림 처리
- **오디오 처리:**`ffmpeg`, `yt-dlp`
- **패키지 매니저:** `npm`
- **컨테이너화:** Docker, Docker Compos

---

## 3. 개발 환경 설정

### 3.1. 네이티브 환경 설정

- **Git clone**

```sh
git clone <repository-url>
cd <repository-directory>
```

- **필수 프로그램 설치**
  - **Node.js 22+:** [Official](https://nodejs.org/ko) 에서 설치
  - **yt-dlp:** `winget`, `apt`, `dnf`를 활용하여 설치
  - **ffmpeg:** `winget`, `apt`, `dnf`를 활용하여 설치
- `.env` **파일 설정**
  - 프로젝트 루트 리렉토리에서 `.env`를 생성하여 다음 내용을 추가

```ini
BOT_TOKEN="YOUR_DISCORD_BOT_TOKEN_HERE"
CLIENT_ID="YOUR_BOT_CLIENT_ID_HERE"

GUILD_ID="YOUR_TEST_SERVER_ID_HERE" # (Optional) 봇을 테스트할 특정 서버 ID
```

- **의존성 설치**

```sh
npm install
```

- **봇 실행**

```sh
npm dev
```

### 3.2. Docker Compose 환경

> **목적:** `ffmpeg`, `yt-dlp` 설치 없이, 실제 배포 환경과 동일한 환경에서 테스트

- **Docker 설치 및 `.env` 파일 생성**
- **봇 실행**

```sh
docker compose up --build -d
```

- **로그 확인**

```sh
docker compose logs -f
```

- **종료**

```sh
docker compose down
```

---

## 4. 개발 로드맵

### 4.1. 초기 프로토타입 (Basic Streaming)

- **목표:** `@discordjs/voice`를 사용하여 기본적인 음악 재생 및 큐 기능 구현
- **주요 작업:**
  - 명령어 핸들러 (Command Handler) 구현
  - `AudioPlayer` 및 `VoiceConnection` 상태 관리 모듈화
  - 재생 제어 (Play, Pause, Skip, Queue) 핵심 로직 구현
- **주요 기능:**
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

### 4.2. 모듈화 및 ffmpeg/yt-dlp 직접 제어

- **목표:** `ffmpeg` 직접 제어 및 안정성 강화 전환
- **주요 작업:**
  - `yt-dlp`와 `ffmpeg`를 연동하는 Custom Audio Resource 구현
  - 메모리 누수 방지를 위한 리소스 해제 로직 강화
  - 가사 검색(Lyrics) 및 플레이리스트 지원
- **주요 기능:**
  - [ ] `yt-dlp` Wrapper 모듈 최적화
  - [ ] `ffmpeg` 오디오 필터 (Bass Boost 등) 지원
  - [ ] 에러 핸들링 및 자동 재연결 로직 구현

---

## 5. 팀 개발 규칙

### 5.1. 브랜치 전략

- **GitHub Flow:** `main` 브랜치 보호, 모든 기능 추가는 Feature 브랜치에서 작업하여 PR 진행

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
