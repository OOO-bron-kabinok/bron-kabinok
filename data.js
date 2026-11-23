const todayStr = new Date().toISOString().split('T')[0];

const defaultRoomsDatabase = {
    1: [
        {
            id: '101',
            name: 'Кабинка 101',
            type: 'Переговорная для мини-команды',
            capacity: 4,
            slots: [
                { time: '10:00 – 12:00', status: 'free', label: 'Свободно' },
                { time: '12:00 – 14:00', status: 'busy', label: 'Занято (Консультация по БД)' },
                { time: '14:00 – 16:00', status: 'free', label: 'Свободно' },
                { time: '16:00 – 18:00', status: 'free', label: 'Свободно' }
            ]
        },
        {
            id: '102',
            name: 'Кабинка 102',
            type: 'Акустическая капсула для созвонов',
            capacity: 1,
            slots: [
                { time: '10:00 – 12:00', status: 'busy', label: 'Занято (Онлайн-защита)' },
                { time: '12:00 – 14:00', status: 'free', label: 'Свободно' },
                { time: '14:00 – 16:00', status: 'free', label: 'Свободно' },
                { time: '16:00 – 18:00', status: 'free', label: 'Свободно' }
            ]
        },
        {
            id: '103',
            name: 'Кабинка 103',
            type: 'Тихая зона для подготовки',
            capacity: 3,
            slots: [
                { time: '10:00 – 12:00', status: 'free', label: 'Свободно' },
                { time: '12:00 – 14:00', status: 'free', label: 'Свободно' },
                { time: '14:00 – 16:00', status: 'free', label: 'Свободно' },
                { time: '16:00 – 18:00', status: 'free', label: 'Свободно' }
            ]
        },
        {
            id: '104',
            name: 'Кабинка 104',
            type: 'Кабинка для парной работы',
            capacity: 2,
            slots: [
                { time: '10:00 – 12:00', status: 'free', label: 'Свободно' },
                { time: '12:00 – 14:00', status: 'free', label: 'Свободно' },
                { time: '14:00 – 16:00', status: 'free', label: 'Свободно' },
                { time: '16:00 – 18:00', status: 'booked', label: 'Забронировано (Ревью кода)' }
            ]
        }
    ],
    2: [
        {
            id: '201',
            name: 'Кабинка 201',
            type: 'Индивидуальное место с монитором',
            capacity: 1,
            slots: [
                { time: '10:00 – 12:00', status: 'busy', label: 'Занято (Сдача практики)' },
                { time: '12:00 – 14:00', status: 'free', label: 'Свободно' },
                { time: '14:00 – 16:00', status: 'free', label: 'Свободно' },
                { time: '16:00 – 18:00', status: 'free', label: 'Свободно' }
            ]
        },
        {
            id: '202',
            name: 'Кабинка 202',
            type: 'Переговорная с маркерной доской',
            capacity: 4,
            slots: [
                { time: '10:00 – 12:00', status: 'free', label: 'Свободно' },
                { time: '12:00 – 14:00', status: 'free', label: 'Свободно' },
                { time: '14:00 – 16:00', status: 'free', label: 'Свободно' },
                { time: '16:00 – 18:00', status: 'free', label: 'Свободно' }
            ]
        }
    ],
    3: [
        {
            id: '301',
            name: 'Кабинка 301',
            type: 'Кабинка для брейншторма',
            capacity: 4,
            slots: [
                { time: '10:00 – 12:00', status: 'free', label: 'Свободно' },
                { time: '12:00 – 14:00', status: 'free', label: 'Свободно' },
                { time: '14:00 – 16:00', status: 'busy', label: 'Занято (Созвон с наставником)' },
                { time: '16:00 – 18:00', status: 'free', label: 'Свободно' }
            ]
        },
        {
            id: '302',
            name: 'Кабинка 302',
            type: 'Зона фокусировки',
            capacity: 2,
            slots: [
                { time: '10:00 – 12:00', status: 'free', label: 'Свободно' },
                { time: '12:00 – 14:00', status: 'free', label: 'Свободно' },
                { time: '14:00 – 16:00', status: 'free', label: 'Свободно' },
                { time: '16:00 – 18:00', status: 'free', label: 'Свободно' }
            ]
        }
    ]
};

const defaultUserBookings = [];

let roomsDatabase = JSON.parse(localStorage.getItem('it_moscow_rooms')) || defaultRoomsDatabase;
let userBookings = JSON.parse(localStorage.getItem('it_moscow_bookings')) || defaultUserBookings;

function saveDatabase() {
    localStorage.setItem('it_moscow_rooms', JSON.stringify(roomsDatabase));
    localStorage.setItem('it_moscow_bookings', JSON.stringify(userBookings));
}

const statusBadgeText = {
    free: 'Свободна сейчас',
    busy: 'Занята',
    booked: 'Забронирована'
};

let cabinReports = JSON.parse(localStorage.getItem('it_moscow_reports')) || [];

function saveReports() {
    localStorage.setItem('it_moscow_reports', JSON.stringify(cabinReports));
}
