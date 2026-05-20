# Design System — 기초 디자인 시스템

---

## 1. 색상 팔레트

### 기본 색상

| 토큰 | CSS 변수 | Hex | 용도 |
|------|----------|-----|------|
| Primary Blue | `--color-todo` | `#3B82F6` | To-Do 컬럼 헤더 |
| Primary Yellow | `--color-inprogress` | `#F59E0B` | In-Progress 컬럼 헤더 |
| Primary Green | `--color-done` | `#10B981` | Done 컬럼 헤더 |
| Background | `--color-bg` | `#F1F5F9` | 보드 배경 |
| Surface | `--color-surface` | `#FFFFFF` | 카드, 컬럼 배경 |
| Column BG | `--color-column-bg` | `#E2E8F0` | 컬럼 바디 배경 |

### 텍스트 색상

| 토큰 | CSS 변수 | Hex | 용도 |
|------|----------|-----|------|
| Text Primary | `--color-text-primary` | `#1E293B` | 카드 본문, 헤더 |
| Text Secondary | `--color-text-secondary` | `#64748B` | 카드 수 뱃지, 보조 텍스트 |
| Text on Color | `--color-text-on-color` | `#FFFFFF` | 컬럼 헤더 텍스트 |

### 상태 색상

| 토큰 | CSS 변수 | Hex | 용도 |
|------|----------|-----|------|
| Drag Over | `--color-drag-over` | `#DBEAFE` | 드롭 대상 컬럼 배경 |
| Drag Over Border | `--color-drag-border` | `#93C5FD` | 드롭 대상 컬럼 테두리 |
| Delete Hover | `--color-delete-hover` | `#EF4444` | × 버튼 hover |

---

## 2. 타이포그래피

| 토큰 | CSS 변수 | 값 | 용도 |
|------|----------|----|------|
| Font Family | `--font-base` | `'Segoe UI', system-ui, sans-serif` | 전체 기본 폰트 |
| Size XL | `--font-xl` | `20px` | 보드 타이틀 |
| Size LG | `--font-lg` | `16px` | 컬럼 헤더 |
| Size MD | `--font-md` | `14px` | 카드 텍스트, 버튼 |
| Size SM | `--font-sm` | `12px` | 카드 수 뱃지 |
| Weight Bold | `--font-bold` | `600` | 헤더, 버튼 |
| Weight Normal | `--font-normal` | `400` | 카드 본문 |

---

## 3. 간격 (Spacing)

| 토큰 | CSS 변수 | 값 | 용도 |
|------|----------|----|------|
| Space XS | `--space-xs` | `4px` | 뱃지 패딩 |
| Space SM | `--space-sm` | `8px` | 카드 내부 패딩 |
| Space MD | `--space-md` | `12px` | 카드 간격, 입력창 패딩 |
| Space LG | `--space-lg` | `16px` | 컬럼 패딩 |
| Space XL | `--space-xl` | `24px` | 보드 패딩, 컬럼 간격 |

---

## 4. 테두리 & 그림자

| 토큰 | CSS 변수 | 값 |
|------|----------|----|
| Radius SM | `--radius-sm` | `6px` |
| Radius MD | `--radius-md` | `10px` |
| Radius LG | `--radius-lg` | `14px` |
| Shadow Card | `--shadow-card` | `0 1px 3px rgba(0,0,0,0.10)` |
| Shadow Card Hover | `--shadow-hover` | `0 4px 12px rgba(0,0,0,0.15)` |
| Shadow Column | `--shadow-column` | `0 2px 8px rgba(0,0,0,0.08)` |

---

## 5. 컴포넌트 스펙

### Board (보드)
- 배경: `--color-bg`
- 패딩: `--space-xl`
- 레이아웃: `display: flex; gap: --space-xl`

### Column (컬럼)
- 너비: `300px` (고정)
- 배경: `--color-column-bg`
- 테두리 반경: `--radius-lg`
- 박스 그림자: `--shadow-column`

```
┌─────────────────────────┐
│  [헤더 색상] 컬럼 제목 [3] │  ← column-header (패딩 16px)
├─────────────────────────┤
│  ┌─────────────────────┐│
│  │  카드 텍스트         ││  ← .card (마진 8px, 패딩 12px)
│  │                  [×]││
│  └─────────────────────┘│
│  ┌─────────────────────┐│
│  │  카드 텍스트 2       ││
│  └─────────────────────┘│
│                          │
│  + 카드 추가             │  ← .btn-add (패딩 8px 16px)
└─────────────────────────┘
```

