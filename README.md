# theonebytwo-site

The public website at https://theonebytwo.com, served by GitHub Pages from this repo's `main` branch.

- `index.html`, `privacy.html`, `terms.html`: the pages Google's OAuth consent screen links to.
  Privacy and terms are **drafts** until counsel replaces them.
- `oauth/google/`: where Google sends people after they approve YouTube or Gmail. The app catches
  this link (App Link / Universal Link); the page only shows if the app did not open. It must never
  load anything from another site, because the address holds a one-time code.
- `.well-known/assetlinks.json` (Android) and `.well-known/apple-app-site-association` (iOS): tell
  the phone that this domain belongs to the app. Fill in the `__PLACEHOLDERS__` from the Flutter
  app's package name, signing-key fingerprints, Apple Team ID and bundle ID.
- `.nojekyll`: without it GitHub Pages silently skips the `.well-known` folder.
- `CNAME`: the custom domain.

Placeholders still to fill: the Apple Team ID and bundle id in `apple-app-site-association`. `assetlinks.json` holds the debug key of the build PC; add the release (Play App Signing) fingerprint when there is one. Contact address on every page: pritika@theonebytwo.com.
