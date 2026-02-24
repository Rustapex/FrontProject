/* 페이지 데이터(window.SHOP)를 기반으로 예약/메뉴 화면을 렌더링 */
const SHOP = window.SHOP;
const STORAGE_KEY = `demo_reserved_slots__${SHOP.id}`;
const PEOPLE_OPTIONS = ["1명", "2명", "3명", "4명", "5명", "6명", "7명", "8명", "9명 이상"];

/* 예약 선택 상태 */
const state = {
  selectedDateKey: null,
  selectedPeople: "2명",
  selectedTime: null,
  reservedSlots: loadReservedSlots(),
  calendarCursor: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
};

/* 여러 선택자 중 첫 번째로 찾은 요소를 반환 */
const qs = (...selectors) => {
  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el) return el;
  }
  return null;
};

/* 가로 스크롤 영역을 grab 드래그로 이동 가능하게 설정 */
function initGrabScroll(rowEl) {
  if (!rowEl || rowEl.dataset.grabInit === "1") return;
  rowEl.dataset.grabInit = "1";

  let isDown = false;
  let startX = 0;
  let startScrollLeft = 0;
  let didDrag = false;
  let suppressClick = false;
  let releaseTimer = 0;

  function onPointerDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (releaseTimer) {
      clearTimeout(releaseTimer);
      releaseTimer = 0;
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
        } catch {}
      }
    }
    rowEl.scrollLeft = startScrollLeft - dx;
    if (didDrag) e.preventDefault();
  }

  function onPointerUp() {
    if (!isDown) return;
    isDown = false;
    rowEl.classList.remove("is-grabbing");
    if (didDrag) {
      releaseTimer = window.setTimeout(() => {
        suppressClick = false;
        didDrag = false;
        releaseTimer = 0;
      }, 180);
    }
  }

  rowEl.addEventListener("pointerdown", onPointerDown);
  rowEl.addEventListener("pointermove", onPointerMove);
  rowEl.addEventListener("pointerup", onPointerUp);
  rowEl.addEventListener("pointercancel", onPointerUp);
  rowEl.addEventListener("lostpointercapture", onPointerUp);
  rowEl.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse") onPointerUp();
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

/* 저장된 예약 슬롯(Set)을 로드 */
function loadReservedSlots() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

/* 예약 슬롯(Set)을 localStorage에 저장 */
function saveReservedSlots() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.reservedSlots]));
}

/* Date -> YYYY-MM-DD 키 변환 */
function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* 캘린더 상단 월 라벨 문자열 */
function monthLabel(d) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

/* 오늘 이전 날짜인지 확인 */
function isPastDate(d) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return d < today;
}

/* 예약 저장용 슬롯 키(shopId + 날짜 + 시간) */
function slotKey(dateKeyStr, time) {
  return `${SHOP.id}__${dateKeyStr}__${time}`;
}

/* 예약현황 카드의 dateTime 문자열에서 날짜/시간 추출 */
function parseHistoryDateTime(dateTimeText) {
  const m = String(dateTimeText || "").match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);
  if (!m) return null;
  return { dateKeyStr: m[1], timeText: m[2] };
}

/* 예약현황 항목이 현재 가게 예약인지 판별 */
function isCurrentShopHistory(item) {
  if (!item || typeof item !== "object") return false;
  if (item.shopId) return item.shopId === SHOP.id;
  const historyName = String(item.name || "").trim();
  const currentName = String(SHOP.name || "").trim();
  return Boolean(historyName && currentName && historyName === currentName);
}

/* reservations(localStorage) 기준으로 슬롯 상태 동기화 */
function syncReservedSlotsFromHistory() {
  let history = [];
  try {
    const raw = localStorage.getItem("reservations");
    history = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(history)) history = [];
  } catch {
    history = [];
  }

  const nextSet = new Set();
  for (const item of history) {
    if (!isCurrentShopHistory(item)) continue;
    const parsed = parseHistoryDateTime(item.dateTime);
    if (!parsed) continue;
    nextSet.add(slotKey(parsed.dateKeyStr, parsed.timeText));
  }

  const prev = [...state.reservedSlots].sort().join("|");
  const next = [...nextSet].sort().join("|");
  state.reservedSlots = nextSet;
  if (prev !== next) saveReservedSlots();
}

