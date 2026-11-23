package ru.fsk.cabinbooking.domain

import java.time.LocalDateTime

enum class FeedbackCategory(val label: String) {
    CLEANLINESS("Грязно"), DAMAGE("Что-то сломано"), OTHER("Другое")
}

data class Feedback(
    val id: String,
    val roomId: Int,
    val category: FeedbackCategory,
    val description: String,
    val createdAt: LocalDateTime,
)

object FeedbackRules {
    fun validate(roomId: Int, description: String): String? = when {
        roomId !in 1..4 -> "Аудитория не найдена"
        description.isBlank() -> "Опишите проблему"
        description.trim().length > 1000 -> "Описание должно содержать не более 1000 символов"
        else -> null
    }
}
