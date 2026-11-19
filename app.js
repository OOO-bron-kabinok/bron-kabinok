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
        date: dateInput.value,
        time: targetSlot.time,
        purpose: purposeText
    });

    saveDatabase(); // Сохраняем изменения в локальную БД
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
            <button class="btn-danger-outline" onclick="cancelBooking(${booking.id})">Отменить бронь</button>
        `;
        listContainer.appendChild(card);
    });
}

function cancelBooking(bookingId) {
    const index = userBookings.findIndex(b => b.id === bookingId);
    if (index === -1) return;

    const removed = userBookings[index];
    const room = roomsDatabase[removed.floor]?.find(r => r.id === removed.roomId);
    const slot = room?.slots.find(s => s.time === removed.time);

    if (slot) {
        slot.status = 'free';
        slot.label = 'Свободно';
    }

    userBookings.splice(index, 1);
    saveDatabase(); // Сохраняем изменения в локальную БД
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
