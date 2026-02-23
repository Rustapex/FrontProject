/* =========================================================
  [0] JS가 로드됐는지 확인용 로그
  - F12 콘솔에서 이 문장이 보이면 app.js는 정상 연결됨
========================================================= */
console.log("[app.js] loaded");

/* =========================================================
  [1] 더미 식당 데이터 (나중에 실제 데이터로 바꾸면 됨)
  - type: "white" | "black"  (탭 필터용)
  - images: 첫 번째 이미지는 '요리사(대표)'라고 가정
========================================================= */
const DUMMY_SHOPS = [
  {
    id: "s1",
    type: "white",
    name: "갓포아키 삼성점",
    rating: 4.7,
    reviews: 2236,
    area: "삼성",
    cuisine: "이자카야",
    openInfo: "영업전 · 11:30 영업 시작",
    priceInfo: "점심 3~5만원 · 저녁 1~8만원",
    images: [
      "https://picsum.photos/seed/chef1/960/540",
      "https://picsum.photos/seed/food1/960/540",
      "https://picsum.photos/seed/food2/960/540",
    ],
    dates: ["오늘(월)", "내일(화)", "2.25(수)", "2.26(목)", "2.27(금)"],
  },
  {
    id: "s2",
    type: "black",
    name: "다이탈리안 클럽",
    rating: 4.4,
    reviews: 2691,
    area: "잠실",
    cuisine: "이탈리안",
    openInfo: "영업중 · 22:00 라스트오더",
    priceInfo: "점심/저녁 2~5만원",
    images: [
      "https://picsum.photos/seed/chef2/960/540",
      "https://picsum.photos/seed/food3/960/540",
    ],
    dates: ["오늘(월)", "내일(화)", "2.25(수)", "2.26(목)", "2.27(금)"],
  },
  {
    id: "s3",
    type: "black",
    name: "수인 인사동 닭한마리",
    rating: 4.6,
    reviews: 1102,
    area: "인사동",
    cuisine: "한식",
    openInfo: "영업전 · 12:00 영업 시작",
    priceInfo: "1~3만원",
    images: [
      "https://picsum.photos/seed/chef3/960/540",
      "https://picsum.photos/seed/food4/960/540",
      "https://picsum.photos/seed/food5/960/540",
    ],
    dates: ["오늘(월)", "내일(화)", "2.25(수)", "2.26(목)", "2.27(금)"],
  },
];
/* =========================================================
  [1-1] 예약 상태를 "시간 단위"로 저장
  - 날짜를 한 번 예약했다고 그 날짜 전체를 '예약완료'로 만들면
    (남은 시간이 있어도) 날짜 버튼이 예약완료로 보이는 문제가 생김.
  - 그래서 "shopId + date + time" 조합으로 예약을 저장한다.
========================================================= */
const RESERVED_SLOT_KEYS = new Set();

function slotKey(shopId, date, time) {
  return `${shopId}__${date}__${time}`;
}
function isReservedSlot(shopId, date, time) {
  return RESERVED_SLOT_KEYS.has(slotKey(shopId, date, time));
}
function reserveSlot(shopId, date, time) {
  RESERVED_SLOT_KEYS.add(slotKey(shopId, date, time));
}

/* =========================================================
  [1-2] 더미 시간 슬롯(예약 마감) 생성
  - closed: true면 "예약 마감" (선택 불가)
========================================================= */
function buildTimeSlots(shopId, date) {
  // 영상/클론 기준으로 보이는 시간대 (원하면 여기만 바꾸면 됨)
  const baseTimes = ["18:00", "18:30", "19:00", "19:30", "20:00"];

  // 항상 같은 결과가 나오도록 seed 생성(데모용)
  const seedStr = `${shopId}__${date}`;
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed += seedStr.charCodeAt(i);

  // 일부 날짜는 전부 마감되도록(예약불가 케이스 확인용)
  const allClosed = seed % 11 === 0;

  return baseTimes.map((t, idx) => {
    if (allClosed) return { time: t, closed: true };
    const closed = (seed + idx) % 3 === 0; // 약 1/3 마감
    return { time: t, closed };
  });
}
/* =========================================================
  [핵심 수정] 날짜 버튼의 "예약 가능/불가" 판단
  - 예약 가능: (마감 아님) + (내가 아직 예약 안 한 시간) 이 1개라도 있으면
  - 예약 불가: 위 조건을 만족하는 시간이 0개면
========================================================= */
function hasAnyAvailableTime(shopId, date) {
  const slots = buildTimeSlots(shopId, date);

  for (const s of slots) {
    // 1) 원래 마감인 시간은 제외
    if (s.closed) continue;

    // 2) 내가 이미 예약한 시간도 제외 (✅ 이 줄이 핵심!)
    if (isReservedSlot(shopId, date, s.time)) continue;

    // 여기까지 왔다는 건 "예약 가능한 시간"이 1개라도 남아있다는 뜻
    return true;
  }
  return false;
}

/* =========================================================
  [1-1] 더미 예약/마감 상태(클론 동작용)
  - RESERVED_DATE_KEYS: "내가 예약한 날짜"를 기억해서
    탭 전환/재렌더링 후에도 '예약 완료' 표시가 유지되도록 함.
  - (중요) 지금은 데모라서 "날짜 단위"로만 막는다.
========================================================= */
const RESERVED_DATE_KEYS = new Set();

