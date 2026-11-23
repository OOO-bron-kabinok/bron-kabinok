package ru.fsk.cabinbooking

import android.Manifest
import android.app.*
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import ru.fsk.cabinbooking.domain.Booking
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

object Reminders {
    private const val CHANNEL = "room_reminders"
    private fun manager(c: Context) = c.getSystemService(AlarmManager::class.java)
    fun exactAllowed(c: Context): Boolean = Build.VERSION.SDK_INT < 31 || manager(c).canScheduleExactAlarms()
    private fun pending(c: Context, id: String): PendingIntent = PendingIntent.getBroadcast(c, 0,
        Intent(c, ReminderReceiver::class.java).setData(Uri.parse("cabinbooking://reminder/$id")).putExtra("id", id),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    fun cancel(c: Context, id: String) {
        manager(c).cancel(pending(c, id))
        c.getSystemService(NotificationManager::class.java).cancel(id, 1)
    }
    fun schedule(c: Context, b: Booking) {
        manager(c).cancel(pending(c, b.id))
        if (b.cancelled || b.reminded || b.start <= LocalDateTime.now()) return
        val planned = b.start.minusMinutes(30).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
        val trigger = maxOf(planned, System.currentTimeMillis() + 1000)
        val alarm = manager(c)
        try {
            if (exactAllowed(c)) alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pending(c, b.id))
            else alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pending(c, b.id))
        } catch (_: SecurityException) {
            alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pending(c, b.id))
        }
    }
    fun restore(c: Context) { BookingStore(c).load().forEach { schedule(c, it) } }
    fun show(c: Context, b: Booking): Boolean {
        if (Build.VERSION.SDK_INT >= 33 && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false
        val nm = c.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(CHANNEL, "Напоминания о брони", NotificationManager.IMPORTANCE_HIGH))
        if (!nm.areNotificationsEnabled() || nm.getNotificationChannel(CHANNEL)?.importance == NotificationManager.IMPORTANCE_NONE) return false
        val open = PendingIntent.getActivity(c, 0, Intent(c, MainActivity::class.java)
            .putExtra("showBookings", true).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val time = b.start.format(DateTimeFormatter.ofPattern("HH:mm"))
        nm.notify(b.id, 1, Notification.Builder(c, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle("Скоро начало брони")
            .setContentText("Аудитория ${100 + b.roomId} · $time · ${b.purpose}")
            .setContentIntent(open).setAutoCancel(true).build())
        return true
    }
}

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra("id") ?: return
        runCatching {
            val store = BookingStore(context)
            val all = store.load()
            val b = all.find { it.id == id && !it.cancelled && !it.reminded } ?: return
            val now = LocalDateTime.now()
            if (now >= b.start) return // Не присылаем устаревшие напоминания.
            if (now < b.start.minusMinutes(30)) { Reminders.schedule(context, b); return }
            if (Reminders.show(context, b)) store.save(all.map { if (it.id == id) it.copy(reminded = true) else it })
        }
    }
}
class RestoreReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action in listOf(Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_TIME_CHANGED,
                Intent.ACTION_TIMEZONE_CHANGED, AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED)) {
            runCatching { Reminders.restore(context) }
        }
    }
}
