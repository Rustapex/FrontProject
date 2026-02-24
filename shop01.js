/* =========================================================
  예약 탭 동작 (서버 연동 없음)
  - 기본값: 오늘 / 1명 / 시간 미선택
  - 예약 버튼 2개(카드 내부, 하단 고정) 모두 동일한 예약 패널 오픈
  - 달력(월 단위)에서 날짜 선택
  - 인원/시간은 가로 슬라이드 선택
  - 예약 완료한 시간은 다시 선택 불가(표시용 로컬 상태)
========================================================= */

/* -----------------------------
  전역 상태
------------------------------ */
const today = new Date();
today.setHours(0, 0, 0, 0);

const reserveState = {
  selectedDate: new Date(today),
  selectedPeople: 1,
  selectedTime: null,
  viewYear: today.getFullYear(),
  viewMonth: today.getMonth(), // 0~11
  reservedSlots: new Set(), // key: YYYY-MM-DD__HH:mm
  lastReserved: null, // {date, people, time}
};

const PEOPLE_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const TIME_OPTIONS = [
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
];

/* =========================================================
  함수: $(selector)
  매개변수: selector(string)
  반환값: Element|null
  기능: document.querySelector 단축
========================================================= */
function $(selector) {
  return document.querySelector(selector);
}

/* =========================================================
  함수: dateKey(dateObj)
  매개변수: dateObj(Date)
  반환값: string ("YYYY-MM-DD")
  기능: 예약 키/비교용 날짜 문자열 생성
========================================================= */
function dateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* =========================================================
  함수: dateFromKey(key)
  매개변수: key(string, "YYYY-MM-DD")
  반환값: Date
  기능: 문자열 날짜를 Date 객체로 변환
========================================================= */
function dateFromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/* =========================================================
  함수: slotKey(dateObj, time)
  매개변수:
    - dateObj(Date)
    - time(string, "HH:mm")
  반환값: string
  기능: "날짜+시간" 예약 슬롯 고유키 생성
========================================================= */
function slotKey(dateObj, time) {
  return `${dateKey(dateObj)}__${time}`;
}

/* =========================================================
  함수: isSameDay(a, b)
  매개변수: a(Date), b(Date)
  반환값: boolean
  기능: 같은 날짜인지 비교
========================================================= */
function isSameDay(a, b) {
  return dateKey(a) === dateKey(b);
}