function reserveKey(shopId, date) {
  return `${shopId}__${date}`;
}
function isReservedDate(shopId, date) {
  return RESERVED_DATE_KEYS.has(reserveKey(shopId, date));
}
function setReservedDate(shopId, date) {
  RESERVED_DATE_KEYS.add(reserveKey(shopId, date));
}

/* =========================================================
  [1-2] 더미 "시간 슬롯" 생성 (예약 가능/예약 불가 계산용)
  - 요구사항:
    * "예약 가능" = 예약 가능한 시간이 1개라도 남아있을 때
    * "예약 불가" = 예약 가능한 시간이 0개일 때(=전부 마감)
  - 지금은 '클론코딩용 더미 로직'이라서
    shopId + date를 기반으로 "결정적(새로고침해도 동일)"으로 마감 시간을 만든다.
========================================================= */
function buildTimeSlots(shopId, date) {
  // 화면에서 보여줄 시간대(필요하면 영상에 맞게 여기만 수정)
  const baseTimes = ["18:00", "18:30", "19:00", "19:30", "20:00"];

  // 문자열을 숫자로 바꿔서 seed 생성(항상 같은 결과가 나오게)
  const seedStr = `${shopId}__${date}`;
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed += seedStr.charCodeAt(i);

  // 특정 seed에서는 "전부 마감"이 나오도록(예약불가 테스트용)
  const allClosed = seed % 11 === 0;

  return baseTimes.map((t, idx) => {
    // allClosed면 전부 마감
    if (allClosed) return { time: t, closed: true };

    // 나머지는 일부만 마감(결정적)
    const closed = (seed + idx) % 3 === 0; // 대략 1/3 마감
    return { time: t, closed };
  });
}

/* =========================================================
  [핵심 수정] 날짜 버튼의 "예약 가능/불가" 판단
  - 예약 가능: (마감 아님) + (내가 아직 예약 안 한 시간) 이 1개라도 있으면
  - 예약 불가: 위 조건을 만족하는 시간이 0개면
========================================================= */
function hasAnyAvailableTime(shopId, date) {
  const slots = buildTimeSlots(shopId, date);

  for (const s of slots) {
    // 1) 원래 마감인 시간은 제외
    if (s.closed) continue;

    // 2) 내가 이미 예약한 시간도 제외 (✅ 이 줄이 핵심!)
    if (isReservedSlot(shopId, date, s.time)) continue;

    // 여기까지 왔다는 건 "예약 가능한 시간"이 1개라도 남아있다는 뜻
    return true;
  }
  return false;
}

/* =========================================================
  [2-1] Sort 상태(지역/음식종류/가격)
  - 실제 필터링 로직은 renderShopList()에서 적용
========================================================= */
const sortState = {
  // region
  regionAll: true,
  regions: new Set(),

  // cuisine
  cuisineAll: true,
  cuisines: new Set(),

  // price
  priceAll: true,
  prices: new Set(),
};

// 영상/UI에 맞춰 옵션만 여기서 관리하면 나머지는 그대로 동작
const SORT_OPTIONS = {
  region: {
    title: "지역",
    allLabel: "서울 전체", // "전체(default)" 역할
    options: ["강남", "역삼", "선릉", "삼성", "잠실", "인사동"],
  },
  cuisine: {
    title: "음식 종류",
    allLabel: "전체", // default
    options: ["한식", "중식", "양식", "일식"],
  },
  price: {
    title: "가격",
    allLabel: "전체", // default
    // (화면 참고) 10/20/30/40 — 필요하면 여기 라벨만 바꾸면 됨
    options: ["10", "20", "30", "40"],
  },
};

/* (선택) 더미 식당의 cuisine 텍스트를 "한/중/양/일"로 매핑해서 필터가 동작하게 함 */
function normalizeCuisineTag(raw) {
  if (!raw) return "";
  if (raw.includes("한")) return "한식";
  if (raw.includes("중")) return "중식";
  // 이탈리안/양식 류는 "양식"으로 취급
  if (raw.includes("이탈") || raw.includes("양") || raw.includes("프렌"))
    return "양식";
  // 이자카야/일식 류는 "일식"으로 취급
  if (raw.includes("이자") || raw.includes("일") || raw.includes("초밥"))
    return "일식";
  return raw;
}

/* 현재 sortState를 기반으로 더미 목록을 필터링 */
function applySortFilters(list) {
  let out = list;

  // 지역: 선택된 지역 중 하나라도 매치되면 표시
  if (!sortState.regionAll && sortState.regions.size > 0) {
    out = out.filter((s) => sortState.regions.has(s.area));
  }

  // 음식 종류: normalizeCuisineTag로 "한/중/양/일"로 맞춘 뒤 비교
  if (!sortState.cuisineAll && sortState.cuisines.size > 0) {
    out = out.filter((s) =>
      sortState.cuisines.has(normalizeCuisineTag(s.cuisine)),
    );
  }

  // 가격: 지금 더미 데이터는 숫자 비교가 애매해서 우선 미적용(표시/스택만 동작)
  // 나중에 priceInfo를 숫자로 바꾸면 여기서 필터링 추가하면 됨.

  return out;
}

let currentTab = "all"; // all | white | black
const dtSelection = {
  date: "오늘(월)",
  people: "2명",
  time: "18:00",
};

