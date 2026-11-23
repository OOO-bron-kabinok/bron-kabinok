package ru.fsk.cabinbooking

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import ru.fsk.cabinbooking.domain.Feedback
import ru.fsk.cabinbooking.domain.FeedbackCategory
import java.time.LocalDateTime

class FeedbackStore(context: Context) {
    private val prefs = context.getSharedPreferences("student_feedback_v1", Context.MODE_PRIVATE)
    fun load(): List<Feedback> {
        val rows = JSONArray(prefs.getString("feedback", "[]"))
        return (0 until rows.length()).map { i ->
            val row = rows.getJSONObject(i)
            Feedback(row.getString("id"), row.getInt("roomId"),
                FeedbackCategory.valueOf(row.getString("category")),
                row.getString("description"), LocalDateTime.parse(row.getString("createdAt")))
        }
    }
    fun save(feedback: List<Feedback>) {
        val rows = JSONArray()
        feedback.forEach { f -> rows.put(JSONObject().put("id", f.id).put("roomId", f.roomId)
            .put("category", f.category.name).put("description", f.description)
            .put("createdAt", f.createdAt.toString())) }
        check(prefs.edit().putString("feedback", rows.toString()).commit()) { "Не удалось сохранить сообщение" }
    }
}
