let currentFloor = 1;
let selectedRoom = null;
let selectedSlotIndices = [];
let reportTargetBooking = null;

// Получение ID текущего авторизованного студента из IT.Шабур
function getActiveUserId() {
    return localStorage.getItem('currentUserId') || 'guest';
}

// Получение броней только текущего студента
function getCurrentUserBookings() {
    const uid = getActiveUserId();
    return userBookings.filter(b => !b.userId || b.userId === uid);
}

// Вспомогательная функция получения локальной даты в формате YYYY-MM-DD
function getLocalDateStr(dateObj = new Date()) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Проверка, является ли дата выходным днём (Суббота = 6, Воскресенье = 0)
function isWeekendDate(dateStr) {
    if (!dateStr) return false;
    const [y, m, d] = dateStr.split('-').map(Number);
    const day = new Date(y, m - 1, d).getDay();
    return day === 0 || day === 6;
}

// Проверка, прошло ли время слота на выбранную дату
function isSlotPassed(slotTime, selectedDateStr) {
    const now = new Date();
    const today = getLocalDateStr(now);

    if (selectedDateStr < today) return true;
    if (selectedDateStr > today) return false;

    const [startStr, endStr] = slotTime.split('–').map(s => s.trim());
    const [endH, endM] = endStr.split(':').map(Number);

    const slotEnd = new Date(now);
    slotEnd.setHours(endH, endM, 0, 0);

    return now >= slotEnd;
}

// Проверка, занят ли конкретный слот на выбранную дату (любым студентом)
function getBookingForSlot(roomId, dateStr, slotTime) {
    return userBookings.find(b => {
        if (b.roomId !== roomId || b.date !== dateStr) return false;
        if (b.bookedSlots && b.bookedSlots.includes(slotTime)) return true;
        return b.time === slotTime;
    });
}

// Настройка ограничений календаря (сегодня .. +7 дней, исключая Сб и Вс)
function setupDateConstraints() {
    const dateInput = document.getElementById('booking-date');
    if (!dateInput) return;

    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 7);

    const minStr = getLocalDateStr(today);
    const maxStr = getLocalDateStr(maxDate);

    dateInput.min = minStr;
    dateInput.max = maxStr;

    // Если сегодня суббота или воскресенье — автоматически переключаем на ближайший понедельник
    let initialDate = new Date(today);
    while (initialDate.getDay() === 0 || initialDate.getDay() === 6) {
        initialDate.setDate(initialDate.getDate() + 1);
    }

    if (!dateInput.value || dateInput.value < minStr || dateInput.value > maxStr || isWeekendDate(dateInput.value)) {
        dateInput.value = getLocalDateStr(initialDate);
    }

    renderBookedDatesBar();
}

// Отрисовка ленты рабочих дней на ближайшую неделю (без Сб и Вс)
function renderBookedDatesBar() {
    const controlsLeft = document.querySelector('.controls-left');
    const dateInput = document.getElementById('booking-date');
    if (!controlsLeft || !dateInput) return;

    let strip = document.getElementById('week-calendar-strip');
    if (!strip) {
        strip = document.createElement('div');
        strip.id = 'week-calendar-strip';
        strip.className = 'week-strip';
        controlsLeft.appendChild(strip);
    }

    const myBookings = getCurrentUserBookings();
    const bookedDatesSet = new Set(myBookings.map(b => b.date));
    const daysHtml = [];
    const weekDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

    for (let i = 0; i <= 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);

        // Пропускаем субботу (6) и воскресенье (0)
        if (d.getDay() === 0 || d.getDay() === 6) continue;

        const dStr = getLocalDateStr(d);
        const isSelected = dateInput.value === dStr;
        const hasBooking = bookedDatesSet.has(dStr);
        const dayNum = String(d.getDate()).padStart(2, '0');
        const monthNum = String(d.getMonth() + 1).padStart(2, '0');
        const label = i === 0 ? 'Сегодня' : `${dayNum}.${monthNum} (${weekDays[d.getDay()]})`;

        daysHtml.push(`
            <button type="button"
                class="day-chip ${isSelected ? 'active' : ''} ${hasBooking ? 'has-booking' : ''}"
                onclick="selectCalendarDate('${dStr}')"
                title="${hasBooking ? 'На эту дату у вас есть бронь' : 'Рабочий день'}">
                ${label}
                ${hasBooking ? '<span class="booking-dot"></span>' : ''}
            </button>
        `);
    }

    strip.innerHTML = daysHtml.join('');

    if (bookedDatesSet.has(dateInput.value)) {
        dateInput.classList.add('has-booking-date');
    } else {
        dateInput.classList.remove('has-booking-date');
    }
}

