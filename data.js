const todayStr = new Date().toISOString().split('T')[0];

const defaultRoomsDatabase = {
    1: [
        {
            id: '101',
            name: 'Маленькая кабинка 101',
            type: 'Стол и кресло (индивидуальная)',
            capacity: 1,
            slots: [
                { time: '10:00 – 12:00', status: 'free', label: 'Свободно' },
                { time: '12:00 – 14:00', status: 'free', label: 'Свободно' },
                { time: '14:00 – 16:00', status: 'free', label: 'Свободно' },
                { time: '16:00 – 18:00', status: 'free', label: 'Свободно' }
            ]
        },
        {
            id: '102',
            name: 'Маленькая кабинка 102',
            type: 'Стол и кресло (индивидуальная)',
            capacity: 1,
            slots: [
                { time: '10:00 – 12:00', status: 'free', label: 'Свободно' },
                { time: '12:00 – 14:00', status: 'free', label: 'Свободно' },
                { time: '14:00 – 16:00', status: 'free', label: 'Свободно' },
                { time: '16:00 – 18:00', status: 'free', label: 'Свободно' }
            ]
        }
    ],
    2: [], // На 2 этаже кабинок нет
    3: [
        {
            id: '301',
            name: 'Маленькая кабинка 301',
            type: 'Стол и кресло (индивидуальная)',
            capacity: 1,
            slots: [
                { time: '10:00 – 12:00', status: 'free', label: 'Свободно' },
                { time: '12:00 – 14:00', status: 'free', label: 'Свободно' },
                { time: '14:00 – 16:00', status: 'free', label: 'Свободно' },
                { time: '16:00 – 18:00', status: 'free', label: 'Свободно' }
            ]
        },
        {
            id: '302',
            name: 'Большая кабинка 302',
            type: '1 стол в центре и 2 дивана/кресла',
            capacity: 4,
            slots: [
                { time: '10:00 – 12:00', status: 'free', label: 'Свободно' },
                { time: '12:00 – 14:00', status: 'free', label: 'Свободно' },
                { time: '14:00 – 16:00', status: 'free', label: 'Свободно' },
                { time: '16:00 – 18:00', status: 'free', label: 'Свободно' }
            ]
        },
        {
            id: '303',
            name: 'Большая кабинка 303',
            type: '1 стол в центре и 2 дивана/кресла',
            capacity: 4,
            slots: [
                { time: '10:00 – 12:00', status: 'free', label: 'Свободно' },
                { time: '12:00 – 14:00', status: 'free', label: 'Свободно' },
                { time: '14:00 – 16:00', status: 'free', label: 'Свободно' },
                { time: '16:00 – 18:00', status: 'free', label: 'Свободно' }
            ]
        },
        {
            id: '304',
            name: 'Большая кабинка 304',
            type: '1 стол в центре и 2 дивана/кресла',
            capacity: 4,
            slots: [
                { time: '10:00 – 12:00', status: 'free', label: 'Свободно' },
                { time: '12:00 – 14:00', status: 'free', label: 'Свободно' },
                { time: '14:00 – 16:00', status: 'free', label: 'Свободно' },
                { time: '16:00 – 18:00', status: 'free', label: 'Свободно' }
            ]
        }
    ],
    4: [] // На 4 этаже кабинок нет
};

const defaultUserBookings = [];

// Обновляем версию схемы в localStorage, чтобы старые демо-кабинки удалились
const SCHEMA_VERSION = 'v2_real_college';
if (localStorage.getItem('it_moscow_schema_ver') !== SCHEMA_VERSION) {
    localStorage.setItem('it_moscow_rooms', JSON.stringify(defaultRoomsDatabase));
    localStorage.setItem('it_moscow_bookings', JSON.stringify(defaultUserBookings));
    localStorage.setItem('it_moscow_schema_ver', SCHEMA_VERSION);
}

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
