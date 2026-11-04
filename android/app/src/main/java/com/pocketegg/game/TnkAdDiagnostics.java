package com.pocketegg.game;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;

/** USB Logcat 없이 TNK 이벤트 확인용 (최근 20건) */
final class TnkAdDiagnostics {

    private static final String PREFS = "pocket_egg_tnk_diag";
    private static final String KEY_EVENTS = "events";
    private static final int MAX = 20;

    private TnkAdDiagnostics() {}

    static void record(Context context, String event) {
        try {
            SharedPreferences prefs =
                    context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONArray arr = new JSONArray(prefs.getString(KEY_EVENTS, "[]"));
            JSONArray next = new JSONArray();
            next.put(System.currentTimeMillis() + " " + event);
            int start = Math.max(0, arr.length() - (MAX - 1));
            for (int i = start; i < arr.length(); i++) {
                next.put(arr.getString(i));
            }
            prefs.edit().putString(KEY_EVENTS, next.toString()).apply();
        } catch (Exception ignored) {
            /* ignore */
        }
    }

    static String dump(Context context) {
        try {
            SharedPreferences prefs =
                    context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            return prefs.getString(KEY_EVENTS, "[]");
        } catch (Exception e) {
            return "[]";
        }
    }
}
