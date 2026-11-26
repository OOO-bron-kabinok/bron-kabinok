const DB_KEY = 'studentAppDB';
const SESSION_KEY = 'currentUserId';
const IT_ROOM_BOOKINGS_KEY = 'it_moscow_bookings';
const IT_ROOM_ROOMS_KEY = 'it_moscow_rooms';

function getShaburDB() {
  const raw = localStorage.getItem(DB_KEY);
  return raw ? JSON.parse(raw) : null;
}

function saveShaburDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function getCurrentStudent() {
  const sessionUser = sessionStorage.getItem(SESSION_KEY);
  if (sessionUser) {
    localStorage.setItem(SESSION_KEY, sessionUser);
  }

  const userId = localStorage.getItem(SESSION_KEY);
  const db = getShaburDB();
  if (!db || !userId) return null;
  return db.users.find(u => u.id === userId) || null;
}

if (!getCurrentStudent()) {
  window.location.replace('IT.Шабур/login.html');
}

function initRoomProfile() {
  const user = getCurrentStudent();
  if (!user) {
    window.location.replace('IT.Шабур/login.html');
    return;
  }

  renderMyBookings();

  const nameEl = document.getElementById('studentName');
  if (nameEl) nameEl.textContent = user.name;
  
  const groupEl = document.getElementById('studentGroup');
  if (groupEl) groupEl.textContent = `Группа: ${user.group || 'Не указана'}`;
  
  const specEl = document.getElementById('studentSpecialty');
  if (specEl) specEl.textContent = `Специальность: ${user.specialty || 'Не указана'}`;
  
  const statusEl = document.getElementById('studentStatus');
  if (statusEl) statusEl.textContent = user.status === 'active' ? 'Статус: Активен' : 'Статус: Неактивен';

  const avatarEl = document.getElementById('avatar');
  if (avatarEl) {
    if (user.avatar) {
      avatarEl.innerHTML = `<img src="${user.avatar}" alt="">`;
    } else {
      avatarEl.textContent = user.name.split(' ').map(w => w).join('').slice(0, 2).toUpperCase();
    }
  }

  const stacksEl = document.getElementById('studentStacks');
  if (stacksEl) {
    stacksEl.innerHTML = (user.stacks && user.stacks.length)
      ? user.stacks.map(s => `<span class="stack-tag">${s}</span>`).join('')
      : '<span style="color:var(--text-muted); font-size:0.85rem;">Стеки не указаны</span>';
  }

  renderBonuses(user);
}

function renderBonuses(user) {
  const amountEl = document.getElementById('bonusAmount');
  if (amountEl) amountEl.textContent = user.bonuses || 0;
  
  const hist = document.getElementById('history');
  if (!hist) return;
  
  const list = (user.bonusHistory || []).slice().reverse();
  if (!list.length) {
    hist.innerHTML = '<div class="history-item">Операций пока нет</div>';
    return;
  }

  hist.innerHTML = list.map(h => {
    const isPositive = h.amount >= 0;
    const sign = isPositive ? '+' : '';
    const color = isPositive ? 'var(--accent-green)' : 'var(--danger)';
    return `
      <div class="history-item" style="display:flex; justify-content:space-between; gap:10px;">
        <span><strong style="color:${color}">${sign}${h.amount} шабурят</strong> — ${h.reason}</span>
        <span style="white-space:nowrap;">${h.date}</span>
      </div>`;
  }).join('');
}

function addShaburTransaction(amount, reason) {
  const currentUser = getCurrentStudent();
  if (!currentUser) return false;

  const db = getShaburDB();
  const idx = db.users.findIndex(u => u.id === currentUser.id);

  if ((db.users[idx].bonuses || 0) + amount < 0) {
    alert('Недостаточно шабурят на балансе!');
    return false;
  }

  db.users[idx].bonuses = (db.users[idx].bonuses || 0) + amount;
  if (!db.users[idx].bonusHistory) db.users[idx].bonusHistory = [];
  db.users[idx].bonusHistory.push({
    date: new Date().toISOString().slice(0, 10),
    amount: amount,
    reason: reason
  });

  saveShaburDB(db);
  renderBonuses(db.users[idx]);
  return true;
}

function checkInDemo() {
  if (addShaburTransaction(10, 'IT.Рум — Check-in в забронированной аудитории')) {
    alert('+10 шабурят зачислено на ваш общий счёт!');
  }
}

function buyVipPass() {
  if (addShaburTransaction(-50, 'IT.Рум — Приоритетное бронирование на 7 дней')) {
    alert('VIP-доступ активирован! Списано 50 шабурят.');
  }
}

function getItRoomBookings() {
  const raw = localStorage.getItem(IT_ROOM_BOOKINGS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function formatDateRu(isoDate) {
  if (!isoDate || !isoDate.includes('-')) return isoDate;
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

function renderMyBookings() {
  const container = document.getElementById('myBookingsList');
  if (!container) return;

  const bookings = getItRoomBookings();

  if (!bookings.length) {
    container.innerHTML = `
      <div style="margin-top: 14px; padding: 16px; background: #0f0f1e; border-radius: 12px; border: 1px dashed var(--card-border); color: var(--text-muted); font-size: 0.9rem;">
        У вас пока нет активных броней. <a href="index.html" style="color: var(--accent-green); text-decoration: none; font-weight: 600;">Выбрать кабинку на карте →</a>
      </div>`;
    return;
  }

  container.innerHTML = bookings.map(b => `
    <div class="booking-item">
      <div>
        <div style="font-weight: 700; color: var(--accent-green); font-size: 1rem;">${b.roomName} (${b.floor} этаж)</div>
        <div style="font-size: 0.9rem; margin-top: 3px;">${formatDateRu(b.date)} • <strong>${b.time}</strong></div>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 3px;">Цель: ${b.purpose}</div>
      </div>
      <button class="btn small danger" onclick="cancelRoomBooking(${b.id})">Отменить</button>
    </div>
  `).join('');
}

function cancelRoomBooking(bookingId) {
  if (!confirm('Отменить бронь аудитории?')) return;

  let bookings = getItRoomBookings();
  const index = bookings.findIndex(b => b.id === bookingId);
  if (index === -1) return;

  const removed = bookings[index];
  const rawRooms = localStorage.getItem(IT_ROOM_ROOMS_KEY);

  if (rawRooms) {
    const roomsDb = JSON.parse(rawRooms);
    const room = roomsDb[removed.floor]?.find(r => r.id === removed.roomId);

    if (room) {
      const [bookStart, bookEnd] = removed.time.split('–').map(t => t.trim());
      const slotsToFree = removed.bookedSlots || [removed.time];

      room.slots.forEach(slot => {
        const [slotStart, slotEnd] = slot.time.split('–').map(t => t.trim());
        if (slotsToFree.includes(slot.time) || (slotStart >= bookStart && slotEnd <= bookEnd)) {
          slot.status = 'free';
          slot.label = 'Свободно';
        }
      });
      localStorage.setItem(IT_ROOM_ROOMS_KEY, JSON.stringify(roomsDb));
    }
  }

  bookings.splice(index, 1);
  localStorage.setItem(IT_ROOM_BOOKINGS_KEY, JSON.stringify(bookings));

  renderMyBookings();
}

function logoutFromShabur() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  window.location.replace('IT.Шабур/login.html');
}

document.addEventListener('DOMContentLoaded', initRoomProfile);
