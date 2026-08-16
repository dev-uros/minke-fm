# minke-fm release rules.
#
# R8 runs on release builds and removes or renames anything it cannot see being
# called. Much of this app is reached from outside the Kotlin the compiler can
# follow - from JavaScript, from the manifest, or reflectively by Tauri's plugin
# system - so without these the release APK builds fine and then misbehaves at
# runtime, in ways that do not show up as a crash.

# The whole app package is kept rather than picked over class by class. It is a
# few hundred kilobytes of our own code, so there is nothing to win by shrinking
# it, and the failures it causes are quiet: the first attempt kept PlayerPlugin
# but not its companion, and the only symptom was that closing the app left the
# playback service running with the activity gone.
-keep class com.fifthguild.minkefm.** { *; }

# The bridge MainActivity installs on the webview. These methods are only ever
# called from JavaScript, so R8 has no reason to believe they are used - and
# stripping them leaves the splash up forever, since the page can never report
# that it is ready.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Tauri finds plugins by annotation and instantiates them reflectively; their
# command methods are matched by name.
-keep class app.tauri.** { *; }
-keep @app.tauri.annotation.TauriPlugin class * { *; }
-keepclassmembers class * {
    @app.tauri.annotation.Command <methods>;
}

# Media3 picks extractors and decoders reflectively.
-dontwarn androidx.media3.**
-keep class androidx.media3.exoplayer.** { *; }
-keep class androidx.media3.extractor.** { *; }

# Line numbers make a crash report from a phone worth reading.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