/* =========================================================
  [3] Swiper 인스턴스 관리
  - 탭 필터로 리스트를 다시 렌더링하면 Swiper도 다시 초기화해야 함
========================================================= */
let swiperInstances = [];

/* Swiper 초기화 (렌더 후 실행해야 함) */
function initSwipers() {
  // CDN이 막혀있으면 Swiper가 undefined
  if (typeof Swiper === "undefined") {
    console.warn("[Swiper] CDN 로드 실패(인터넷/차단 확인)");
    return;
  }

  // 기존 인스턴스가 있다면 제거(재렌더링 대비)
  swiperInstances.forEach((ins) => {
    try {
      ins.destroy(true, true);
    } catch (e) {}
  });
  swiperInstances = [];

  document.querySelectorAll(".shop-swiper").forEach((el) => {
    const ins = new Swiper(el, {
      loop: false,
      slidesPerView: 1,
      pagination: {
        el: el.querySelector(".swiper-pagination"),
        clickable: true,
      },
      navigation: {
        nextEl: el.querySelector(".swiper-button-next"),
        prevEl: el.querySelector(".swiper-button-prev"),
      },
    });
    swiperInstances.push(ins);
  });
}

/* =========================================================
  [4] 식당 목록 렌더링 
  - 탭에 따라 DUMMY_SHOPS를 필터링해서 main#shopList에 출력
========================================================= */
function renderShopList() {
  const root = document.getElementById("shopList");
  if (!root) return;

  // 1) 탭 필터 적용
  let filtered =
    currentTab === "all"
      ? DUMMY_SHOPS
      : DUMMY_SHOPS.filter((s) => s.type === currentTab);

  // 2) Sort(지역/음식종류/가격) 필터 적용
  filtered = applySortFilters(filtered);

  // 비우고 다시 그림
  root.innerHTML = filtered.map((shop) => shopCardHTML(shop)).join("");

  // 렌더 후 Swiper 초기화
  initSwipers();

  // 렌더 후 “예약 버튼(날짜 버튼)” 더미 동작 연결
  initReserveButtons();
}

/* 카드 HTML 템플릿 */
function shopCardHTML(shop) {
  const slides = shop.images
    .map(
      (src) => `
      <div class="swiper-slide">
        <img class="shop-img" src="${src}" alt="${shop.name} 이미지" />
      </div>
    `,
    )
    .join("");

  const dateBtns = shop.dates
    .map((d) => {
      const ok = hasAnyAvailableTime(shop.id, d);

      // 남은 시간이 1개라도 있으면 예약 가능
      if (ok) {
        return `
        <button class="date-btn is-available" type="button" data-shop="${shop.id}" data-date="${d}">
          ${d}<br /><small>예약 가능</small>
        </button>
      `;
      }

      // 남은 시간이 0개면 예약 불가(클릭 불가)
      return `
      <button class="date-btn is-disabled" type="button" data-shop="${shop.id}" data-date="${d}" disabled>
        ${d}<br /><small>예약 불가</small>
      </button>
    `;
    })
    .join("");

  return `
  <article class="shop-card" data-shopid="${shop.id}">
    <div class="shop-card__head">
      <div>
        <h2 class="shop-card__name">${shop.name}</h2>
        <div class="shop-card__meta">
          <span class="star">★</span><span>${shop.rating}</span>
          <span class="muted">(${shop.reviews.toLocaleString()})</span>
          <span class="dot">·</span><span class="muted">${shop.area}</span>
          <span class="dot">·</span><span class="muted">${shop.cuisine}</span>
        </div>
      </div>
      <button class="bookmark" type="button" aria-label="북마크">🔖</button>
    </div>

    <div class="swiper shop-swiper">
      <div class="swiper-wrapper">
        ${slides}
      </div>
      <div class="swiper-button-prev"></div>
      <div class="swiper-button-next"></div>
      <div class="swiper-pagination"></div>
    </div>

    <div class="shop-card__info">
      <div class="info-row"><span class="info-ico">🕒</span>${shop.openInfo}</div>
      <div class="info-row"><span class="info-ico">💳</span>${shop.priceInfo}</div>
    </div>

    <div class="date-strip">
      ${dateBtns}
    </div>
  </article>
  `;
}

/* =========================================================
  [5] 날짜 버튼 클릭 → 예약창 오픈 (클론 동작)
  - 더 이상 "클릭 즉시 예약완료" 하지 않는다.
  - 예약은 예약창에서 "예약하기"를 눌렀을 때만 완료된다.
  - 이벤트 위임 방식이라 리스트 재렌더링(renderShopList) 후에도 정상 동작.
========================================================= */
function initReserveButtons() {
  const listRoot = document.getElementById("shopList");
  if (!listRoot) return;

  // 중복 바인딩 방지
  if (listRoot.dataset.reserveBound === "1") return;
  listRoot.dataset.reserveBound = "1";

  listRoot.addEventListener("click", (e) => {
    const btn = e.target.closest(".date-btn");
    if (!btn) return;

    // 예약 불가 버튼은 disabled라서 여기서도 방어
    if (btn.disabled || btn.classList.contains("is-disabled")) return;

    const shopId = btn.dataset.shop;
    const date = btn.dataset.date;

    openReserveSheet(shopId, date);
  });
}

