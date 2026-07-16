# Firebase Delete User Data extension

Install the [Delete User Data](https://extensions.dev/extensions/firebase/delete-user-data) extension on the Vislet Firebase project so Firestore and Storage objects are removed when `deleteUser()` runs.

## Install

1. Open [Firebase Console](https://console.firebase.google.com/) → your Vislet project → **Extensions**.
2. Install **Delete User Data** (`firebase/delete-user-data`).
3. Configure paths (adjust if your schema changes):

| Resource | Path pattern |
|----------|----------------|
| Cloud Firestore | `users/{UID}` |
| Cloud Firestore | `users/{UID}/notifications/{document}` |
| Cloud Firestore | `applications` where `userId == {UID}` (use collection group or extension auto-discovery if supported) |
| Cloud Storage | `users/{UID}` |

4. Deploy extension rules/functions when prompted.

## Vislet-specific notes

- **R2 is not covered** by this extension. Account deletion still calls [`functions/api/account/r2-wipe.ts`](../functions/api/account/r2-wipe.ts) to delete `users/{uid}/` and applicant ciphertext owned by the user.
- **Local metadata** (applications list, notifications, encrypted payload envelopes in localStorage) is cleared in [`accountService.ts`](../src/services/accountService.ts) and [`platformStorage.ts`](../src/services/platformStorage.ts).
- After extension install, `deleteUser()` in Firebase Auth triggers the extension’s cleanup automatically; no client-side Firestore delete loop is required for covered paths.

## Verify

1. Create a test user, submit a visa application, delete the account from Profile.
2. Confirm Auth user is gone, Firestore user docs removed, R2 prefix wiped, and Welcome shows `?accountDeleted=1`.
