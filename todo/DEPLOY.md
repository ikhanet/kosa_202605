# 배포 가이드

ikhanet day03 Todo List — 순수 정적 앱 + Supabase 백엔드

---

## 아키텍처 요약

```
브라우저 (HTML/CSS/JS)
    │
    │  Supabase JS SDK (CDN)
    ▼
Supabase (supabase.com)
    ├── Auth   — 이메일/비밀번호 인증
    └── DB     — todos 테이블 (RLS 적용)
```

빌드 도구 없음. 정적 파일 3개(`index.html`, `style.css`, `script.js`)가 전부.  
별도 서버(Node, Python 등)도 불필요 — 정적 호스팅 어디에나 올릴 수 있다.

---

## 1. 로컬 실행

```bash
# todo 디렉터리에서
python3 -m http.server 8765
```

브라우저에서 `http://localhost:8765/index.html` 접속.

> `file://`로 직접 열면 외부 CSS/JS 로드가 불안정하므로 반드시 HTTP 서버를 경유한다.

---

## 2. Supabase 설정 상태

| 항목 | 값 |
|------|----|
| Project URL | `https://wkxczksgfxuhmfsulwkm.supabase.co` |
| Region | Northeast Asia (Seoul) |
| 인증 방식 | 이메일/비밀번호 |
| 이메일 확인(Confirm email) | **ON** (프로덕션 권장) / 개발 중 OFF 가능 |
| RLS | 활성화 — 로그인한 사용자가 본인 행만 접근 |

### todos 테이블 컬럼

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | bigint PK | 자동 증가 |
| user_id | uuid FK → auth.users | 소유자 |
| text | text | 할일 내용 |
| completed | boolean | 완료 여부 |
| priority | text | high / medium / low |
| position | integer | 드래그앤드롭 순서 |
| created_at | timestamptz | 생성 시각 |

---

## 3. 정적 호스팅 배포

빌드 단계 없이 파일 3개를 그대로 올리면 된다.

### 옵션 A — GitHub Pages (무료, 권장)

1. GitHub 저장소 → **Settings → Pages**
2. Source: `Deploy from a branch`
3. Branch: `main` / Folder: `/ (root)` 또는 해당 하위 경로 선택
4. 저장 → 부여된 URL 확인 (예: `https://<username>.github.io/...`)

> 모노레포 구조라 경로가 깊다. Pages 루트는 저장소 루트부터 시작하므로  
> 실제 접속 URL: `https://<username>.github.io/<repo>/src/exercise/ikhanet/day03/todo/`

### 옵션 B — Netlify Drop (가장 빠름)

1. [https://app.netlify.com/drop](https://app.netlify.com/drop) 접속
2. `todo/` 폴더 전체를 드래그앤드롭
3. 즉시 임시 URL 발급 (`https://xxxx.netlify.app`)

### 옵션 C — Vercel

```bash
npm i -g vercel
cd src/exercise/ikhanet/day03/todo
vercel
```

---

## 4. 배포 후 필수 작업 — Supabase Auth URL 등록

**배포 URL이 바뀔 때마다** Supabase 대시보드에서 허용 URL을 추가해야 한다.  
등록되지 않은 도메인에서 인증하면 로그인이 차단된다.

```
Supabase 대시보드
  → Authentication → URL Configuration
  → Site URL         : https://배포된-도메인 (대표 URL 1개)
  → Redirect URLs    : https://배포된-도메인/** 추가
```

로컬 + 배포 동시 운영 예시:

| 항목 | 값 |
|------|----|
| Site URL | `https://xxxx.netlify.app` |
| Redirect URLs | `https://xxxx.netlify.app/**` |
|               | `http://localhost:8765/**` |

---

## 5. 보안 체크리스트

| 항목 | 상태 | 설명 |
|------|------|------|
| `anon` key를 브라우저에 사용 | ✅ 정상 | 공개 키, RLS로 보호됨 |
| `service_role` key를 브라우저에 미사용 | ✅ 정상 | script.js에 없음 |
| `.env` 파일 커밋 금지 | ⚠️ 확인 필요 | `.gitignore`에 추가 권장 |
| RLS 활성화 | ✅ 완료 | 본인 데이터만 접근 가능 |
| Confirm email (프로덕션) | ⚠️ 확인 필요 | 배포 전 ON으로 설정 |

### .gitignore에 .env 추가

```bash
echo ".env" >> .gitignore
```

> `anon` key는 공개돼도 RLS가 보호하므로 script.js에 하드코딩된 것은 허용 범위다.  
> 단, `service_role` key가 노출되면 RLS를 우회하므로 절대 커밋 금지.

---

## 6. 배포 전 최종 체크리스트

```
□ Supabase Auth → Confirm email ON 확인
□ Supabase Auth → URL Configuration에 배포 도메인 등록
□ .env 파일 .gitignore에 추가
□ 브라우저 콘솔에 에러 없는지 확인
□ 가입 → 로그인 → 할일 추가 → 새로고침 후 유지 → 로그아웃 동선 테스트
□ 다른 계정으로 로그인 시 할일이 분리되는지 확인 (RLS 검증)
```

---

## 7. 환경별 설정 요약

| 환경 | Confirm email | Supabase URL 등록 |
|------|--------------|-------------------|
| 로컬 개발 | OFF 가능 | `http://localhost:8765` |
| 스테이징 | OFF 가능 | 스테이징 도메인 |
| 프로덕션 | **ON** | 프로덕션 도메인 |