/* =========================================================
  [5-1] 예약창(바텀시트) - JS로 1회 생성해서 사용
  - 날짜 클릭 → 예약창 오픈
  - 날짜는 자동 선택
  - 시간 슬롯: 
      * closed(예약 마감) = 클릭 불가 + '예약 마감'
      * reserved(예약 완료) = 클릭 불가 + '예약 완료'
  - 예약하기 누르면 alert → 선택한 "시간"만 예약 완료 처리
  - 예약 후 날짜 버튼은 "남은 시간" 기준으로 예약 가능/불가 갱신
========================================================= */
let reserveUI = null;
const reserveDraft = {
  shopId: null,
  date: null,
  people: "2명",
  time: null,
};

function ensureReserveUI() {
  if (reserveUI) return;

  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop";
  backdrop.id = "reserveBackdrop";
  backdrop.hidden = true;

  const sheet = document.createElement("section");
  sheet.className = "sheet";
  sheet.id = "reserveSheet";
  sheet.hidden = true;
  sheet.setAttribute("aria-label", "예약 선택");

  sheet.innerHTML = `
    <div class="sheet__handle" aria-hidden="true"></div>

    <div class="sheet__header">
      <h3>예약</h3>
      <button class="sheet__x" type="button" id="reserveCloseX" aria-label="닫기">✕</button>
    </div>

    <div class="sheet__body">
      <div id="reserveShopName" style="font-weight:900; margin-bottom: 10px;"></div>

      <div class="sheet-block">
        <div class="sheet-block__title">날짜</div>
        <div class="sheet-grid" id="reserveDateGrid"></div>
      </div>

      <div class="sheet-block">
        <div class="sheet-block__title">인원</div>
        <div class="sheet-grid" id="reservePeopleGrid"></div>
      </div>

      <div class="sheet-block">
        <div class="sheet-block__title">시간</div>
        <div class="sheet-grid" id="reserveTimeGrid"></div>
      </div>

      <div class="muted" style="font-size:12px; line-height:1.4;">
        ※ 예약 마감/예약 완료(회색)은 선택할 수 없습니다.
      </div>
    </div>

    <div class="sheet__footer">
      <button class="btn btn--ghost" type="button" id="reserveCloseBtn">닫기</button>
      <button class="btn btn--primary" type="button" id="reserveConfirmBtn">예약하기</button>
    </div>
  `;

  document.body.append(backdrop, sheet);

  reserveUI = {
    backdrop,
    sheet,
    closeX: sheet.querySelector("#reserveCloseX"),
    closeBtn: sheet.querySelector("#reserveCloseBtn"),
    confirmBtn: sheet.querySelector("#reserveConfirmBtn"),
    shopName: sheet.querySelector("#reserveShopName"),
    dateGrid: sheet.querySelector("#reserveDateGrid"),
    peopleGrid: sheet.querySelector("#reservePeopleGrid"),
    timeGrid: sheet.querySelector("#reserveTimeGrid"),
  };

  // 닫기
  backdrop.addEventListener("click", closeReserveSheet);
  reserveUI.closeX.addEventListener("click", closeReserveSheet);
  reserveUI.closeBtn.addEventListener("click", closeReserveSheet);

  // 선택(이벤트 위임)
  sheet.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;

    // 날짜 선택
    if (b.dataset.role === "rdate") {
      if (b.disabled) return;
      reserveDraft.date = b.dataset.date;
      reserveDraft.time = null; // 날짜 바꾸면 시간 다시 선택
      const shop = DUMMY_SHOPS.find((s) => s.id === reserveDraft.shopId);
      renderReserveDates(shop);
      renderReserveTimes(reserveDraft.shopId, reserveDraft.date);
      return;
    }

    // 인원 선택
    if (b.dataset.role === "rpeople") {
      reserveDraft.people = b.dataset.people;
      renderReservePeople();
      return;
    }

    // 시간 선택
    if (b.dataset.role === "rtime") {
      if (b.disabled) return;
      reserveDraft.time = b.dataset.time;
      renderReserveTimes(reserveDraft.shopId, reserveDraft.date);
      return;
    }
  });

  // 예약하기
  reserveUI.confirmBtn.addEventListener("click", () => {
    if (!reserveDraft.shopId || !reserveDraft.date) return;

    if (!reserveDraft.time) {
      alert("시간을 선택해 주세요.");
      return;
    }

    // ✅ "시간 단위" 예약 완료 처리
    reserveSlot(reserveDraft.shopId, reserveDraft.date, reserveDraft.time);

    alert("예약이 완료되었습니다.");

    // ✅ 날짜 버튼 상태는 '남은 시간' 기준으로 갱신 (예약완료로 고정 X)
    updateDateButtonUI(reserveDraft.shopId, reserveDraft.date);

    closeReserveSheet();
  });
}

function openReserveSheet(shopId, date) {
  ensureReserveUI();

  const shop = DUMMY_SHOPS.find((s) => s.id === shopId);
  if (!shop) return;

  reserveDraft.shopId = shopId;
  reserveDraft.date = date; // ✅ 날짜 자동 선택
  reserveDraft.people = "2명";
  reserveDraft.time = null;

  reserveUI.shopName.textContent = shop.name;

  renderReserveDates(shop);
  renderReservePeople();
  renderReserveTimes(shopId, date);

  reserveUI.backdrop.hidden = false;
  reserveUI.sheet.hidden = false;
}

