document.addEventListener("DOMContentLoaded", () => {
  const slides = document.getElementById("slides");
  if (slides) {
    let idx = 0;
    setInterval(() => {
      idx = (idx + 1) % slides.children.length;
      slides.style.transform = `translateX(-${idx * 100}%)`;
    }, 3000);
  }

  const overlay = document.getElementById("reserveOverlay");
  const modal = overlay?.querySelector(".modal");
  const openReserve = document.getElementById("openReserve");
  const closeReserve = document.getElementById("closeReserve");
  const openBtn = document.getElementById("openReserveFixed");
  const closeBtn = document.getElementById("closeReserveFixed");
  const reservationBtn = document.getElementById("reservationBtn");
  const backBtn = document.querySelector("#header a");
  const daysEl = document.getElementById("days");
  const timeWrap = document.getElementById("time");

  let year = 2026;
  let month = 1;
  let people = document.querySelector("#people .active")?.dataset.p || "2";
  let time = document.querySelector("#time .active")?.textContent?.trim() || "11:30";

  const soldOutSlots = new Set();

  function openOverlay() {
    if (!overlay) return;
    overlay.classList.add("show");
    if (closeBtn) {
      closeBtn.style.display = "block";
      closeBtn.disabled = false;
      closeBtn.style.pointerEvents = "auto";
    }
  }

  function closeOverlay() {
    if (!overlay) return;
    overlay.classList.remove("show");
    if (closeBtn) closeBtn.style.display = "none";
  }

  function getSelectedDay() {
    return document.querySelector("#days .active")?.textContent || "";
  }

  function saveReservation(day, slotTime) {
    if (!day || !slotTime) return;

    const name = document.querySelector(".place-header h1")?.textContent?.trim() || "\uB9E4\uC7A5";
    const info =
      document.querySelector(".place-header .info li:nth-child(2)")?.textContent?.trim() ||
      document.querySelector(".place-header .info li")?.textContent?.trim() ||
      "\uC608\uC57D \uC815\uBCF4";
    const image = document.querySelector(".slide img")?.getAttribute("src") || "";

    const dateLabel = `${year}\uB144 ${month + 1}\uC6D4 ${day}\uC77C`;
    const peopleLabel = `${people}\uBA85`;

    let reservationData = [];
    try {
      reservationData = JSON.parse(localStorage.getItem("reservations")) || [];
    } catch (_) {
      reservationData = [];
    }

    reservationData.unshift({
      dDay: String(day),
      status: "\uC608\uC57D\uC644\uB8CC",
      image,
      name,
      info,
      dateTime: `${dateLabel} / ${slotTime} / ${peopleLabel}`,
      slotDate: day,
      slotTime,
      createdAt: Date.now(),
    });

    localStorage.setItem("reservations", JSON.stringify(reservationData));
  }

  function slotKey(day, slotTime) {
    return `${year}-${month + 1}-${day}-${slotTime}`;
  }

  function getModalReserveButton() {
    return document.getElementById("modalReserveBtn");
  }

  function updateModalReserveButtonState() {
    const reserveBtn = getModalReserveButton();
    if (!reserveBtn) return;
    const hasAvailableTime = Array.from(document.querySelectorAll("#time button")).some(b => !b.disabled);
    reserveBtn.disabled = !hasAvailableTime;
    reserveBtn.style.opacity = hasAvailableTime ? "1" : "0.5";
    reserveBtn.style.cursor = hasAvailableTime ? "pointer" : "not-allowed";
  }

  function applyTimeAvailability() {
    const day = getSelectedDay();
    const timeButtons = Array.from(document.querySelectorAll("#time button"));
    let hasActiveAvailable = false;

    timeButtons.forEach(button => {
      if (!button.dataset.time) {
        button.dataset.time = button.textContent?.trim() || "";
      }
      const baseTime = button.dataset.time;
      const soldOut = !!day && soldOutSlots.has(slotKey(day, baseTime));

      button.disabled = soldOut;
      button.classList.toggle("soldout", soldOut);
      button.textContent = soldOut ? `${baseTime} \uB9C8\uAC10` : baseTime;

      if (button.classList.contains("active") && soldOut) {
        button.classList.remove("active");
      }
      if (button.classList.contains("active") && !soldOut) {
        hasActiveAvailable = true;
        time = baseTime;
      }
    });

    if (!hasActiveAvailable) {
      const firstAvailable = timeButtons.find(button => !button.disabled);
      if (firstAvailable) {
        firstAvailable.classList.add("active");
        time = firstAvailable.dataset.time || firstAvailable.textContent?.trim() || "";
      } else {
        time = "";
      }
    }

    updateModalReserveButtonState();
  }

  function ensureModalReserveButton() {
    if (!modal || !closeReserve) return;
    if (getModalReserveButton()) return;

    const reserveBtn = document.createElement("button");
    reserveBtn.id = "modalReserveBtn";
    reserveBtn.type = "button";
    reserveBtn.className = "modal-reserve-btn";
    reserveBtn.textContent = "\uC608\uC57D\uD558\uAE30";
    reserveBtn.addEventListener("click", () => {
      const day = getSelectedDay();
      if (!day || !time) return;

      saveReservation(day, time);
      soldOutSlots.add(slotKey(day, time));
      applyTimeAvailability();
      updateReserveText();
      closeOverlay();
    });

    closeReserve.insertAdjacentElement("beforebegin", reserveBtn);
    updateModalReserveButtonState();
  }

  function updateReserveText() {
    const day = getSelectedDay() || "1";
    const reserveText = document.getElementById("reserveText");
    if (!reserveText) return;
    const timeText = time || "\uB9C8\uAC10";
    reserveText.textContent = `${year}\uB144 ${month + 1}\uC6D4 ${day}\uC77C \u00B7 ${timeText} \u00B7 ${people}\uBA85`;
  }

  function renderCalendar() {
    if (!daysEl) return;
    daysEl.innerHTML = "";

    const first = new Date(year, month, 1).getDay();
    const last = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < first; i++) {
      const empty = document.createElement("span");
      empty.className = "empty";
      daysEl.appendChild(empty);
    }

    for (let day = 1; day <= last; day++) {
      const cell = document.createElement("span");
      cell.textContent = String(day);
      if (day === 24) cell.classList.add("active");

      cell.onclick = () => {
        document.querySelectorAll("#days span").forEach(x => x.classList.remove("active"));
        cell.classList.add("active");
        ensureModalReserveButton();
        applyTimeAvailability();
        updateReserveText();
      };

      daysEl.appendChild(cell);
    }
  }

  if (timeWrap) {
    timeWrap.addEventListener(
      "wheel",
      e => {
        if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
        e.preventDefault();
        timeWrap.scrollLeft += e.deltaY;
      },
      { passive: false }
    );
  }

  document.querySelectorAll("#people button").forEach(button => {
    button.onclick = () => {
      document.querySelectorAll("#people button").forEach(x => x.classList.remove("active"));
      button.classList.add("active");
      people = button.dataset.p || "2";
      ensureModalReserveButton();
      updateReserveText();
    };
  });

  document.querySelectorAll("#time button").forEach(button => {
    if (!button.dataset.time) {
      button.dataset.time = button.textContent?.trim() || "";
    }

    button.addEventListener("click", () => {
      if (button.disabled) return;
      document.querySelectorAll("#time button").forEach(x => x.classList.remove("active"));
      button.classList.add("active");
      time = button.dataset.time || button.textContent?.trim() || "11:30";
      ensureModalReserveButton();
      updateReserveText();
    });
  });

  if (openReserve) openReserve.onclick = openOverlay;
  if (openBtn) openBtn.addEventListener("click", openOverlay);
  if (closeReserve) closeReserve.onclick = closeOverlay;
  if (closeBtn) closeBtn.addEventListener("click", closeOverlay);
  if (backBtn) {
    backBtn.addEventListener("click", e => {
      e.preventDefault();
      window.location.href = "intro.html";
    });
  }
  if (reservationBtn) {
    reservationBtn.addEventListener("click", () => {
      window.location.href = "예약현황.html";
    });
  }

  renderCalendar();
  applyTimeAvailability();
  updateReserveText();
  if (closeBtn) closeBtn.style.display = "none";
});
