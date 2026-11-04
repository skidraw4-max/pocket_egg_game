package com.pocketegg.game;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.browser.customtabs.CustomTabsIntent;

import com.tnkfactory.ad.AdItem;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

final class TnkLandingHelper {

    private static final String TAG = "PocketEgg/TNK";
    private static final String TNK_AD_PANEL = "com.tnkfactory.ad.pub.r5";
    private static final String TNK_NATIVE_CTA = "com.tnkfactory.ad.pub.m5";
    private static final String TNK_CLICK_TRACKER = "com.tnkfactory.ad.pub.t4";
    private static final String PATCH_TAG = "pocket_egg_tnk_patched";
    private static final int PATCH_TOUCH_KEY = 0x7E001001;
    private static final String JS_BRIDGE = "PocketEggTnkBridge";
    private static final String JS_CTA_MATCH =
            "function(t){if(!t)return 0;var s=t.toLowerCase();"
                    + "return (t.indexOf('바로')>=0||t.indexOf('이동')>=0||t.indexOf('사이트')>=0"
                    + "||t.indexOf('가기')>=0||t.indexOf('보기')>=0||t.indexOf('확인')>=0"
                    + "||t.indexOf('지금')>=0||t.indexOf('자세히')>=0"
                    + "||s.indexOf('visit')>=0||s.indexOf('website')>=0||s.indexOf('learn more')>=0"
                    + "||s.indexOf('go now')>=0||s.indexOf('install')>=0||s.indexOf('download')>=0"
                    + "||s.indexOf('open')>=0||s.indexOf('shop')>=0||s.indexOf('store')>=0)?1:0;}";

    private TnkLandingHelper() {}

    static boolean handleCtaTouch(Activity activity, AdItem item, MotionEvent event) {
        View root = activity.getWindow().getDecorView();
        float rawX = event.getRawX();
        float rawY = event.getRawY();
        View target = findViewAtRaw(root, rawX, rawY);

        if (target instanceof TextView) {
            CharSequence text = ((TextView) target).getText();
            if (looksLikeCta(text)) {
                TnkAdDiagnostics.record(activity, "touchNativeCta:" + text);
                return performLanding(activity, item);
            }
        }

        if (target != null && target.getClass().getName().equals(TNK_NATIVE_CTA)) {
            TnkAdDiagnostics.record(activity, "touchNativeSdkCta");
            return performLanding(activity, item);
        }

        WebView webView = findWebViewAtRaw(root, rawX, rawY);
        if (webView != null) {
            int[] loc = new int[2];
            webView.getLocationOnScreen(loc);
            int x = Math.max(0, (int) rawX - loc[0]);
            int y = Math.max(0, (int) rawY - loc[1]);

            WebView.HitTestResult hit = webView.getHitTestResult();
            if (hit != null) {
                int type = hit.getType();
                String extra = hit.getExtra();
                if (type == WebView.HitTestResult.SRC_ANCHOR_TYPE
                        || type == WebView.HitTestResult.IMAGE_TYPE
                        || (extra != null && extra.startsWith("http"))) {
                    TnkAdDiagnostics.record(activity, "touchWebHit:" + type);
                    return performLanding(activity, item);
                }
            }

            if (isInBottomCtaStrip(webView, rawX, rawY) && !looksLikeSkip(target)) {
                TnkAdDiagnostics.record(activity, "touchWebBottomStrip");
                return performLanding(activity, item);
            }

            String js =
                    String.format(
                            Locale.US,
                            "(function(x,y){var el=document.elementFromPoint(x,y);"
                                    + "if(!el)return'';"
                                    + "var t=(el.innerText||el.textContent||'').trim();"
                                    + "if(!t&&el.parentElement){"
                                    + "t=(el.parentElement.innerText||el.parentElement.textContent||'').trim();"
                                    + "}"
                                    + "return t.substring(0,80);})(%d,%d)",
                            x, y);
            webView.evaluateJavascript(
                    js,
                    value -> {
                        if (value == null) return;
                        String text = value.replace("\"", "").trim();
                        if (looksLikeCta(text)) {
                            activity.runOnUiThread(
                                    () -> {
                                        TnkAdDiagnostics.record(
                                                activity, "touchWebCta:" + shorten(text));
                                        performLanding(activity, item);
                                    });
                        }
                    });
        }

        if (isInBottomCtaStrip(root, rawX, rawY) && !looksLikeSkip(target)) {
            TnkAdDiagnostics.record(activity, "touchBottomStrip");
            return performLanding(activity, item);
        }

        return false;
    }

