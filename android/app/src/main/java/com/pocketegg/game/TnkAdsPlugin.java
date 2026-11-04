package com.pocketegg.game;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.util.Log;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.tnkfactory.ad.AdConfiguration;

@CapacitorPlugin(name = "TnkAds")
public class TnkAdsPlugin extends Plugin {

    private static final String TAG = "PocketEgg/TNK";

    private String publisherId = "";
    private boolean initialized = false;

    @Override
    public void load() {
        super.load();
        publisherId = readString(R.string.tnk_pub_id);
        applyPublisherId();
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }
        activity.runOnUiThread(
                () -> {
                    if (!initialized) {
                        boolean debug =
                                (activity.getApplicationInfo().flags
                                                & ApplicationInfo.FLAG_DEBUGGABLE)
                                        != 0;
                        AdConfiguration.enableLogging(debug);
                        initialized = true;
                        Log.i(TAG, "TNK Publisher SDK ready (debugLog=" + debug + ")");
                    }
                    applyPublisherId();
                    call.resolve();
                });
    }

    @PluginMethod
    public void configure(PluginCall call) {
        publisherId = firstNonEmpty(call.getString("publisherId"), publisherId);
        applyPublisherId();
        JSObject data = new JSObject();
        data.put("message", "configured");
        call.resolve(data);
    }

    @PluginMethod
    public void showRewarded(PluginCall call) {
        String placementId = call.getString("placementId");
        if (placementId == null || placementId.isEmpty()) {
            call.reject("placementId is required");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }

        applyPublisherId();
        call.setKeepAlive(true);

        activity.runOnUiThread(
                () -> {
                    if (activity instanceof MainActivity) {
                        ((MainActivity) activity).prepareForTnkAd();
                    }
                    Intent intent = new Intent(activity, TnkAdHostActivity.class);
                    intent.putExtra(TnkAdHostActivity.EXTRA_PLACEMENT_ID, placementId);
                    startActivityForResult(call, intent, "onRewardedFinished");
                });
    }

    @ActivityCallback
    private void onRewardedFinished(PluginCall call, ActivityResult result) {
        Activity activity = getActivity();
        if (activity instanceof MainActivity) {
            ((MainActivity) activity).restoreAfterTnkAd();
        }
        if (call == null) return;

        boolean success = false;
        boolean rewarded = false;
        String reason = "user_closed";
        if (result != null && result.getData() != null) {
            success = result.getData().getBooleanExtra(TnkAdHostActivity.EXTRA_SUCCESS, false);
            rewarded = result.getData().getBooleanExtra(TnkAdHostActivity.EXTRA_REWARDED, false);
            String extraReason = result.getData().getStringExtra(TnkAdHostActivity.EXTRA_REASON);
            if (extraReason != null && !extraReason.isEmpty()) {
                reason = extraReason;
            } else if (rewarded) {
                reason = null;
            }
        }

        resolveRewardedCall(call, success, rewarded, reason);
    }

    private void applyPublisherId() {
        if (publisherId == null || publisherId.isEmpty()) return;
        try {
            AdConfiguration.setPublisherId(getContext(), publisherId);
            AdConfiguration.setCOPPA(getContext(), false);
        } catch (Exception ignored) {
            // Publisher ID is also set via AndroidManifest tnk_pub_id.
        }
    }

    private String readString(int id) {
        try {
            return getContext().getString(id);
        } catch (Exception ignored) {
            return "";
        }
    }

    private static String firstNonEmpty(String value, String fallback) {
        return value != null && !value.isEmpty() ? value : (fallback == null ? "" : fallback);
    }

    private void resolveRewardedCall(
            PluginCall call, boolean success, boolean rewarded, String reason) {
        if (call == null) return;
        JSObject ret = new JSObject();
        ret.put("success", success);
        ret.put("rewarded", rewarded);
        if (reason != null) {
            ret.put("reason", reason);
        }
        call.resolve(ret);
        call.setKeepAlive(false);
    }
}
