# MONAPp artwork

`monap-sleeping-ghost.png` is the bundled home illustration, app icon, and web favicon. It uses an original sleeping sheet-ghost character with the exact lettering **MONAP**. The app display name is **MONAPp** (Mon + Nap + App).

Created with the built-in imagegen tool. The Gengar attempts were rejected by the image service; this distinct original mascot is the alternative used after the user asked to continue. The image was copied into this project without image edits, and the original generation was retained.

## Final generation prompt

Use case: stylized-concept. Asset type: square branded illustration for a personal mobile app. An original sleeping purple ghost mascot, a small soft round lilac sheet ghost with a flowing scalloped lower edge, tiny closed curved eyes and a peaceful tiny smile, curled on a lavender cushion. The design is its own character: no ears, no spikes, no limbs, no teeth. Cozy polished 2D illustration, plush rounded shapes and gentle moonlit shading. Deep aubergine and violet dreamy background with a few tiny stars and one crescent moon. Above and behind the ghost, clearly render the exact word "MONAP" in large chunky rounded lavender letters. Keep every letter fully legible and unobscured. All important content within central 70% of the square canvas with generous edge margins, suitable for a mobile app icon and home illustration. Purple and lilac palette, calm welcoming atmosphere. Full-bleed opaque background, no border, no mockup, no other text, no watermark.

## Tab bar indicator

`tab-indicator.png` (with `@2x` and `@3x`) is the fluffy spirit that marks the current tab: a white alpha mask of the body, ear, tail and glow, tinted at runtime with the `indicator` colour token. It is drawn by `scripts/tab-indicator.mjs` (`node scripts/tab-indicator.mjs`). If the shape changes, copy the printed bounds into `INDICATOR_ART` in `src/components/navigation/liquidTabGeometry.ts`.

## Calendar artwork

`calendar-spirit-shade` / `calendar-spirit-light` (the same spirit peeking from clouds, top-right of Calendar) and `agenda-ghost-body` / `agenda-ghost-face` (the small ghost beside the agenda heading) are white masks drawn by `scripts/calendar-art.mjs`. Each pair is stacked and tinted with the `artShade`, `artLight` and `onIndicator` tokens, so they follow light and dark mode. The character is original; it is not based on any existing franchise character. Both scripts share `scripts/lib/` (`spirit.mjs` for the character outline, `raster.mjs` for drawing and PNG output); pass `--preview <dir>` to render tinted previews.

## Updating an existing installation

Build and install a new preview APK for launcher name/icon changes. Keep the current package, signing key, storage key, and EAS project. Version 0.2.1 uses the existing app-version runtime policy, so its updates are separate from version 0.2.0.
