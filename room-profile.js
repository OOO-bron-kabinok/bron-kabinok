const DB_KEY = 'studentAppDB';
const ROOMS_DB_KEY = 'itRoomBookings'; // Отдельный ключ для броней кабинетов

// Получаем общую базу из IT.Шабур
function getShaburDB() {
  const raw = localStorage.getItem(DB_KEY);
  return raw ? JSON.parse(raw) : null;
}

function saveShaburDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// Получаем текущего авторизованного студента
function getCurrentStudent() {
  const userId = sessionStorage.getItem('currentUserId');
  const db = getShaburDB();
  if (!db || !userId) return null;
  return db.users.find(u => u.id === userId) || null;
}

// Динамический QR-код (логика 1-в-1 из IT.Шабур)
let qrSeconds = 60;
function generateRoomQR(user) {
  const nonce = Math.random().toString(36).slice(2, 10);
  const qrText = `ITROOM_CHECKIN:${user.id}:${Date.now()}:${nonce}:${user.group}`;
  const container = document.getElementById('qrcode');
  container.innerHTML = '';
  new QRCode(container, {
    text: qrText,
    width: 130,
    height: 130,
    colorDark: '#0a0a14',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });
  qrSeconds = 60;
}

// Инициализация страницы
function initRoomProfile() {
  const user = getCurrentStudent();

  // Если студент не вошел в IT.Шабур — отправляем на страницу логина IT.Шабур
  if (!user) {
    alert('Сначала выполните вход через Электронный студенческий (IT.Шабур)');
    window.location.href = 'IT.Шабур/login.html';
    return;
  }

  // Заполняем данные профиля из IT.Шабур
  document.getElementById('studentName').textContent = user.name;
  document.getElementById('studentGroup').textContent = `Группа: ${user.group || 'Не указана'}`;
  document.getElementById('studentSpecialty').textContent = `Специальность: ${user.specialty || 'Не указана'}`;
  document.getElementById('studentStatus').textContent = user.status === 'active' ? 'Статус: Активен' : 'Статус: Неактивен';

  // Аватар или инициалы
  const avatarEl = document.getElementById('avatar');
  if (user.avatar) {
    avatarEl.innerHTML = `<img src="${user.avatar}" alt="">`;
  } else {
    avatarEl.textContent = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  // Стеки технологий
  const stacksEl = document.getElementById('studentStacks');
  stacksEl.innerHTML = (user.stacks && user.stacks.length)
    ? user.stacks.map(s => `<span class="stack-tag">${s}</span>`).join('')
    : '<span style="color:var(--text-muted); font-size:0.85rem;">Стеки не указаны</span>';

  // Отрисовка шабурят и истории
  renderBonuses(user);

  // Генерация QR и запуск таймера
  generateRoomQR(user);
  setInterval(() => {
    qrSeconds--;
    document.getElementById('qrTimer').textContent = `Обновление через: ${qrSeconds} сек`;
    if (qrSeconds <= 0) generateRoomQR(user);
  }, 1000);

  // Загрузка броней студента
  renderMyBookings(user.id);
}

// Отрисовка баланса и истории из IT.Шабур
function renderBonuses(user) {
  document.getElementById('bonusAmount').textContent = user.bonuses || 0;
  const hist = document.getElementById('history');
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

// Универсальная функция начисления/списания шабурят в общую БД
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

// Демо-кнопки интеграции баллов
function checkInDemo() {
  if (addShaburTransaction(10, 'IT.ROOM — Check-in в забронированной аудитории')) {
    alert('+10 шабурят зачислено на ваш общий счёт!');
  }
}

function buyVipPass() {
  if (addShaburTransaction(-50, 'IT.ROOM — Приоритетное бронирование на 7 дней')) {
    alert('VIP-доступ активирован! Списано 50 шабурят.');
  }
}

// Работа с бронями кабинетов
function getBookings() {
  const raw = localStorage.getItem(ROOMS_DB_KEY);
  if (!raw) {
    // Тестовая бронь для студента st001 (Маслов Максим)
    const demo = [
      { id: 101, userId: 'st001', room: '304А', date: '2026-11-25', time: '16:00 – 18:00', purpose: 'Подготовка к хакатону' }
    ];
    localStorage.setItem(ROOMS_DB_KEY, JSON.stringify(demo));
    return demo;
  }
  return JSON.parse(raw);
}

function renderMyBookings(userId) {
  const container = document.getElementById('myBookingsList');
  const myBookings = getBookings().filter(b => b.userId === userId);

  if (!myBookings.length) {
    container.innerHTML = '<p style="color:var(--text-muted); margin-top:12px;">У вас пока нет активных броней.</p>';
    return;
  }

  container.innerHTML = myBookings.map(b => `
    <div class="booking-item">
      <div>
        <div style="font-weight: 600; color: var(--accent-green);">Аудитория ${b.room}</div>
        <div style="font-size: 0.9rem;">${b.date} • <strong>${b.time}</strong></div>
        <div style="font-size: 0.85rem; color: var(--text-muted);">Цель: ${b.purpose}</div>
      </div>
      <button class="btn small danger" onclick="cancelRoomBooking(${b.id})">Отменить</button>
    </div>
  `).join('');
}

function cancelRoomBooking(bookingId) {
  if (!confirm('Отменить бронь аудитории?')) return;
  const all = getBookings().filter(b => b.id !== bookingId);
  localStorage.setItem(ROOMS_DB_KEY, JSON.stringify(all));
  
  // Бонус за сознательную отмену заранее
  addShaburTransaction(5, 'IT.ROOM — Своевременная отмена брони');
  renderMyBookings(getCurrentStudent().id);
}

function logoutFromShabur() {
  sessionStorage.removeItem('currentUserId');
  window.location.href = 'IT.Шабур/login.html';
}

initRoomProfile();
