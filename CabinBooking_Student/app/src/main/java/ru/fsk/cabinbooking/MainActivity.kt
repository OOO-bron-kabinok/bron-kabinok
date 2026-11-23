package ru.fsk.cabinbooking

import android.Manifest
import android.app.DatePickerDialog
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.delay
import ru.fsk.cabinbooking.domain.*
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter

private val Green = Color(0xFF22834D)
private val Red = Color(0xFFB63737)
private val Yellow = Color(0xFF916500)
private val TimeFormat = DateTimeFormatter.ofPattern("HH:mm")
private val DateFormat = DateTimeFormatter.ofPattern("dd.MM.yyyy")

class MainActivity : ComponentActivity() {
    private var openBookings by mutableStateOf(false)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        openBookings = intent.getBooleanExtra("showBookings", false)
        enableEdgeToEdge()
        setContent {
            MaterialTheme(colorScheme = lightColorScheme(primary = Green, background = Color(0xFFF5F7F5))) {
                BookingApp(openBookings) { openBookings = false }
            }
        }
    }
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        openBookings = intent.getBooleanExtra("showBookings", false)
    }
}

@Composable
private fun Panel(content: @Composable ColumnScope.() -> Unit) {
    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp), content = content)
    }
}

@Composable
private fun BookingApp(openBookings: Boolean, consumed: () -> Unit, vm: BookingViewModel = viewModel()) {
    var tab by rememberSaveable { mutableStateOf(0) }
    var roomId by rememberSaveable { mutableStateOf<Int?>(null) }
    var now by remember { mutableStateOf(LocalDateTime.now()) }
    val owner = LocalLifecycleOwner.current
    LaunchedEffect(Unit) { while (true) { now = LocalDateTime.now(); delay(15_000) } }
    LaunchedEffect(openBookings) { if (openBookings) { tab = 1; roomId = null; consumed() } }
    DisposableEffect(owner) {
        val observer = LifecycleEventObserver { _, event -> if (event == Lifecycle.Event.ON_RESUME) { vm.refresh(); now = LocalDateTime.now() } }
        owner.lifecycle.addObserver(observer)
        onDispose { owner.lifecycle.removeObserver(observer) }
    }
    Scaffold(bottomBar = {
        NavigationBar {
            NavigationBarItem(selected = tab == 0, onClick = { tab = 0; roomId = null },
                icon = { Text("▦", fontSize = 24.sp) }, label = { Text("Аудитории") })
            NavigationBarItem(selected = tab == 1, onClick = { tab = 1; roomId = null },
                icon = { Text("▤", fontSize = 24.sp) }, label = { Text("Мои брони") })
        }
    }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("Бронь Кабинки", fontWeight = FontWeight.Bold, fontSize = 28.sp)
            Text("Пространство для твоих идей", color = Green)
            if (tab == 1) MyBookings(vm, now)
            else if (roomId != null) RoomDetails(vm, vm.rooms.first { it.id == roomId }, now,
                onBack = { roomId = null }, onBooked = { tab = 1; roomId = null })
            else RoomList(vm, now) { roomId = it }
        }
    }
    vm.message?.let { text -> AlertDialog(onDismissRequest = vm::dismiss,
        title = { Text("Бронь Кабинки") }, text = { Text(text) },
        confirmButton = { TextButton(onClick = vm::dismiss) { Text("Понятно") } }) }
}