/* =========================================================
  함수: isPastDay(dateObj)
  매개변수: dateObj(Date)
  반환값: boolean
  기능: 오늘 이전 날짜인지 확인
========================================================= */
function isPastDay(dateObj) {
  const d = new Date(dateObj);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

/* =========================================================
  함수: weekdayKorean(dateObj)
  매개변수: dateObj(Date)
  반환값: string ("일"~"토")
  기능: 요일 한글 반환
========================================================= */
function weekdayKorean(dateObj) {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return days[dateObj.getDay()];
}

/* =========================================================
  함수: formatDisplayDate(dateObj)
  매개변수: dateObj(Date)
  반환값: string
  기능: 오늘/내일 우선 표시, 그 외 MM.DD(요일) 포맷 반환
========================================================= */
function formatDisplayDate(dateObj) {
  const d = new Date(dateObj);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (isSameDay(d, today)) return `오늘(${weekdayKorean(d)})`;
  if (isSameDay(d, tomorrow)) return `내일(${weekdayKorean(d)})`;
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}(${weekdayKorean(d)})`;
}

/* =========================================================
  함수: getMonthCells(year, month)
  매개변수:
    - year(number)
    - month(number, 0~11)
  반환값: Array<(Date|null)>
  기능:
    - 달력 1개월 표시용 셀 배열 생성
    - 빈칸은 null, 날짜칸은 Date
========================================================= */
function getMonthCells(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const cells = [];

  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let day = 1; day <= last.getDate(); day++) cells.push(new Date(year, month, day));

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/* =========================================================
  함수: initGrabScroll(rowEl)
  매개변수: rowEl(Element)
  반환값: 없음(void)
  기능:
    - 가로 스크롤 영역을 grab 드래그로 이동 가능하게 설정
========================================================= */
function initGrabScroll(rowEl) {
  if (!rowEl || rowEl.dataset.grabInit === "1") return;
  rowEl.dataset.grabInit = "1";

  let isDown = false;
  let startX = 0;
  let startScrollLeft = 0;
  let didDrag = false;

  function onDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    isDown = true;
    didDrag = false;
    startX = e.clientX;
    startScrollLeft = rowEl.scrollLeft;
  }

  function onMove(e) {
    if (!isDown) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) {
      didDrag = true;
      rowEl.classList.add("is-grabbing");
    }
    rowEl.scrollLeft = startScrollLeft - dx;
    if (didDrag) e.preventDefault();
  }

  function onUp() {
    if (!isDown) return;
    isDown = false;
    rowEl.classList.remove("is-grabbing");
  }

  rowEl.addEventListener("pointerdown", onDown);
  rowEl.addEventListener("pointermove", onMove);
  rowEl.addEventListener("pointerup", onUp);
  rowEl.addEventListener("pointercancel", onUp);
  rowEl.addEventListener("pointerleave", onUp);
}

/* -----------------------------
  렌더 함수들
------------------------------ */
function renderReserveSummary() {
  const summary = $("#reserveSummary");
  if (!summary) return;

  if (reserveState.lastReserved) {
    const { date, people, time } = reserveState.lastReserved;
    summary.textContent = `최근 예약: ${formatDisplayDate(date)} · ${people}명 · ${time}`;
    return;
  }

  const timeText = reserveState.selectedTime || "시간 선택";
  summary.textContent = `기본 선택: ${formatDisplayDate(reserveState.selectedDate)} · ${reserveState.selectedPeople}명 · ${timeText}`;
}

function renderCalendar() {
  const monthLabel = $("#calendarMonthLabel");
  const grid = $("#calendarGrid");
  if (!monthLabel || !grid) return;

  monthLabel.textContent = `${reserveState.viewYear}.${String(reserveState.viewMonth + 1).padStart(2, "0")}`;
  grid.innerHTML = "";

  const cells = getMonthCells(reserveState.viewYear, reserveState.viewMonth);
  cells.forEach((cellDate) => {
    if (!cellDate) {
      const empty = document.createElement("div");
      empty.className = "calendar-empty";
      grid.appendChild(empty);
      return;
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "calendar-day";
    btn.dataset.role = "calendarDay";
    btn.dataset.dateKey = dateKey(cellDate);
    btn.textContent = String(cellDate.getDate());

    if (cellDate.getMonth() !== reserveState.viewMonth) btn.classList.add("is-out");
    if (isSameDay(cellDate, today)) btn.classList.add("is-today");
    if (isSameDay(cellDate, reserveState.selectedDate)) btn.classList.add("is-selected");

    if (isPastDay(cellDate)) {
      btn.disabled = true;
      btn.classList.add("is-disabled");
    }

    grid.appendChild(btn);
  });
}

function renderPeopleRow() {
  const row = $("#pickerPeopleRow");
  if (!row) return;
  row.innerHTML = "";

  PEOPLE_OPTIONS.forEach((p) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-chip";
    btn.dataset.role = "pickerPeople";
    btn.dataset.people = String(p);
    btn.textContent = `${p}명`;

    if (reserveState.selectedPeople === p) btn.classList.add("is-selected");
    row.appendChild(btn);
  });
}

function renderTimeRow() {
  const row = $("#pickerTimeRow");
  if (!row) return;
  row.innerHTML = "";

  TIME_OPTIONS.forEach((time) => {
    const reserved = reserveState.reservedSlots.has(slotKey(reserveState.selectedDate, time));
    if (reserved && reserveState.selectedTime === time) reserveState.selectedTime = null;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-chip";
    btn.dataset.role = "pickerTime";
    btn.dataset.time = time;
    btn.textContent = reserved ? `${time} (예약완료)` : time;

    if (reserveState.selectedTime === time) btn.classList.add("is-selected");
    if (reserved) {
      btn.disabled = true;
      btn.classList.add("is-disabled");
    }

    row.appendChild(btn);
  });
}

function syncPickerReserveButton() {
  const btn = $("#pickerReserveBtn");
  if (!btn) return;
  btn.disabled = !(reserveState.selectedDate && reserveState.selectedPeople && reserveState.selectedTime);
}

function renderPicker() {
  renderCalendar();
  renderPeopleRow();
  renderTimeRow();
  syncPickerReserveButton();
}

/* -----------------------------
  패널 열기/닫기
------------------------------ */
function openReservePicker() {
  const backdrop = $("#reservePickerBackdrop");
  const picker = $("#reservePicker");
  if (!backdrop || !picker) return;

  backdrop.hidden = false;
  picker.hidden = false;
  renderPicker();
}

function closeReservePicker() {
  const backdrop = $("#reservePickerBackdrop");
  const picker = $("#reservePicker");
  if (!backdrop || !picker) return;

  backdrop.hidden = true;
  picker.hidden = true;
}

/* -----------------------------
  예약 실행
------------------------------ */
function reserveSelected() {
  if (!reserveState.selectedTime) {
    alert("시간을 선택해 주세요.");
    return;
  }

  const key = slotKey(reserveState.selectedDate, reserveState.selectedTime);
  if (reserveState.reservedSlots.has(key)) {
    alert("이미 예약 완료된 시간입니다.");
    return;
  }

  reserveState.reservedSlots.add(key);
  reserveState.lastReserved = {
    date: new Date(reserveState.selectedDate),
    people: reserveState.selectedPeople,
    time: reserveState.selectedTime,
  };

  reserveState.selectedTime = null;
  renderReserveSummary();
  renderPicker();
  closeReservePicker();
  alert("예약이 완료되었습니다.");
}

/* -----------------------------
  이벤트 바인딩
------------------------------ */
function bindEvents() {
  const openBtn = $("#openReservePickerBtn");
  const bottomBtn = $("#bottomReserveBtn");
  const closeBtn = $("#closeReservePickerBtn");
  const backdrop = $("#reservePickerBackdrop");
  const prevBtn = $("#calendarPrevBtn");
  const nextBtn = $("#calendarNextBtn");
  const picker = $("#reservePicker");
  const reserveBtn = $("#pickerReserveBtn");

  if (openBtn) openBtn.addEventListener("click", openReservePicker);
  if (bottomBtn) bottomBtn.addEventListener("click", openReservePicker);
  if (closeBtn) closeBtn.addEventListener("click", closeReservePicker);
  if (backdrop) backdrop.addEventListener("click", closeReservePicker);

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      reserveState.viewMonth -= 1;
      if (reserveState.viewMonth < 0) {
        reserveState.viewMonth = 11;
        reserveState.viewYear -= 1;
      }
      renderCalendar();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      reserveState.viewMonth += 1;
      if (reserveState.viewMonth > 11) {
        reserveState.viewMonth = 0;
        reserveState.viewYear += 1;
      }
      renderCalendar();
    });
  }

  if (reserveBtn) reserveBtn.addEventListener("click", reserveSelected);

  if (picker) {
    picker.addEventListener("click", (e) => {
      const dayBtn = e.target.closest('button[data-role="calendarDay"]');
      if (dayBtn) {
        reserveState.selectedDate = dateFromKey(dayBtn.dataset.dateKey);
        reserveState.selectedTime = null;
        renderPicker();
        return;
      }

      const peopleBtn = e.target.closest('button[data-role="pickerPeople"]');
      if (peopleBtn) {
        reserveState.selectedPeople = Number(peopleBtn.dataset.people || "1");
        renderPeopleRow();
        syncPickerReserveButton();
        return;
      }

      const timeBtn = e.target.closest('button[data-role="pickerTime"]');
      if (timeBtn) {
        if (timeBtn.disabled) return;
        reserveState.selectedTime = timeBtn.dataset.time || null;
        renderTimeRow();
        syncPickerReserveButton();
      }
    });
  }

  // 메뉴 "구성 보기" 토글 유지
  document.addEventListener("click", (e) => {
    const toggleBtn = e.target.closest('[data-role="menuToggle"]');
    if (!toggleBtn) return;

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
  });
}

/* -----------------------------
  초기 실행
------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  initGrabScroll($("#pickerPeopleRow"));
  initGrabScroll($("#pickerTimeRow"));
  bindEvents();
  renderReserveSummary();
  renderPicker();
});
