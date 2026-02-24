/* =========================================================
  shop01.js
  목표:
  - 서버 없이(HTML+CSS+JS만) 예약 UI를 "영상처럼" 동작시키기
  - 날짜/인원/시간 선택 → 바로 예약
  - 예약 완료된 시간대는 다시 선택 불가
  - 예약 마감 시간대도 선택 불가(더미 규칙으로 표시)
  - 메뉴 "구성 보기" 토글은 기존 방식 그대로 유지
========================================================= */

/* =========================================================
  [전역 상태]
  - 서버가 없으므로 "이미 예약한 시간"을 브라우저 메모리에만 저장(Set)
  - 새로고침하면 초기화(요구사항: 항상 업데이트 필요 X)
========================================================= */
const reserveState = {
  selectedDateKey: null,  // "YYYY-MM-DD"
  selectedPeople: "2명",
  selectedTime: null,     // "19:00"
  reservedSlots: new Set(), // "YYYY-MM-DD__HH:MM"
};

/* =========================================================
  함수: $(selector)
  매개변수: selector(string)
  반환값: Element|null
  기능: DOM 요소 1개 빠르게 찾기
  작동원리: document.querySelector 호출
========================================================= */
function $(selector) {
  return document.querySelector(selector);
}

/* =========================================================
  함수: dateKey(dateObj)
  매개변수: dateObj(Date)
  반환값: string ("YYYY-MM-DD")
  기능: 날짜를 비교/저장하기 쉬운 키로 변환
  작동원리: getFullYear/getMonth/getDate로 문자열 조합
========================================================= */
function dateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* =========================================================
  함수: weekdayKorean(dateObj)
  매개변수: dateObj(Date)
  반환값: string ("월"~"일")
  기능: 요일 한글 반환
  작동원리: getDay() 결과를 배열 인덱싱
========================================================= */
function weekdayKorean(dateObj) {
  const w = ["일", "월", "화", "수", "목", "금", "토"];
  return w[dateObj.getDay()];
}

/* =========================================================
  함수: makeNextDates(n)
  매개변수: n(number) - 앞으로 n일 생성
  반환값: Date[]
  기능: 오늘부터 n일치 Date 배열 생성
  작동원리: for문 반복 + setDate(today+i)
========================================================= */
function makeNextDates(n) {
  const out = [];
  const base = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push(d);
  }
  return out;
}

/* =========================================================
  함수: slotKey(dateKeyStr, timeStr)
  매개변수: dateKeyStr(string), timeStr(string)
  반환값: string
  기능: 예약 완료 슬롯을 식별하는 고유키 생성
  작동원리: 문자열 결합
========================================================= */
function slotKey(dateKeyStr, timeStr) {
  return `${dateKeyStr}__${timeStr}`;
}

/* =========================================================
  함수: isReservedSlot(dateKeyStr, timeStr)
  매개변수: dateKeyStr(string), timeStr(string)
  반환값: boolean
  기능: 해당 시간대가 이미 예약 완료인지 확인
  작동원리: Set.has()
========================================================= */
function isReservedSlot(dateKeyStr, timeStr) {
  return reserveState.reservedSlots.has(slotKey(dateKeyStr, timeStr));
}

/* =========================================================
  함수: buildTimeSlots(dateKeyStr)
  매개변수: dateKeyStr(string)
  반환값: {time:string, closed:boolean}[]
  기능:
    - 영상처럼 "예약 마감" 시간이 섞여 보이도록 더미 시간표 생성
    - closed=true면 예약 마감(선택 불가)
  작동원리:
    - 날짜 문자열을 seed로 만들어 일부 시간만 마감 처리
    - forEach/map 반복문 사용
========================================================= */
function buildTimeSlots(dateKeyStr) {
  const baseTimes = ["18:00", "18:30", "19:00", "19:30", "20:00"];

  // 날짜 문자열을 숫자 seed로 변환(항상 같은 날짜는 같은 마감 패턴)
  let seed = 0;
  for (let i = 0; i < dateKeyStr.length; i++) seed += dateKeyStr.charCodeAt(i);

  // 특정 날짜는 전부 마감(예약 불가 테스트용)
  const allClosed = seed % 11 === 0;

  return baseTimes.map((t, idx) => {
    if (allClosed) return { time: t, closed: true };
    const closed = (seed + idx) % 3 === 0; // 일부만 마감
    return { time: t, closed };
  });
}

/* =========================================================
  함수: hasAnyAvailableTime(dateKeyStr)
  매개변수: dateKeyStr(string)
  반환값: boolean
  기능:
    - 예약 가능: (마감 아님) && (예약완료 아님) 시간 1개라도 있으면 true
    - 예약 불가: 위 조건이 0개면 false
  작동원리:
    - for..of로 슬롯 순회
    - if로 마감/예약완료 건너뛰기
========================================================= */
function hasAnyAvailableTime(dateKeyStr) {
  const slots = buildTimeSlots(dateKeyStr);
  for (const s of slots) {
    if (s.closed) continue;
    if (isReservedSlot(dateKeyStr, s.time)) continue;
    return true;
  }
  return false;
}

