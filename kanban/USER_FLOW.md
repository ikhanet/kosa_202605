# User Flow — 사용자 흐름도

## 1. 전체 흐름 개요

```mermaid
flowchart TD
    Start([브라우저에서 index.html 열기]) --> Auth{로그인 세션?}
    Auth -->|없음| Login[login.html 이동]
    Auth -->|있음| Invite[pendingInviteToken 확인]
    Invite -->|토큰 있음| JoinBoard[board_members upsert → ?board=ownerID 리다이렉트]
    Invite -->|없음| Load[Supabase에서 보드 데이터 로드]
    Load --> Render[보드 렌더링 + 로그 로드 + Realtime + Presence]
    Render --> Idle{사용자 액션 대기}

    Idle -->|카드 추가 버튼| AddFlow[카드 추가 흐름]
    Idle -->|카드 클릭| ModalFlow[카드 상세 모달 흐름]
    Idle -->|카드 드래그| DragFlow[드래그 앤 드롭 흐름]
    Idle -->|× 버튼| DeleteFlow[카드 삭제 흐름]
    Idle -->|공유 링크 버튼| ShareFlow[초대 링크 생성 흐름]
    Idle -->|로그 버튼| LogFlow[활동 로그 패널 토글]
```

---

## 2. 초기 로딩 흐름

```mermaid
flowchart TD
    A([DOMContentLoaded]) --> B[requireAuth]
    B --> C[URL ?board 파라미터 확인\nbboardOwnerId 결정]
    C --> D[processPendingInvite\nsessionStorage 토큰 확인]
    D -->|토큰 있음| E[board_members upsert → ?board=ownerID 리다이렉트]
    D -->|없음| F[loadBoard from Supabase]
    F --> G[loadActivityLog]
    G --> H[bindColumnEvents + bindAddCardButtons]
    H --> I[initRealtime]
    I --> J[initPresence]
    J --> K[사용자 인터랙션 대기]
```

---

## 3. 카드 추가 흐름

```mermaid
flowchart TD
    A([+ 카드 추가 버튼 클릭]) --> B[인라인 입력창 표시\ntextarea에 포커스]
    B --> C{사용자 입력}

    C -->|추가 클릭 또는 Enter| D{텍스트가 비어있는가?}
    C -->|취소 클릭 또는 ESC| E[입력창 닫기]

    D -->|예| F[shake 애니메이션 경고\n입력창 유지]
    D -->|아니오| G[createCard: 카드 DOM 생성]

    G --> H[saveBoard: Supabase upsert]
    H --> I[logActivity: card_added]
    I --> J[입력창 닫기]

    F --> C
    E --> K([완료])
    J --> K
```

---

## 4. 카드 상세 모달 흐름

```mermaid
flowchart TD
    A([카드 클릭]) --> B{드래그 직후?\n_wasDragged=true}
    B -->|예| C[모달 열지 않음]
    B -->|아니오| D[openCardModal: 기존 값 채우기]
    D --> E{사용자 액션}
    E -->|저장 버튼| F[saveCardModal: dataset 업데이트]
    E -->|취소 / ESC / 오버레이 클릭| G[closeCardModal]
    F --> H[renderCardBadges: 배지 재렌더링]
    H --> I[saveBoard: Supabase upsert]
    I --> J([완료])
    G --> J
    C --> J
```

---

## 5. 드래그 앤 드롭 흐름

```mermaid
flowchart TD
    A([카드 드래그 시작]) --> B[_wasDragged=true\ndragging 클래스 + dataTransfer.set]
    B --> C[드롭 대상 컬럼 위: drag-over 클래스]
    C --> D{드롭 발생}

    D --> E[카드 이동 to 대상 card-list]
    E --> F{컬럼이 변경됐는가?}
    F -->|예| G[updateCardCount\nsaveBoard + logActivity card_moved]
    F -->|아니오| H[saveBoard만]
    G --> I[dragend: dragging 제거]
    H --> I
    I --> J[setTimeout: _wasDragged=false]
    J --> K([완료])
```

---

## 6. 카드 삭제 흐름

```mermaid
flowchart TD
    A([카드 × 버튼 클릭]) --> B[stopPropagation: 모달 열림 방지]
    B --> C[카드 DOM 제거]
    C --> D[updateCardCount]
    D --> E[saveBoard: Supabase upsert]
    E --> F[logActivity: card_deleted]
    F --> G([완료])
```

---

## 7. 초대 링크 공유 흐름

```mermaid
flowchart TD
    A([소유자: 공유 링크 복사 버튼 클릭]) --> B[board_invites INSERT → token UUID]
    B --> C[invite.html?token=UUID 링크 생성]
    C --> D[navigator.clipboard.writeText]
    D --> E[버튼 텍스트 '복사됨!' 2초 표시]

    F([팀원: 링크 클릭]) --> G{로그인 상태?}
    G -->|미로그인| H[sessionStorage에 token 저장]
    H --> I[login.html 이동]
    I --> J[로그인 완료 → index.html]
    J --> K[processPendingInvite 실행]
    G -->|로그인| K
    K --> L[board_invites에서 board_owner_id 조회]
    L --> M[board_members upsert]
    M --> N[index.html?board=ownerID 이동]
```

---

## 8. 실시간 동기화 흐름

```mermaid
flowchart TD
    A([내 변경: saveBoard 호출]) --> B[_justSaved=true]
    B --> C[Supabase upsert]
    C --> D[Realtime 이벤트 수신]
    D -->|_justSaved=true| E[skip: 내 변경 무시]

    F([타인 변경: 다른 탭/사용자]) --> G[Supabase upsert]
    G --> H[Realtime 이벤트 수신]
    H -->|_justSaved=false| I[reloadBoard: DOM 재렌더링]

    J([activity_logs INSERT]) --> K[log-sync 채널 수신]
    K --> L[prependLogItem: 패널 상단에 추가]
```
