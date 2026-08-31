/* ═══════════════════════════════════════════════════════
   FIREBASE KONFIGURACE
   ═══════════════════════════════════════════════════════

   Postup nastavení:
   1. Jděte na https://console.firebase.google.com a vytvořte nový projekt.
   2. V levém menu otevřete "Build → Firestore Database" a klikněte
      "Create database" (stačí produkční režim, region zvolte "eur3"
      nebo nejbližší Evropě).
   3. V Project settings (ozubené kolo vlevo nahoře) → "Your apps"
      klikněte na ikonu </> (Web app), zaregistrujte appku
      (název může být např. "videology-web") a zkopírujte objekt
      firebaseConfig, který se vám zobrazí — vložte ho níže místo
      hodnot "YOUR_...".
   4. Ve Firestore Database → záložka "Rules" vložte pravidla ze
      souboru firestore.rules (v kořeni projektu) a publikujte je.

   Dokud tu zůstanou placeholder hodnoty, rezervační kalendář běží
   v náhledovém režimu (žádné datum se neoznačí jako obsazené a
   odeslání objednávky skončí chybovou hláškou místo zápisu do DB).
   ═══════════════════════════════════════════════════════ */

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// True, dokud jsou v konfiguraci placeholder hodnoty.
export const isFirebaseConfigured = !Object.values(firebaseConfig).some(
  (v) => typeof v === "string" && v.startsWith("YOUR_")
);
