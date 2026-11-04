package com.pocketegg.game;

import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.tnkfactory.ad.AdConfiguration;
import com.tnkfactory.ad.AdError;
import com.tnkfactory.ad.AdItem;
import com.tnkfactory.ad.AdListener;
import com.tnkfactory.ad.RewardVideoAdItem;
import com.tnkfactory.ad.RewardVideoAdListener;

/** Capacitor WebView가 없는 화면에서 TNK 보상형 광고를 띄운다. */
public class TnkAdHostActivity extends AppCompatActivity {

    public static final String EXTRA_PLACEMENT_ID = "tnk_placement_id";
    public static final String EXTRA_SUCCESS = "tnk_success";
    public static final String EXTRA_REWARDED = "tnk_rewarded";
    public static final String EXTRA_REASON = "tnk_reason";

    private static final String TAG = "PocketEgg/TNK";
    private static final long LOAD_TIMEOUT_MS = 45_000;

    private RewardVideoAdItem adItem;
    private AdItem activeItem;
    private boolean settled = false;
    private boolean adShown = false;
    private boolean rewarded = false;
    private String placementId;
    private long lastCtaLandingMs = 0L;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable loadTimeoutRunnable =
            () -> {
                if (!settled && !adShown) {
                    Log.w(TAG, "Host load/show timeout placement=" + placementId);
                    TnkAdDiagnostics.record(TnkAdHostActivity.this, "timeout:" + placementId);
                    finishWithResult(false, false, "error");
                }
            };

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        WindowInsetsControllerCompat insets =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        insets.show(WindowInsetsCompat.Type.systemBars());

        setContentView(R.layout.activity_tnk_rewarded);

        placementId = getIntent().getStringExtra(EXTRA_PLACEMENT_ID);
        if (placementId == null || placementId.isEmpty()) {
            finishWithResult(false, false, "error");
            return;
        }

        boolean debug = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        AdConfiguration.enableLogging(debug);
        AdConfiguration.setCOPPA(this, false);

        FrameLayout host = findViewById(R.id.tnk_ad_host_root);
        host.setVisibility(View.VISIBLE);
        host.setClickable(false);
        host.setFocusable(false);

        TnkAdDiagnostics.record(this, "hostOnCreate:" + placementId);
        handler.postDelayed(loadTimeoutRunnable, LOAD_TIMEOUT_MS);

        adItem = new RewardVideoAdItem(this, placementId);
        adItem.setListener(
                new RewardVideoAdListener() {
                    @Override
                    public void onLoad(AdItem item) {
                        Log.d(TAG, "Host onLoad placement=" + placementId);
                        if (!isFinishing() && !isDestroyed()) {
                            item.show(TnkAdHostActivity.this);
                        }
                    }

                    @Override
                    public void onShow(AdItem item) {
                        adShown = true;
                        activeItem = item;
                        handler.removeCallbacks(loadTimeoutRunnable);
                        Log.d(TAG, "Host onShow placement=" + placementId);
                        TnkAdDiagnostics.record(
                                TnkAdHostActivity.this, "onShow:" + placementId);
                        TnkLandingHelper.logAdItemValues(item);
                        TnkLandingHelper.scheduleCtaPatch(TnkAdHostActivity.this, item, handler);
                    }

                    @Override
                    public void onClick(AdItem item) {
                        Log.i(TAG, "Host onClick placement=" + placementId);
                        TnkAdDiagnostics.record(TnkAdHostActivity.this, "onClick:" + placementId);
                        TnkLandingHelper.logAdItemValues(item);
                        TnkLandingHelper.assistLanding(TnkAdHostActivity.this, item);
                    }

                    @Override
                    public void onVideoCompletion(AdItem item, int verifyCode) {
                        super.onVideoCompletion(item, verifyCode);
                        Log.d(TAG, "Host onVideoCompletion code=" + verifyCode);
                        if (verifyCode >= AdListener.VIDEO_VERIFY_SUCCESS_SELF) {
                            rewarded = true;
                        }
                    }

                    @Override
                    public void onClose(AdItem item, int type) {
                        Log.d(TAG, "Host onClose type=" + type);
                        finishWithResult(true, rewarded, rewarded ? null : "user_closed");
                    }

                    @Override
                    public void onError(AdItem item, AdError error) {
                        String message = error != null ? error.getMessage() : "error";
                        Log.w(TAG, "Host onError " + message);
                        finishWithResult(false, false, "error");
                    }

                    @Override
                    public void onShowFail(AdItem item, AdError error) {
                        String message = error != null ? error.getMessage() : "show fail";
                        Log.w(TAG, "Host onShowFail " + message);
                        finishWithResult(false, false, "error");
                    }
                });
        adItem.load();
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent ev) {
        if (adShown && !settled && ev.getAction() == MotionEvent.ACTION_UP) {
            long now = SystemClock.uptimeMillis();
            if (now - lastCtaLandingMs > 700
                    && TnkLandingHelper.handleCtaTouch(
                            this, activeItem != null ? activeItem : adItem, ev)) {
                lastCtaLandingMs = now;
            }
        }
        return super.dispatchTouchEvent(ev);
    }

    private void finishWithResult(boolean success, boolean rewarded, @Nullable String reason) {
        if (settled) return;
        settled = true;
        handler.removeCallbacks(loadTimeoutRunnable);
        if (adItem != null) {
            try {
                adItem.close();
            } catch (Exception ignored) {
                /* ignore */
            }
            adItem = null;
        }
        activeItem = null;
        Intent data = new Intent();
        data.putExtra(EXTRA_SUCCESS, success);
        data.putExtra(EXTRA_REWARDED, rewarded);
        if (reason != null) {
            data.putExtra(EXTRA_REASON, reason);
        }
        setResult(RESULT_OK, data);
        finish();
    }

    @Override
    @Deprecated
    public void onBackPressed() {
        finishWithResult(true, rewarded, rewarded ? null : "user_closed");
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacks(loadTimeoutRunnable);
        adItem = null;
        activeItem = null;
        super.onDestroy();
    }
}
