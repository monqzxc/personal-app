# Profile photo and Quick Expense return fix

MONAPp 0.2.4 adds a personal profile photo and changes the Quick Expense return flow. Build and install a new APK for this version: the photo picker and resizer need native support. Do not publish this code to the 0.2.3 runtime. The app identifier, EAS project, local database key, and schema 6 stay the same.

## Profile photo

Open Settings, or tap your initial on Home. Choose **Choose photo**, select a picture, and crop it on your phone. The preview changes before saving. Tap **Save preferences** to keep it; Cancel leaves the saved photo unchanged. **Change photo** replaces it and **Remove photo** restores your initial after saving.

The app makes a 256-pixel square JPEG for the avatar. It stores that small image with your preferences on the device, includes it in JSON backups, and shows it on Home. No photo is uploaded by MONAPp. Existing backups without a photo still import normally. Unreadable images fall back to your initial. Photos are limited to 128 KB of encoded text, and adding one cannot push the saved database beyond its existing 1.5 MB restore limit.

The [Expo image picker](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/) supplies the native selection/crop screen; [Expo ImageManipulator](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator/) resizes and converts the image before storage. Only photo selection is offered; camera and microphone permissions are disabled for this feature.

## Quick Expense

The reported expense was saved successfully before the screen became black. Quick Add and Quick Expense now use ordinary stack pages, avoiding the modal replacement/dismissal flow. Saving closes the keyboard first, then returns to Home with an **Expense saved.** toast. Cancel returns to the existing caller, or opens Finance if there is no previous page. Save & add another keeps the form open. A failed save stays on the form with its error and entered values.

The native black-screen symptom has not been reproduced on a physical device here. These changes address the return path; the device checks below are still required.

## Rebuild and check

Strict TypeScript and all 97 automated tests pass, including save-return navigation, profile persistence/backup round trips, invalid photo rejection, storage failures, and crop dimensions. Android, iOS, and web JavaScript/assets exports also pass, and the Expo native configuration resolves to runtime 0.2.4 with the existing app identifiers. Exports are not signed APK/IPA builds or device tests.

Export a JSON backup first. In PowerShell:

```powershell
cd E:\personal-app
npx.cmd eas-cli@latest build --platform android --profile preview
```

Install the resulting APK over the existing app with the same signing key; do not uninstall. This release has not been built or published here.

On your phone:

1. Save Quick Expense from Home, the Quick Add button, Finance, and a Collection. Confirm Home appears immediately with the **Expense saved.** toast and the expense appears exactly once.
2. Try Save & add another, Cancel, and an invalid amount with the keyboard open.
3. Choose a photo, cancel selection, replace it, and remove it. Save each intended change, restart the app, and check Home.
4. Export and restore JSON with a photo, then check it still displays. Also check permission denial and light/dark themes.