function selectCalendarDate(dateStr) {
    const dateInput = document.getElementById('booking-date');
    if (dateInput) {
        dateInput.value = dateStr;
        renderFloor();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupDateConstraints();
    renderFloor();
    updateBookingsCounter();
});

function switchView(view) {
    document.getElementById('view-map').classList.toggle('hidden', view !== 'map');
    document.getElementById('view-bookings').classList.toggle('hidden', view !== 'bookings');
    document.getElementById('nav-map').classList.toggle('active', view === 'map');
    document.getElementById('nav-bookings').classList.toggle('active', view === 'bookings');

    if (view === 'bookings') {
        renderBookingsList();
    } else {
        renderFloor();
    }
}

function changeFloor(floor, btn) {
    currentFloor = floor;
    document.querySelectorAll('.floor-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    renderFloor();
}

function getRoomStatus(room, dateStr) {
    // В выходные кабинки закрыты
    if (isWeekendDate(dateStr)) return 'busy';

    let hasAvailableSlot = false;
    let hasBooking = false;

    for (const slot of room.slots) {
        const passed = isSlotPassed(slot.time, dateStr);
        const bookedSlot = getBookingForSlot(room.id, dateStr, slot.time);

        if (bookedSlot || slot.status === 'booked') {
            hasBooking = true;
        } else if (!passed && slot.status === 'free') {
            hasAvailableSlot = true;
        }
    }

    if (hasBooking && !hasAvailableSlot) return 'booked';
    if (hasAvailableSlot) return 'free';
    return 'busy';
}

function renderFloor() {
    const dateInput = document.getElementById('booking-date');
    const selectedDate = dateInput ? dateInput.value : getLocalDateStr();

    // Если пользователь выбрал Сб или Вс в поле <input type="date"> — предупреждаем и возвращаем на ближайший будний день
    if (isWeekendDate(selectedDate)) {
        showToast('Выходной день', 'По субботам и воскресеньям бронирование кабинок недоступно.');
        setupDateConstraints();
        return;
    }

    renderBookedDatesBar();

    const northGrid = document.getElementById('rooms-north');
    const southGrid = document.getElementById('rooms-south');
    northGrid.innerHTML = '';
    southGrid.innerHTML = '';

    const rooms = roomsDatabase[currentFloor] || [];
    const half = Math.ceil(rooms.length / 2);

    rooms.forEach((room, idx) => {
        const status = getRoomStatus(room, selectedDate);
        const card = document.createElement('div');
        card.className = `room-card ${status}`;
        card.onclick = () => openRoomModal(room);

        card.innerHTML = `
            <div class="room-header">
                <div class="room-number">${room.name}</div>
            </div>
            <div class="room-footer">
                <span>До ${room.capacity} мест</span>
                <span class="room-action">Расписание →</span>
            </div>
        `;

        if (idx < half) {
            northGrid.appendChild(card);
        } else {
            southGrid.appendChild(card);
        }
    });
}

function openRoomModal(room) {
    selectedRoom = room;
    selectedSlotIndices = [];
    const selectedDate = document.getElementById('booking-date').value;

    document.getElementById('modal-title').textContent = `${room.name} (${currentFloor} этаж)`;
    document.getElementById('modal-subtitle').textContent = `Дата: ${selectedDate.split('-').reverse().join('.')} • Вместимость: до ${room.capacity} чел.`;
    document.getElementById('purpose-input').value = '';
    document.getElementById('modal-error').classList.remove('visible');

    renderModalSlots();
    document.getElementById('modal-backdrop').classList.add('open');
}

function renderModalSlots() {
    const container = document.getElementById('modal-slots');
    const selectedDate = document.getElementById('booking-date').value;
    const uid = getActiveUserId();
    container.innerHTML = '';

    selectedRoom.slots.forEach((slot, index) => {
        const passed = isSlotPassed(slot.time, selectedDate);
        const existingBooking = getBookingForSlot(selectedRoom.id, selectedDate, slot.time);

        let effectiveStatus = slot.status;
        let effectiveLabel = slot.label;

        if (existingBooking) {
            const isMine = !existingBooking.userId || existingBooking.userId === uid;
            effectiveStatus = 'booked';
            effectiveLabel = isMine
                ? `Ваша бронь (${existingBooking.purpose})`
                : 'Забронировано другим студентом';
        } else if (passed) {
            effectiveStatus = 'occupied';
            effectiveLabel = 'Время прошло';
        }

        const isSelected = selectedSlotIndices.includes(index);
        const item = document.createElement('div');
        item.className = `slot-item ${effectiveStatus} ${isSelected ? 'selected' : ''}`;
        item.innerHTML = `<span>${slot.time}</span><span>${effectiveLabel}</span>`;

        if (effectiveStatus === 'free') {
            item.onclick = () => {
                if (selectedSlotIndices.includes(index)) {
                    selectedSlotIndices = selectedSlotIndices.filter(i => i !== index);
                } else {
                    selectedSlotIndices.push(index);
                    selectedSlotIndices.sort((a, b) => a - b);
                }
                renderModalSlots();
            };
        }

        container.appendChild(item);
    });
}

function submitBooking() {
    const errorEl = document.getElementById('modal-error');
    const purpose = document.getElementById('purpose-input').value.trim();
    const selectedDate = document.getElementById('booking-date').value;
    const myBookings = getCurrentUserBookings();

    // Проверка: один человек может забронировать не более 1 кабинки на одну дату
    const alreadyBookedToday = myBookings.find(b => b.date === selectedDate);
    if (alreadyBookedToday) {
        const formattedDate = selectedDate.split('-').reverse().join('.');
        errorEl.textContent = `На ${formattedDate} у вас уже есть бронь (${alreadyBookedToday.roomName}). Можно бронировать не более 1 кабинки в день.`;
        errorEl.classList.add('visible');
        return;
    }

    if (selectedSlotIndices.length === 0) {
        errorEl.textContent = 'Выберите хотя бы одно свободное временное окно.';
        errorEl.classList.add('visible');
        return;
    }

    // Проверяем, что выбранные слоты идут подряд
    for (let i = 1; i < selectedSlotIndices.length; i++) {
        if (selectedSlotIndices[i] !== selectedSlotIndices[i - 1] + 1) {
            errorEl.textContent = 'Можно выбрать только соседние слоты подряд.';
            errorEl.classList.add('visible');
            return;
        }
    }

    if (!purpose) {
        errorEl.textContent = 'Укажите цель бронирования.';
        errorEl.classList.add('visible');
        return;
    }

    const firstSlot = selectedRoom.slots[selectedSlotIndices[0]];
    const lastSlot = selectedRoom.slots[selectedSlotIndices[selectedSlotIndices.length - 1]];
    const startTime = firstSlot.time.split('–')[0].trim();
    const endTime = lastSlot.time.split('–')[1].trim();
    const combinedTime = `${startTime} – ${endTime}`;
    const bookedSlots = selectedSlotIndices.map(i => selectedRoom.slots[i].time);

    userBookings.push({
        id: Date.now(),
        userId: getActiveUserId(),
        roomId: selectedRoom.id,
        roomName: selectedRoom.name,
        floor: currentFloor,
        date: selectedDate,
        time: combinedTime,
        bookedSlots: bookedSlots,
        purpose: purpose
    });

    saveDatabase();
    closeModal();
    renderFloor();
    updateBookingsCounter();
    showToast('Бронь подтверждена!', `${selectedRoom.name} на ${selectedDate.split('-').reverse().join('.')} (${combinedTime})`);
}

function closeModal() {
    document.getElementById('modal-backdrop').classList.remove('open');
}

function handleBackdropClick(e) {
    if (e.target.id === 'modal-backdrop') closeModal();
}

function updateBookingsCounter() {
    const badge = document.getElementById('bookings-counter');
    if (!badge) return;
    const myBookings = getCurrentUserBookings();
    badge.textContent = myBookings.length;
    badge.classList.toggle('hidden', myBookings.length === 0);
}

function renderBookingsList() {
    const list = document.getElementById('bookings-list');
    list.innerHTML = '';
    const myBookings = getCurrentUserBookings();

    if (myBookings.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted);">У вас пока нет активных броней.</p>';
        return;
    }

    myBookings.forEach(b => {
        const card = document.createElement('div');
        card.className = 'booking-card';
        card.innerHTML = `
            <div>
                <h3 style="color: var(--accent-green);">${b.roomName} (${b.floor} этаж)</h3>
                <p style="margin-top: 4px;">Дата: <strong>${b.date.split('-').reverse().join('.')}</strong> • ${b.time}</p>
                <p style="color: var(--text-muted); font-size: 0.88rem; margin-top: 4px;">Цель: ${b.purpose}</p>
            </div>
            <div class="booking-actions">
                <div class="booking-actions-row">
                    <button class="btn-secondary" onclick="extendBooking(${b.id})">+ Продлить</button>
                    <button class="btn-secondary" onclick="openReportModal(${b.id})">⚠ Проблема</button>
                </div>
                <button class="btn-danger-outline" onclick="cancelBooking(${b.id})">Отменить бронь</button>
            </div>
        `;
        list.appendChild(card);
    });
}