@Composable
private fun RoomList(vm: BookingViewModel, now: LocalDateTime, select: (Int) -> Unit) {
    Text("Найди свободную аудиторию", fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
    Text("Статусы на ${now.format(DateTimeFormatter.ofPattern("dd.MM · HH:mm"))}")
    Text("● Свободна сейчас", color = Green)
    Text("● Занята сейчас: пара или встреча", color = Red)
    Text("● Свободна сейчас, есть бронь позже сегодня", color = Yellow)
    Text("Демонстрационное расписание · брони на этом телефоне", style = MaterialTheme.typography.bodySmall)
    vm.rooms.forEach { room ->
        val state = BookingEngine.state(room.id, now, vm.bookings)
        val color = when (state) { RoomState.FREE -> Green; RoomState.BUSY -> Red; RoomState.RESERVED -> Yellow }
        val label = when (state) { RoomState.FREE -> "Свободна сейчас"; RoomState.BUSY -> "Занята сейчас"; RoomState.RESERVED -> "Есть будущая бронь сегодня" }
        Panel {
            Text(room.name, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Text(room.description)
            Text("● $label", color = color, fontWeight = FontWeight.SemiBold)
            OutlinedButton(onClick = { select(room.id) }, modifier = Modifier.fillMaxWidth()) { Text("Посмотреть расписание") }
        }
    }
}

@Composable
private fun RoomDetails(vm: BookingViewModel, room: Room, now: LocalDateTime, onBack: () -> Unit, onBooked: () -> Unit) {
    val context = LocalContext.current
    var dateText by rememberSaveable(room.id) { mutableStateOf(now.toLocalDate().toString()) }
    val date = LocalDate.parse(dateText)
    var startText by rememberSaveable(room.id) { mutableStateOf("16:00") }
    var endText by rememberSaveable(room.id) { mutableStateOf("18:00") }
    var purpose by rememberSaveable(room.id) { mutableStateOf("") }
    var inputError by remember { mutableStateOf<String?>(null) }
    var confirm by remember { mutableStateOf(false) }
    val agenda = BookingEngine.schedule(room.id, date, vm.bookings)
    TextButton(onClick = onBack) { Text("‹ Все аудитории") }
    Text(room.name, fontWeight = FontWeight.Bold, fontSize = 24.sp)
    Text(room.description)
    RoomFeedback(vm, room)
    OutlinedButton(onClick = {
        DatePickerDialog(context, { _, year, month, day -> dateText = LocalDate.of(year, month + 1, day).toString() },
            date.year, date.monthValue - 1, date.dayOfMonth).apply {
            datePicker.minDate = System.currentTimeMillis()
        }.show()
    }, modifier = Modifier.fillMaxWidth()) { Text("Дата: ${date.format(DateFormat)}") }
    Text("Расписание по часам · 08:00–22:00", fontWeight = FontWeight.Bold)
    Text("Нажми на свободный час или задай точное время ниже.", style = MaterialTheme.typography.bodySmall)
    for (hour in 8..21) {
        val a = date.atTime(hour, 0)
        val b = a.plusHours(1)
        val busy = agenda.filter { BookingEngine.overlaps(a, b, it.start, it.end) }
        val past = a <= now
        val free = busy.isEmpty() && !past
        Column(Modifier.fillMaxWidth().background(if (busy.isEmpty()) Color(0xFFE9F4EC) else Color(0xFFFFEEEE), RoundedCornerShape(10.dp))
            .clickable(enabled = free) { startText = a.format(TimeFormat); endText = b.format(TimeFormat); inputError = null }
            .padding(12.dp)) {
            Text("${a.format(TimeFormat)}–${b.format(TimeFormat)} · ${if (busy.isEmpty()) "Свободно" else "Занято полностью или частично"}", fontWeight = FontWeight.SemiBold)
            busy.forEach { Text("${it.start.format(TimeFormat)}–${it.end.format(TimeFormat)} · ${it.title}", fontSize = 13.sp) }
            if (past && busy.isEmpty()) Text("Выберите время позже текущего", fontSize = 12.sp)
        }
    }
    Panel {
        Text("Оформить бронь", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedTextField(startText, { startText = it; inputError = null }, Modifier.weight(1f), label = { Text("С HH:mm") }, singleLine = true)
            OutlinedTextField(endText, { endText = it; inputError = null }, Modifier.weight(1f), label = { Text("До HH:mm") }, singleLine = true)
        }
        OutlinedTextField(purpose, { purpose = it.take(200); inputError = null }, Modifier.fillMaxWidth(),
            label = { Text("Цель встречи") }, placeholder = { Text("Например, подготовка к экзамену") }, minLines = 2)
        inputError?.let { Text(it, color = Red) }
        Button(onClick = {
            val start = parseTime(startText)?.let { date.atTime(it) }
            val end = parseTime(endText)?.let { date.atTime(it) }
            inputError = if (start == null || end == null) "Введите время в формате HH:mm, например 16:00"
                else BookingEngine.validate(room.id, start, end, purpose, vm.bookings, LocalDateTime.now())
            if (inputError == null) confirm = true
        }, modifier = Modifier.fillMaxWidth()) { Text("Забронировать") }
    }
    if (confirm) AlertDialog(onDismissRequest = { confirm = false }, title = { Text("Подтвердить бронь?") },
        text = { Text("${room.name}\n${date.format(DateFormat)} · $startText–$endText\n${purpose.trim()}") },
        confirmButton = { TextButton(onClick = {
            confirm = false
            val start = parseTime(startText)?.let { date.atTime(it) }
            val end = parseTime(endText)?.let { date.atTime(it) }
            if (start != null && end != null && vm.reserve(room.id, start, end, purpose)) onBooked()
        }) { Text("Подтвердить") } },
        dismissButton = { TextButton(onClick = { confirm = false }) { Text("Назад") } })
}

private fun parseTime(text: String): LocalTime? =
    if (!Regex("([01][0-9]|2[0-3]):[0-5][0-9]").matches(text.trim())) null
    else runCatching { LocalTime.parse(text.trim()) }.getOrNull()

@Composable
private fun NotificationSettings() {
    val context = LocalContext.current
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        runCatching { Reminders.restore(context) }
    }
    Panel {
        Text("Напоминание за 30 минут", fontWeight = FontWeight.Bold)
        Text("Разрешите уведомления и точные напоминания. Без разрешения на точное время Android может задержать уведомление.", style = MaterialTheme.typography.bodySmall)
        OutlinedButton(onClick = {
            if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED)
                permission.launch(Manifest.permission.POST_NOTIFICATIONS)
            else runCatching { context.startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)) }
        }, modifier = Modifier.fillMaxWidth()) { Text("Разрешить уведомления") }
        if (Build.VERSION.SDK_INT >= 31 && !Reminders.exactAllowed(context)) {
            OutlinedButton(onClick = {
                runCatching { context.startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}"))) }
            }, modifier = Modifier.fillMaxWidth()) { Text("Разрешить точное время") }
        }
    }
}

