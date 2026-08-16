package com.fifthguild.minkefm

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.OnBackPressedCallback
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat

/**
 * The Android shell around the webview.
 *
 * Everything here is a thing the web layer cannot see for itself: how tall the
 * system bars really are, when the keyboard opens, and when the hardware back
 * button is pressed. Each is pushed into the page, so the Vue side stays plain
 * web code and the desktop build is untouched.
 */
class MainActivity : TauriActivity() {

    private var webView: WebView? = null

    /** Lets the splash sit until the page has actually painted something. */
    @Volatile
    private var webViewReady = false

    override fun onCreate(savedInstanceState: Bundle?) {
        val splash = installSplashScreen()

        // Hold the splash until the page reports itself ready, but never past a
        // deadline: a splash that waits forever on a broken frontend would look
        // exactly like a hung app.
        val deadline = SystemClock.uptimeMillis() + SPLASH_LIMIT_MS
        splash.setKeepOnScreenCondition {
            !webViewReady && SystemClock.uptimeMillis() < deadline
        }

        // That condition is only asked again on a draw pass, and a webview
        // sitting behind the splash may stop producing them - which is how a
        // page that never reported in left the splash up permanently. Forcing
        // a draw makes the deadline mean something.
        Handler(Looper.getMainLooper()).postDelayed({
            webViewReady = true
            window.decorView.invalidate()
        }, SPLASH_LIMIT_MS)

        // Cross-fade rather than cut. The page underneath is already painted and
        // shares this exact background, so all that actually moves is the icon
        // dissolving into the interface - no gap, no flash of bare window.
        splash.setOnExitAnimationListener { screen ->
            var removed = false
            val finish = Runnable {
                if (!removed) {
                    removed = true
                    screen.remove()
                }
            }

            screen.view.animate()
                .alpha(0f)
                .setDuration(SPLASH_FADE_MS)
                .withEndAction(finish)
                .start()

            // Taking this listener means taking responsibility for removing the
            // splash: if the animator never completes - animations disabled, the
            // view detached - it would sit on screen forever.
            screen.view.postDelayed(finish, SPLASH_FADE_MS + 250)
        }

        // Transparent both ends, so the app's own background runs the full
        // height of the screen instead of leaving a black or white band above
        // the clock and below the gesture bar.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT)
        )
        super.onCreate(savedInstanceState)

        // The app is dark, so the clock and battery icons have to stay light.
        WindowCompat.getInsetsController(window, window.decorView)
            .isAppearanceLightStatusBars = false
    }

    override fun onWebViewCreate(webView: WebView) {
        this.webView = webView
        // A webview paints white until the page's own background arrives. That
        // white was the flash between the splash and the app.
        webView.setBackgroundColor(BACKGROUND)
        webView.addJavascriptInterface(Shell(), "MinkeShell")

        /*
         * Insets are measured here rather than read from CSS. On Android
         * `env(safe-area-inset-top)` reports the *display cutout*, not the
         * height of the status bar, so a CSS-only layout leaves content sitting
         * under the clock on every phone without a notch. The union of the
         * system bars and the cutout is the honest number.
         */
        ViewCompat.setOnApplyWindowInsetsListener(window.decorView) { _, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            // The keyboard is a separate inset. Without it a search field just
            // sits behind the keyboard with no way to see what was typed.
            val keyboard = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom

            val density = resources.displayMetrics.density
            fun css(px: Int) = (px / density).toInt()

            send(
                buildString {
                    append("(function(){")
                    // Insets can arrive before the document exists, and
                    // `document.documentElement.style` then throws.
                    append("var e=document.documentElement; if(!e) return; var s=e.style;")
                    append("s.setProperty('--safe-top','${css(bars.top)}px');")
                    append("s.setProperty('--safe-bottom','${css(bars.bottom)}px');")
                    append("s.setProperty('--safe-left','${css(bars.left)}px');")
                    append("s.setProperty('--safe-right','${css(bars.right)}px');")
                    append("s.setProperty('--keyboard','${css(keyboard)}px');")
                    append("})()")
                }
            )
            // Returned unconsumed: other views still need to see them.
            insets
        }

        /*
         * Back never leaves on its own. The page decides whether there is a
         * modal to close first, and the app exits only through an explicit
         * confirmation - `TauriActivity` sets `handleBackNavigation` to false,
         * so nothing else is competing for the press.
         */
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                send("window.dispatchEvent(new Event('android:back'))")
            }
        })
    }

    private fun send(script: String) {
        val target = webView ?: return
        target.post { target.evaluateJavascript(script, null) }
    }

    /** The page's way back into the shell. Reached as `window.MinkeShell`. */
    private inner class Shell {

        /**
         * Called once the layout has actually painted, not merely mounted -
         * lifting the splash a frame early is exactly what shows as a stutter.
         *
         * Also re-requests the insets: any applied before the page loaded were
         * evaluated into nothing.
         */
        @JavascriptInterface
        fun ready() {
            webViewReady = true
            window.decorView.post { ViewCompat.requestApplyInsets(window.decorView) }
        }

        /**
         * The confirmation dialog's only job.
         *
         * The service is stopped as well as the activity: it is a foreground
         * service, so finishing the activity alone leaves it playing with
         * nothing on screen to stop it. The page releases the player first;
         * this is what takes the service down with it.
         */
        @JavascriptInterface
        fun exit() {
            runOnUiThread {
                PlayerPlugin.releaseController?.invoke()
                PlaybackService.shutdown()
                stopService(Intent(this@MainActivity, PlaybackService::class.java))
                finishAndRemoveTask()
            }
        }
    }

    private companion object {
        /**
         * Only a fallback for a frontend that never reports ready - the page
         * normally lifts the splash itself. Measured: a warm start is ready at
         * ~2.6s, but the first launch after install runs past 3s, and cutting
         * the splash early there is exactly what shows as a bare dark screen.
         */
        const val SPLASH_LIMIT_MS = 6_000L
        const val SPLASH_FADE_MS = 260L

        /** Matches @color/minke_background and the app's own background. */
        const val BACKGROUND = 0xFF1A1A1A.toInt()
    }
}