function extendBooking(bookingId) {
    const booking = userBookings.find(b => b.id === bookingId);
    if (!booking) return;

    const room = (roomsDatabase[booking.floor] || []).find(r => r.id === booking.roomId);
    if (!room) return;

    const lastBookedTime = booking.bookedSlots[booking.bookedSlots.length - 1];
    const lastIdx = room.slots.findIndex(s => s.time === lastBookedTime);

    if (lastIdx === -1 || lastIdx + 1 >= room.slots.length) {
        showToast('Нельзя продлить', 'Это последний слот в расписании на этот день.');
        return;
    }

    const nextSlot = room.slots[lastIdx + 1];
    if (getBookingForSlot(room.id, booking.date, nextSlot.time) || nextSlot.status !== 'free') {
        showToast('Слот занят', `Следующее окно (${nextSlot.time}) уже занято.`);
        return;
    }

    booking.bookedSlots.push(nextSlot.time);
    const startTime = booking.time.split('–')[0].trim();
    const newEndTime = nextSlot.time.split('–')[1].trim();
    booking.time = `${startTime} – ${newEndTime}`;

    saveDatabase();
    renderBookingsList();
    renderFloor();
    showToast('Бронь продлена', `Новое время: ${booking.time}`);
}

function cancelBooking(bookingId) {
    const idx = userBookings.findIndex(b => b.id === bookingId);
    if (idx === -1) return;

    userBookings.splice(idx, 1);
    saveDatabase();
    renderBookingsList();
    renderFloor();
    updateBookingsCounter();
    showToast('Бронь отменена', 'Слот снова свободен для бронирования.');
}