/* 이미 예약된 시간인지 확인 */
function isReserved(dateKeyStr, time) {
  return state.reservedSlots.has(slotKey(dateKeyStr, time));
}

/* 날짜별 시간 슬롯 생성(간단한 seed 규칙으로 일부 마감 처리) */
function buildTimeSlots(dateKeyStr) {
  const base = ["18:00", "18:30", "19:00", "19:30", "20:00"];
  const seedStr = `${SHOP.id}__${dateKeyStr}`;
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed += seedStr.charCodeAt(i);
  const allClosed = seed % 11 === 0;
  return base.map((time, idx) => ({
    time,
    closed: allClosed ? true : (seed + idx) % 3 === 0,
  }));
}

/* 해당 날짜에 예약 가능한 시간이 1개라도 있는지 확인 */
function hasAnyAvailableTime(dateKeyStr) {
  for (const s of buildTimeSlots(dateKeyStr)) {
    if (!s.closed && !isReserved(dateKeyStr, s.time)) return true;
  }
  return false;
}

/* 예약 패널(혹은 모달) 열기/닫기 */
function setPanel(open) {
  const panel = qs("#reservePanel", "#reservePicker");
  const toggleBtn = qs("#reserveToggleBtn", "#openReservePickerBtn");
  const backdrop = qs("#reservePickerBackdrop");
  if (!panel) return;
  panel.classList.toggle("active", open);
  if ("hidden" in panel) panel.hidden = !open;
  if (backdrop) backdrop.hidden = !open;
  if (toggleBtn) toggleBtn.classList.toggle("is-open", open);
}

/* 상단 가게 정보 영역 텍스트 렌더 */
function renderInfo() {
  const map = [
    ["#shopName", SHOP.name],
    ["#way", SHOP.way],
    ["#price", SHOP.price],
    ["#address", SHOP.address],
    ["#walk", SHOP.walk],
    ["#phone", SHOP.phone],
    ["#closedDay", SHOP.closedDay],
  ];
  for (const [selector, value] of map) {
    const el = qs(selector);
    if (el) el.textContent = value;
  }

  const rating = qs("#rating");
  if (rating) rating.textContent = `별점 ${SHOP.rating}`;

  const reviews = qs("#reviewCount");
  if (reviews) reviews.textContent = `리뷰 ${Number(SHOP.reviews).toLocaleString()}개`;

  const category = qs("#category");
  if (category) category.textContent = `- ${SHOP.category}`;

  const area = qs("#area");
  if (area) area.textContent = SHOP.area;

  const openHoursSummary = qs("#openHoursSummary");
  const openHours = qs("#openHours");
  if (openHoursSummary) openHoursSummary.textContent = SHOP.openHoursSummary || "";
  if (openHours) openHours.innerHTML = SHOP.openHours || "";
}

/* 대표 이미지 1장/여러 장 자동 순환 */
function initHero() {
  const hero = qs("#heroImg");
  if (!hero) return;

  const images = (Array.isArray(SHOP.heroImages) && SHOP.heroImages.length
    ? SHOP.heroImages
    : [SHOP.heroImg]
  ).filter(Boolean);

  if (!images.length) return;
  hero.src = images[0];
  if (images.length < 2) return;

  let idx = 0;
  setInterval(() => {
    idx = (idx + 1) % images.length;
    hero.src = images[idx];
  }, 3500);
}

