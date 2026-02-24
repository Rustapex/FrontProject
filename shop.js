/* =========================================================
  이 페이지 JS의 목표
  - (1) 더미 데이터로 화면을 채운다(조건7)
  - (2) 예약 기능:
      * 날짜/인원/시간 선택
      * "예약 가능" = 남은 시간이 1개라도 있음
      * "예약 불가" = 남은 시간이 0개(=전부 마감 or 전부 예약완료)
      * 예약하기 누르면 선택한 시간만 예약완료 처리
  - (3) 메뉴 펼치기(세트 구성 확인)
  - (4) 하단 예약하기 버튼: 선택 상태가 없으면 예약 섹션으로 이동
========================================================= */

/* -----------------------------
  [더미 데이터] (조건8: 최대한 간단)
------------------------------ */
const SHOP = {
  id: "shop-001",
  heroImg:
    "https://images.unsplash.com/photo-1555992336-cbf7c366f2a2?auto=format&fit=crop&w=1200&q=60",
  name: "더미 이탈리안 클럽",
  rating: 4.4,
  reviews: 2691,
  category: "양식",
  area: "삼성",
  way: "2호선 삼성역 5번 출구",
  price: "점심 3~5만원 · 저녁 7~10만원",
  openHours: "11:30~22:00 (브레이크타임 15:00~17:00)",
  address: "서울 강남구 테헤란로 000 (더미)",
  walk: "삼성역 5번 출구에서 도보 6분",
  phone: "02-000-0000",
  closedDay: "매주 월요일",
  menus: [
    {
      id: "m1",
      name: "런치 코스",
      price: "39,000원",
      items: ["샐러드", "파스타", "디저트", "커피/티"],
    },
    {
      id: "m2",
      name: "디너 코스",
      price: "79,000원",
      items: ["전채 2종", "스테이크", "파스타", "디저트", "와인(선택)"],
    },
  ],
};

/* -----------------------------
  [예약 상태]
  - 예약은 "날짜+시간" 단위로 저장해야
    날짜 버튼이 남은 시간에 따라 예약 가능/불가로 바뀐다.
------------------------------ */
const state = {
  selectedDateKey: null, // 예: "2026-02-24"
  selectedPeople: "2명",
  selectedTime: null, // 예: "19:00"
  reservedSlots: loadReservedSlots(), // Set 형태
  calendarCursor: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
};

function getPeopleOptions() {
  const appRoot = document.querySelector("main.app");
  if (appRoot?.dataset.peopleRange === "1-9plus") {
    return ["1명", "2명", "3명", "4명", "5명", "6명", "7명", "8명", "9명이상"];
  }
  return ["2명", "3명", "4명", "5명"];
}

function applyPageDefaults() {
  const appRoot = document.querySelector("main.app");
  const defaultPeople = appRoot?.dataset.defaultPeople;
  if (defaultPeople) state.selectedPeople = defaultPeople;
}

/* =========================================================
  함수: $(selector)
  매개변수: selector (string) - CSS 선택자
  반환값: Element | null
  기능: document.querySelector를 짧게 쓰기 위한 헬퍼
  작동원리: 브라우저 DOM API 호출 (반복문/조건문 없음)
  왜 만들었나: 코드 길이를 줄이면서 가독성을 높이려고
========================================================= */
function $(selector) {
  return document.querySelector(selector);
}