function openReportModal(bookingId) {
    reportTargetBooking = userBookings.find(b => b.id === bookingId);
    if (!reportTargetBooking) return;

    document.getElementById('report-title').textContent = `Проблема: ${reportTargetBooking.roomName}`;
    document.getElementById('report-input').value = '';
    document.getElementById('report-error').classList.remove('visible');
    document.getElementById('report-backdrop').classList.add('open');
}

function closeReportModal() {
    document.getElementById('report-backdrop').classList.remove('open');
}

function submitReport() {
    const text = document.getElementById('report-input').value.trim();
    if (!text) {
        document.getElementById('report-error').classList.add('visible');
        return;
    }

    cabinReports.push({
        id: Date.now(),
        roomName: reportTargetBooking.roomName,
        floor: reportTargetBooking.floor,
        date: reportTargetBooking.date,
        text: text
    });

    saveReports();
    closeReportModal();
    alert('Ваша жалоба была отправлена админу (демо)');
    showToast('Заявка отправлена', 'Ваша жалоба была отправлена админу (демо)');
}


function simulatePush() {
    const myBookings = getCurrentUserBookings();
    if (myBookings.length === 0) {
        showToast('Нет активных броней', 'Сначала забронируйте кабинку на плане этажа.');
        return;
    }

    const first = myBookings[0];
    showToast('Напоминание (за 30 мин)', `Скоро ваша бронь: ${first.roomName} в ${first.time}`);
}

function showToast(title, body) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-body').textContent = body;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
}
