document.addEventListener("DOMContentLoaded", () => {

  /* 슬라이더 */
  const slides = document.getElementById("slides");
  if (slides) {
    let idx = 0;
    setInterval(() => {
      idx = (idx + 1) % slides.children.length;
      slides.style.transform = `translateX(-${idx * 100}%)`;
    }, 3000);
  }

  /* 예약 오버레이 */
  const overlay = document.getElementById("reserveOverlay");
  const openReserve = document.getElementById("openReserve");          // 상단 예약 요약 버튼
  const closeReserve = document.getElementById("closeReserve");        // 모달 안 '닫기' 버튼

  /* 하단 고정 버튼 */
  const openBtn = document.getElementById("openReserveFixed");         // 하단 '예약하기' 버튼(있으면)
  const closeBtn = document.getElementById("closeReserveFixed");       // 하단 '닫기' 버튼

  // ✅ 영상처럼: 오버레이 열리면 '닫기' 버튼이 활성화(보이게)
  function openOverlay() {
    if (!overlay) return;
    overlay.classList.add("show");

    if (closeBtn) {
      closeBtn.style.display = "block";     // ⭐ 닫기 버튼 보이기
      closeBtn.disabled = false;            // ⭐ 활성화
      closeBtn.style.pointerEvents = "auto";
    }
  }

  // ✅ 닫기 버튼 누르면 오버레이 닫힘 + 닫기 버튼 숨김
  function closeOverlay() {
    if (!overlay) return;
    overlay.classList.remove("show");

    if (closeBtn) {
      closeBtn.style.display = "none";      // ⭐ 닫기 버튼 숨기기
    }
  }

  // 상단 예약 클릭 → 오버레이 열기
  if (openReserve) openReserve.onclick = openOverlay;

  // 하단 예약하기 클릭(있으면) → 오버레이 열기
  if (openBtn) openBtn.addEventListener("click", openOverlay);

  // 모달 안 닫기 클릭 → 오버레이 닫기
  if (closeReserve) closeReserve.onclick = closeOverlay;

  // 하단 닫기 클릭 → 오버레이 닫기
  if (closeBtn) closeBtn.addEventListener("click", closeOverlay);


  /* 달력 */
  const daysEl = document.getElementById("days");
  let year = 2026, month = 1;

  function render() {
    if (!daysEl) return;
    daysEl.innerHTML = "";

    const first = new Date(year, month, 1).getDay();
    const last = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < first; i++) {
      const empty = document.createElement("span");
      empty.className = "empty";
      daysEl.appendChild(empty);
    }

    for (let d = 1; d <= last; d++) {
      const s = document.createElement("span");
      s.textContent = d;

      if (d === 24) s.classList.add("active");

      s.onclick = () => {
        document.querySelectorAll("#days span").forEach(x => x.classList.remove("active"));
        s.classList.add("active");
        updateText();
      };

      daysEl.appendChild(s);
    }
  }

  /* 인원 선택 */
  let people = "2";
  document.querySelectorAll("#people button").forEach(b => {
    b.onclick = () => {
      document.querySelectorAll("#people button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      people = b.dataset.p;
      updateText();
    };
  });

  function updateText() {
    const day = document.querySelector("#days .active")?.textContent || "1";
    const reserveText = document.getElementById("reserveText");
    if (reserveText) {
      reserveText.textContent = `${year}년 ${month + 1}월 ${day}일 · ${people}명`;
    }
  }

  render();
  updateText();

  // ✅ 처음 로딩 시에는 하단 닫기 버튼은 무조건 숨김 (영상처럼)
  if (closeBtn) closeBtn.style.display = "none";
});
