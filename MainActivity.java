package com.temgraph.spyfallonline;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.Insets;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

/**
 * เปลือก WebView ที่เปิดเซิร์ฟเวอร์ Spyfall Online (URL มาจาก BuildConfig.SERVER_URL)
 * - Android 15+ (targetSdk 35+) บังคับ edge-to-edge: เว้นขอบ status bar / navigation bar / คีย์บอร์ดให้เอง
 * - ปุ่ม Back ใช้พฤติกรรมระบบ (เว็บเกมไม่ใช้ history จึงไม่ต้องดักปุ่ม Back)
 */
public class MainActivity extends Activity {
    private static final int BG = Color.rgb(8, 14, 26);

    private FrameLayout root;
    private WebView webView;
    private ProgressBar progress;
    private TextView overlay;
    private String baseUrl;
    private boolean failed;
    private boolean canRetry;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            // Android 14 ลงไป: ระบายสีแถบระบบเอง (Android 15+ เป็น edge-to-edge ไม่ใช้ค่านี้)
            getWindow().setStatusBarColor(BG);
            getWindow().setNavigationBarColor(BG);
        }
        baseUrl = BuildConfig.SERVER_URL.replaceAll("/+$", "");
        buildScreen();
        if (baseUrl.contains("YOUR-SERVER")) {
            failed = true;
            showMessage("แอปพร้อมแล้ว แต่ยังไม่ได้ตั้งค่าเซิร์ฟเวอร์เกมออนไลน์\n\nต้องนำเซิร์ฟเวอร์ Spyfall Online ขึ้นออนไลน์ แล้วสร้างแอปใหม่โดยใส่ URL ของเซิร์ฟเวอร์ก่อนจึงจะเล่นได้", false);
        } else {
            loadGame();
        }
    }

    private void loadGame() {
        failed = false;
        showMessage("กำลังเชื่อมต่อเซิร์ฟเวอร์เกม...\n\n(ครั้งแรกหลังไม่ได้ใช้งานนาน ๆ อาจใช้เวลาประมาณ 1 นาที)", false);
        webView.loadUrl(baseUrl);
    }

    private void buildScreen() {
        root = new FrameLayout(this);
        root.setBackgroundColor(BG);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            // edge-to-edge: เว้นพื้นที่ให้แถบระบบและคีย์บอร์ด ไม่ให้เนื้อหาเว็บไปอยู่ใต้แถบ
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                Insets ime = insets.getInsets(WindowInsets.Type.ime());
                v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
                return WindowInsets.CONSUMED;
            });
        }

        webView = new WebView(this);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setLoadsImagesAutomatically(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) {
                progress.setProgress(value);
                progress.setVisibility(value >= 100 ? View.GONE : View.VISIBLE);
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = Uri.parse(baseUrl).getHost();
                boolean sameSite = "https".equals(uri.getScheme()) && host != null && host.equals(uri.getHost());
                return !sameSite; // เปิดเฉพาะเซิร์ฟเวอร์เกมของเราเอง ลิงก์ภายนอกไม่เปิด
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (!failed) overlay.setVisibility(View.GONE);
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    failed = true;
                    showMessage("เชื่อมต่อเซิร์ฟเวอร์เกมไม่ได้\n\nตรวจสอบอินเทอร์เน็ตหรือสถานะเซิร์ฟเวอร์", true);
                }
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 500) {
                    failed = true;
                    showMessage("เซิร์ฟเวอร์กำลังเริ่มทำงานหรือมีปัญหาชั่วคราว\n\nรอสักครู่แล้วลองอีกครั้ง", true);
                }
            }
        });
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));

        overlay = new TextView(this);
        overlay.setTextColor(Color.WHITE);
        overlay.setTextSize(16);
        overlay.setGravity(Gravity.CENTER);
        overlay.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        overlay.setPadding(32, 32, 32, 32);
        overlay.setBackgroundColor(BG);
        overlay.setOnClickListener(v -> { if (canRetry) loadGame(); });
        root.addView(overlay, new FrameLayout.LayoutParams(-1, -1));

        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        root.addView(progress, new FrameLayout.LayoutParams(-1, 5, Gravity.TOP));

        setContentView(root);
    }

    private void showMessage(String message, boolean retry) {
        canRetry = retry;
        overlay.setText(retry ? message + "\n\nแตะหน้าจอเพื่อลองอีกครั้ง" : message);
        overlay.setVisibility(View.VISIBLE);
    }

    @Override protected void onDestroy() {
        if (webView != null) {
            root.removeView(webView);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
