// Adds the "com.erbilgo.app://" deep link to the generated Android project,
// so the app opens again after Google sign-in. Run after `npx cap add android`.
import { readFileSync, writeFileSync } from "node:fs";

const file = "android/app/src/main/AndroidManifest.xml";
let xml = readFileSync(file, "utf8");

if (xml.includes('android:scheme="com.erbilgo.app"')) {
  console.log("Deep link already present.");
} else {
  const filter = `            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="com.erbilgo.app" />
            </intent-filter>
        </activity>`;
  if (!xml.includes("</activity>")) {
    console.error("Could not find </activity> in AndroidManifest.xml");
    process.exit(1);
  }
  xml = xml.replace("</activity>", filter);
  writeFileSync(file, xml);
  console.log("Deep link added to AndroidManifest.xml");
}
