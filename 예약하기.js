(() => {
    'use strict';

    const STORAGE_KEYS = {
        slots: 'demo_reserved_slots',
        reservations: 'reservations',
    };

    function loadReservedSlots() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.slots);
            const arr = raw ? JSON.parse(raw) : [];
            return new Set(Array.isArray(arr) ? arr : []);
        } catch {
            return new Set();
        }
    }

    function saveReservedSlots(set) {
        localStorage.setItem(STORAGE_KEYS.slots, JSON.stringify(Array.from(set)));
    }

    function dateKey(dateObj) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function monthLabel(dateObj) {
        return `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월`;
    }

    function isPastDate(dateObj) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return dateObj < today;
    }

    function buildTimeSlots(shopId, dateKeyStr) {
        const base = ['18:00', '18:30', '19:00', '19:30', '20:00'];

        const seedStr = `${shopId}__${dateKeyStr}`;
        let seed = 0;
        for (let i = 0; i < seedStr.length; i++) seed += seedStr.charCodeAt(i);

        const allClosed = seed % 11 === 0;

        return base.map((time, idx) => {
            if (allClosed) return { time, closed: true };
            return { time, closed: (seed + idx) % 3 === 0 };
        });
    }

    function slotKey(shopId, dateKeyStr, time) {
        return `${shopId}__${dateKeyStr}__${time}`;
    }

    class ReserveKit {
        constructor(root) {
            this.root = root;
            this.shop = {
                id: root.dataset.shopId || 'shop-001',
                name: root.dataset.shopName || '도우룸 광화문',
                info: root.dataset.shopInfo || '광화문 / 점심, 저녁 동일가 3-4만원',
                image: root.dataset.shopImage || '',
                statusPage: root.dataset.statusPage || '예약현황.html',
            };

            this.state = {
                selectedDateKey: null,
                selectedPeople: '2명',
                selectedTime: null,
                calendarCursor: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                reservedSlots: loadReservedSlots(),
            };

            this.els = {
                statusBtn: root.querySelector('[data-role="status-btn"]'),
                toggleBtn: root.querySelector('[data-role="toggle"]'),
                panel: root.querySelector('[data-role="panel"]'),
                arrow: root.querySelector('[data-role="arrow"]'),
                summary: root.querySelector('[data-role="summary"]'),
                monthLabel: root.querySelector('[data-role="month-label"]'),
                prevMonthBtn: root.querySelector('[data-role="prev-month"]'),
                nextMonthBtn: root.querySelector('[data-role="next-month"]'),
                dateGrid: root.querySelector('[data-role="date-grid"]'),
                peopleRow: root.querySelector('[data-role="people-row"]'),
                timeGrid: root.querySelector('[data-role="time-grid"]'),
                reserveBtn: root.querySelector('[data-role="reserve-btn"]'),
            };

            this.bindEvents();
            this.render();
        }

        bindEvents() {
            this.els.statusBtn?.addEventListener('click', () => {
                window.location.href = this.shop.statusPage;
            });

            this.els.toggleBtn?.addEventListener('click', () => {
                this.openPanel(!this.els.panel.classList.contains('active'));
            });

            this.els.prevMonthBtn?.addEventListener('click', () => {
                this.state.calendarCursor = new Date(
                    this.state.calendarCursor.getFullYear(),
                    this.state.calendarCursor.getMonth() - 1,
                    1
                );
                this.state.selectedDateKey = null;
                this.state.selectedTime = null;
                this.render();
            });

            this.els.nextMonthBtn?.addEventListener('click', () => {
                this.state.calendarCursor = new Date(
                    this.state.calendarCursor.getFullYear(),
                    this.state.calendarCursor.getMonth() + 1,
                    1
                );
                this.state.selectedDateKey = null;
                this.state.selectedTime = null;
                this.render();
            });

            this.els.dateGrid?.addEventListener('click', (event) => {
                const btn = event.target.closest('[data-role="date"]');
                if (!btn || btn.disabled) return;

                this.state.selectedDateKey = btn.dataset.dateKey;
                this.state.selectedTime = null;
                this.render();
            });

            this.els.peopleRow?.addEventListener('click', (event) => {
                const btn = event.target.closest('[data-role="people"]');
                if (!btn) return;

                this.state.selectedPeople = btn.dataset.people;
                this.render();
            });

            this.els.timeGrid?.addEventListener('click', (event) => {
                const btn = event.target.closest('[data-role="time"]');
                if (!btn || btn.disabled) return;

                this.state.selectedTime = btn.dataset.time;
                this.render();
            });

            this.els.reserveBtn?.addEventListener('click', () => {
                this.processReservation();
            });
        }

        openPanel(open) {
            this.els.panel?.classList.toggle('active', open);
            this.els.toggleBtn?.classList.toggle('is-open', open);
        }

        hasAnyAvailableTime(dateKeyStr) {
            const slots = buildTimeSlots(this.shop.id, dateKeyStr);
            for (const slot of slots) {
                if (slot.closed) continue;
                if (this.state.reservedSlots.has(slotKey(this.shop.id, dateKeyStr, slot.time))) continue;
                return true;
            }
            return false;
        }

        renderCalendar() {
            const grid = this.els.dateGrid;
            if (!grid) return;

            grid.innerHTML = '';
            if (this.els.monthLabel) this.els.monthLabel.textContent = monthLabel(this.state.calendarCursor);

            const y = this.state.calendarCursor.getFullYear();
            const m = this.state.calendarCursor.getMonth();
            const firstDay = new Date(y, m, 1);
            const firstWeekDay = firstDay.getDay();
            const lastDate = new Date(y, m + 1, 0).getDate();
            const todayKey = dateKey(new Date());

            for (let i = 0; i < firstWeekDay; i++) {
                const empty = document.createElement('span');
                empty.className = 'rk-date-empty';
                grid.appendChild(empty);
            }

            let firstAvailableKey = null;
            let selectedExists = false;

            for (let day = 1; day <= lastDate; day++) {
                const d = new Date(y, m, day);
                const key = dateKey(d);
                const hasSlot = this.hasAnyAvailableTime(key);
                const canReserve = hasSlot && !isPastDate(d);

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'rk-date-btn';
                btn.dataset.role = 'date';
                btn.dataset.dateKey = key;
                btn.textContent = String(day);

                if (key === todayKey) btn.classList.add('today');
                if (this.state.selectedDateKey === key) {
                    btn.classList.add('on');
                    selectedExists = true;
                }

                if (!canReserve) {
                    btn.classList.add('disabled');
                    btn.disabled = true;
                }

                if (!firstAvailableKey && canReserve) firstAvailableKey = key;
                grid.appendChild(btn);
            }

            if (!selectedExists) {
                this.state.selectedDateKey = firstAvailableKey;
            }
        }

        renderPeople() {
            const row = this.els.peopleRow;
            if (!row) return;

            row.innerHTML = '';
            ['2명', '3명', '4명', '5명'].forEach((people) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'rk-person-btn';
                btn.dataset.role = 'people';
                btn.dataset.people = people;
                btn.textContent = people;

                if (this.state.selectedPeople === people) btn.classList.add('on');
                row.appendChild(btn);
            });
        }

        renderTimes() {
            const grid = this.els.timeGrid;
            if (!grid) return;

            grid.innerHTML = '';
            if (!this.state.selectedDateKey) return;

            const slots = buildTimeSlots(this.shop.id, this.state.selectedDateKey);
            slots.forEach((slot) => {
                const reserved = this.state.reservedSlots.has(
                    slotKey(this.shop.id, this.state.selectedDateKey, slot.time)
                );
                const disabled = slot.closed || reserved;

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'rk-time-btn';
                btn.dataset.role = 'time';
                btn.dataset.time = slot.time;

                let suffix = '';
                if (slot.closed) suffix = ' (예약 마감)';
                else if (reserved) suffix = ' (예약 완료)';

                btn.textContent = slot.time + suffix;
                if (this.state.selectedTime === slot.time) btn.classList.add('on');

                if (disabled) {
                    btn.classList.add('disabled');
                    btn.disabled = true;
                }
                grid.appendChild(btn);
            });
        }

        renderSummary() {
            if (!this.els.summary) return;

            if (!this.state.selectedDateKey) {
                this.els.summary.textContent = '예약 가능한 날짜가 없습니다.';
                return;
            }

            const selectedTime = this.state.selectedTime || '미선택';
            this.els.summary.textContent = `${this.state.selectedDateKey} / ${this.state.selectedPeople} / ${selectedTime}`;
        }

        renderReserveButton() {
            if (!this.els.reserveBtn) return;
            this.els.reserveBtn.disabled = !(this.state.selectedDateKey && this.state.selectedTime);
        }

        processReservation() {
            if (!this.state.selectedDateKey) {
                alert('예약 가능한 날짜가 없습니다.');
                return;
            }

            if (!this.state.selectedTime) {
                alert('시간을 선택해 주세요.');
                return;
            }

            const reservation = {
                dDay: String(Number(this.state.selectedDateKey.split('-')[2])),
                dateTime: `${this.state.selectedDateKey} ${this.state.selectedTime} / ${this.state.selectedPeople}`,
                name: this.shop.name,
                info: this.shop.info,
                image: this.shop.image,
                status: '예약완료',
            };

            const reservations = JSON.parse(localStorage.getItem(STORAGE_KEYS.reservations)) || [];
            reservations.push(reservation);
            localStorage.setItem(STORAGE_KEYS.reservations, JSON.stringify(reservations));

            const reservedKey = slotKey(this.shop.id, this.state.selectedDateKey, this.state.selectedTime);
            this.state.reservedSlots.add(reservedKey);
            saveReservedSlots(this.state.reservedSlots);

            this.state.selectedTime = null;
            this.render();
            this.openPanel(false);

            alert('예약이 완료되었습니다.');
        }

        render() {
            this.renderCalendar();
            this.renderPeople();
            this.renderTimes();
            this.renderSummary();
            this.renderReserveButton();
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.rk-reserve').forEach((root) => {
            new ReserveKit(root);
        });
    });
})();
