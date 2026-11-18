const todayStr = new Date().toISOString().split('T');

const roomsDatabase = {
    1: [
        {
            id: '101',
            name: 'Кабинка 101',
            type: 'Переговорная  т   ля команд',
            capacity: 6,
            slots: [
                { time: '10:00 – 12:00', status: 'free', label: 'Свободно' },
                { time: '12:00 – 14:00', status: 'busy', label: 'Идет пара (Базы данных)' },
                { time: '14:00 – 16:00', status: 'free', label: 'Свободно' },
                { time: '16:00 – 18:00', status: 'free', label: 'Свободно' }
            ]
        },
        {
            id: '102',
            name: 'Аудитория 102',
            type: 'Компьютерный класс',
            capacity: 25,
            slots: [
                { time: '10:00 – 12:00', status: 'busy', label: 'Идет пара (Сети и телекоммуникации)' },
                { time: '12:00 – 14:00', status: 'busy', label: 'Идет пара (Операционные системы)' },
                { time: '14:00 – 16:00', status: 'free', label: 'Свободно' },
                { time: '16:00 – 18:00', status: 'free', label: 'Свободно' }
            ]
        },
        {
            id: '103',
            name: 'Кабинка 103',
            type: 'Тихая зона для подготовки',
            capacity: 4,
            slots: [
                { time: '10:00 – 12:00', status: 'free', label: 'Свободно' },
                { time: '12:00 – 14:00', status: 'free', label: 'Свободно' },
                { time: '14:00 – 16:00', status: 'booked', label: 'Забронировано (Собрание студсовета)' },
                { time: '16:00 – 18:00', status: 'free', label: 'Свободно' }
            ]
        },
        {
            id: '104',
            name: 'Аудитория 104',
            type: 'Лаборатория VR / AR',
            capacity: 15,
            slots: [
                { time: '10:00 – 12:00', status: 'free', label: 'Свободно' },
                { time: '12:00 – 14:00', status: 'free', label: 'Свободно' },
                { time: '14:00 – 16:00', status: 'free', label: 'Свободно' },
                { time: '16:00 – 18:00', status: 'booked', label: 'Забронировано (Клуб разработки игр)' }
            ]
        }
    ],
    2: [
        {
            id: '201',
            name: 'Аудитория 201',
            type: 'Класс разработки ПО',
            capacity: 24,
            slots: [
                { time: '10:00 – 12:00', status: 'busy', label: 'Идет пара (Разработка на C#)' },
                { time: '12:00 – 14:00', status: 'free', label: 'Свободно' },
                { time: '14:00 – 16:00', status: 'free', label: 'Свободно' },
                { time: '16:00 – 18:00', status: 'free', label: 'Свободно' }
            ]
        },
        {
            id: '202',
            name: 'Кабинка 202',
            type: 'Переговорная с доской',
            capacity: 8,
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
            name: 'Аудитория 301',
            type: 'Полигон кибербезопасности',
            capacity: 18,
            slots: [
                { time: '10:00 – 12:00', status: 'free', label: 'Свободно' },
                { time: '12:00 – 14:00', status: 'free', label: 'Свободно' },
                { time: '14:00 – 16:00', status: 'busy', label: 'Идет пара (Защита информации)' },
                { time: '16:00 – 18:00', status: 'free', label: 'Свободно' }
            ]
        },
        {
            id: '302',
            name: 'Кабинка 302',
            type: 'Проектный коворкинг',
            capacity: 10,
            slots: [
                { time: '10:00 – 12:00', status: 'free', label: 'Свободно' },
                { time: '12:00 – 14:00', status: 'free', label: 'Свободно' },
                { time: '14:00 – 16:00', status: 'free', label: 'Свободно' },
                { time: '16:00 – 18:00', status: 'free', label: 'Свободно' }
            ]
        }
    ]
};

let userBookings = [
    {
        id: 1001,
        roomId: '103',
        roomName: 'Кабинка 103',
        floor: 1,
        date: todayStr,
        time: '14:00 – 16:00',
        purpose: 'Собрание студсовета и подготовка к УП.12'
    }
];

const statusBadgeText = {
    free: 'Свободен сейчас',
    busy: 'Занят (идет пара)',
    booked: 'Забронирован'
};