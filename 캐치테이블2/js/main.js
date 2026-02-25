// ======================= js/main.js =======================
// slider/carousel logic

document.addEventListener("DOMContentLoaded", () => {
  const slides = document.getElementById("slides");
  const dotsWrap = document.getElementById("dots");
  if (slides && dotsWrap) {
    const slideCount = slides.children.length;
    let slideIndex = 0;
    for (let i = 0; i < slideCount; i++) {
      const d = document.createElement("div");
      d.className = "dot" + (i === 0 ? " active" : "");
      dotsWrap.appendChild(d);
    }
    const dots = [...dotsWrap.children];
    setInterval(() => {
      slideIndex = (slideIndex + 1) % slideCount;
      slides.style.transform = `translateX(-${slideIndex * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle("active", i === slideIndex));
    }, 3500);
  }

});

// ======================= reservation/shop logic =======================

const SHOP = window.SHOP || {};
const STORAGE_KEY = `demo_reserved_slots__${SHOP.id}`;
const PEOPLE_OPTIONS = ["1명", "2명", "3명", "4명", "5명", "6명", "7명", "8명", "9명 이상"];

const state = {
  selectedDateKey: null,
  selectedPeople: "2명",
  selectedTime: null,
  reservedSlots: loadReservedSlots(),
  calendarCursor: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
};

function qs(...selectors) {
  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el) return el;
  }
  return null;
}

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

function loadReservedSlots() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveReservedSlots() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.reservedSlots]));
}

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthLabel(d) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

function isPastDate(d) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return d < today;
}

function slotKey(dateKeyStr, time) {
  return `${SHOP.id}__${dateKeyStr}__${time}`;
}

function parseHistoryDateTime(dateTimeText) {
  const m = String(dateTimeText || "").match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);
  if (!m) return null;
  return { dateKeyStr: m[1], timeText: m[2] };
}

function isCurrentShopHistory(item) {
  if (!item || typeof item !== "object") return false;
  if (item.shopId) return item.shopId === SHOP.id;
  const historyName = String(item.name || "").trim();
  const currentName = String(SHOP.name || "").trim();
  return Boolean(historyName && currentName && historyName === currentName);
}

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

function isReserved(dateKeyStr, time) {
  return state.reservedSlots.has(slotKey(dateKeyStr, time));
}

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

function hasAnyAvailableTime(dateKeyStr) {
  for (const s of buildTimeSlots(dateKeyStr)) {
    if (!s.closed && !isReserved(dateKeyStr, s.time)) return true;
  }
  return false;
}

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
    // Only overwrite existing DOM text when SHOP provides a defined value.
    // This preserves static markup in the HTML when SHOP.* properties are not set.
    if (!el) continue;
    if (value === undefined || value === null) continue;
    el.textContent = value;
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

function renderSummary() {
  const el = qs("#reserveSummary");
  if (!el) return;
  if (!state.selectedDateKey) {
    el.textContent = "예약 가능한 날짜가 없습니다.";
    return;
  }
  el.textContent = `${state.selectedDateKey} / ${state.selectedPeople} / ${state.selectedTime || "미선택"}`;
}

function renderMenu() {
  const list = qs("#menuList");
  if (!list) return;
  list.innerHTML = "";
  for (const m of SHOP.menus) {
    const itemHtml = (m.items || []).map((x) => ` ${x}`).join("<br>");
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

function renderReserveButton() {
  const btn = qs("#reserveBtn", "#pickerReserveBtn");
  if (btn) btn.disabled = !(state.selectedDateKey && state.selectedTime);
}

function saveReservationHistory(dateKeyStr, timeText, peopleText) {
  const dayText = String(Number(String(dateKeyStr).split("-")[2] || ""));
  const name = (qs("#shopName")?.textContent || SHOP.name || "").trim();
  const areaText = (qs("#area")?.textContent || SHOP.area || "").replace("", "").trim();
  const priceText = (qs("#price")?.textContent || SHOP.price || "").trim();
  const info = `${areaText} / ${priceText}`;
  // try explicit hero element first, then look for static SHOP heroImg,
  // lastly fall back to first slide image if present
  let image = "";
  const heroEl = qs("#heroImg");
  if (heroEl && heroEl.src) image = heroEl.src;
  if (!image && SHOP.heroImg) image = SHOP.heroImg;
  if (!image) {
    const slideImg = document.querySelector(".slides img");
    if (slideImg && slideImg.src) image = slideImg.src;
  }
  // normalize to absolute URL so the history page can load it even if path is relative
  if (image) {
    try {
      image = new URL(image, window.location.href).href;
    } catch (_e) {
      // ignore if invalid
    }
  }

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

// event listeners

(document.addEventListener("click", (e) => {
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
}));

qs("#reserveToggleBtn", "#openReservePickerBtn")?.addEventListener("click", () => {
  const panel = qs("#reservePanel", "#reservePicker");
  if (!panel) return;
  setPanel(!panel.classList.contains("active"));
});

qs("#closeReservePickerBtn")?.addEventListener("click", () => setPanel(false));
qs("#reservePickerBackdrop")?.addEventListener("click", () => setPanel(false));

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

qs("#reserveBtn", "#pickerReserveBtn")?.addEventListener("click", bookSelectedSlot);

qs("#bottomReserveBtn")?.addEventListener("click", () => {
  if (!state.selectedTime) {
    setPanel(true);
    qs("#reserveSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
    alert("날짜/시간을 선택한 후 예약하기를 눌러주세요.");
    return;
  }
  bookSelectedSlot();
});

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
// topbar links --------------------------------------------------------------
// left link is a normal <a> so it navigates automatically; add backup behavior
const topbarBack = document.querySelector(".topbar__back");
if (topbarBack) {
  topbarBack.addEventListener("click", (e) => {
    // anchor already has href, but we can also use history if desired
    // e.preventDefault(); history.back();
  });
}

// right button should go to the reservation history page
const reservationButton = document.getElementById("reservationBtn");
if (reservationButton) {
  reservationButton.addEventListener("click", () => {
    // current page lives in `캐치테이블2/`, but the history file is one level up
    window.location.href = "../예약현황.html";
  });
}
initHero();
render();
