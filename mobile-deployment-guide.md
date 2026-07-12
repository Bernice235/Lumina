# 🌸 Lumina: Mobile Deployment & App Store Submission Guide

Lumina is configured for native deployment on **Android** and **iOS** using **Capacitor**. This guide details how to generate test builds, set up secure signing keys, and submit Lumina to the **Google Play Store** and the **Apple App Store**.

---

## 📱 Mobile Architecture Checklist Completed

All native files have been successfully initialized and custom-tailored for Lumina:
1. **Capacitor Core**: Setup configured with unique identifiers inside `capacitor.config.ts`.
2. **Platform Directories**: Native `/android` and `/ios` workspaces fully generated.
3. **Application Identifiers**:
   - **Android Package**: `com.lumina.app`
   - **iOS Bundle ID**: `com.lumina.app`
4. **App Icons & Splash Screens**: High-resolution branding assets generated, resized, and deployed to all native resource slots (mimaps, drawables, assets folders).
5. **Push Notifications**: Permissions declared (`POST_NOTIFICATIONS`, `WAKE_LOCK`, `ACCESS_NETWORK_STATE`) inside `AndroidManifest.xml` and standard iOS capability prepared.
6. **Deep Linking**: Intent filters and URL schemes (`lumina://` and `https://lumina.app`) fully configured inside Android and iOS metadata.
7. **Secure Storage**: Developed an AES-GCM encrypted persistent adapter inside `/services/secureStorage.ts` for secure device-bound credential storage.

---

## 🤖 1. Android Release Build (.AAB) & Google Play Submission

To compile, sign, and build the Android App Bundle (`.AAB`) for Play Store submission:

### Step A: Generate a Private Signing Keystore
Run the following command in your local terminal to generate a secure release keystore:
```bash
keytool -genkey -v -keystore lumina-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias lumina-alias
```
*Keep this `lumina-release-key.jks` file secure and backed up; you will need it for all future updates.*

### Step B: Compile Web Assets and Sync
```bash
npm run build
npm run cap:sync
```

### Step C: Configure Signing in Gradle
Create/edit `android/local.properties` or update `android/app/build.gradle` to define your release signing config:
```groovy
android {
    ...
    signingConfigs {
        release {
            storeFile file("../../lumina-release-key.jks")
            storePassword "your-keystore-password"
            keyAlias "lumina-alias"
            keyPassword "your-key-password"
        }
    }
    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }
}
```

### Step D: Build the Android App Bundle (.AAB)
Compile the production bundle using the Gradle wrapper inside the `/android` directory:
```bash
cd android
./gradlew bundleRelease
```
Your compiled upload-ready file will be generated at:
`android/app/build/outputs/bundle/release/app-release.aab`

### Step E: Submit to Google Play Console
1. Log into your **Google Play Console**.
2. Create an application and navigate to **Production** or **Testing**.
3. Upload the `app-release.aab` file.
4. Complete the App Store Questionnaire (Content Rating, Privacy Policy, target age group).
5. Publish to **Closed Testing** or **Production**.

---

## 🍏 2. iOS Release Build (.IPA) & Apple App Store Submission

Building for iOS requires a macOS environment with **Xcode** and a valid **Apple Developer Account**.

### Step A: Install CocoaPods & Sync iOS Project
In your local workspace:
```bash
npm run build
npm run cap:sync
```
Ensure dependencies are installed:
```bash
cd ios/App && pod install && cd ../..
```

### Step B: Open Project in Xcode
```bash
npm run cap:open:ios
```
This opens Xcode targeting `/ios/App`.

### Step C: Configure Signing & Capabilities
1. In the left navigation, select **App**.
2. Go to the **Signing & Capabilities** tab.
3. Check **"Automatically manage signing"**.
4. Select your **Development Team**.
5. To enable push notifications:
   - Click **`+ Capability`** at the top left of the tab.
   - Choose **Push Notifications**.
   - Choose **Background Modes** and check **Remote notifications**.

### Step D: Archive the iOS Build
1. In Xcode, select **Product** -> **Scheme** -> **App**.
2. Select **Any iOS Device (arm64)** as the target.
3. Choose **Product** -> **Archive**.
4. Once the archiving is complete, the **Organizer** window will open.

### Step E: Export and Upload to App Store Connect
1. Click **Distribute App** in the Organizer.
2. Select **App Store Connect** -> **Upload**.
3. Follow the prompts to sign your build with your App Store Distribution certificate.
4. Once uploaded, log into **App Store Connect**.
5. Set up your app description, privacy policy link, and upload screenshots.
6. Select your uploaded build and submit for **TestFlight Beta Testing** or **App Store Review**.

---

## 🔒 3. Secure Storage Configuration details
Lumina includes native AES-GCM encrypted persistence in `services/secureStorage.ts`:
- **Web/Preview**: Gracefully falls back to localized storage.
- **Native Android/iOS (WebView)**: Uses device hardware-accelerated AES-GCM 256-bit encryption before writing files to local secure sandbox storage. This fully guarantees that user authentication tokens, cycle calendars, and medical statistics are encrypted in the application container, preventing reading even if the physical phone storage is extracted or backed up.

---

## 🔗 4. Deep Linking Configuration details
- **Android**: Handled by custom intent filters inside `AndroidManifest.xml` targeting:
  - Custom Scheme: `lumina://`
  - Universal Link: `https://lumina.app` and `https://lumina-sanctuary.web.app`
- **iOS**: Standard URL schemes registered inside `Info.plist`. To enable universal domain links, add the **Associated Domains** capability in Xcode with:
  - `applinks:lumina.app`

---

## 🧪 5. Rapid Mobile Testing
To test the mobile interface on emulators or physical devices locally:
- For Android Emulator: `npx cap run android`
- For iOS Simulator: `npx cap run ios`
- Live reload development mode:
  ```bash
  npx cap run android --live-reload --external
  ```