function closeReserveSheet() {
  if (!reserveUI) return;
  reserveUI.backdrop.hidden = true;
  reserveUI.sheet.hidden = true;
}

/* =========================================================
  [수정] 날짜 버튼 UI를 "남은 시간" 기준으로 갱신
  - 예약 완료 문구로 바꾸지 않음
  - 남은 시간이 있으면: 예약 가능
  - 남은 시간이 없으면: 예약 불가(비활성)
========================================================= */
function updateDateButtonUI(shopId, date) {
  const btn = document.querySelector(
    `.date-btn[data-shop="${shopId}"][data-date="${date}"]`
  );
  if (!btn) return false;

  const ok = hasAnyAvailableTime(shopId, date);

  if (ok) {
    btn.classList.remove("is-disabled");
    btn.classList.add("is-available");
    btn.disabled = false;
    btn.innerHTML = `${date}<br /><small>예약 가능</small>`;
  } else {
    btn.classList.remove("is-available");
    btn.classList.add("is-disabled");
    btn.disabled = true;
    btn.innerHTML = `${date}<br /><small>예약 불가</small>`;
  }

  return true;
}

/* 예약창: 날짜 렌더 (남은 시간이 없으면 disabled) */
function renderReserveDates(shop) {
  reserveUI.dateGrid.innerHTML = shop.dates
    .map((d) => {
      const isOn = reserveDraft.date === d;
      const disabled = !hasAnyAvailableTime(shop.id, d);

      return `
        <button
          class="pill ${isOn ? "is-on" : ""}"
          type="button"
          data-role="rdate"
          data-date="${d}"
          ${disabled ? "disabled" : ""}
          style="${disabled ? "opacity:.5; cursor:not-allowed;" : ""}"
        >
          ${d}
        </button>
      `;
    })
    .join("");
}

/* 예약창: 인원 렌더 */
function renderReservePeople() {
  const peopleOptions = ["2명", "3명", "4명", "5명"];
  reserveUI.peopleGrid.innerHTML = peopleOptions
    .map((p) => {
      const isOn = reserveDraft.people === p;
      return `
        <button class="pill ${isOn ? "is-on" : ""}"
          type="button"
          data-role="rpeople"
          data-people="${p}">
          ${p}
        </button>
      `;
    })
    .join("");
}

/* 예약창: 시간 렌더 (예약 마감/예약 완료 표시 + 클릭 불가) */
function renderReserveTimes(shopId, date) {
  const slots = buildTimeSlots(shopId, date);

  reserveUI.timeGrid.innerHTML = slots
    .map((slot) => {
      const reserved = isReservedSlot(shopId, date, slot.time);
      const disabled = slot.closed || reserved;
      const isOn = reserveDraft.time === slot.time;

      // 표시 문구
      let suffix = "";
      if (slot.closed)
        suffix = ` <span class="muted" style="font-weight:700;">예약 마감</span>`;
      else if (reserved)
        suffix = ` <span class="muted" style="font-weight:700;">예약 완료</span>`;

      return `
        <button
          class="pill ${isOn ? "is-on" : ""}"
          type="button"
          data-role="rtime"
          data-time="${slot.time}"
          ${disabled ? "disabled" : ""}
          style="${disabled ? "opacity:.5; cursor:not-allowed;" : ""}"
        >
          ${slot.time}${suffix}
        </button>
      `;
    })
    .join("");
}

/* =========================================================
  [6] 탭 선택 (문제 1의 일부)
  - 클릭하면 is-active 변경 + 리스트 재렌더링
========================================================= */
function initTabs() {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");

      currentTab = btn.dataset.tab; // all|white|black
      renderShopList();
    });
  });
}

