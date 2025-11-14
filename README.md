# README.md

<div align="center">
  <img height="150" width="150" src="./docs/img/bot-icon-wt.png" alt="bot-icon"/>
</div>

# croffle-bot

Go 언어를 사용한 디스코드 봇 프로젝트입니다. `discordgo` 라이브러리를 사용하고, \`ffmpeg\`와 \`yt-dlp\`를 통해 음악 재생 기능을 구현합니다.

## 1. 프로젝트 목표

1. Go 언어의 동시성 및 `os/exec`를 활용한 외부 프로세스 제어
2. `dca` 라이브러리를 활용한 프로토 타입 개발
3. `dca`를 제거하고 `ffmpeg` 및 스트리밍 파이프 라인을 구현하여 모듈화 된 봇 구성
4. Docker & Docker Compose를 활용한 일관된 개발 및 배포 환경 구축

---

## 2. 기술 스택

- **언어:** Go
- **핵심 라이브러리:**
    - `github.com/bwmarrin/discordgo`: 디스코드 API 연동
    - `github.com/jonas747/dca`: 디스코드 오디오 인코딩 (초기 프로토타입용)
- **오디오 처리:**`ffmpeg`, `yt-dlp`
- **컨테이너화:** Docker, Docker Compose

---

## 3. 개발 환경 설정

### 3.1. 네이티브 환경 설정

- **Git clone**

```shellscript
git clone <repository-url>
cd <repository-directory>
```

- **필수 프로그램 설치**
    - **Go 1.25+:** [Official](https://go.dev/dl/) 에서 설치
    - **yt-dlp:** `winget`, `apt`, `dnf`를 활용하여 설치
    - **ffmpeg:** `winget`, `apt`, `dnf`를 활용하여 설치
- **`.env`\*\***&#x20;파일 설정\*\*
    - 프로젝트 루트 리렉토리에서 `.env`를 생성하여 다음 내용을 추가

```ini
BOT_TOKEN="YOUR_DISCORD_BOT_TOKEN_HERE"
# (Optional) 봇을 테스트할 특정 서버 ID
GUILD_ID="YOUR_TEST_SERVER_ID_HERE"
```

- **의존성 설치**

```shellscript
go mod tidy
```

- **봇 실행**

```shellscript
cd cmd/croffle-bot
go run .
```

### 3.2. Docker Compose 환경

> **목적:** `ffmpeg`, `yt-dlp` 설치 없이, 실제 배포 환경과 동일한 환경에서 테스트

- **Docker 설치 및&#x20;\*\***`.env`\***\*파일 생성**
- **봇 실행**

```shellscript
docker compose up --build -d
```

- **로그 확인**

```shellscript
docker compose logs -f
```

- **종료**

```shellscript
docker compose down
```

---

## 4. 개발 로드맵

### 4.1. 초기 프로토타입 (dca 사용)

- **목표:**`dca` 라이브러리를 사용하여 기본적인 음악 재생 기능 구현
- **주요 작업:**
- `ffmpeg` 및 `yt-clp` 제어는 `dca`에 위임
- **Queue** 관리 구현
- **재생 제어** (재생, 일시정지, 건너뛰기 등) 구현
- **명령어 처리**: 디스코드 메시지로부터 명령어 파싱 및 실행
- **주요 기능:**
    - [ ] `!join`/`!leave`: 음성 채널 입장/퇴장
    - [ ] `!play <url>`/`!p <url>`: URL 기반 음악 재생
    - [ ] 노래 큐(Queue) 관리
        - [ ] `!skip`: 현재 재생 중인 노래 건너뛰기
        - [ ] `!skipto <큐 번호`>: 특정 번호 노래까지 노래 스킵 (중간 노래 모두 스킵)
        - [ ] `!playnext <url>`: 바로 다음 재생 (우선 예약)
        - [ ] `!pause`/`!resume`: 재생 일시 정지 및 재개
        - [ ] `!remove <큐 번호>`: 큐에서 특정 번호 목록 삭제
        - [ ] `!clear`: 현재 재생 중 곡은 놔두고 큐 초기화
        - [ ] `!stop`: 재생 중지 및 큐 초기화
        - [ ] `!queue`/`!list`: 현재 큐 리스트 출력
    - [ ] 정보 및 상태 확인
        - [ ] `!help`: 봇이 가진 모든 명령어와 사용법 출력
        - [ ] `!ping`: 봇의 현재 반응 속도 출력 (지연 시간 확인)

### 4.2. 모듈화 및 ffmpeg/yt-dlp 직접 제어

- **목표:**`dca` 제거, `ffmpeg` 및 `yt-dlp` 직접 제어로 전환
- **주요 작업:**
    - `os/exec` 패키지를 사용하여 \`ffmpeg\` 및 \`yt-dlp\` 프로세스 직접 관리
    - `io.Pipe`를 통해 \`ffmpeg\` 출력 스트림을 디스코드 오디오 스트림에 연결
    - 음악 재생 로직 모듈화 (음악 엔진 분리)
- **주요 기능:&#x20;**
    - [ ] `dca` 모듈을 제거하고 \`streaming\` 모듈 구현
    - [ ] `yt-dlp` Wrapper 구현
    - [ ] `ffmpeg` pipeline 제어 로직 구현
    - [ ] 성능 및 안정성 최적화

---

## 5. 팀 개발 규칙

5.**1. 브랜치 전략**

- GitHub Flow: 메인 레포지토리를 각 개발자가 Fork 하여 개발하고, PR

  5.**2. 작업 흐름**

1. `upstream`에서 `fetch` 하여 최신 코드가 있는지 확인
2. `upstream`의 `master`로부터 로컬의 `master`를 업데이트(`merge`/`pull`)
3. 각 개발자의 fork 된 레포지토리인 `origin`에 push하여 동기화
4. 브랜치를 분기하여 작업을 수행
5. 개발이 완료되면 `<user>/feat/<branch>`로부터 `Team-Croffle/master`로 PR을 생성

5.**3. Commit Convention**

- `feat`: 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정 (README 등)
- `refactor`: 코드 리팩토링
- `style`: 코드 스타일 수정 (포매팅)
