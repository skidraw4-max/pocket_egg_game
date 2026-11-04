package com.pocketegg.game;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;

import androidx.annotation.Nullable;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private boolean webViewDetachedForAd;
    @Nullable
    private ViewGroup webViewParent;
    private int webViewIndex = -1;
    @Nullable
    private ViewGroup.LayoutParams webViewLayoutParams;
    @Nullable
    private WebView detachedWebView;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TnkAdsPlugin.class);
        lockPortraitOrientation();
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        hideNavigationBar();
    }

    @Override
    public void onResume() {
        super.onResume();
        lockPortraitOrientation();
        if (!webViewDetachedForAd) {
            hideNavigationBar();
            attachSafeAreaInsets();
        }
    }

    public void prepareForTnkAd() {
        if (webViewDetachedForAd) return;
        webViewDetachedForAd = true;
        detachCapacitorWebView();
        TnkAdDiagnostics.record(this, "mainPrepareAd");
    }

    public void restoreAfterTnkAd() {
        reattachCapacitorWebView();
        webViewDetachedForAd = false;
        TnkAdDiagnostics.record(this, "mainRestoreAd");
    }

    private void detachCapacitorWebView() {
        if (bridge == null) return;
        WebView webView = bridge.getWebView();
        if (webView == null) return;

        webView.onPause();
        webView.clearFocus();

        if (webView.getParent() instanceof ViewGroup) {
            webViewParent = (ViewGroup) webView.getParent();
            webViewIndex = webViewParent.indexOfChild(webView);
            webViewLayoutParams = webView.getLayoutParams();
            webViewParent.removeView(webView);
            detachedWebView = webView;
        }
        getWindow().getDecorView().requestFocus();
    }

    private void reattachCapacitorWebView() {
        if (detachedWebView == null || webViewParent == null) {
            detachedWebView = null;
            webViewParent = null;
            return;
        }

        if (detachedWebView.getParent() == null) {
            if (webViewIndex >= 0 && webViewIndex <= webViewParent.getChildCount()) {
                webViewParent.addView(detachedWebView, webViewIndex, webViewLayoutParams);
            } else {
                webViewParent.addView(detachedWebView, webViewLayoutParams);
            }
        }
        webViewParent.setVisibility(View.VISIBLE);
        detachedWebView.setVisibility(View.VISIBLE);
        detachedWebView.onResume();

        detachedWebView = null;
        webViewParent = null;
        webViewIndex = -1;
        webViewLayoutParams = null;

        attachSafeAreaInsets();
        hideNavigationBar();
    }

    private void hideNavigationBar() {
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.navigationBars());
        controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }

    private void attachSafeAreaInsets() {
        if (bridge == null) return;
        WebView webView = bridge.getWebView();
        if (webView == null) return;

        ViewCompat.setOnApplyWindowInsetsListener(
                webView,
                (v, windowInsets) -> {
                    Insets status = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars());
                    Insets nav = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars());
                    float density = getResources().getDisplayMetrics().density;
                    int topCss = Math.round(status.top / density);
                    int bottomCss = Math.round(nav.bottom / density);
                    String js =
                            String.format(
                                    "document.documentElement.style.setProperty('--safe-top','%dpx');"
                                            + "document.documentElement.style.setProperty('--safe-bottom','%dpx');",
                                    topCss,
                                    bottomCss);
                    webView.post(() -> webView.evaluateJavascript(js, null));
                    return windowInsets;
                });
        ViewCompat.requestApplyInsets(webView);
    }

    private void lockPortraitOrientation() {
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT);
    }
}