/* =========================================================
  [7] 퀵 필터 칩(선택 스택) UI 
  - 칩 클릭하면 is-on 토글 + 아래 스택에 쌓임
========================================================= */
function initSelectedChips() {
  const selectedList = document.getElementById("selectedChipList");
  const clearAllBtn = document.getElementById("clearAllChips");

  // ✅ 상단 3개 칩(지역/음식종류/가격)
  const chipRegion = document.querySelector('.chip[data-chip="지역"]');
  const chipCuisine = document.querySelector('.chip[data-chip="음식 종류"]');
  const chipPrice = document.querySelector('.chip[data-chip="가격"]');

  if (
    !selectedList ||
    !clearAllBtn ||
    !chipRegion ||
    !chipCuisine ||
    !chipPrice
  )
    return;

  // -------------------------------
  // 1) 초기 렌더(칩 라벨 + 스택)
  // -------------------------------
  updateChipLabels();
  renderSelectedStack();

  // -------------------------------
  // 2) 칩 클릭 → "sort 바텀시트" 열기
  // -------------------------------
  chipRegion.addEventListener("click", () => openSortSheet("region"));
  chipCuisine.addEventListener("click", () => openSortSheet("cuisine"));
  chipPrice.addEventListener("click", () => openSortSheet("price"));

  // -------------------------------
  // 3) 전체 초기화(쓰레기통 아이콘)
  // -------------------------------
  clearAllBtn.addEventListener("click", () => {
    // region
    sortState.regionAll = true;
    sortState.regions.clear();

    // cuisine
    sortState.cuisineAll = true;
    sortState.cuisines.clear();

    // price
    sortState.priceAll = true;
    sortState.prices.clear();

    updateChipLabels();
    renderSelectedStack();
    renderShopList(); // ✅ 필터 결과 반영
  });

  // =======================================================
  // 아래 함수들은 "sort UI"를 위해 필요함
  // (기존 파일 구조를 크게 바꾸지 않기 위해 initSelectedChips 아래에 둠)
  // =======================================================

  /* 칩 라벨을 영상처럼 바꿔주는 함수 */
  function updateChipLabels() {
    setChipLabel(
      chipRegion,
      "지역",
      sortState.regionAll,
      sortState.regions,
      "region",
    );
    setChipLabel(
      chipCuisine,
      "음식 종류",
      sortState.cuisineAll,
      sortState.cuisines,
      "cuisine",
    );
    setChipLabel(
      chipPrice,
      "가격",
      sortState.priceAll,
      sortState.prices,
      "price",
    );
  }

  /* 칩 1개 선택이면 해당 텍스트로, 여러개면 "A 외 N" 형태 */
  function setChipLabel(btn, defaultLabel, isAll, set, type) {
    if (isAll) {
      btn.textContent = defaultLabel;
      btn.classList.remove("is-on");
      return;
    }

    const arr = Array.from(set);
    if (arr.length === 0) {
      // (전체도 아니고, 아무것도 없는 상태) → 기본값으로 되돌림
      btn.textContent = defaultLabel;
      btn.classList.remove("is-on");
      return;
    }

    const first = formatLabel(type, arr[0]);
    if (arr.length === 1) {
      btn.textContent = first;
    } else {
      btn.textContent = `${first} 외 ${arr.length - 1}`;
    }
    btn.classList.add("is-on");
  }

  /* 스택(선택된 조건) 다시 그리기 */
  function renderSelectedStack() {
    selectedList.innerHTML = "";

    // region
    if (!sortState.regionAll) {
      sortState.regions.forEach((v) => {
        selectedList.appendChild(createSelectedPill("region", v));
      });
    }

    // cuisine
    if (!sortState.cuisineAll) {
      sortState.cuisines.forEach((v) => {
        selectedList.appendChild(createSelectedPill("cuisine", v));
      });
    }

    // price
    if (!sortState.priceAll) {
      sortState.prices.forEach((v) => {
        selectedList.appendChild(createSelectedPill("price", v));
      });
    }
  }

  /* 선택 pill 생성 (x 클릭 시 해당 항목만 삭제) */
  function createSelectedPill(type, value) {
    const wrap = document.createElement("span");
    wrap.className = "sel-pill";
    wrap.dataset.type = type;
    wrap.dataset.value = value;

    const text = document.createElement("span");
    text.textContent = formatLabel(type, value);

    const x = document.createElement("button");
    x.className = "sel-pill__x";
    x.type = "button";
    x.textContent = "✕";

    x.addEventListener("click", () => {
      removeSelection(type, value);
      updateChipLabels();
      renderSelectedStack();
      renderShopList();
    });

    wrap.append(text, x);
    return wrap;
  }

  /* type별 라벨 표시(가격은 '10' → '10만원'처럼 보이게) */
  function formatLabel(type, value) {
    if (type === "price") return `${value}만원`;
    return value;
  }

  /* 선택값 제거(마지막 1개를 지우면 전체(default)로 되돌림) */
  function removeSelection(type, value) {
    if (type === "region") {
      sortState.regions.delete(value);
      if (sortState.regions.size === 0) sortState.regionAll = true;
      return;
    }
    if (type === "cuisine") {
      sortState.cuisines.delete(value);
      if (sortState.cuisines.size === 0) sortState.cuisineAll = true;
      return;
    }
    if (type === "price") {
      sortState.prices.delete(value);
      if (sortState.prices.size === 0) sortState.priceAll = true;
      return;
    }
  }

  /* ===============================
    [Sort 바텀시트] 생성/열기/닫기
  =============================== */
  let sortUI = null; // {backdrop, sheet, title, closeX, selectedList, clearBtn, grid, btnClose, btnApply}
  let sortDraft = null; // {type, all, set}

  function ensureSortUI() {
    if (sortUI) return;

    // ✅ 백드롭 생성
    const backdrop = document.createElement("div");
    backdrop.className = "sheet-backdrop";
    backdrop.id = "sortBackdrop";
    backdrop.hidden = true;

    // ✅ 시트 생성
    const sheet = document.createElement("section");
    sheet.className = "sheet";
    sheet.id = "sortSheet";
    sheet.hidden = true;
    sheet.setAttribute("aria-label", "정렬 선택");

    sheet.innerHTML = `
      <div class="sheet__handle" aria-hidden="true"></div>

      <div class="sheet__header">
        <h3 id="sortTitle">정렬</h3>
        <button class="sheet__x" type="button" id="sortX" aria-label="닫기">✕</button>
      </div>

      <div class="sheet__body">
        <!-- ✅ 선택된 항목(영상처럼 x로 삭제 가능) -->
        <div class="selected" aria-label="선택된 필터(바텀시트)">
          <button class="selected__trash" type="button" id="sortClearCategory" aria-label="현재 항목 전체 삭제">🗑️</button>
          <div class="selected__list" id="sortSelectedList"></div>
        </div>

        <div class="sheet-block" style="margin-top: 10px;">
          <div class="sheet-block__title" id="sortBlockTitle"></div>
          <div class="sheet-grid" id="sortOptionGrid"></div>
        </div>
      </div>

      <div class="sheet__footer">
        <button class="btn btn--ghost" type="button" id="sortCloseBtn">닫기</button>
        <button class="btn btn--primary" type="button" id="sortApplyBtn">적용</button>
      </div>
    `;

    // 앱 컨테이너(.app) 안에 붙이면 z-index/width(480) 기준이 동일하게 맞음
    const appRoot = document.querySelector(".app");
    appRoot.append(backdrop, sheet);

    sortUI = {
      backdrop,
      sheet,
      title: sheet.querySelector("#sortTitle"),
      closeX: sheet.querySelector("#sortX"),
      selectedList: sheet.querySelector("#sortSelectedList"),
      clearBtn: sheet.querySelector("#sortClearCategory"),
      blockTitle: sheet.querySelector("#sortBlockTitle"),
      grid: sheet.querySelector("#sortOptionGrid"),
      btnClose: sheet.querySelector("#sortCloseBtn"),
      btnApply: sheet.querySelector("#sortApplyBtn"),
    };

    // 닫기 이벤트(백드롭/상단X/하단 닫기)
    sortUI.backdrop.addEventListener("click", closeSortSheet);
    sortUI.closeX.addEventListener("click", closeSortSheet);
    sortUI.btnClose.addEventListener("click", closeSortSheet);

    // 현재 카테고리 전체 삭제(쓰레기통)
    sortUI.clearBtn.addEventListener("click", () => {
      if (!sortDraft) return;
      sortDraft.all = true;
      sortDraft.set.clear();
      renderSortSheet();
    });

    // 적용
    sortUI.btnApply.addEventListener("click", () => {
      if (!sortDraft) return;

      // ✅ 미선택 경고(요구사항)
      // - 전체(default)도 아니고 선택도 없으면 alert
      if (!sortDraft.all && sortDraft.set.size === 0) {
        alert(
          `${SORT_OPTIONS[sortDraft.type].title}을(를) 1개 이상 선택해 주세요.`,
        );
        return;
      }

      commitDraftToState();
      closeSortSheet();
    });
  }

  function openSortSheet(type) {
    ensureSortUI();

    // ✅ 현재 상태를 draft로 복사(적용 전까지는 draft만 변경)
    sortDraft = cloneStateToDraft(type);

    // 제목/내용 렌더
    renderSortSheet();

    // 표시
    sortUI.backdrop.hidden = false;
    sortUI.sheet.hidden = false;
  }

  function closeSortSheet() {
    if (!sortUI) return;
    sortUI.backdrop.hidden = true;
    sortUI.sheet.hidden = true;
    sortDraft = null;
  }

  /* state → draft 복사 */
  function cloneStateToDraft(type) {
    if (type === "region") {
      return {
        type,
        all: sortState.regionAll,
        set: new Set(sortState.regions),
      };
    }
    if (type === "cuisine") {
      return {
        type,
        all: sortState.cuisineAll,
        set: new Set(sortState.cuisines),
      };
    }
    // price
    return { type, all: sortState.priceAll, set: new Set(sortState.prices) };
  }

  /* draft → state 적용 */
  function commitDraftToState() {
    const { type, all, set } = sortDraft;

    if (type === "region") {
      sortState.regionAll = all;
      sortState.regions = new Set(set);
    } else if (type === "cuisine") {
      sortState.cuisineAll = all;
      sortState.cuisines = new Set(set);
    } else {
      sortState.priceAll = all;
      sortState.prices = new Set(set);
    }

    updateChipLabels();
    renderSelectedStack();
    renderShopList();
  }

  /* 바텀시트 UI 렌더 */
  function renderSortSheet() {
    const conf = SORT_OPTIONS[sortDraft.type];
    sortUI.title.textContent = conf.title;
    sortUI.blockTitle.textContent = conf.title;

    // 1) 선택된 항목(스택) 렌더
    sortUI.selectedList.innerHTML = "";

    // draft가 '전체'가 아니면 선택값을 스택으로 보여줌
    if (!sortDraft.all) {
      sortDraft.set.forEach((v) => {
        const pill = document.createElement("span");
        pill.className = "sel-pill";

        const text = document.createElement("span");
        text.textContent = formatLabel(sortDraft.type, v);

        const x = document.createElement("button");
        x.className = "sel-pill__x";
        x.type = "button";
        x.textContent = "✕";
        x.addEventListener("click", () => {
          sortDraft.set.delete(v);
          renderSortSheet();
        });

        pill.append(text, x);
        sortUI.selectedList.appendChild(pill);
      });
    }

    // 2) 옵션 그리드 렌더
    sortUI.grid.innerHTML = "";

    // (A) 전체(default) 버튼
    const allBtn = document.createElement("button");
    allBtn.className = "pill";
    allBtn.type = "button";
    allBtn.textContent = conf.allLabel;
    if (sortDraft.all) allBtn.classList.add("is-on");
    allBtn.addEventListener("click", () => {
      // 전체가 켜져 있으면 → 끄기(=미선택 상태 가능)
      if (sortDraft.all) {
        sortDraft.all = false;
      } else {
        sortDraft.all = true;
        sortDraft.set.clear();
      }
      renderSortSheet();
    });
    sortUI.grid.appendChild(allBtn);

    // (B) 나머지 옵션(복수 선택 가능)
    conf.options.forEach((opt) => {
      const b = document.createElement("button");
      b.className = "pill";
      b.type = "button";
      b.textContent = formatLabel(sortDraft.type, opt);

      if (!sortDraft.all && sortDraft.set.has(opt)) b.classList.add("is-on");

      b.addEventListener("click", () => {
        // 옵션 선택 시 전체는 자동 해제
        if (sortDraft.all) sortDraft.all = false;

        if (sortDraft.set.has(opt)) sortDraft.set.delete(opt);
        else sortDraft.set.add(opt);

        renderSortSheet();
      });

      sortUI.grid.appendChild(b);
    });
  }
}

