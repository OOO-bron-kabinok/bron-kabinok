package ru.fsk.cabinbooking

import android.app.Application
import androidx.compose.runtime.*
import androidx.lifecycle.AndroidViewModel
import ru.fsk.cabinbooking.domain.*
import java.time.LocalDateTime
import java.util.UUID

class BookingViewModel(app: Application) : AndroidViewModel(app) {
    val rooms = listOf(
        Room(1, "Аудитория 101", "1 этаж · 12 мест · проектор"),
        Room(2, "Аудитория 102", "1 этаж · 8 мест · маркерная доска"),
        Room(3, "Аудитория 103", "1 этаж · 20 мест · проектор"),
        Room(4, "Аудитория 104", "1 этаж · 6 мест · тихая зона"),
    )
    private val store = BookingStore(app)
    private val feedbackStore = FeedbackStore(app)
    var feedback by mutableStateOf(emptyList<Feedback>())
        private set
    var bookings by mutableStateOf(emptyList<Booking>())
        private set
    var message by mutableStateOf<String?>(null)
        private set
    private var readable = true
    init { refresh() }
    fun dismiss() { message = null }
    fun refresh() {
        try { bookings = store.load(); readable = true; Reminders.restore(getApplication()) }
        catch (_: Exception) { readable = false; message = "Не удалось прочитать данные или восстановить напоминания. Изменения отключены; данные сохранены." }
        try { feedback = feedbackStore.load() }
        catch (_: Exception) { message = "Не удалось прочитать сообщения о проблемах. Сохранённые данные не изменены." }
    }
    private fun save(next: List<Booking>): Boolean {
        if (!readable) { message = "Запись недоступна: требуется восстановление данных"; return false }
        return try { store.save(next); bookings = next; true }
        catch (_: Exception) { message = "Не удалось сохранить изменения"; false }
    }
    fun reserve(roomId: Int, start: LocalDateTime, end: LocalDateTime, purpose: String): Boolean {
        // Повторная проверка непосредственно перед сохранением.
        val current = try { store.load() } catch (_: Exception) { message = "Не удалось прочитать брони"; return false }
        val error = BookingEngine.validate(roomId, start, end, purpose, current, LocalDateTime.now())
        if (error != null) { message = error; return false }
        val b = Booking(UUID.randomUUID().toString(), roomId, start, end, purpose.trim())
        if (!save(current + b)) return false
        try { Reminders.schedule(getApplication(), b); message = "Бронь подтверждена" }
        catch (_: Exception) { message = "Бронь сохранена, но напоминание не установлено. Откройте приложение повторно." }
        return true
    }
    fun cancel(id: String) {
        val current = try { store.load() } catch (_: Exception) { message = "Не удалось прочитать брони"; return }
        val b = current.find { it.id == id } ?: return
        if (b.cancelled || b.end <= LocalDateTime.now()) return
        if (save(current.map { if (it.id == id) it.copy(cancelled = true) else it })) {
            Reminders.cancel(getApplication(), id)
            message = "Бронь отменена, время освобождено"
        }
    }

    fun extend(id: String, newEnd: LocalDateTime): Boolean {
        val current = try { store.load() }
        catch (_: Exception) { message = "Не удалось прочитать брони"; return false }
        val error = BookingEngine.validateExtension(id, newEnd, current, LocalDateTime.now())
        if (error != null) { message = error; return false }
        if (!save(current.map { if (it.id == id) it.copy(end = newEnd) else it })) return false
        // Начало и отметка reminded не меняются: повторное напоминание не требуется.
        message = "Бронь продлена"
        return true
    }

    fun report(roomId: Int, category: FeedbackCategory, description: String): Boolean {
        val error = FeedbackRules.validate(roomId, description)
        if (error != null) { message = error; return false }
        return try {
            val current = feedbackStore.load() // Не затираем данные при ошибке чтения.
            val next = current + Feedback(UUID.randomUUID().toString(), roomId, category,
                description.trim(), LocalDateTime.now())
            feedbackStore.save(next)
            feedback = next
            message = "Сообщение сохранено на телефоне. Отправка администрации не подключена."
            true
        } catch (_: Exception) {
            message = "Не удалось сохранить сообщение. Попробуйте ещё раз; прежние записи не изменены."
            false
        }
    }
}
