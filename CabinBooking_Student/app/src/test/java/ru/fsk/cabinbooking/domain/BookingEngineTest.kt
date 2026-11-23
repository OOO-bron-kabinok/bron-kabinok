package ru.fsk.cabinbooking.domain

import org.junit.Assert.*
import org.junit.Test
import java.time.LocalDate
import java.time.LocalDateTime

class BookingEngineTest {
    // Понедельник: в аудитории 101 пары 09:00–10:30 и 13:00–14:30.
    private val date = LocalDate.of(2026, 11, 16)
    private val now = date.atTime(7, 0)
    private fun at(hour: Int, minute: Int = 0) = date.atTime(hour, minute)
    private fun booking(room: Int = 1, start: Int = 16, end: Int = 18, cancelled: Boolean = false) =
        Booking("test", room, at(start), at(end), "Собрание клуба", cancelled)
    private fun validate(start: LocalDateTime, end: LocalDateTime, rows: List<Booking> = emptyList(), purpose: String = "Подготовка") =
        BookingEngine.validate(1, start, end, purpose, rows, now)

    @Test fun freeWindowIsAccepted() { assertNull(validate(at(16), at(18))) }
    @Test fun lessonOverlapIsRejected() { assertNotNull(validate(at(10), at(11))) }
    @Test fun exactLessonBoundaryIsAccepted() { assertNull(validate(at(10, 30), at(11))) }
    @Test fun bookingOverlapIsRejected() { assertNotNull(validate(at(17), at(19), listOf(booking()))) }
    @Test fun containingBookingIsRejected() { assertNotNull(validate(at(15), at(19), listOf(booking()))) }
    @Test fun adjacentBookingIsAllowed() { assertNull(validate(at(18), at(19), listOf(booking()))) }
    @Test fun cancellationFreesWindow() { assertNull(validate(at(16), at(18), listOf(booking(cancelled = true)))) }
    @Test fun ownBookingInAnotherRoomIsRejected() { assertNotNull(validate(at(16), at(18), listOf(booking(room = 2)))) }
    @Test fun emptyPurposeIsRejected() { assertNotNull(validate(at(16), at(18), purpose = "  ")) }
    @Test fun reverseAndZeroDurationsAreRejected() {
        assertNotNull(validate(at(18), at(16)))
        assertNotNull(validate(at(16), at(16)))
    }
    @Test fun pastIsRejected() { assertNotNull(BookingEngine.validate(1, at(16), at(18), "Клуб", emptyList(), at(17))) }
    @Test fun outsideHoursIsRejected() { assertNotNull(validate(at(21), at(23))) }
    @Test fun crossingDateIsRejected() { assertNotNull(validate(at(21), date.plusDays(1).atTime(9, 0))) }
    @Test fun lessonMakesRoomRedUntilItsEnd() {
        assertEquals(RoomState.BUSY, BookingEngine.state(1, at(9), emptyList()))
        assertEquals(RoomState.FREE, BookingEngine.state(1, at(10, 30), emptyList()))
    }
    @Test fun laterBookingMakesRoomYellow() { assertEquals(RoomState.RESERVED, BookingEngine.state(1, at(11), listOf(booking()))) }
    @Test fun currentBookingMakesRoomRed() { assertEquals(RoomState.BUSY, BookingEngine.state(1, at(16), listOf(booking()))) }
    @Test fun cancelledBookingDoesNotColorRoom() { assertEquals(RoomState.FREE, BookingEngine.state(1, at(11), listOf(booking(cancelled = true)))) }
    @Test fun weekendHasNoLessons() { assertTrue(BookingEngine.lessons(1, LocalDate.of(2026, 11, 21)).isEmpty()) }
    @Test fun cancelledBookingIsAbsentFromSchedule() {
        assertFalse(BookingEngine.schedule(1, date, listOf(booking(cancelled = true))).any { it.title.startsWith("Бронь:") })
    }
}
