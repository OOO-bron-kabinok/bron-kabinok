package ru.fsk.cabinbooking.domain

import org.junit.Assert.*
import org.junit.Test

class FeedbackRulesTest {
    @Test fun meaningfulReportIsAccepted() { assertNull(FeedbackRules.validate(1, "Сломан стул у окна")) }
    @Test fun blankReportIsRejected() { assertNotNull(FeedbackRules.validate(1, " \n\t")) }
    @Test fun missingRoomIsRejected() {
        assertNotNull(FeedbackRules.validate(0, "Грязно"))
        assertNotNull(FeedbackRules.validate(5, "Грязно"))
    }
    @Test fun descriptionLengthIsLimited() {
        assertNull(FeedbackRules.validate(4, "я".repeat(1000)))
        assertNotNull(FeedbackRules.validate(4, "я".repeat(1001)))
    }
}
