# Setting up the supply & demand admin (about 10 minutes)

The public site is static, so the login and the listings live in a free Google Firebase project.
Only rb@kabaniconsulting.com can change listings; everyone else can only read them.

1. Go to https://console.firebase.google.com and sign in with your Kabani Google account.
2. **Add project**, name it "kabani-commodities". You can switch Google Analytics off.
3. **Build > Authentication > Get started > Sign-in method > Google > Enable**, choose a support email (rb@kabaniconsulting.com), Save.
4. **Build > Firestore Database > Create database**. Pick a location in Europe (for example `eur3` or `europe-west6` Zurich). Start in **production mode**.
5. In Firestore open the **Rules** tab, replace everything with the contents of `firestore.rules` (in this folder), and **Publish**.
6. **Project settings (gear) > General > Your apps > Web (</>)**, register an app called "website". Firebase shows a config block.
   Copy `apiKey`, `authDomain`, `projectId` and `appId` into `firebase-config.js`.
7. **Authentication > Settings > Authorized domains**: add the domain the site will live on (for example `kabaniconsulting.com` and your `github.io` address). `localhost` is already allowed for testing.
8. Rebuild with `python3 -I build.py`, open `admin.html`, click **Sign in with Google**.
   The first time, click **Import current listings** to load the supply list from the map, then add or remove offers.

Privacy: the Commodities page asks Google's Firestore servers for the listings, so visitors' IP addresses reach Google.
Mention this in the privacy notice. Firebase Authentication data is only used when you sign in.
