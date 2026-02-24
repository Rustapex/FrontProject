const openBtn = document.getElementById("openBtn");
const reserveBtn = document.getElementById("reserveBtn");
const modal = document.getElementById("calendarModal");
const closeBtn = document.getElementById("closeBtn");
const reservationBtn = document.getElementById("reservationBtn");

reservationBtn.addEventListener("click", () => {
    window.location.href = "예약현황.html";
});

openBtn.addEventListener("click", () => {
    modal.classList.add("active");
    document.body.classList.add("modal-open");
});

reserveBtn.addEventListener("click", () => {
    modal.classList.add("active");
    document.body.classList.add("modal-open");
});

closeBtn.addEventListener("click", () => {
    modal.classList.remove("active");
    document.body.classList.remove("modal-open");

    setTimeout(() => {
        resetCalendar();
    }, 400);
});

function resetCalendar() {
    modal.querySelectorAll(".selected").forEach((el) => el.classList.remove("selected"));

    const calendarReserveBtn = modal.querySelector(".calendar-reserve-btn");
    if (calendarReserveBtn) {
        calendarReserveBtn.classList.remove("show");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const modalReserveBtn = document.querySelector(".calendar-reserve-btn");
    const outsideReserveBtn = document.getElementById("reserveBtn");

    function checkSelection() {
        const selectedDate = document.querySelector(".calendar .selected");
        const selectedPeople = document.querySelector(".people .selected");
        const selectedTime = document.querySelector(".watch .selected");

        if (selectedDate && selectedPeople && selectedTime) {
            if (modalReserveBtn) modalReserveBtn.classList.add("show");
        } else {
            if (modalReserveBtn) modalReserveBtn.classList.remove("show");
        }
    }

    document.querySelectorAll(".calendar span").forEach((date) => {
        date.addEventListener("click", () => {
            if (date.classList.contains("disabled")) return;

            document.querySelectorAll(".calendar .selected").forEach((d) => d.classList.remove("selected"));
            date.classList.add("selected");
            checkSelection();
        });
    });

    document.querySelectorAll(".people button").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".people button").forEach((b) => b.classList.remove("selected"));
            btn.classList.add("selected");
            checkSelection();
        });
    });

    document.querySelectorAll(".watch button").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".watch button").forEach((b) => b.classList.remove("selected"));
            btn.classList.add("selected");
            checkSelection();
        });
    });

    function processReservation() {
        const selectedDate = document.querySelector(".calendar .selected");
        const selectedPeople = document.querySelector(".people .selected");
        const selectedTime = document.querySelector(".watch .selected");

        if (!selectedDate || !selectedPeople || !selectedTime) return;

        const reservation = {
            dDay: selectedDate.textContent,
            dateTime: `${selectedDate.textContent} ${selectedTime.textContent} / ${selectedPeople.textContent}`,
            name: "도우룸 광화문",
            info: "광화문 / 점심, 저녁 동일가 3-4만원",
            image: "https://ugc-images.catchtable.co.kr/shop/manager/images/043d25fe6bbc44fd961228b3b11814f9?resizeType=details500&ftype=avif",
            status: "예약완료",
        };

        const reservations = JSON.parse(localStorage.getItem("reservations")) || [];
        reservations.push(reservation);
        localStorage.setItem("reservations", JSON.stringify(reservations));

        selectedTime.classList.remove("selected");
        selectedTime.classList.add("disabled");
        selectedTime.textContent = "예약마감";

        modal.classList.remove("active");
        document.body.classList.remove("modal-open");
        document.body.style.overflow = "auto";

        resetCalendar();
    }

    if (modalReserveBtn) modalReserveBtn.addEventListener("click", processReservation);
    if (outsideReserveBtn) outsideReserveBtn.addEventListener("click", processReservation);
});
