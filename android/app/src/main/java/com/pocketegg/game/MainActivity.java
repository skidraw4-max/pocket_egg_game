package com.pocketegg.game;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.google.android.gms.ads.MobileAds;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Google Mobile Ads SDK 초기화
        MobileAds.initialize(this, initializationStatus -> {
            // @capacitor-community/admob 플러그인이 자동으로 광고 요청 처리
        });
    }
}