/* =========================================================
  [8] 바텀시트(날짜·인원·시간) 열기/닫기/선택 적용 
  - 열기: dtbar 클릭
  - 닫기: X / 하단 닫기 / 배경 클릭
  - 선택: pill 클릭 시 해당 그룹에서 하나만 is-on
  - 적용: 상단 dtSummary 텍스트 변경 + 닫기
========================================================= */
function initDateTimeSheet() {
  const openBtn = document.getElementById("openDateTime");
  const closeBtn = document.getElementById("closeDateTime");
  const sheet = document.getElementById("dateTimeSheet");
  const backdrop = document.getElementById("sheetBackdrop");
  const footerClose = document.getElementById("sheetCloseBtn");
  const footerApply = document.getElementById("sheetApplyBtn");
  const dtSummary = document.getElementById("dtSummary");

  if (
    !openBtn ||
    !closeBtn ||
    !sheet ||
    !backdrop ||
    !footerClose ||
    !footerApply ||
    !dtSummary
  )
    return;

  function openSheet() {
    // 시트 열 때 현재 저장된 선택값을 pill에 반영(동기화)
    syncSheetUIFromState();
    backdrop.hidden = false;
    sheet.hidden = false;
  }

  function closeSheet() {
    backdrop.hidden = true;
    sheet.hidden = true;
  }

  // ✅ pill 선택 처리: 같은 group 내에서 하나만 선택
  sheet.addEventListener("click", (e) => {
    const pill = e.target.closest(".pill");
    if (!pill) return;

    const groupBlock = pill.closest(".sheet-block");
    if (!groupBlock) return;

    // 같은 그룹의 pill들 is-on 제거 후 현재만 is-on
    groupBlock
      .querySelectorAll(".pill")
      .forEach((p) => p.classList.remove("is-on"));
    pill.classList.add("is-on");
  });

  // 적용 버튼: 현재 is-on 값들을 state로 저장 + 상단 텍스트 적용
  footerApply.addEventListener("click", () => {
    dtSelection.date = getSelectedText("date") || dtSelection.date;
    dtSelection.people = getSelectedText("people") || dtSelection.people;
    dtSelection.time = getSelectedText("time") || dtSelection.time;

    dtSummary.textContent = `${dtSelection.date} · ${dtSelection.people} · ${dtSelection.time}`;
    closeSheet();
  });

  // 열고 닫기 이벤트
  openBtn.addEventListener("click", openSheet);
  closeBtn.addEventListener("click", closeSheet);
  footerClose.addEventListener("click", closeSheet);
  backdrop.addEventListener("click", closeSheet);

  // 특정 그룹에서 현재 선택된 pill 텍스트 반환
  function getSelectedText(groupName) {
    const block = sheet.querySelector(
      `.sheet-block[data-group="${groupName}"]`,
    );
    return block?.querySelector(".pill.is-on")?.textContent?.trim();
  }

  // state -> UI 동기화
  function syncSheetUIFromState() {
    setOn("date", dtSelection.date);
    setOn("people", dtSelection.people);
    setOn("time", dtSelection.time);
  }

  // 특정 group에서 텍스트가 같은 pill에 is-on 부여
  function setOn(groupName, text) {
    const block = sheet.querySelector(
      `.sheet-block[data-group="${groupName}"]`,
    );
    if (!block) return;
    const pills = Array.from(block.querySelectorAll(".pill"));

    pills.forEach((p) => p.classList.remove("is-on"));
    const target = pills.find((p) => p.textContent.trim() === text);
    (target || pills[0])?.classList.add("is-on");
  }

  // 처음 로딩 시 상단 요약 텍스트 초기화
  dtSummary.textContent = `${dtSelection.date} · ${dtSelection.people} · ${dtSelection.time}`;
}

/* =========================================================
  [9] 하단 버튼 (지금은 디자인/확인용)
========================================================= */
function initBottomActions() {
  const btnClose = document.getElementById("btnClose");
  const btnShow = document.getElementById("btnShowResults");
  if (!btnClose || !btnShow) return;

  btnClose.addEventListener("click", () => console.log("[Bottom] 닫기"));
  btnShow.addEventListener("click", () => console.log("[Bottom] 결과 보기"));
}

/* =========================================================
  [10] 초기 실행
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initSelectedChips();
  initDateTimeSheet();
  initBottomActions();

  // ✅ 첫 화면 렌더링(더미 식당 목록 출력) → 문제 3 해결
  renderShopList();
});