/* =========================================================
  함수: loadReservedSlots
  매개변수: 없음
  반환값: Set<string>
  기능: localStorage에서 예약완료된 (날짜+시간) 목록을 불러온다.
  작동원리:
    - try/catch로 JSON 파싱 실패를 방어(예외처리 최소)
    - 배열을 Set으로 변환
  왜 만들었나:
    - 새로고침해도 "예약 완료"가 유지되면 테스트가 편함(필수는 아니지만 유용)
========================================================= */
function loadReservedSlots() {
  try {
    const raw = localStorage.getItem("demo_reserved_slots");
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/* =========================================================
  함수: saveReservedSlots
  매개변수: 없음
  반환값: 없음
  기능: 현재 예약완료 상태(Set)를 localStorage에 저장
  작동원리:
    - Set → Array로 변환해서 JSON.stringify
  왜 만들었나:
    - 예약 상태를 간단하게 유지하려고
========================================================= */
function saveReservedSlots() {
  localStorage.setItem(
    "demo_reserved_slots",
    JSON.stringify(Array.from(state.reservedSlots))
  );
}

/* =========================================================
  함수: dateKey(dateObj)
  매개변수: dateObj (Date)
  반환값: string ("YYYY-MM-DD")
  기능: 날짜를 비교/저장하기 쉬운 key로 변환
  작동원리:
    - Date에서 년/월/일 뽑아 문자열 결합
  왜 만들었나:
    - Date 객체끼리 비교는 까다로워서 key가 필요
========================================================= */
function dateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthLabel(dateObj) {
  return `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월`;
}

function isPastDate(dateObj) {
  const t = new Date();
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return dateObj < today;
}

/* =========================================================
  함수: makeNextDates(n)
  매개변수: n (number) - 앞으로 몇 일치 만들지
  반환값: Date[] 배열
  기능: 오늘부터 n일치 Date 배열 생성
  작동원리:
    - for문으로 i=0..n-1 반복
    - new Date()에 setDate(today + i)
  왜 만들었나:
    - “고정된 5일만 보이게” 같은 요구를 쉽게 만족
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
  함수: weekdayKorean(dateObj)
  매개변수: dateObj (Date)
  반환값: string ("월"~"일")
  기능: 요일 한글 텍스트 반환
  작동원리:
    - Date.getDay()는 0(일)~6(토)
    - 배열 인덱싱으로 변환
========================================================= */
function weekdayKorean(dateObj) {
  const w = ["일", "월", "화", "수", "목", "금", "토"];
  return w[dateObj.getDay()];
}

/* =========================================================
  함수: buildTimeSlots(shopId, dateKeyStr)
  매개변수:
    - shopId (string)
    - dateKeyStr (string) "YYYY-MM-DD"
  반환값: {time:string, closed:boolean}[]
  기능:
    - 특정 날짜의 "기본 시간표"를 만들고,
      일부 시간은 "예약 마감(closed)" 처리한다.
  작동원리:
    - 문자열 seed를 만들어 charCode 합으로 숫자화
    - (seed + idx) % 3 === 0 같은 규칙으로 일부 마감
  왜 만들었나:
    - 서버 없이도 "마감된 시간"이 있는 것처럼 보이게 하려고(클론 느낌)
========================================================= */
function buildTimeSlots(shopId, dateKeyStr) {
  const base = ["18:00", "18:30", "19:00", "19:30", "20:00"];

  const seedStr = `${shopId}__${dateKeyStr}`;
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed += seedStr.charCodeAt(i);

  // 특정 날은 전부 마감되게(예약 불가 테스트용)
  const allClosed = seed % 11 === 0;

  return base.map((t, idx) => {
    if (allClosed) return { time: t, closed: true };
    const closed = (seed + idx) % 3 === 0;
    return { time: t, closed };
  });
}

/* =========================================================
  함수: slotKey(shopId, dateKeyStr, time)
  매개변수: shopId(string), dateKeyStr(string), time(string)
  반환값: string
  기능: 예약완료를 저장하기 위한 고유 키 생성
  작동원리: 문자열 결합
  왜 만들었나:
    - 날짜 단위 예약이 아니라 "시간 단위" 예약을 저장해야
      날짜 버튼이 남은 시간 기준으로 '예약 불가'가 가능
========================================================= */
function slotKey(shopId, dateKeyStr, time) {
  return `${shopId}__${dateKeyStr}__${time}`;
}

/* =========================================================
  함수: isReservedSlot(shopId, dateKeyStr, time)
  매개변수: shopId, dateKeyStr, time
  반환값: boolean
  기능: 해당 시간 슬롯이 이미 예약완료인지 확인
  작동원리: Set.has()
========================================================= */
function isReservedSlot(shopId, dateKeyStr, time) {
  return state.reservedSlots.has(slotKey(shopId, dateKeyStr, time));
}

/* =========================================================
  함수: hasAnyAvailableTime(dateKeyStr)
  매개변수: dateKeyStr(string)
  반환값: boolean
  기능:
    - "예약 가능" = (마감 아님) AND (예약완료 아님) 시간 1개라도 있으면 true
    - "예약 불가" = 위 조건 시간 0개면 false
  작동원리:
    - for..of 반복문으로 슬롯을 훑으며
      if로 마감/예약완료를 건너뜀
  왜 만들었나:
    - 요구사항의 핵심 규칙(예약 가능/불가 표시)을 한 곳에서 결정하려고
========================================================= */
function hasAnyAvailableTime(dateKeyStr) {
  const slots = buildTimeSlots(SHOP.id, dateKeyStr);
  for (const s of slots) {
    if (s.closed) continue;
    if (isReservedSlot(SHOP.id, dateKeyStr, s.time)) continue;
    return true;
  }
  return false;
}

/* =========================================================
  함수: render()
  매개변수: 없음
  반환값: 없음
  기능: 현재 state를 바탕으로 화면 전체를 갱신
  작동원리:
    - 여러 작은 render 함수를 순서대로 호출
  왜 만들었나:
    - “상태 → 화면” 흐름을 단순화(버그 줄이기)
========================================================= */
function render() {
  renderShopInfo();
  renderDates();
  renderPeople();
  renderTimes();
  renderSummary();
  renderMenu();
  renderReserveButtons();
}

function setReservePanel(open) {
  const panel = $("#reservePanel");
  const toggleBtn = $("#reserveToggleBtn");
  if (!panel || !toggleBtn) return;

  panel.classList.toggle("active", open);
  toggleBtn.classList.toggle("is-open", open);
}

function initReservePanel() {
  const toggleBtn = $("#reserveToggleBtn");
  if (!toggleBtn) return;

  const prevBtn = $("#calPrevBtn");
  const nextBtn = $("#calNextBtn");
  const peopleRow = $("#peopleRow");

  initGrabScroll(peopleRow);

  toggleBtn.addEventListener("click", () => {
    const panel = $("#reservePanel");
    if (!panel) return;
    const shouldOpen = !panel.classList.contains("active");
    setReservePanel(shouldOpen);
  });

  prevBtn?.addEventListener("click", () => {
    state.calendarCursor = new Date(
      state.calendarCursor.getFullYear(),
      state.calendarCursor.getMonth() - 1,
      1
    );
    state.selectedDateKey = null;
    state.selectedTime = null;
    render();
  });

  nextBtn?.addEventListener("click", () => {
    state.calendarCursor = new Date(
      state.calendarCursor.getFullYear(),
      state.calendarCursor.getMonth() + 1,
      1
    );
    state.selectedDateKey = null;
    state.selectedTime = null;
    render();
  });
}

/* ---- 화면 채우기(더미 데이터) ---- */
function renderShopInfo() {
  const appRoot = document.querySelector("main.app");
  if (appRoot?.dataset.staticShopInfo === "true") return;

  const heroImgEl = $("#heroImg");
  if (heroImgEl) heroImgEl.src = SHOP.heroImg;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText("shopName", SHOP.name);
  setText("rating", `⭐ ${SHOP.rating}`);
  setText("reviewCount", `(${SHOP.reviews.toLocaleString()})`);
  setText("category", `· ${SHOP.category}`);
  setText("area", `· ${SHOP.area}`);
  setText("way", SHOP.way);
  setText("price", SHOP.price);
  setText("openHours", SHOP.openHours);
  setText("address", SHOP.address);
  setText("walk", SHOP.walk);
  setText("phone", SHOP.phone);
  setText("closedDay", SHOP.closedDay);
}

/* =========================================================
  함수: renderDates
  매개변수: 없음
  반환값: 없음
  기능: 5일치 날짜 버튼을 그리고, 각 날짜에 "예약 가능/불가" 상태 반영
  작동원리:
    - makeNextDates(5)로 날짜 목록 생성
    - forEach로 버튼 만들기
    - hasAnyAvailableTime로 가능/불가 판단
========================================================= */
function renderDates() {
  const row = $("#dateRow");
  row.innerHTML = "";
  const monthLabelEl = $("#calMonthLabel");
  if (monthLabelEl) monthLabelEl.textContent = monthLabel(state.calendarCursor);

  const y = state.calendarCursor.getFullYear();
  const m = state.calendarCursor.getMonth();
  const firstDay = new Date(y, m, 1);
  const firstWeekDay = firstDay.getDay();
  const lastDate = new Date(y, m + 1, 0).getDate();
  const todayKey = dateKey(new Date());

  for (let i = 0; i < firstWeekDay; i++) {
    const empty = document.createElement("span");
    empty.className = "calendar-empty";
    row.appendChild(empty);
  }

  let firstAvailableKey = null;

  for (let day = 1; day <= lastDate; day++) {
    const d = new Date(y, m, day);
    const key = dateKey(d);
    const hasSlot = hasAnyAvailableTime(key);
    const canReserve = hasSlot && !isPastDate(d);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "calendar-day";
    btn.dataset.role = "date";
    btn.dataset.dateKey = key;
    btn.textContent = String(day);

    if (key === todayKey) btn.classList.add("today");
    if (state.selectedDateKey === key) btn.classList.add("on");

    if (!canReserve) {
      btn.classList.add("disabled");
      btn.disabled = true;
    }

    if (!firstAvailableKey && canReserve) firstAvailableKey = key;
    row.appendChild(btn);
  }

  if (!state.selectedDateKey && firstAvailableKey) {
    state.selectedDateKey = firstAvailableKey;
  }
}

/* =========================================================
  함수: renderPeople
  매개변수: 없음
  반환값: 없음
  기능: 인원 버튼을 그리고 단일 선택 처리
  작동원리:
    - 페이지 설정에 맞는 인원 목록을 forEach로 버튼 생성
    - state.selectedPeople와 비교해 on 클래스 부여
========================================================= */
function renderPeople() {
  const row = $("#peopleRow");
  row.innerHTML = "";

  const peopleOptions = getPeopleOptions();
  if (!peopleOptions.includes(state.selectedPeople)) {
    state.selectedPeople = peopleOptions[0];
  }

  peopleOptions.forEach((p) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pill";
    btn.dataset.role = "people";
    btn.dataset.people = p;
    btn.textContent = p;

    if (state.selectedPeople === p) btn.classList.add("on");
    row.appendChild(btn);
  });
}

/* =========================================================
  함수: renderTimes
  매개변수: 없음
  반환값: 없음
  기능: 선택된 날짜의 시간 슬롯을 그리고,
       마감/예약완료/선택 상태를 반영
  작동원리:
    - buildTimeSlots로 슬롯 생성
    - forEach로 버튼 생성
    - if로 (마감/예약완료) 비활성 처리
========================================================= */
function renderTimes() {
  const grid = $("#timeGrid");
  grid.innerHTML = "";

  const dkey = state.selectedDateKey;
  if (!dkey) return;

  const slots = buildTimeSlots(SHOP.id, dkey);
  slots.forEach((s) => {
    const reserved = isReservedSlot(SHOP.id, dkey, s.time);
    const disabled = s.closed || reserved;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pill";
    btn.dataset.role = "time";
    btn.dataset.time = s.time;

    let suffix = "";
    if (s.closed) suffix = " (예약 마감)";
    else if (reserved) suffix = " (예약 완료)";

    btn.textContent = s.time + suffix;

    if (state.selectedTime === s.time) btn.classList.add("on");

    if (disabled) {
      btn.classList.add("disabled");
      btn.disabled = true;
    }
    grid.appendChild(btn);
  });
}

/* =========================================================
  함수: renderSummary
  매개변수: 없음
  반환값: 없음
  기능: 현재 선택(날짜/인원/시간) 요약 텍스트 갱신
  작동원리:
    - if로 선택값 존재 여부 확인
========================================================= */
function renderSummary() {
  const el = $("#reserveSummary");
  if (!el) return;

  if (!state.selectedDateKey) {
    el.textContent = "예약 가능한 날짜가 없습니다.";
    return;
  }

  const t = state.selectedTime ? state.selectedTime : "미선택";
  el.textContent = `${state.selectedDateKey} / ${state.selectedPeople} / ${t}`;
}

/* =========================================================
  함수: renderMenu
  매개변수: 없음
  반환값: 없음
  기능: 메뉴 리스트를 화면에 만들고, 펼치기 가능한 구조로 배치
  작동원리:
    - menus 배열을 forEach로 DOM 생성
    - 상세는 .menu-detail에 넣고 기본은 숨김
  왜 만들었나:
    - “세트 메뉴 구성 펼치기” 요구 충족
========================================================= */
function renderMenu() {
  const list = $("#menuList");
  if (!list) return;
  if (list.dataset.staticMenu === "true") return;
  list.innerHTML = "";

  SHOP.menus.forEach((m) => {
    const wrap = document.createElement("div");
    wrap.className = "menu-item";

    wrap.innerHTML = `
      <div class="menu-head">
        <div>
          <div class="menu-name">${m.name}</div>
          <div class="menu-price">${m.price}</div>
        </div>
        <button class="pill" type="button" data-role="menuToggle" data-menu="${m.id}">
          구성 보기
        </button>
      </div>
      <div class="menu-detail" id="menuDetail-${m.id}">
        ${m.items.map((x) => `• ${x}`).join("<br>")}
      </div>
    `;

    list.appendChild(wrap);
  });
}

function initGrabScroll(rowEl) {
  if (!rowEl || rowEl.dataset.grabInit === "1") return;
  rowEl.dataset.grabInit = "1";

  let isDown = false;
  let startX = 0;
  let startScrollLeft = 0;
  let didDrag = false;
  let suppressClick = false;
  let clickSuppressTimer = 0;

  function onPointerDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    if (clickSuppressTimer) {
      clearTimeout(clickSuppressTimer);
      clickSuppressTimer = 0;
    }

    isDown = true;
    didDrag = false;
    suppressClick = false;
    startX = e.clientX;
    startScrollLeft = rowEl.scrollLeft;
  }

  function onPointerMove(e) {
    if (!isDown) return;

    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) {
      if (!didDrag) {
        didDrag = true;
        suppressClick = true;
        rowEl.classList.add("is-grabbing");
        try {
          rowEl.setPointerCapture(e.pointerId);
        } catch (_) {}
      }
    }

    rowEl.scrollLeft = startScrollLeft - dx;
    if (didDrag) e.preventDefault();
  }

  function endDrag() {
    if (!isDown) return;
    isDown = false;
    rowEl.classList.remove("is-grabbing");

    if (didDrag) {
      clickSuppressTimer = window.setTimeout(() => {
        suppressClick = false;
        didDrag = false;
        clickSuppressTimer = 0;
      }, 220);
    }
  }

  rowEl.addEventListener("pointerdown", onPointerDown);
  rowEl.addEventListener("pointermove", onPointerMove);
  rowEl.addEventListener("pointerup", endDrag);
  rowEl.addEventListener("pointercancel", endDrag);
  rowEl.addEventListener("lostpointercapture", endDrag);
  rowEl.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse") endDrag();
  });

  rowEl.addEventListener(
    "click",
    (e) => {
      if (!suppressClick) return;
      e.preventDefault();
      e.stopPropagation();
      suppressClick = false;
      didDrag = false;
    },
    true
  );
}