    static void assistLanding(Activity activity, AdItem item) {
        if (!performLanding(activity, item)) {
            TnkAdDiagnostics.record(activity, "clickNoUrl");
        }
    }

    static void scheduleCtaPatch(Activity activity, AdItem item, android.os.Handler handler) {
        Runnable patch = () -> patchCtaButtons(activity, item);
        for (int delayMs : new int[] {300, 600, 1000, 2000, 4000, 8000, 12000, 16000}) {
            handler.postDelayed(patch, delayMs);
        }
    }

    static void patchCtaButtons(Activity activity, AdItem item) {
        if (activity.isFinishing() || activity.isDestroyed()) return;

        View root = activity.getWindow().getDecorView();
        wireNativeCtaViews(root, activity, item);
        wireNativeSdkButtons(root, activity, item);
        patchWebViews(activity, root, item);
    }

    static String extractClickUrl(AdItem item) {
        if (item == null) return null;

        String[] keys = {
            "landing_url", "click_url", "clickUrl", "landingUrl", "adv_url", "ADV_URL",
            "url", "link", "target_url", "targetUrl", "landing", "dest_url",
        };
        for (String key : keys) {
            String url = asHttpUrl(item.getValue(key));
            if (url != null) return url;
        }
        return scanInternalValues(item);
    }

    static void logAdItemValues(AdItem item) {
        if (item == null) return;
        Map<String, String> values = collectInternalValues(item);
        if (values.isEmpty()) {
            Log.d(TAG, "AdItem values: (empty)");
            return;
        }
        StringBuilder sb = new StringBuilder("AdItem values:");
        for (Map.Entry<String, String> e : values.entrySet()) {
            sb.append(' ').append(e.getKey()).append('=').append(shorten(e.getValue()));
        }
        Log.d(TAG, sb.toString());
    }

    static void openUrl(Activity activity, String url) {
        if (url == null || url.isEmpty()) return;
        Uri uri = Uri.parse(url);

        try {
            CustomTabsIntent tabs = new CustomTabsIntent.Builder().setShowTitle(true).build();
            tabs.launchUrl(activity, uri);
            Log.i(TAG, "CustomTabs launch: " + url);
            return;
        } catch (ActivityNotFoundException e) {
            Log.d(TAG, "CustomTabs unavailable, fallback VIEW");
        } catch (Exception e) {
            Log.w(TAG, "CustomTabs failed", e);
        }

        try {
            Intent view = new Intent(Intent.ACTION_VIEW, uri);
            view.addCategory(Intent.CATEGORY_BROWSABLE);
            view.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(view);
            Log.i(TAG, "ACTION_VIEW launch: " + url);
        } catch (Exception e) {
            Log.e(TAG, "Landing failed for " + url, e);
        }
    }

    private static final class LandingContext {
        String url;
        ArrayList<String> tracking;
    }

    private static boolean performLanding(Activity activity, AdItem item) {
        LandingContext ctx = buildLandingContext(activity.getWindow().getDecorView(), item);
        fireClickTracking(ctx.tracking);
        if (ctx.url != null) {
            TnkAdDiagnostics.record(activity, "landing:" + shorten(ctx.url));
            openUrl(activity, ctx.url);
            return true;
        }
        if (triggerSdkNativeCta(activity.getWindow().getDecorView())) {
            TnkAdDiagnostics.record(activity, "landingSdkNativeCta");
            return true;
        }
        if (triggerSdkWebViewClick(activity.getWindow().getDecorView())) {
            TnkAdDiagnostics.record(activity, "landingSdkTap");
            return true;
        }
        return false;
    }