### Card (카드)
- 배경: `--color-surface`
- 패딩: `--space-md`
- 테두리 반경: `--radius-sm`
- 박스 그림자: `--shadow-card`
- Hover: `transform: translateY(-2px)`, `--shadow-hover`
- Dragging: `opacity: 0.4`

### Button — + 카드 추가
- 배경: 투명
- 텍스트: `--color-text-secondary`
- Hover: 배경 `rgba(0,0,0,0.05)`
- 너비: 100%

### Button — 삭제 (×)
- 크기: `20px × 20px`
- 배경: 투명, Hover: `--color-delete-hover`
- 텍스트: `--color-text-secondary`

### 입력창 (card-input-form)
- textarea: 너비 100%, 높이 `80px`, 테두리 `1px solid #CBD5E1`
- 포커스: 테두리 `--color-todo`
- 확인 버튼: 배경 `--color-todo`, 텍스트 흰색
- 취소 버튼: 배경 투명, 텍스트 `--color-text-secondary`

---

### Card Badge (카드 배지)

```
.card (flex-direction: column)
  .card-header (flex-direction: row)
    .card-text (flex: 1)
    .card-delete (20px × 20px)
  .card-badges (flex-wrap: wrap, gap: 4px)
    .badge (우선순위 — 색상 inline style)
    .badge-due (마감일 — 회색, 초과 시 빨강)
    .badge-tag (태그 — 파란색)
```

배지 공통: `font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 99px; color: white`

| 배지 유형 | 배경색 | 조건 |
|-----------|--------|------|
| 우선순위 높음 | `#EF4444` | `priority = "high"` |
| 우선순위 보통 | `#F59E0B` | `priority = "medium"` |
| 우선순위 낮음 | `#10B981` | `priority = "low"` |
| 마감일 | `--color-text-secondary` | `dueDate` 있음 |
| 마감일 초과 | `--color-delete-hover` | `dueDate < today` |
| 태그 | `--color-todo` | `tags[]` 각 항목 |

### Card Modal (카드 상세 모달)

- `position: fixed; inset: 0; z-index: 100`
- 배경: `rgba(0,0,0,0.5)` 반투명 오버레이
- 모달 박스: `max-width: 480px; padding: 24px; border-radius: --radius-lg`
- `.hidden` 시 `display: none`

### Log Panel (활동 로그 사이드패널)

- `position: fixed; top: 57px; right: 0; width: 300px; z-index: 50`
- `.hidden` 시 `transform: translateX(100%)` (슬라이드 아웃, `transition: 250ms ease`)
- 로그 항목: `.log-item` — 배경 `--color-bg`, 패딩 `8px 12px`

### Avatars (프레전스 아바타)

- 헤더 중앙 배치, `display: flex`
- 각 아바타: `width: 28px; height: 28px; border-radius: 50%; border: 2px solid white`
- 겹치기: `margin-left: -6px` (첫 번째는 0)
- 배경: `--color-todo` (파란색), 텍스트: 이메일 첫 글자 대문자

---

## 6. 애니메이션

| 상황 | 효과 | 값 |
|------|------|----|
| 카드 hover | translateY 이동 | `transform: translateY(-2px); transition: 150ms ease` |
| 카드 생성 | 페이드 인 | `animation: fadeIn 200ms ease` |
| 드래그 피드백 | 투명도 | `opacity: 0.4; transition: opacity 150ms` |
| 입력창 열기 | 슬라이드 다운 | `animation: slideDown 150ms ease` |

---

## 7. CSS 변수 전체 선언 (`:root`)

```css
:root {
  /* Colors */
  --color-todo: #3B82F6;
  --color-inprogress: #F59E0B;
  --color-done: #10B981;
  --color-bg: #F1F5F9;
  --color-surface: #FFFFFF;
  --color-column-bg: #E2E8F0;
  --color-text-primary: #1E293B;
  --color-text-secondary: #64748B;
  --color-text-on-color: #FFFFFF;
  --color-drag-over: #DBEAFE;
  --color-drag-border: #93C5FD;
  --color-delete-hover: #EF4444;

  /* Typography */
  --font-base: 'Segoe UI', system-ui, sans-serif;
  --font-xl: 20px;
  --font-lg: 16px;
  --font-md: 14px;
  --font-sm: 12px;
  --font-bold: 600;
  --font-normal: 400;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;

  /* Border & Shadow */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --shadow-card: 0 1px 3px rgba(0,0,0,0.10);
  --shadow-hover: 0 4px 12px rgba(0,0,0,0.15);
  --shadow-column: 0 2px 8px rgba(0,0,0,0.08);
}
```
