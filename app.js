let activeFloor = 1;
let activeRoom = null;
let chosenSlotIndex = null;
let toastTimer = null;

// Настройка выбора даты
const dateInput = document.getElementById('booking-date');
dateInput.value = todayStr;
dateInput.min = todayStr;

function getRoomCurrentStatus(room) {
    if (room.slots.some(s => s.status === 'busy')) return 'busy';
    if (room.slots.some(s => s.status === 'booked')) return 'booked';
    return 'free';
}

function renderFloor() {
    const northGrid = document.getElementById('rooms-north');
    const southGrid = document.getElementById('rooms-south');
    northGrid.innerHTML = '';
    southGrid.innerHTML = '';

    roomsDatabase[activeFloor].forEach((room, index) => {
        const currentStatus = getRoomCurrentStatus(room);
        const card = document.createElement('div');
        card.className = `room-card ${currentStatus}`;
        card.onclick = () => openModal(room);

        card.innerHTML = `
            <div>
                <div class="room-card-header">
                    <span class="room-title">${room.name}</span>
                    <span class="status-tag ${currentStatus}">${statusBadgeText[currentStatus]}</span>
                </div>
                <div class="room-subtitle">${room.type}</div>
            </div>
            <div class="room-footer">
                <span>До ${room.capacity} мест</span>
                <span class="room-action-link">Расписание →</span>
            </div>
        `;

        if (index % 2 === 0) northGrid.appendChild(card);
        else southGrid.appendChild(card);
    });
}

function changeFloor(floorNumber, btnElement) {
    activeFloor = floorNumber;
    document.querySelectorAll('.floor-pill').forEach(pill => pill.classList.remove('active'));
    btnElement.classList.add('active');
    renderFloor();
}

function openModal(room) {
    activeRoom = room;
    chosenSlotIndex = null;

    document.getElementById('modal-title').textContent = room.name;
    document.getElementById('modal-subtitle').textContent = `${room.type} • Вместимость до ${room.capacity} чел.`;
    document.getElementById('purpose-input').value = '';
    document.getElementById('modal-error').style.display = 'none';

    const slotsContainer = document.getElementById('modal-slots');
    slotsContainer.innerHTML = '';

    room.slots.forEach((slot, idx) => {
        const row = document.createElement('div');
        const isFree = slot.status === 'free';
        row.className = `slot-row ${isFree ? 'available' : 'occupied'}`;
        row.innerHTML = `
            <span class="slot-time">${slot.time}</span>
            <span class="slot-status-text">${slot.label}</span>
        `;

        if (isFree) {
            row.onclick = () => {
                document.querySelectorAll('.slot-row').forEach(el => el.classList.remove('selected'));
                row.classList.add('selected');
                chosenSlotIndex = idx;
                document.getElementById('modal-error').style.display = 'none';
            };
        }
        slotsContainer.appendChild(row);
    });

    document.getElementById('modal-backdrop').classList.add('open');
}

function closeModal() {
    document.getElementById('modal-backdrop').classList.remove('open');
}

function handleBackdropClick(event) {
    if (event.target.id === 'modal-backdrop') closeModal();
}

function submitBooking() {
    const purposeText = document.getElementById('purpose-input').value.trim();
    const errorEl = document.getElementById('modal-error');
    const selectedDate = dateInput.value;

    // Проверка: одна кабинка на один день
    const existingBooking = userBookings.find(b => b.date === selectedDate);
    if (existingBooking) {
        errorEl.textContent = `На эту дату у вас уже забронирована ${existingBooking.roomName} (${existingBooking.time}). Можно только продлить текущую бронь.`;
        errorEl.style.display = 'block';
        return;
    }

    if (chosenSlotIndex === null || !purposeText) {
        errorEl.textContent = 'Пожалуйста, выберите свободное окно и укажите цель встречи.';
        errorEl.style.display = 'block';
        return;
    }

    const targetSlot = activeRoom.slots[chosenSlotIndex];
    if (targetSlot.status !== 'free') {
        errorEl.textContent = 'Это время уже занято. Выберите другое окно.';
        errorEl.style.display = 'block';
        return;
    }

    targetSlot.status = 'booked';
    targetSlot.label = `Забронировано (${purposeText})`;

    userBookings.unshift({
        id: Date.now(),
        roomId: activeRoom.id,
        roomName: activeRoom.name,
        floor: activeFloor,
        date: selectedDate,
        time: targetSlot.time,
        bookedSlots: [targetSlot.time],
        purpose: purposeText
    });

    saveDatabase();
    updateCounter();
    renderFloor();
    closeModal();
    showToast('Бронь подтверждена', `${activeRoom.name} на ${targetSlot.time}. Напоминание придет за 30 минут.`);
}


