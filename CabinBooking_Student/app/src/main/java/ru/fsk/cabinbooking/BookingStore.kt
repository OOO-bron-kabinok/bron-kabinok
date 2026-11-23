package ru.fsk.cabinbooking

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import ru.fsk.cabinbooking.domain.Booking
import java.time.LocalDateTime

class BookingStore(context: Context) {
    private val prefs = context.getSharedPreferences("student_rooms_v2", Context.MODE_PRIVATE)
    // Ошибки чтения передаются вызывающему коду: повреждённые данные не затираются.
    fun load(): List<Booking> {
        val rows = JSONArray(prefs.getString("bookings", "[]"))
        return (0 until rows.length()).map { i ->
            val row = rows.getJSONObject(i)
            Booking(row.getString("id"), row.getInt("roomId"), LocalDateTime.parse(row.getString("start")),
                LocalDateTime.parse(row.getString("end")), row.getString("purpose"),
                row.optBoolean("cancelled"), row.optBoolean("reminded"))
        }
    }
    fun save(bookings: List<Booking>) {
        val rows = JSONArray()
        bookings.forEach { b -> rows.put(JSONObject().put("id", b.id).put("roomId", b.roomId)
            .put("start", b.start.toString()).put("end", b.end.toString()).put("purpose", b.purpose)
            .put("cancelled", b.cancelled).put("reminded", b.reminded)) }
        check(prefs.edit().putString("bookings", rows.toString()).commit()) { "Не удалось сохранить брони" }
    }
}
