# GitHub Pages 배포 가이드

ikhanet day03 Todo List  
프론트엔드: GitHub Pages / 백엔드: Supabase

---

## 배포 후 최종 URL

```
https://weable-kosa.github.io/kosa-vibecoding-2026-2nd/ikhanet/day03/todo/
```

---

## 구조 개요

```
push to main (todo/** 파일 변경 시)
    │
    ▼ GitHub Actions 자동 실행
src/exercise/ikhanet/day03/todo/  →  gh-pages 브랜치 /ikhanet/day03/todo/
    │
    ▼ GitHub Pages 서빙
https://weable-kosa.github.io/kosa-vibecoding-2026-2nd/ikhanet/day03/todo/
```

> 공유 모노레포이므로 `keep_files: true` 옵션으로 다른 참가자 배포 파일을 건드리지 않는다.

---

## Step 1 — GitHub Actions 워크플로 파일 생성

저장소 루트에 아래 파일을 생성한다.

**경로**: `.github/workflows/deploy-ikhanet-todo.yml`

```yaml
name: Deploy ikhanet Todo to GitHub Pages

on:
  push:
    branches:
      - main
    paths:
      - 'src/exercise/ikhanet/day03/todo/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: src/exercise/ikhanet/day03/todo
          destination_dir: ikhanet/day03/todo
          keep_files: true
          exclude_assets: '.gitignore,*.md,images'
```

> `exclude_assets`: `.gitignore`, `*.md`, `images/` 폴더는 배포에서 제외한다.

---

## Step 2 — GitHub Pages 활성화

1. GitHub → `weable-kosa/kosa-vibecoding-2026-2nd` 저장소
2. **Settings → Pages**
3. Source: **Deploy from a branch**
4. Branch: **`gh-pages`** / Folder: **`/ (root)`** → **Save**

> `gh-pages` 브랜치는 Step 1의 워크플로가 첫 실행될 때 자동 생성된다.  
> Pages 활성화는 브랜치가 존재한 뒤에 해도 된다.

---

## Step 3 — Supabase Auth URL 등록

배포 URL을 Supabase에 허용 목록으로 추가해야 소셜 로그인 리디렉션이 정상 동작한다.

**Supabase 대시보드 → Authentication → URL Configuration**

| 항목 | 값 |
|------|----|
| Site URL | `https://weable-kosa.github.io/kosa-vibecoding-2026-2nd/ikhanet/day03/todo/` |
| Redirect URLs | 아래 두 줄 추가 |

```
https://weable-kosa.github.io/kosa-vibecoding-2026-2nd/ikhanet/day03/todo/**
http://localhost:8765/**
```

> Google / GitHub OAuth App의 Callback URL은 Supabase 콜백 URL을 바라보므로 **변경 불필요**하다.  
> (`https://wkxczksgfxuhmfsulwkm.supabase.co/auth/v1/callback`)

---

## Step 4 — 첫 배포 실행

```bash
# 워크플로 파일 커밋 및 푸시
git add .github/workflows/deploy-ikhanet-todo.yml
git commit -m "feat(todo): GitHub Pages 자동 배포 워크플로 추가"
git pull --no-rebase origin main
git push origin main
```

푸시 후 GitHub → **Actions 탭**에서 워크플로 실행 상태 확인.  
초록 체크 표시가 뜨면 배포 완료.

---

## Step 5 — 배포 확인

브라우저에서 접속:

```
https://weable-kosa.github.io/kosa-vibecoding-2026-2nd/ikhanet/day03/todo/
```

**체크리스트**

```
□ 로그인 화면이 표시된다
□ 이메일/비밀번호 로그인 동작
□ Google 소셜 로그인 동작
□ GitHub 소셜 로그인 동작
□ 할일 추가 / 완료 / 삭제 동작
□ 새로고침 후 데이터 유지 (Supabase 연동 확인)
□ 로그아웃 동작
```

---

## 이후 업데이트 방법

`src/exercise/ikhanet/day03/todo/` 안의 파일을 수정하고 main에 푸시하면  
GitHub Actions가 자동으로 감지해서 재배포한다. 별도 작업 불필요.

---

## 환경별 설정 요약

| 환경 | URL | Supabase Redirect |
|------|-----|-------------------|
| 로컬 | `http://localhost:8765` | `http://localhost:8765/**` |
| 프로덕션 | `https://weable-kosa.github.io/.../todo/` | 위 Redirect URLs에 추가 |
