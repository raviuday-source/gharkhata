# GharKhata

GharKhata is a mobile-first household expense tracker for INR entries. It is built as an installable PWA so it can run in mobile browsers on iOS and Android. It uses Firebase Firestore as the shared household database when configured, and falls back to local phone storage when Firebase is not configured.

## What It Includes

- Sorted starter categories for the provided household expense list.
- Shared storage using Firebase Firestore, with `localStorage` fallback.
- INR amount entry with date, item, category, and a 20-character notes field.
- Monthly total, daily average, top category, category mix chart, monthly pie chart, and six-month trend chart.
- Separate Categories and Analytics & Trends pages linked from the home screen.
- Category/item management for future additions.

## Run

From this folder:

```sh
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

## Firebase Firestore Setup

The app is wired for Firestore, but `firebase-config.js` needs your Firebase web app config before the shared database becomes live.

1. Create or open a Firebase project.
2. Add a Web app and copy its Firebase config into `firebase-config.js`.
3. Create a Firestore database.
4. Enable Authentication > Sign-in method > Anonymous.
5. Set Firestore rules to allow signed-in app users:

```text
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /households/{householdId}/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

The current passcode is a convenience lock in the app UI, not a server-side security boundary. For stronger private-family access later, replace anonymous auth with named user sign-in and rules that only allow your household users.