function renderBookings() {
    const listContainer = document.getElementById('bookings-list');
    listContainer.innerHTML = '';

    if (userBookings.length === 0) {
        listContainer.innerHTML = `<div class="empty-state">У вас пока нет активных бронирований.</div>`;
        return;
    }

    userBookings.forEach(booking => {
        const card = document.createElement('div');
        card.className = 'booking-card';
        card.innerHTML = `
            <div>
                <div class="booking-card-top">
                    <div>
                        <div class="booking-room-name">${booking.roomName}</div>
                        <div class="booking-date-info">${booking.floor} этаж • Дата: ${formatDate(booking.date)}</div>
                    </div>
                    <span class="booking-time-chip">${booking.time}</span>
                </div>
                <div class="booking-purpose-box">
                    <strong>Цель встречи</strong>
                    ${booking.purpose}
                </div>
            </div>
            <div class="booking-actions">
                <div class="booking-actions-row">
                    <button class="btn-secondary" onclick="extendBooking(${booking.id})">+ Продлить</button>
                    <button class="btn-secondary" onclick="openReportModal('${booking.roomName}')">⚠ Проблема</button>
                </div>
                <button class="btn-danger-outline" onclick="cancelBooking(${booking.id})">Отменить бронь</button>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

function cancelBooking(bookingId) {
    const index = userBookings.findIndex(b => b.id === bookingId);
    if (index === -1) return;

    const removed = userBookings[index];
    const room = roomsDatabase[removed.floor]?.find(r => r.id === removed.roomId);

    if (room) {
        const [bookStart, bookEnd] = removed.time.split('–').map(t => t.trim());
        const slotsToFree = removed.bookedSlots || [removed.time];

        room.slots.forEach(slot => {
            const [slotStart, slotEnd] = slot.time.split('–').map(t => t.trim());
            // Освобождаем слот, если он в списке или попадает в интервал продлённой брони
            if (slotsToFree.includes(slot.time) || (slotStart >= bookStart && slotEnd <= bookEnd)) {
                slot.status = 'free';
                slot.label = 'Свободно';
            }
        });
    }

    userBookings.splice(index, 1);
    saveDatabase();
    updateCounter();
    renderBookings();
    renderFloor();
    showToast('Бронь отменена', `${removed.roomName} (${removed.time}) снова свободна.`);
}

function updateCounter() {
    const counter = document.getElementById('bookings-counter');
    counter.textContent = userBookings.length;
    
    if (userBookings.length > 0) {
        counter.classList.remove('hidden');
    } else {
        counter.classList.add('hidden');
    }
}

function switchView(viewName) {
    document.getElementById('nav-map').classList.toggle('active', viewName === 'map');
    document.getElementById('nav-bookings').classList.toggle('active', viewName === 'bookings');
    document.getElementById('view-map').classList.toggle('hidden', viewName !== 'map');
    document.getElementById('view-bookings').classList.toggle('hidden', viewName !== 'bookings');

    if (viewName === 'bookings') renderBookings();
}

function showToast(title, message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-body').textContent = message;

    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 4500);
}

function simulatePush() {
    const firstBooking = userBookings[0];
    const msg = firstBooking
        ? `${firstBooking.roomName} ждет вас в ${firstBooking.time.split('–')[0].trim()}.`
        : 'Кабинка 101 ждет вас в 16:00 (тестовое уведомление).';
    showToast('Напоминание: через 30 минут бронь', msg);
}

function formatDate(isoDate) {
    const [year, month, day] = isoDate.split('-');
    return `${day}.${month}.${year}`;
}

// Запуск при загрузке
updateCounter();
renderFloor();

let reportRoomName = '';

function extendBooking(bookingId) {
    const booking = userBookings.find(b => b.id === bookingId);
    if (!booking) return;

    const room = roomsDatabase[booking.floor]?.find(r => r.id === booking.roomId);
    if (!room) return;

    // Берём конечное время текущей брони (например, "16:00" из "14:00 – 16:00")
    const currentEndTime = booking.time.split('–')[1].trim();
    const nextSlot = room.slots.find(s => s.time.startsWith(currentEndTime));

    if (!nextSlot || nextSlot.status !== 'free') {
        showToast('Нельзя продлить', 'Следующий слот уже занят или рабочий день окончен.');
        return;
    }

    nextSlot.status = 'booked';
    nextSlot.label = `Забронировано (${booking.purpose})`;

    // Запоминаем все слоты этой брони, чтобы потом освободить каждый
    if (!booking.bookedSlots) booking.bookedSlots = [booking.time];
    booking.bookedSlots.push(nextSlot.time);

    const startTime = booking.time.split('–')[0].trim();
    const newEndTime = nextSlot.time.split('–')[1].trim();
    booking.time = `${startTime} – ${newEndTime}`;

    saveDatabase();
    renderBookings();
    renderFloor();
    showToast('Бронь продлена', `${booking.roomName} теперь ваша до ${newEndTime}.`);
}

function openReportModal(roomName) {
    reportRoomName = roomName;
    document.getElementById('report-title').textContent = `Проблема: ${roomName}`;
    document.getElementById('report-input').value = '';
    document.getElementById('report-error').style.display = 'none';
    document.getElementById('report-backdrop').classList.add('open');
}

function closeReportModal() {
    document.getElementById('report-backdrop').classList.remove('open');
}

function submitReport() {
    const text = document.getElementById('report-input').value.trim();
    if (!text) {
        document.getElementById('report-error').style.display = 'block';
        return;
    }

    cabinReports.unshift({
        id: Date.now(),
        room: reportRoomName,
        issue: text,
        date: new Date().toLocaleString('ru-RU')
    });

    saveReports();
    closeReportModal();
    showToast('Заявка отправлена', `Администратор получил сообщение по ${reportRoomName}.`);
}