    private static LandingContext buildLandingContext(View root, AdItem item) {
        LandingContext ctx = new LandingContext();

        Object adPanel = findViewByClassName(root, TNK_AD_PANEL);
        if (adPanel != null) {
            ctx.url = readStringField(adPanel, "D");
            ctx.tracking = readStringArrayList(adPanel, "E");
            if (ctx.url == null) {
                ctx.url = extractUrlFromAdData(readField(adPanel, "C"));
            }
        }

        if (ctx.url == null) {
            ctx.url = extractClickUrl(item);
        }
        if (ctx.url == null) {
            ctx.url = findUrlInWebViews(root);
        }
        return ctx;
    }

    private static void wireNativeCtaViews(View root, Activity activity, AdItem item) {
        if (root instanceof TextView) {
            TextView tv = (TextView) root;
            if (looksLikeCta(tv.getText())) {
                wireCtaView(root, activity, item);
            }
        } else if (root instanceof Button) {
            Button btn = (Button) root;
            if (looksLikeCta(btn.getText())) {
                wireCtaView(root, activity, item);
            }
        } else if (TNK_NATIVE_CTA.equals(root.getClass().getName())) {
            wireCtaView(root, activity, item);
        }

        if (root instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) root;
            for (int i = 0; i < group.getChildCount(); i++) {
                wireNativeCtaViews(group.getChildAt(i), activity, item);
            }
        }
    }

    private static void wireNativeSdkButtons(View root, Activity activity, AdItem item) {
        if (TNK_NATIVE_CTA.equals(root.getClass().getName())) {
            wireCtaView(root, activity, item);
        }
        if (root instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) root;
            for (int i = 0; i < group.getChildCount(); i++) {
                wireNativeSdkButtons(group.getChildAt(i), activity, item);
            }
        }
    }

    private static void wireCtaView(View view, Activity activity, AdItem item) {
        if (PATCH_TAG.equals(view.getTag())) return;
        view.setTag(PATCH_TAG);
        view.setClickable(true);
        view.setOnClickListener(v -> performLanding(activity, item));
    }

    private static void patchWebViews(Activity activity, View root, AdItem item) {
        for (WebView webView : findAllWebViews(root)) {
            patchSingleWebView(activity, webView, item);
        }
    }

    private static void patchSingleWebView(Activity activity, WebView webView, AdItem item) {
        Object tag = webView.getTag();
        if (!(tag instanceof WebBridge)) {
            webView.setTag(new WebBridge(activity, item));
            webView.addJavascriptInterface((WebBridge) webView.getTag(), JS_BRIDGE);
        }
        injectCtaHookJs(webView);
        chainWebViewTouchListener(webView, activity, item);
    }

    private static void chainWebViewTouchListener(
            WebView webView, Activity activity, AdItem item) {
        if (Boolean.TRUE.equals(webView.getTag(PATCH_TOUCH_KEY))) return;
        webView.setTag(PATCH_TOUCH_KEY, Boolean.TRUE);

        View.OnTouchListener existing = getExistingTouchListener(webView);
        webView.setOnTouchListener(
                (v, event) -> {
                    if (event.getAction() == MotionEvent.ACTION_UP) {
                        WebView wv = (WebView) v;
                        float rawX = event.getRawX();
                        float rawY = event.getRawY();
                        int[] loc = new int[2];
                        wv.getLocationOnScreen(loc);
                        int x = Math.max(0, (int) rawX - loc[0]);
                        int y = Math.max(0, (int) rawY - loc[1]);

                        if (isInBottomCtaStrip(wv, rawX, rawY)) {
                            activity.runOnUiThread(() -> performLanding(activity, item));
                        } else {
                            wv.evaluateJavascript(
                                    String.format(
                                            Locale.US,
                                            "(function(x,y){var el=document.elementFromPoint(x,y);"
                                                    + "if(!el)return 0;"
                                                    + "var t=(el.innerText||el.textContent||'').trim();"
                                                    + "if(!t&&el.parentElement){"
                                                    + "t=(el.parentElement.innerText||el.parentElement.textContent||'').trim();"
                                                    + "}"
                                                    + "return "
                                                    + JS_CTA_MATCH
                                                    + "(t);})(%d,%d)",
                                            x, y),
                                    value -> {
                                        if ("1".equals(value)) {
                                            activity.runOnUiThread(
                                                    () -> performLanding(activity, item));
                                        }
                                    });
                        }
                    }
                    if (existing != null) {
                        existing.onTouch(v, event);
                    }
                    return false;
                });
    }

    @Nullable
    private static View.OnTouchListener getExistingTouchListener(View view) {
        try {
            Field listenerInfoField = View.class.getDeclaredField("mListenerInfo");
            listenerInfoField.setAccessible(true);
            Object listenerInfo = listenerInfoField.get(view);
            if (listenerInfo == null) return null;
            Field otlField = listenerInfo.getClass().getDeclaredField("mOnTouchListener");
            otlField.setAccessible(true);
            return (View.OnTouchListener) otlField.get(listenerInfo);
        } catch (Exception e) {
            return null;
        }
    }

    private static final class WebBridge {
        private final Activity activity;
        private final AdItem item;

        WebBridge(Activity activity, AdItem item) {
            this.activity = activity;
            this.item = item;
        }

        @JavascriptInterface
        public void onCtaClick() {
            activity.runOnUiThread(() -> performLanding(activity, item));
        }
    }

    private static void injectCtaHookJs(WebView webView) {
        String js =
                "(function(){function hook(){"
                        + "var sel='a,button,input[type=button],[role=button],div,span,p,label';"
                        + "document.querySelectorAll(sel).forEach(function(el){"
                        + "if(el.__peTnk)return;"
                        + "var t=(el.innerText||el.textContent||el.value||'').trim();"
                        + "if(!t&&el.parentElement){"
                        + "t=(el.parentElement.innerText||el.parentElement.textContent||'').trim();"
                        + "}"
                        + "if(!t)return;"
                        + "if("
                        + JS_CTA_MATCH
                        + "(t)){"
                        + "el.__peTnk=1;"
                        + "el.addEventListener('click',function(ev){"
                        + "try{ev.preventDefault();ev.stopPropagation();}catch(x){}"
                        + "if(window."
                        + JS_BRIDGE
                        + "){window."
                        + JS_BRIDGE
                        + ".onCtaClick();}"
                        + "},true);"
                        + "}"
                        + "});"
                        + "var fixed=document.querySelectorAll('[style*=\"bottom\"]');"
                        + "fixed.forEach(function(el){"
                        + "if(el.__peTnkBottom)return;"
                        + "var r=el.getBoundingClientRect();"
                        + "if(r.height<24||r.width<48)return;"
                        + "if(r.top<window.innerHeight*0.55)return;"
                        + "el.__peTnkBottom=1;"
                        + "el.addEventListener('click',function(ev){"
                        + "try{ev.preventDefault();ev.stopPropagation();}catch(x){}"
                        + "if(window."
                        + JS_BRIDGE
                        + "){window."
                        + JS_BRIDGE
                        + ".onCtaClick();}"
                        + "},true);"
                        + "});"
                        + "}"
                        + "hook();setInterval(hook,500);})();";
        webView.evaluateJavascript(js, null);
    }

    private static boolean triggerSdkNativeCta(View root) {
        View cta = findViewByClassName(root, TNK_NATIVE_CTA);
        if (cta != null && cta.isShown()) {
            return cta.performClick();
        }
        return false;
    }

    private static boolean triggerSdkWebViewClick(View root) {
        for (WebView webView : findAllWebViews(root)) {
            if (!webView.getClass().getName().startsWith("com.tnkfactory.ad.pub.")) {
                continue;
            }
            if (invokeSdkTapHandler(webView)) {
                return true;
            }
        }
        return false;
    }

    private static boolean invokeSdkTapHandler(WebView webView) {
        try {
            Field dField = webView.getClass().getDeclaredField("d");
            dField.setAccessible(true);
            Object gestureDetector = dField.get(webView);
            if (gestureDetector == null) return false;

            Field listenerField = gestureDetector.getClass().getDeclaredField("a");
            listenerField.setAccessible(true);
            Object gestureListener = listenerField.get(gestureDetector);
            if (gestureListener == null) return false;

            Field tapHandlerField = gestureListener.getClass().getDeclaredField("b");
            tapHandlerField.setAccessible(true);
            Object tapHandler = tapHandlerField.get(gestureListener);
            if (tapHandler == null) return false;

            tapHandler.getClass().getMethod("a").invoke(tapHandler);
            return true;
        } catch (Exception e) {
            Log.d(TAG, "invokeSdkTapHandler skipped", e);
            return false;
        }
    }

    private static boolean isInBottomCtaStrip(View view, float rawX, float rawY) {
        int[] loc = new int[2];
        view.getLocationOnScreen(loc);
        int width = view.getWidth();
        int height = view.getHeight();
        if (width <= 0 || height <= 0) return false;
        float stripTop = loc[1] + height * 0.68f;
        return rawY >= stripTop
                && rawX >= loc[0]
                && rawX <= loc[0] + width
                && rawY <= loc[1] + height;
    }

    private static boolean looksLikeSkip(@Nullable View view) {
        if (view == null) return false;
        CharSequence text = null;
        if (view instanceof TextView) {
            text = ((TextView) view).getText();
        }
        if (text == null) {
            text = view.getContentDescription();
        }
        if (text == null) return false;
        String s = text.toString().toLowerCase(Locale.ROOT);
        return s.contains("닫")
                || s.contains("skip")
                || s.contains("close")
                || s.contains("건너")
                || s.equals("x")
                || s.contains("×");
    }

    @Nullable
    private static View findViewAtRaw(View root, float rawX, float rawY) {
        int[] loc = new int[2];
        root.getLocationOnScreen(loc);
        int left = loc[0];
        int top = loc[1];
        int right = left + root.getWidth();
        int bottom = top + root.getHeight();
        if (rawX < left || rawX > right || rawY < top || rawY > bottom) {
            return null;
        }

        if (root instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) root;
            for (int i = group.getChildCount() - 1; i >= 0; i--) {
                View found = findViewAtRaw(group.getChildAt(i), rawX, rawY);
                if (found != null) return found;
            }
        }
        return root;
    }

    @Nullable
    private static WebView findWebViewAtRaw(View root, float rawX, float rawY) {
        View target = findViewAtRaw(root, rawX, rawY);
        while (target != null) {
            if (target instanceof WebView) return (WebView) target;
            if (!(target.getParent() instanceof View)) return null;
            target = (View) target.getParent();
        }
        return null;
    }

    private static String findUrlInWebViews(View root) {
        for (WebView webView : findAllWebViews(root)) {
            String url = asHttpUrl(webView.getUrl());
            if (url != null) return url;
            String original = asHttpUrl(webView.getOriginalUrl());
            if (original != null) return original;
        }
        return null;
    }

    private static ArrayList<WebView> findAllWebViews(View root) {
        ArrayList<WebView> out = new ArrayList<>();
        collectWebViews(root, out);
        return out;
    }

    private static void collectWebViews(View root, ArrayList<WebView> out) {
        if (root instanceof WebView) {
            out.add((WebView) root);
        }
        if (root instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) root;
            for (int i = 0; i < group.getChildCount(); i++) {
                collectWebViews(group.getChildAt(i), out);
            }
        }
    }

    private static String extractUrlFromAdData(Object adData) {
        if (adData == null) return null;
        Set<String> seen = new HashSet<>();

        for (Field field : adData.getClass().getDeclaredFields()) {
            field.setAccessible(true);
            try {
                Object value = field.get(adData);
                String url = extractUrlFromValue(value, seen);
                if (url != null) return url;
            } catch (Exception ignored) {
                /* ignore */
            }
        }
        return null;
    }

    private static String extractUrlFromValue(Object value, Set<String> seen) {
        if (value instanceof String) {
            return asHttpUrl(value);
        }
        if (value instanceof ArrayList) {
            for (Object entry : (ArrayList<?>) value) {
                if (entry instanceof String) {
                    String raw = (String) entry;
                    if (!seen.add(raw)) continue;
                    String direct = asHttpUrl(raw);
                    if (direct != null) return direct;
                    int httpIdx = raw.indexOf("http");
                    if (httpIdx >= 0) {
                        String tail = raw.substring(httpIdx);
                        int end = tail.indexOf(' ');
                        if (end > 0) tail = tail.substring(0, end);
                        String nested = asHttpUrl(tail);
                        if (nested != null) return nested;
                    }
                }
            }
        }
        return null;
    }

    private static void fireClickTracking(ArrayList<String> tracking) {
        if (tracking == null || tracking.isEmpty()) return;
        try {
            Class<?> tracker = Class.forName(TNK_CLICK_TRACKER);
            tracker.getMethod("a", ArrayList.class).invoke(null, tracking);
        } catch (Exception e) {
            Log.w(TAG, "Click tracking invoke failed", e);
        }
    }

    private static boolean looksLikeCta(CharSequence text) {
        if (text == null) return false;
        String s = text.toString().trim();
        if (s.isEmpty()) return false;
        String lower = s.toLowerCase(Locale.ROOT);
        return s.contains("바로")
                || s.contains("사이트")
                || s.contains("이동")
                || s.contains("가기")
                || s.contains("보기")
                || s.contains("확인")
                || s.contains("지금")
                || lower.contains("visit")
                || lower.contains("website")
                || lower.contains("learn more")
                || lower.contains("go now")
                || lower.contains("install")
                || lower.contains("download")
                || lower.contains("open")
                || lower.contains("shop")
                || lower.contains("store")
                || s.contains("자세히");
    }

    private static String scanInternalValues(AdItem item) {
        for (String value : collectInternalValues(item).values()) {
            String url = asHttpUrl(value);
            if (url != null) return url;
        }
        return null;
    }

    private static Map<String, String> collectInternalValues(AdItem item) {
        Map<String, String> out = new HashMap<>();
        try {
            Field inner = item.getClass().getDeclaredField("a");
            inner.setAccessible(true);
            Object g1 = inner.get(item);
            if (g1 == null) return out;

            Field mapField = g1.getClass().getDeclaredField("c");
            mapField.setAccessible(true);
            Object mapObj = mapField.get(g1);
            if (!(mapObj instanceof HashMap)) return out;

            HashMap<?, ?> map = (HashMap<?, ?>) mapObj;
            for (Map.Entry<?, ?> e : map.entrySet()) {
                if (e.getKey() != null && e.getValue() != null) {
                    out.put(String.valueOf(e.getKey()), String.valueOf(e.getValue()));
                }
            }
        } catch (Exception e) {
            Log.d(TAG, "collectInternalValues skipped", e);
        }
        return out;
    }

    private static View findViewByClassName(View root, String className) {
        if (className.equals(root.getClass().getName())) return root;
        if (root instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) root;
            for (int i = 0; i < group.getChildCount(); i++) {
                View found = findViewByClassName(group.getChildAt(i), className);
                if (found != null) return found;
            }
        }
        return null;
    }

    private static Object readField(Object target, String name) {
        try {
            Field field = target.getClass().getDeclaredField(name);
            field.setAccessible(true);
            return field.get(target);
        } catch (Exception e) {
            return null;
        }
    }

    private static String readStringField(Object target, String name) {
        Object value = readField(target, name);
        return value instanceof String ? (String) value : null;
    }

    @SuppressWarnings("unchecked")
    private static ArrayList<String> readStringArrayList(Object target, String name) {
        Object value = readField(target, name);
        if (!(value instanceof ArrayList)) return null;
        ArrayList<?> raw = (ArrayList<?>) value;
        ArrayList<String> out = new ArrayList<>();
        for (Object o : raw) {
            if (o instanceof String) out.add((String) o);
        }
        return out.isEmpty() ? null : out;
    }

    private static String asHttpUrl(Object value) {
        if (!(value instanceof String)) return null;
        String s = ((String) value).trim();
        if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("market://")) {
            return s;
        }
        return null;
    }

    private static String shorten(String value) {
        if (value == null) return "";
        return value.length() <= 48 ? value : value.substring(0, 45) + "...";
    }
}