/* 월간 달력 렌더 및 기본 선택 날짜 계산 */
function renderDates() {
  const row = qs("#dateRow", "#calendarGrid");
  const monthEl = qs("#calMonthLabel", "#calendarMonthLabel");
  if (!row) return;
  row.innerHTML = "";
  if (monthEl) monthEl.textContent = monthLabel(state.calendarCursor);

  const y = state.calendarCursor.getFullYear();
  const m = state.calendarCursor.getMonth();
  const firstDay = new Date(y, m, 1);
  const firstWeekday = firstDay.getDay();
  const lastDate = new Date(y, m + 1, 0).getDate();
  const todayKey = dateKey(new Date());
  let firstAvailable = null;

  for (let i = 0; i < firstWeekday; i++) {
    const empty = document.createElement("span");
    empty.className = "calendar-empty";
    row.appendChild(empty);
  }

  for (let day = 1; day <= lastDate; day++) {
    const d = new Date(y, m, day);
    const key = dateKey(d);
    const canReserve = hasAnyAvailableTime(key) && !isPastDate(d);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "calendar-day";
    btn.dataset.role = "date";
    btn.dataset.dateKey = key;
    btn.textContent = String(day);

    if (key === todayKey) btn.classList.add("today", "is-today");
    if (state.selectedDateKey === key) btn.classList.add("on", "is-selected");
    if (!canReserve) {
      btn.disabled = true;
      btn.classList.add("disabled", "is-disabled");
    } else if (!firstAvailable) {
      firstAvailable = key;
    }
    row.appendChild(btn);
  }

  if (!state.selectedDateKey && firstAvailable) state.selectedDateKey = firstAvailable;
}

/* 인원 선택 버튼 렌더 */
function renderPeople() {
  const row = qs("#peopleRow", "#pickerPeopleRow");
  if (!row) return;
  row.innerHTML = "";
  initGrabScroll(row);
  if (!PEOPLE_OPTIONS.includes(state.selectedPeople)) state.selectedPeople = PEOPLE_OPTIONS[0];

  for (const p of PEOPLE_OPTIONS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pill";
    btn.dataset.role = "people";
    btn.dataset.people = p;
    btn.textContent = p;
    if (state.selectedPeople === p) btn.classList.add("on", "is-selected");
    row.appendChild(btn);
  }
}

/* 시간 선택 버튼 렌더(마감/예약완료 반영) */
function renderTimes() {
  const grid = qs("#timeGrid", "#pickerTimeRow");
  if (!grid) return;
  grid.innerHTML = "";
  if (!state.selectedDateKey) return;

  for (const s of buildTimeSlots(state.selectedDateKey)) {
    const reserved = isReserved(state.selectedDateKey, s.time);
    const disabled = s.closed || reserved;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pill";
    btn.dataset.role = "time";
    btn.dataset.time = s.time;
    if (state.selectedTime === s.time) btn.classList.add("on");
    if (disabled) {
      btn.disabled = true;
      btn.classList.add("disabled", "is-disabled");
    }

    let suffix = "";
    if (s.closed) suffix = " (예약 마감)";
    if (reserved) suffix = " (예약 완료)";
    btn.textContent = s.time + suffix;
    grid.appendChild(btn);
  }
}

/* 예약 요약 텍스트 렌더 */
function renderSummary() {
  const el = qs("#reserveSummary");
  if (!el) return;
  if (!state.selectedDateKey) {
    el.textContent = "예약 가능한 날짜가 없습니다.";
    return;
  }
  el.textContent = `${state.selectedDateKey} / ${state.selectedPeople} / ${state.selectedTime || "미선택"}`;
}

/* 메뉴 목록 렌더 */
function renderMenu() {
  const list = qs("#menuList");
  if (!list) return;
  list.innerHTML = "";
  for (const m of SHOP.menus) {
    const itemHtml = (m.items || []).map((x) => `• ${x}`).join("<br>");
    const wrap = document.createElement("div");
    wrap.className = "menu-item";
    wrap.innerHTML = `
      <div class="menu-head">
        <div>
          <div class="menu-name">${m.name}</div>
          <div class="menu-price">${m.price}</div>
        </div>
        <button class="pill" type="button" data-role="menuToggle" data-menu="${m.id}">구성 보기</button>
      </div>
      <div class="menu-detail" id="menuDetail-${m.id}" hidden>${itemHtml}</div>
    `;
    list.appendChild(wrap);
  }
}

/* 예약 버튼 활성/비활성 제어 */
function renderReserveButton() {
  const btn = qs("#reserveBtn", "#pickerReserveBtn");
  if (btn) btn.disabled = !(state.selectedDateKey && state.selectedTime);
}

