// ======================= js/main.js =======================
document.addEventListener("DOMContentLoaded", () => {

  /* ===== 슬라이더 ===== */
  const slides = document.getElementById("slides");
  const dotsWrap = document.getElementById("dots");
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

  /* ===== 예약 오버레이 ===== */
  const overlay = document.getElementById("reserveOverlay");
  const openBtn = document.getElementById("openReserve");
  const closeBtn = document.getElementById("closeReserve");
  openBtn.onclick = () => overlay.classList.add("show");
  closeBtn.onclick = () => overlay.classList.remove("show");

  /* ===== 달력 (월 변경 + 날짜 클릭) ===== */
  const daysEl = document.getElementById("days");
  const monthLabel = document.getElementById("monthLabel");
  const prevMonthBtn = document.getElementById("prevMonth");
  const nextMonthBtn = document.getElementById("nextMonth");

  let year = 2026;
  let month = 1; // 2월 (0=1월)

  function renderCalendar() {
    daysEl.innerHTML = "";
    monthLabel.textContent = `${year}년 ${month + 1}월`;

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement("span");
      empty.className = "empty";
      daysEl.appendChild(empty);
    }

    for (let d = 1; d <= lastDate; d++) {
      const s = document.createElement("span");
      s.textContent = d;

      s.onclick = () => {
        document.querySelectorAll("#days span").forEach(x => x.classList.remove("active"));
        s.classList.add("active");
        updateReserveText();
      };

      if (year === 2026 && month === 1 && d === 24) s.classList.add("active");
      daysEl.appendChild(s);
    }
  }

  prevMonthBtn.onclick = () => {
    month--;
    if (month < 0) { month = 11; year--; }
    renderCalendar();
    updateReserveText(true);
  };

  nextMonthBtn.onclick = () => {
    month++;
    if (month > 11) { month = 0; year++; }
    renderCalendar();
    updateReserveText(true);
  };

  /* ===== 인원 선택 (가로 유지) ===== */
  const peopleRow = document.getElementById("people");
  let people = "2";
  peopleRow.querySelectorAll("button").forEach(btn => {
    btn.onclick = () => {
      peopleRow.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      people = btn.dataset.p;
      updateReserveText();
    };
  });

  /* ===== 예약 요약 텍스트 ===== */
  function updateReserveText(resetToFirstActive=false){
    const activeDay = document.querySelector("#days .active");
    if (!activeDay) {
      // 월 변경 후 active가 없으면 1일을 자동 선택
      const firstClickable = [...document.querySelectorAll("#days span")].find(s => s.textContent && !s.classList.contains("empty"));
      if (firstClickable) firstClickable.classList.add("active");
    }

    const dayEl = document.querySelector("#days .active");
    const day = dayEl ? dayEl.textContent : "1";

    document.getElementById("reserveText").textContent =
      `${year}년 ${month + 1}월 ${day}일 · ${people}명`;
  }

  renderCalendar();
  updateReserveText();

  /* ===== 카카오 지도 ===== */
  if (window.kakao) {
    kakao.maps.load(() => {
      const pos = new kakao.maps.LatLng(37.559301, 127.006965);
      const map = new kakao.maps.Map(document.getElementById("map"), { center: pos, level: 3 });
      new kakao.maps.Marker({ map, position: pos });
    });
  }

});