@Composable
private fun MyBookings(vm: BookingViewModel, now: LocalDateTime) {
    var filter by rememberSaveable { mutableStateOf(0) }
    var cancelId by remember { mutableStateOf<String?>(null) }
    var extendId by rememberSaveable { mutableStateOf<String?>(null) }
    Text("Мои брони", fontSize = 24.sp, fontWeight = FontWeight.Bold)
    NotificationSettings()
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        FilterChip(selected = filter == 0, onClick = { filter = 0 }, label = { Text("Предстоящие") })
        FilterChip(selected = filter == 1, onClick = { filter = 1 }, label = { Text("История") })
    }
    val rows = vm.bookings.filter { if (filter == 0) !it.cancelled && it.end > now else it.cancelled || it.end <= now }
        .let { if (filter == 0) it.sortedBy { b -> b.start } else it.sortedByDescending { b -> b.start } }
    if (rows.isEmpty()) Text(if (filter == 0) "Броней пока нет. Выберите аудиторию на главном экране." else "История пока пуста.")
    rows.forEach { b -> Panel {
        Text(vm.rooms.first { it.id == b.roomId }.name, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text("${b.start.format(DateFormat)} · ${b.start.format(TimeFormat)}–${b.end.format(TimeFormat)}")
        Text(b.purpose)
        Text(when { b.cancelled -> "Отменена"; b.end <= now -> "Завершена"; b.start <= now -> "Идёт сейчас"; else -> "Подтверждена" }, color = if (b.cancelled) Red else Green)
        if (!b.cancelled && b.start.toLocalDate() >= now.toLocalDate() && b.end.toLocalTime() < BookingEngine.closes) {
            OutlinedButton(onClick = { extendId = b.id }) { Text("Продлить бронь") }
        }
        if (!b.cancelled && b.end > now) TextButton(onClick = { cancelId = b.id }) { Text("Отменить бронь", color = Red) }
    } }
    extendId?.let { id ->
        vm.bookings.find { it.id == id }?.let { booking ->
            ExtensionDialog(vm, booking) { extendId = null }
        }
    }
    if (cancelId != null) AlertDialog(onDismissRequest = { cancelId = null }, title = { Text("Отменить бронь?") },
        text = { Text("Время станет доступно для бронирования. Напоминание будет удалено.") },
        confirmButton = { TextButton(onClick = { cancelId?.let(vm::cancel); cancelId = null }) { Text("Отменить бронь") } },
        dismissButton = { TextButton(onClick = { cancelId = null }) { Text("Оставить") } })
}
