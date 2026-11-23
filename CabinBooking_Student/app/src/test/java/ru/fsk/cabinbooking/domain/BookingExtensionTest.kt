package ru.fsk.cabinbooking.domain

import org.junit.Assert.*
import org.junit.Test
import java.time.LocalDate

class BookingExtensionTest {
    private val date = LocalDate.of(2026, 11, 16)
    private fun at(hour: Int, minute: Int = 0) = date.atTime(hour, minute)
    private val booking = Booking("own", 1, at(16), at(18), "Клуб", reminded = true)
    private fun validate(endHour: Int = 19, endMinute: Int = 0,
                         rows: List<Booking> = listOf(booking), nowHour: Int = 17) =
        BookingEngine.validateExtension("own", at(endHour, endMinute), rows, at(nowHour))

    @Test fun activeBookingCanBeExtendedWithoutCollidingWithItself() { assertNull(validate()) }
    @Test fun futureBookingCanBeExtended() { assertNull(validate(nowHour = 15)) }
    @Test fun exactOriginalEndIsAcceptedAsCurrentTime() { assertNull(validate(nowHour = 18)) }
    @Test fun recentlyEndedBookingCanBeExtendedIfWholeIntervalIsFree() {
        assertNull(BookingEngine.validateExtension("own", at(20), listOf(booking), at(18, 15)))
    }
    @Test fun expiredPartOfAddedIntervalIsAlsoChecked() {
        val other = Booking("other", 1, at(18), at(18, 10), "Другая встреча")
        assertNotNull(BookingEngine.validateExtension("own", at(20), listOf(booking, other), at(18, 15)))
    }
    @Test fun cancelledBookingCannotBeExtended() {
        assertNotNull(validate(rows = listOf(booking.copy(cancelled = true))))
    }
    @Test fun unknownBookingIsRejected() { assertNotNull(validate(rows = emptyList())) }
    @Test fun shorteningAndNoChangeAreRejected() {
        assertNotNull(validate(17)); assertNotNull(validate(18))
    }
    @Test fun newEndMustBeInFuture() { assertNotNull(validate(19, nowHour = 19)) }
    @Test fun closingBoundaryIsAllowedButLaterIsRejected() {
        assertNull(validate(22)); assertNotNull(validate(22, 1))
    }
    @Test fun crossingMidnightIsRejected() {
        assertNotNull(BookingEngine.validateExtension("own", date.plusDays(1).atTime(9, 0), listOf(booking), at(17)))
    }
    @Test fun previousDayCannotBeRevived() {
        assertNotNull(BookingEngine.validateExtension("own", at(20), listOf(booking), date.plusDays(1).atTime(8, 0)))
    }
    @Test fun lessonInAddedTimeIsRejected() {
        val morning = booking.copy(start = at(10, 30), end = at(12))
        assertNotNull(BookingEngine.validateExtension("own", at(14), listOf(morning), at(11)))
    }
    @Test fun addedTimeCanEndAtNextLessonStart() {
        val morning = booking.copy(start = at(10, 30), end = at(12))
        assertNull(BookingEngine.validateExtension("own", at(13), listOf(morning), at(11)))
    }
    @Test fun nextBookingBoundaryIsAllowedButOverlapIsRejected() {
        val other = Booking("other", 1, at(19), at(20), "Встреча")
        assertNull(validate(rows = listOf(booking, other)))
        assertNotNull(validate(19, 1, listOf(booking, other)))
    }
    @Test fun ownBookingInDifferentRoomAlsoBlocksExtension() {
        val other = Booking("other", 2, at(18, 30), at(20), "Встреча")
        assertNotNull(validate(rows = listOf(booking, other)))
    }
    @Test fun cancelledNextBookingDoesNotBlockExtension() {
        val other = Booking("other", 1, at(18, 30), at(20), "Встреча", cancelled = true)
        assertNull(validate(rows = listOf(booking, other)))
    }
    @Test fun extendedTimeAppearsInScheduleAndColorsRoom() {
        val extended = booking.copy(end = at(19))
        assertEquals(at(19), BookingEngine.schedule(1, date, listOf(extended)).last().end)
        assertEquals(RoomState.BUSY, BookingEngine.state(1, at(18, 30), listOf(extended)))
        assertEquals(RoomState.FREE, BookingEngine.state(1, at(19), listOf(extended)))
    }
}
