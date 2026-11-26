# ProGuard / R8 keep rules for Lumina Capacitor Android release builds
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,SourceFile,LineNumberTable
-keep class com.getcapacitor.** { *; }
-keep class com.aparajita.capacitor.biometricauth.** { *; }
-keep class com.revenuecat.purchases.** { *; }
-dontwarn com.google.errorprone.annotations.**