/* =========================================================
  함수: ensureSelectedDate()
  매개변수: 없음
  반환값: 없음
  기능:
    - 선택된 날짜가 없거나,
    - 선택된 날짜가 "예약 불가"가 되었으면
      다음 가능한 날짜로 자동 선택(영상처럼 흐름 유지)
  작동원리:
    - makeNextDates(5) 반복
    - 첫 번째 예약 가능한 날짜를 찾으면 state 업데이트
========================================================= */
function ensureSelectedDate() {
  const dates = makeNextDates(5).map(dateKey);
  const current = reserveState.selectedDateKey;

  if (current && hasAnyAvailableTime(current)) return;

  for (const dk of dates) {
    if (hasAnyAvailableTime(dk)) {
      reserveState.selectedDateKey = dk;
      reserveState.selectedTime = null; // 날짜 바꾸면 시간 재선택
      return;
    }
  }

  // 전부 예약 불가라면 null로 둠
  reserveState.selectedDateKey = null;
  reserveState.selectedTime = null;
}

/* =========================================================
  함수: renderReserveSummary()
  매개변수: 없음
  반환값: 없음
  기능: 상단 요약 텍스트 갱신
  작동원리: if로 선택 상태 분기
========================================================= */
function renderReserveSummary() {
  const el = $("#reserveSummary");
  if (!el) return;

  if (!reserveState.selectedDateKey) {
    el.textContent = "예약 가능한 날짜가 없습니다.";
    return;
  }

  const timeText = reserveState.selectedTime ? reserveState.selectedTime : "미선택";
  el.textContent = `선택: ${reserveState.selectedDateKey} · ${reserveState.selectedPeople} · ${timeText}`;
}

/* =========================================================
  함수: renderDates()
  매개변수: 없음
  반환값: 없음
  기능:
    - 5일 날짜 버튼 생성
    - 각 날짜를 "예약 가능/예약 불가"로 표시
    - 예약 불가 날짜는 disabled 처리(선택 불가)
  작동원리:
    - forEach로 버튼 DOM 생성
    - hasAnyAvailableTime로 가능/불가 판단
========================================================= */
function renderDates() {
  const row = $("#dateRow");
  if (!row) return;
  row.innerHTML = "";

  const dates = makeNextDates(5);
  dates.forEach((d, idx) => {
    const dk = dateKey(d);
    const ok = hasAnyAvailableTime(dk);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pill";
    btn.dataset.role = "reserveDate";
    btn.dataset.dateKey = dk;

    const label =
      idx === 0
        ? `오늘(${weekdayKorean(d)})`
        : idx === 1
        ? `내일(${weekdayKorean(d)})`
        : `${d.getMonth() + 1}.${d.getDate()}(${weekdayKorean(d)})`;

    btn.innerHTML = `${label}<br><span class="small">${ok ? "예약 가능" : "예약 불가"}</span>`;

    if (reserveState.selectedDateKey === dk) btn.classList.add("on");

    if (!ok) {
      btn.classList.add("disabled");
      btn.disabled = true;
    }

    row.appendChild(btn);
  });
}

/* =========================================================
  함수: renderPeople()
  매개변수: 없음
  반환값: 없음
  기능: 인원(2~5명) 버튼 생성 + 단일 선택
  작동원리: forEach 반복 + state 비교로 on 표시
========================================================= */
function renderPeople() {
  const row = $("#peopleRow");
  if (!row) return;
  row.innerHTML = "";

  ["2명", "3명", "4명", "5명"].forEach((p) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pill";
    btn.dataset.role = "reservePeople";
    btn.dataset.people = p;
    btn.textContent = p;

    if (reserveState.selectedPeople === p) btn.classList.add("on");
    row.appendChild(btn);
  });
}

