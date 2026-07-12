#!/bin/bash
# Exit on error
set -e

ICON_SRC="src/assets/images/app_icon_1783725985542.jpg"
SPLASH_SRC="src/assets/images/splash_screen_1783725998426.jpg"

echo "🎨 Processing Lumina App Icons..."

# iOS App Icon (1024x1024)
convert "$ICON_SRC" -resize 1024x1024 ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png

# iOS Splash Screen (2732x2732)
convert "$SPLASH_SRC" -resize 2732x2732\! ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png
convert "$SPLASH_SRC" -resize 2732x2732\! ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png
convert "$SPLASH_SRC" -resize 2732x2732\! ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png

# Android Launcher Icons
# Mipmap sizes: hdpi (72), mdpi (48), xhdpi (96), xxhdpi (144), xxxhdpi (192)
echo "🤖 Generating Android Mipmaps..."
convert "$ICON_SRC" -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher.png
convert "$ICON_SRC" -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png
convert "$ICON_SRC" -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png

convert "$ICON_SRC" -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher.png
convert "$ICON_SRC" -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png
convert "$ICON_SRC" -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png

convert "$ICON_SRC" -resize 96x96 android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
convert "$ICON_SRC" -resize 96x96 android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png
convert "$ICON_SRC" -resize 96x96 android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png

convert "$ICON_SRC" -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
convert "$ICON_SRC" -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png
convert "$ICON_SRC" -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png

convert "$ICON_SRC" -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
convert "$ICON_SRC" -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png
convert "$ICON_SRC" -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png

# Android Splash Screen
echo "🤖 Generating Android Splash Screens..."
convert "$SPLASH_SRC" -resize 1080x1920\! android/app/src/main/res/drawable/splash.png
convert "$SPLASH_SRC" -resize 1080x1920\! android/app/src/main/res/drawable-port-hdpi/splash.png
convert "$SPLASH_SRC" -resize 1080x1920\! android/app/src/main/res/drawable-port-mdpi/splash.png
convert "$SPLASH_SRC" -resize 1080x1920\! android/app/src/main/res/drawable-port-xhdpi/splash.png
convert "$SPLASH_SRC" -resize 1080x1920\! android/app/src/main/res/drawable-port-xxhdpi/splash.png
convert "$SPLASH_SRC" -resize 1080x1920\! android/app/src/main/res/drawable-port-xxxhdpi/splash.png

# Landscape Splash Screens
convert "$SPLASH_SRC" -resize 1920x1080\! android/app/src/main/res/drawable-land-hdpi/splash.png
convert "$SPLASH_SRC" -resize 1920x1080\! android/app/src/main/res/drawable-land-mdpi/splash.png
convert "$SPLASH_SRC" -resize 1920x1080\! android/app/src/main/res/drawable-land-xhdpi/splash.png
convert "$SPLASH_SRC" -resize 1920x1080\! android/app/src/main/res/drawable-land-xxhdpi/splash.png
convert "$SPLASH_SRC" -resize 1920x1080\! android/app/src/main/res/drawable-land-xxxhdpi/splash.png

echo "✅ All mobile assets (App Icons & Splash Screens) generated successfully!"