function getMenuDetailEl(btn) {
  const targetId = btn.dataset.target;
  if (targetId) return document.getElementById(targetId);

  const menuId = btn.dataset.menu;
  if (!menuId) return null;
  return document.getElementById(`menuDetail-${menuId}`);
}

function setMenuDetailOpen(detail, open) {
  if (!detail) return;

  if (open) {
    detail.removeAttribute("hidden");
    detail.classList.add("open", "is-open");
    detail.style.maxHeight = "0px";

    requestAnimationFrame(() => {
      detail.style.maxHeight = `${detail.scrollHeight}px`;
    });

    detail.addEventListener(
      "transitionend",
      () => {
        if (detail.classList.contains("open") || detail.classList.contains("is-open")) {
          detail.style.maxHeight = "none";
        }
      },
      { once: true }
    );
    return;
  }

  const currentHeight = detail.scrollHeight;
  detail.style.maxHeight = `${currentHeight}px`;
  detail.classList.remove("open", "is-open");

  requestAnimationFrame(() => {
    detail.style.maxHeight = "0px";
  });
}

function overrideReserve(event) {
  event.preventDefault();
  event.stopImmediatePropagation();

  const selectedDateBtn = document.querySelector("#dateRow [data-role='date'].on");
  const selectedPeopleBtn = document.querySelector("#peopleRow .pill.on");
  const selectedTimeBtn = document.querySelector("#timeGrid .pill.on");

  if (!selectedDateBtn || !selectedPeopleBtn || !selectedTimeBtn) {
    const reservePanel = document.getElementById("reservePanel");
    const reserveToggleBtn = document.getElementById("reserveToggleBtn");
    reservePanel?.classList.add("active");
    reserveToggleBtn?.classList.add("is-open");
    document.getElementById("reserveSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
    alert("날짜/인원/시간을 모두 선택해 주세요.");
    return;
  }

  if (selectedTimeBtn.disabled || selectedTimeBtn.classList.contains("disabled")) {
    alert("선택한 시간은 예약할 수 없습니다.");
    return;
  }

  const dateKeyStr = selectedDateBtn.dataset.dateKey || "";
  const dayText = dateKeyStr
    ? String(Number(dateKeyStr.split("-")[2]))
    : selectedDateBtn.textContent.trim();
  const peopleText =
    selectedPeopleBtn.dataset.people || selectedPeopleBtn.textContent.trim();
  const timeText = selectedTimeBtn.dataset.time || selectedTimeBtn.textContent.trim();
  const name = (document.getElementById("shopName")?.textContent || SHOP.name || "식당").trim();
  const areaText = (document.getElementById("area")?.textContent || "").replace("·", "").trim();
  const priceText = (document.getElementById("price")?.textContent || "").trim();
  const info = `${areaText} / ${priceText}`;
  const image = document.getElementById("heroImg")?.src || "";

  const reservation = {
    dDay: dayText,
    dateTime: `${dateKeyStr} ${timeText} / ${peopleText}`,
    name,
    info,
    image,
    status: "예약완료",
  };

  const reservations = JSON.parse(localStorage.getItem("reservations")) || [];
  reservations.push(reservation);
  localStorage.setItem("reservations", JSON.stringify(reservations));

  let syncedWithShopState = false;
  if (
    typeof SHOP !== "undefined" &&
    typeof state !== "undefined" &&
    typeof slotKey === "function"
  ) {
    const internalDateKey = state.selectedDateKey || dateKeyStr;
    const internalTime = selectedTimeBtn.dataset.time || timeText;
    state.reservedSlots.add(slotKey(SHOP.id, internalDateKey, internalTime));
    state.selectedTime = null;
    if (typeof saveReservedSlots === "function") saveReservedSlots();
    if (typeof render === "function") render();
    syncedWithShopState = true;
  }

  if (!syncedWithShopState) {
    selectedTimeBtn.classList.remove("on");
    selectedTimeBtn.classList.add("disabled");
    selectedTimeBtn.disabled = true;
    selectedTimeBtn.textContent = `${timeText} (예약마감)`;

    const summary = document.getElementById("reserveSummary");
    if (summary) {
      summary.textContent = `${dateKeyStr} / ${peopleText} / 예약완료`;
    }
  }

  alert("예약이 완료되었습니다.");
}

/* =========================================================
  함수: renderReserveButtons
  매개변수: 없음
  반환값: 없음
  기능:
    - 본문 예약하기 버튼 / 하단 예약하기 버튼의 활성화 상태 제어
  작동원리:
    - if로 selectedTime 유무 체크
========================================================= */
function renderReserveButtons() {
  const canReserve = Boolean(state.selectedDateKey && state.selectedTime);
  $("#reserveBtn").disabled = !canReserve;
}

/* =========================================================
  함수: bookSelectedSlot
  매개변수: 없음
  반환값: 없음
  기능:
    - 선택된 날짜+시간을 예약완료 처리
    - 저장 후 UI 재렌더링
    - 예약 후 해당 날짜가 "남은 시간이 0"이면 날짜 버튼이 자동으로 예약 불가로 바뀜
  작동원리:
    - if로 유효성 검사
    - Set.add로 예약 저장
    - render()로 화면 갱신
========================================================= */
function bookSelectedSlot() {
  if (!state.selectedDateKey) {
    alert("예약 가능한 날짜가 없습니다.");
    return;
  }
  if (!state.selectedTime) {
    alert("시간을 선택해 주세요.");
    return;
  }

  const key = slotKey(SHOP.id, state.selectedDateKey, state.selectedTime);
  state.reservedSlots.add(key);
  saveReservedSlots();

  alert("예약이 완료되었습니다.");

  // 예약 후 선택 시간은 초기화(다음 예약을 위해)
  state.selectedTime = null;

  // ✅ 핵심: 다시 렌더하면 hasAnyAvailableTime가 "예약완료 제외"로 계산되어
  // 남은 시간이 0이면 해당 날짜가 "예약 불가"로 바뀜
  render();
}

/* =========================================================
  이벤트 처리 방식(중복 개념 최소화)
  - 하나의 클릭 리스너로 role을 분기하는 “이벤트 위임” 사용
  - 왜 위임을 쓰나?
    * 버튼이 렌더링으로 계속 새로 만들어져도(날짜/시간 변경)
      addEventListener를 매번 다시 달 필요가 없음
========================================================= */
document.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const role = btn.dataset.role;

  // 날짜 선택
  if (role === "date") {
    const next = btn.dataset.dateKey;
    state.selectedDateKey = next;
    state.selectedTime = null; // 날짜 바꾸면 시간은 다시 선택
    render();
    return;
  }

  // 인원 선택(단일)
  if (role === "people") {
    state.selectedPeople = btn.dataset.people;
    render();
    return;
  }

  // 시간 선택
  if (role === "time") {
    // disabled 버튼은 클릭 자체가 막혀있지만, 안전하게 한 번 더 방어
    if (btn.disabled) return;
    state.selectedTime = btn.dataset.time;
    render();
    return;
  }

  // 메뉴 펼치기
  if (role === "menuToggle") {
    const detail = getMenuDetailEl(btn);
    if (!detail) return;

    const isOpen = detail.classList.contains("open") || detail.classList.contains("is-open");
    setMenuDetailOpen(detail, !isOpen);
    btn.textContent = isOpen ? "구성 보기" : "접기";
    return;
  }
});

// 본문 예약하기
$("#reserveBtn").addEventListener("click", bookSelectedSlot);

// 하단 예약하기: 선택이 없으면 예약 섹션으로 안내
$("#bottomReserveBtn").addEventListener("click", () => {
  if (!state.selectedTime) {
    setReservePanel(true);
    $("#reserveSection").scrollIntoView({ behavior: "smooth", block: "start" });
    alert("날짜/시간을 선택한 후 예약하기를 눌러주세요.");
    return;
  }
  bookSelectedSlot();
});

const appRoot = document.querySelector("main.app");
const reservationBtnEl = $("#reservationBtn");
if (
  reservationBtnEl &&
  appRoot?.dataset.reservationLink !== "static" &&
  reservationBtnEl.getAttribute("href") === "#"
) {
  reservationBtnEl.addEventListener("click", () => {
    window.location.href = "예약현황.html";
  });
}

$("#reserveBtn")?.addEventListener("click", overrideReserve, true);
$("#bottomReserveBtn")?.addEventListener("click", overrideReserve, true);

// 최초 렌더
applyPageDefaults();
initReservePanel();
render();