/* 예약현황 페이지에서 읽는 포맷으로 예약 내역 저장 */
function saveReservationHistory(dateKeyStr, timeText, peopleText) {
  const dayText = String(Number(String(dateKeyStr).split("-")[2] || ""));
  const name = (qs("#shopName")?.textContent || SHOP.name || "").trim();
  const areaText = (qs("#area")?.textContent || SHOP.area || "").replace("·", "").trim();
  const priceText = (qs("#price")?.textContent || SHOP.price || "").trim();
  const info = `${areaText} / ${priceText}`;
  const image = qs("#heroImg")?.src || SHOP.heroImg || "";

  const reservation = {
    shopId: SHOP.id,
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
}

/* 현재 선택된 날짜/시간을 예약완료 처리 */
function bookSelectedSlot() {
  if (!state.selectedDateKey) {
    alert("예약 가능한 날짜가 없습니다.");
    return;
  }
  if (!state.selectedTime) {
    alert("시간을 선택해 주세요.");
    return;
  }

  saveReservationHistory(state.selectedDateKey, state.selectedTime, state.selectedPeople);
  state.reservedSlots.add(slotKey(state.selectedDateKey, state.selectedTime));
  saveReservedSlots();
  alert("예약이 완료되었습니다.");
  state.selectedTime = null;
  render();
}

/* 상태 기반 전체 화면 렌더 */
function render() {
  syncReservedSlotsFromHistory();
  renderInfo();
  renderDates();
  renderPeople();
  renderTimes();
  renderSummary();
  renderMenu();
  renderReserveButton();
}

/* 버튼 이벤트 위임: 날짜/인원/시간/메뉴 토글 */
document.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const role = btn.dataset.role;

  if (role === "date") {
    state.selectedDateKey = btn.dataset.dateKey;
    state.selectedTime = null;
    render();
    return;
  }
  if (role === "people") {
    state.selectedPeople = btn.dataset.people;
    render();
    return;
  }
  if (role === "time") {
    if (btn.disabled) return;
    state.selectedTime = btn.dataset.time;
    render();
    return;
  }
  if (role === "menuToggle") {
    const target = btn.dataset.target
      ? document.getElementById(btn.dataset.target)
      : document.getElementById(`menuDetail-${btn.dataset.menu}`);
    if (!target) return;
    const open = target.classList.toggle("open");
    target.hidden = !open;
    btn.textContent = open ? "접기" : "구성 보기";
  }
});

/* 예약 패널 열기/닫기 */
qs("#reserveToggleBtn", "#openReservePickerBtn")?.addEventListener("click", () => {
  const panel = qs("#reservePanel", "#reservePicker");
  if (!panel) return;
  setPanel(!panel.classList.contains("active"));
});

qs("#closeReservePickerBtn")?.addEventListener("click", () => setPanel(false));
qs("#reservePickerBackdrop")?.addEventListener("click", () => setPanel(false));

/* 달력 월 이동 */
qs("#calPrevBtn", "#calendarPrevBtn")?.addEventListener("click", () => {
  state.calendarCursor = new Date(state.calendarCursor.getFullYear(), state.calendarCursor.getMonth() - 1, 1);
  state.selectedDateKey = null;
  state.selectedTime = null;
  render();
});

qs("#calNextBtn", "#calendarNextBtn")?.addEventListener("click", () => {
  state.calendarCursor = new Date(state.calendarCursor.getFullYear(), state.calendarCursor.getMonth() + 1, 1);
  state.selectedDateKey = null;
  state.selectedTime = null;
  render();
});

/* 예약 실행 버튼 */
qs("#reserveBtn", "#pickerReserveBtn")?.addEventListener("click", bookSelectedSlot);

/* 하단 예약 버튼 */
qs("#bottomReserveBtn")?.addEventListener("click", () => {
  if (!state.selectedTime) {
    setPanel(true);
    qs("#reserveSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
    alert("날짜/시간을 선택한 후 예약하기를 눌러주세요.");
    return;
  }
  bookSelectedSlot();
});

/* 예약현황에서 취소 후 돌아왔을 때 슬롯 상태 갱신 */
window.addEventListener("pageshow", () => {
  syncReservedSlotsFromHistory();
  render();
});

window.addEventListener("storage", (e) => {
  if (e.key !== "reservations") return;
  syncReservedSlotsFromHistory();
  render();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  syncReservedSlotsFromHistory();
  render();
});

/* 초기화 */
initHero();
render();
