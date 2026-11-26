// Local "database" in localStorage
const DB_KEY = 'studentAppDB';

function getDB() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    const seed = {
      users: [
        {
          id: 'admin1',
          login: 'admin',
          password: 'admin123',
          role: 'admin',
          name: 'Администратор'
        },
        {
          id: 'st001',
          login: 'maslov',
          password: '123456',
          role: 'student',
          name: 'Маслов Максим',
          group: '2ИП-7-25',
          specialty: '09.02.07 Информационные системы и программирование',
          status: 'active',
          avatar: null,
          description: 'Студент 2 курса, учусь на программиста.',
          stacks: ['JavaScript', 'C++', 'Python'],
          bonuses: 150,
          bonusHistory: [
            { date: '2026-11-20', amount: 50, reason: 'ИТ.Спорт — посещение секции' },
            { date: '2026-11-22', amount: 100, reason: 'Активность на паре' }
          ]
        }
      ]
    };
    localStorage.setItem(DB_KEY, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(raw);
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function getCurrentUser() {
  const id = sessionStorage.getItem('currentUserId');
  if (!id) return null;
  const db = getDB();
  return db.users.find(u => u.id === id) || null;
}

function requireAuth(role = null) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return null;
  }
  if (role && user.role !== role) {
    alert('Доступ запрещён');
    window.location.href = user.role === 'admin' ? 'admin.html' : 'student.html';
    return null;
  }
  return user;
}

function logout() {
  sessionStorage.removeItem('currentUserId');
  window.location.href = 'login.html';
}

// Login
function doLogin() {
  const login = document.getElementById('login').value.trim();
  const password = document.getElementById('password').value;
  const err = document.getElementById('error');
  const db = getDB();
  const user = db.users.find(u => u.login === login && u.password === password);
  if (!user) {
    err.textContent = 'Неверный логин или пароль';
    return;
  }
  sessionStorage.setItem('currentUserId', user.id);
  if (user.role === 'admin') {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'student.html';
  }
}

// Student main page
let qrInterval = null;
let qrSeconds = 60;

function generateUniqueQR(user) {
  const nonce = Math.random().toString(36).slice(2, 10);
  const qrText = `STUDENT:${user.id}:${Date.now()}:${nonce}:${user.group}`;
  const container = document.getElementById('qrcode');
  if (!container) return;
  container.innerHTML = '';
  new QRCode(container, {
    text: qrText,
    width: 200,
    height: 200,
    colorDark: '#000',
    colorLight: '#fff',
    correctLevel: QRCode.CorrectLevel.M
  });
  qrSeconds = 60;
  updateQRTimer();
}

function updateQRTimer() {
  const el = document.getElementById('qrTimer');
  if (el) el.textContent = `Обновление через: ${qrSeconds} сек`;
}

function loadStudentPage() {
  const user = requireAuth('student');
  if (!user) return;
  document.getElementById('studentName').textContent = user.name;
  document.getElementById('studentGroup').textContent = `Группа: ${user.group}`;
  document.getElementById('studentSpecialty').textContent = `Специальность: ${user.specialty || 'Не указана'}`;
  document.getElementById('studentStatus').textContent = user.status === 'active' ? 'Статус: Активен' : 'Статус: Неактивен';
  document.getElementById('studentBonuses').textContent = user.bonuses || 0;
  document.getElementById('studentDesc').textContent = user.description || 'Описание не указано';
  
  const stacksEl = document.getElementById('studentStacks');
  stacksEl.innerHTML = '';
  if (user.stacks && user.stacks.length) {
    user.stacks.forEach(s => {
      stacksEl.innerHTML += `<span class="stack-tag">${s}</span>`;
    });
  } else {
    stacksEl.innerHTML = '<span style="color:var(--text-muted);">Стеки не указаны</span>';
  }

  const avatarEl = document.getElementById('avatar');
  if (user.avatar) {
    avatarEl.innerHTML = `<img src="${user.avatar}" alt="">`;
  } else {
    const initials = user.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    avatarEl.textContent = initials;
  }

  generateUniqueQR(user);

  if (qrInterval) clearInterval(qrInterval);
  qrInterval = setInterval(() => {
    qrSeconds--;
    updateQRTimer();
    if (qrSeconds <= 0) {
      const freshUser = getCurrentUser();
      if (freshUser) generateUniqueQR(freshUser);
    }
  }, 1000);
}

// Profile page
function loadProfilePage() {
  const user = requireAuth('student');
  if (!user) return;
  document.getElementById('editName').value = user.name;
  document.getElementById('editDesc').value = user.description || '';
  document.getElementById('editStacks').value = (user.stacks || []).join(', ');
  const avatarPreview = document.getElementById('avatarPreview');
  if (user.avatar) {
    avatarPreview.innerHTML = `<img src="${user.avatar}" style="width:100%;height:100%;object-fit:cover;">`;
  } else {
    avatarPreview.textContent = user.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  }
}

