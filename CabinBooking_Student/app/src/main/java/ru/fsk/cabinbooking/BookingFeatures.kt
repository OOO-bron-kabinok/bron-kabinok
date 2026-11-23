package ru.fsk.cabinbooking

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ru.fsk.cabinbooking.domain.*
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter

private val FeedbackDateFormat = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm")
private val EndTimeFormat = DateTimeFormatter.ofPattern("HH:mm")

@Composable
internal fun RoomFeedback(vm: BookingViewModel, room: Room) {
    var showForm by rememberSaveable(room.id) { mutableStateOf(false) }
    var categoryName by rememberSaveable(room.id) { mutableStateOf(FeedbackCategory.CLEANLINESS.name) }
    var description by rememberSaveable(room.id) { mutableStateOf("") }
    var error by rememberSaveable(room.id) { mutableStateOf<String?>(null) }
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Обратная связь", fontWeight = FontWeight.Bold)
            Text("Грязно или что-то сломано? Опишите проблему. Сообщения хранятся только на этом телефоне; администрация их не получает.",
                style = MaterialTheme.typography.bodySmall)
            OutlinedButton(onClick = { showForm = true; error = null }) { Text("Сообщить о проблеме") }
            val recent = vm.feedback.filter { it.roomId == room.id }.sortedByDescending { it.createdAt }.take(10)
            if (recent.isNotEmpty()) Text("Последние сообщения на этом телефоне (до 10)", fontWeight = FontWeight.Bold)
            recent.forEach { f ->
                HorizontalDivider()
                Text("${f.category.label} · ${f.createdAt.format(FeedbackDateFormat)}")
                Text(f.description)
                Text("Сохранено локально", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
    if (showForm) AlertDialog(
        onDismissRequest = { showForm = false },
        title = { Text("Сообщить: ${room.name}") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Выберите тип проблемы")
                FeedbackCategory.entries.forEach { category ->
                    FilterChip(selected = categoryName == category.name,
                        onClick = { categoryName = category.name }, label = { Text(category.label) })
                }
                OutlinedTextField(description, { description = it.take(1000); error = null },
                    label = { Text("Что случилось?") }, minLines = 3,
                    supportingText = { Text("${description.length}/1000") })
                Text("Сообщение будет сохранено на телефоне без отправки администрации.")
                error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            }
        },
        confirmButton = { TextButton(onClick = {
            if (vm.report(room.id, FeedbackCategory.valueOf(categoryName), description)) {
                showForm = false
                description = ""
            } else {
                error = vm.message
                vm.dismiss()
            }
        }) { Text("Сохранить сообщение") } },
        dismissButton = { TextButton(onClick = { showForm = false }) { Text("Закрыть") } },
    )
}

@Composable
internal fun ExtensionDialog(vm: BookingViewModel, booking: Booking, onClose: () -> Unit) {
    var endText by rememberSaveable(booking.id) { mutableStateOf(booking.end.plusMinutes(30).format(EndTimeFormat)) }
    var error by rememberSaveable(booking.id) { mutableStateOf<String?>(null) }
    AlertDialog(
        onDismissRequest = onClose,
        title = { Text("Продлить бронь") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(vm.rooms.first { it.id == booking.roomId }.name)
                Text("Текущее окончание: ${booking.end.format(FeedbackDateFormat)}")
                Text("Выберите новое окончание до 22:00 в тот же день. Начало и цель брони сохранятся.")
                Text("Если время уже закончилось сегодня, проверяется весь интервал от прежнего окончания до нового, включая прошедшее время.",
                    style = MaterialTheme.typography.bodySmall)
                OutlinedTextField(endText, { endText = it; error = null }, singleLine = true,
                    label = { Text("Новое окончание HH:mm") })
                error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            }
        },
        confirmButton = { TextButton(onClick = {
            val time = if (Regex("([01][0-9]|2[0-3]):[0-5][0-9]").matches(endText.trim()))
                runCatching { LocalTime.parse(endText.trim()) }.getOrNull() else null
            if (time == null) error = "Введите время в формате HH:mm, например 18:30"
            else {
                val newEnd = booking.start.toLocalDate().atTime(time)
                error = BookingEngine.validateExtension(booking.id, newEnd, vm.bookings, LocalDateTime.now())
                if (error == null) {
                    if (vm.extend(booking.id, newEnd)) onClose()
                    else { error = vm.message; vm.dismiss() }
                }
            }
        }) { Text("Подтвердить продление") } },
        dismissButton = { TextButton(onClick = onClose) { Text("Отмена") } },
    )
}