/* =========================================================
  함수: renderTimes()
  매개변수: 없음
  반환값: 없음
  기능:
    - 선택된 날짜의 시간 버튼 생성
    - 예약 마감/예약 완료는 disabled 처리
  작동원리:
    - buildTimeSlots로 슬롯 생성
    - forEach로 버튼 생성
    - if로 상태(마감/예약완료/선택) 반영
========================================================= */
function renderTimes() {
  const grid = $("#timeGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const dk = reserveState.selectedDateKey;
  if (!dk) return;

  const slots = buildTimeSlots(dk);
  slots.forEach((s) => {
    const reserved = isReservedSlot(dk, s.time);
    const disabled = s.closed || reserved;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pill";
    btn.dataset.role = "reserveTime";
    btn.dataset.time = s.time;

    let suffix = "";
    if (s.closed) suffix = " (예약 마감)";
    else if (reserved) suffix = " (예약 완료)";

    btn.textContent = s.time + suffix;

    if (reserveState.selectedTime === s.time) btn.classList.add("on");

    if (disabled) {
      btn.classList.add("disabled");
      btn.disabled = true;
    }

    grid.appendChild(btn);
  });
}

/* =========================================================
  함수: syncReserveButtons()
  매개변수: 없음
  반환값: 없음
  기능:
    - 페이지 안 예약하기(#reserveBtn)와 하단 예약하기(#bottomReserveBtn)
      활성/비활성 동기화
  작동원리: if(선택된 날짜+시간 존재 여부)로 disabled 제어
========================================================= */
function syncReserveButtons() {
  const canReserve = Boolean(reserveState.selectedDateKey && reserveState.selectedTime);
  const topBtn = $("#reserveBtn");
  const bottomBtn = $("#bottomReserveBtn");

  if (topBtn) topBtn.disabled = !canReserve;
  if (bottomBtn) bottomBtn.disabled = !canReserve;
}

/* =========================================================
  함수: renderReserveUI()
  매개변수: 없음
  반환값: 없음
  기능: 예약 UI 전체 렌더(상태→화면)
  작동원리: 여러 render 함수를 순서대로 호출
========================================================= */
function renderReserveUI() {
  ensureSelectedDate();
  renderDates();
  renderPeople();
  renderTimes();
  renderReserveSummary();
  syncReserveButtons();
}

/* =========================================================
  함수: reserveNow()
  매개변수: 없음
  반환값: 없음
  기능:
    - 현재 선택된 날짜/시간을 "예약 완료"로 처리
    - 같은 시간대 재예약 불가
    - 예약 직후 UI 갱신 + 알림
  작동원리:
    - if로 유효성 검사
    - Set.add로 예약 저장
    - 선택 시간 초기화 후 재렌더
========================================================= */
function reserveNow() {
  const dk = reserveState.selectedDateKey;
  const t = reserveState.selectedTime;

  if (!dk) {
    alert("예약 가능한 날짜가 없습니다.");
    return;
  }
  if (!t) {
    alert("시간을 선택해 주세요.");
    return;
  }

  // 안전장치(원래는 disabled로 클릭 자체가 안 되지만, 혹시 모를 경우)
  const slotList = buildTimeSlots(dk);
  const slot = slotList.find((x) => x.time === t);
  if (!slot || slot.closed) {
    alert("해당 시간은 예약 마감입니다.");
    return;
  }
  if (isReservedSlot(dk, t)) {
    alert("이미 예약 완료된 시간입니다.");
    return;
  }

  reserveState.reservedSlots.add(slotKey(dk, t));
  alert("예약이 완료되었습니다.");

  // 예약 직후: 시간 선택 해제(다음 예약을 위해)
  reserveState.selectedTime = null;

  // ✅ 예약 후 그 날짜가 더 이상 예약 가능 시간이 없으면
  // ensureSelectedDate()가 자동으로 다음 가능한 날짜로 이동시킴
  renderReserveUI();
}

/* =========================================================
  이벤트: 클릭(이벤트 위임)
  - menuToggle(기존 기능) 유지
  - 예약 날짜/인원/시간 선택 처리 추가
========================================================= */
document.addEventListener("click", (e) => {
  // 1) 메뉴 구성 보기 토글(기존)
  const toggleBtn = e.target.closest('[data-role="menuToggle"]');
  if (toggleBtn) {
    const targetId = toggleBtn.dataset.target;
    if (!targetId) return;

    const detail = document.getElementById(targetId);
    if (!detail) return;

    const isHidden = detail.hasAttribute("hidden");
    if (isHidden) {
      detail.removeAttribute("hidden");
      toggleBtn.textContent = "접기";
    } else {
      detail.setAttribute("hidden", "");
      toggleBtn.textContent = "구성 보기";
    }
    return;
  }

  // 2) 예약 날짜 선택
  const dateBtn = e.target.closest('button[data-role="reserveDate"]');
  if (dateBtn) {
    const dk = dateBtn.dataset.dateKey;
    reserveState.selectedDateKey = dk;
    reserveState.selectedTime = null; // 날짜 바꾸면 시간 다시 선택
    renderReserveUI();
    return;
  }

  // 3) 인원 선택
  const peopleBtn = e.target.closest('button[data-role="reservePeople"]');
  if (peopleBtn) {
    reserveState.selectedPeople = peopleBtn.dataset.people || "2명";
    renderReserveUI();
    return;
  }

  // 4) 시간 선택
  const timeBtn = e.target.closest('button[data-role="reserveTime"]');
  if (timeBtn) {
    if (timeBtn.disabled) return; // 예약마감/예약완료 방어
    reserveState.selectedTime = timeBtn.dataset.time || null;
    renderReserveUI();
    return;
  }
});

/* =========================================================
  초기화: DOMContentLoaded
  - 예약 UI 렌더
  - 예약하기 버튼(상단/하단) 클릭 연결
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  renderReserveUI();

  const topReserveBtn = $("#reserveBtn");
  const bottomReserveBtn = $("#bottomReserveBtn");

  if (topReserveBtn) topReserveBtn.addEventListener("click", reserveNow);
  if (bottomReserveBtn) bottomReserveBtn.addEventListener("click", reserveNow);
});