function saveProfile() {
  const user = getCurrentUser();
  if (!user) return;
  const db = getDB();
  const idx = db.users.findIndex(u => u.id === user.id);
  db.users[idx].description = document.getElementById('editDesc').value.trim();
  db.users[idx].stacks = document.getElementById('editStacks').value.split(',').map(s => s.trim()).filter(Boolean);
  saveDB(db);
  document.getElementById('msg').textContent = 'Профиль сохранён';
  setTimeout(() => location.reload(), 800);
}

function uploadAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const user = getCurrentUser();
    const db = getDB();
    const idx = db.users.findIndex(u => u.id === user.id);
    db.users[idx].avatar = e.target.result;
    saveDB(db);
    document.getElementById('avatarPreview').innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
    document.getElementById('msg').textContent = 'Аватарка обновлена';
  };
  reader.readAsDataURL(file);
}

// Bonuses page
function loadBonusesPage() {
  const user = requireAuth('student');
  if (!user) return;
  document.getElementById('bonusAmount').textContent = user.bonuses || 0;
  const hist = document.getElementById('history');
  hist.innerHTML = '';
  (user.bonusHistory || []).slice().reverse().forEach(h => {
    hist.innerHTML += `<div class="history-item" style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
      <span>+${h.amount} шабурята — ${h.reason}</span>
      <span style="color:var(--text-muted); white-space:nowrap;">${h.date}</span>
    </div>`;
  });
}

// Admin page
function loadAdminPage() {
  const user = requireAuth('admin');
  if (!user) return;
  renderStudentsTable();
}

function renderStudentsTable() {
  const db = getDB();
  const tbody = document.querySelector('#studentsTable tbody');
  tbody.innerHTML = '';
  db.users.filter(u => u.role === 'student').forEach(s => {
    tbody.innerHTML += `
      <tr>
        <td>${s.name}</td>
        <td>${s.login}</td>
        <td>${s.group}</td>
        <td>${s.bonuses || 0}</td>
        <td>
          <button class="btn small" onclick="editStudent('${s.id}')">Изменить</button>
          <button class="btn small success" onclick="giveBonus('${s.id}')">+Шабурята</button>
        </td>
      </tr>`;
  });
}

function addStudent() {
  const login = document.getElementById('newLogin').value.trim();
  const password = document.getElementById('newPassword').value;
  const name = document.getElementById('newName').value.trim();
  const group = document.getElementById('newGroup').value.trim();
  const specialty = document.getElementById('newSpecialty').value.trim();
  if (!login || !password || !name || !group || !specialty) { alert('Заполни все поля, включая группу и специальность'); return; }
  const db = getDB();
  if (db.users.some(u => u.login === login)) { alert('Логин уже занят'); return; }
  db.users.push({
    id: 'st' + Date.now(),
    login, password, role: 'student',
    name, group, specialty, status: 'active',
    avatar: null, description: '', stacks: [],
    bonuses: 0, bonusHistory: []
  });
  saveDB(db);
  document.getElementById('newLogin').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('newName').value = '';
  document.getElementById('newGroup').value = '';
  document.getElementById('newSpecialty').value = '';
  renderStudentsTable();
  alert('Студент добавлен');
}

function editStudent(id) {
  const db = getDB();
  const s = db.users.find(u => u.id === id);
  if (!s) return;
  const newLogin = prompt('Новый логин:', s.login);
  if (newLogin === null) return;
  const newPass = prompt('Новый пароль (оставь пустым чтобы не менять):', '');
  const newGroup = prompt('Новая группа:', s.group);
  const newSpecialty = prompt('Новая специальность:', s.specialty || '');
  if (newLogin.trim()) s.login = newLogin.trim();
  if (newPass && newPass.trim()) s.password = newPass.trim();
  if (newGroup && newGroup.trim()) s.group = newGroup.trim();
  if (newSpecialty && newSpecialty.trim()) s.specialty = newSpecialty.trim();
  saveDB(db);
  renderStudentsTable();
  alert('Обновлено');
}

function giveBonus(id) {
  const amount = prompt('Сколько шабурята начислить?', '50');
  if (!amount || isNaN(amount)) return;
  const reason = prompt('Причина:', 'От администратора') || 'От администратора';
  const db = getDB();
  const s = db.users.find(u => u.id === id);
  if (!s) return;
  s.bonuses = (s.bonuses || 0) + Number(amount);
  if (!s.bonusHistory) s.bonusHistory = [];
  s.bonusHistory.push({
    date: new Date().toISOString().slice(0,10),
    amount: Number(amount),
    reason
  });
  saveDB(db);
  renderStudentsTable();
  alert(`Начислено ${amount} шабурята`);
}