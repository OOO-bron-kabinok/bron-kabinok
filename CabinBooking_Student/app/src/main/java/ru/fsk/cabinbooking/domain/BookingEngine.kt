package ru.fsk.cabinbooking.domain

import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime

data class Room(val id: Int, val name: String, val description: String)
data class Booking(
    val id: String,
    val roomId: Int,
    val start: LocalDateTime,
    val end: LocalDateTime,
    val purpose: String,
    val cancelled: Boolean = false,
    val reminded: Boolean = false,
)
data class Occupancy(val start: LocalDateTime, val end: LocalDateTime, val title: String)
enum class RoomState { FREE, BUSY, RESERVED }

object BookingEngine {
    val opens: LocalTime = LocalTime.of(8, 0)
    val closes: LocalTime = LocalTime.of(22, 0)
    fun overlaps(a: LocalDateTime, b: LocalDateTime, c: LocalDateTime, d: LocalDateTime) = a < d && c < b

    /** Учебное расписание пар. В реальном сервисе приходит с сервера вуза. */
    fun lessons(roomId: Int, date: LocalDate): List<Occupancy> {
        if (date.dayOfWeek.value > 5) return emptyList()
        val starts = when (roomId) {
            1 -> listOf(9, 13)
            2 -> listOf(10, 14)
            3 -> listOf(8, 12)
            else -> listOf(11, 15)
        }
        return starts.map { hour ->
            Occupancy(date.atTime(hour, 0), date.atTime(hour + 1, 30), "Учебная пара")
        }
    }
    fun schedule(roomId: Int, date: LocalDate, bookings: List<Booking>): List<Occupancy> =
        (lessons(roomId, date) + bookings.filter { !it.cancelled && it.roomId == roomId && it.start.toLocalDate() == date }
            .map { Occupancy(it.start, it.end, "Бронь: ${it.purpose}") }).sortedBy { it.start }

    fun state(roomId: Int, now: LocalDateTime, bookings: List<Booking>): RoomState {
        if (schedule(roomId, now.toLocalDate(), bookings).any { now >= it.start && now < it.end }) return RoomState.BUSY
        if (bookings.any { it.roomId == roomId && !it.cancelled && it.start > now && it.start.toLocalDate() == now.toLocalDate() }) return RoomState.RESERVED
        return RoomState.FREE
    }

    fun validate(roomId: Int, start: LocalDateTime, end: LocalDateTime, purpose: String,
                 bookings: List<Booking>, now: LocalDateTime): String? {
        if (roomId !in 1..4) return "Аудитория не найдена"
        if (purpose.isBlank()) return "Укажите цель бронирования"
        if (purpose.trim().length > 200) return "Цель должна содержать не более 200 символов"
        if (start <= now) return "Выберите будущее время начала"
        if (end <= start) return "Окончание должно быть позже начала"
        if (start.toLocalDate() != end.toLocalDate()) return "Выберите время в пределах одного дня"
        if (start.toLocalTime() < opens || end.toLocalTime() > closes) return "Аудитории открыты с 08:00 до 22:00"
        if (schedule(roomId, start.toLocalDate(), bookings).any { overlaps(start, end, it.start, it.end) })
            return "Есть пересечение с парой или другой бронью"
        if (bookings.any { !it.cancelled && overlaps(start, end, it.start, it.end) })
            return "На это время у вас уже есть бронь другой аудитории"
        return null
    }

    /** Проверяем только добавляемый интервал, сохраняя исходные начало и цель. */
    fun validateExtension(id: String, newEnd: LocalDateTime,
                          bookings: List<Booking>, now: LocalDateTime): String? {
        val booking = bookings.find { it.id == id } ?: return "Бронь не найдена"
        if (booking.cancelled) return "Отменённую бронь продлить нельзя"
        if (booking.start.toLocalDate() < now.toLocalDate()) return "Бронь прошлого дня продлить нельзя"
        if (newEnd <= booking.end) return "Новое окончание должно быть позже текущего"
        if (newEnd <= now) return "Новое окончание должно быть позже текущего времени"
        if (newEnd.toLocalDate() != booking.start.toLocalDate()) return "Продление возможно только в пределах дня брони"
        if (newEnd.toLocalTime() > closes) return "Аудитории открыты до 22:00"
        val others = bookings.filter { it.id != id }
        if (schedule(booking.roomId, booking.start.toLocalDate(), others).any {
                overlaps(booking.end, newEnd, it.start, it.end)
            }) return "Продление пересекается с парой или другой бронью"
        if (others.any { !it.cancelled && overlaps(booking.end, newEnd, it.start, it.end) })
            return "На добавляемое время у вас уже есть бронь другой аудитории"
        return null
    }
}
