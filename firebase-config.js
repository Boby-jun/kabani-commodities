/* Firebase settings for the supply & demand admin.
   Fill these in from: Firebase console > Project settings > General > Your apps > Web app.
   They are public identifiers, not passwords: the Firestore rules (firestore.rules) are what
   keep everyone except the owner from changing anything. Leave projectId empty and the site
   simply shows the listings in market.json. */
window.KABANI_FIREBASE = {
  apiKey: "AIzaSyDJ-dj9g0jEN6DWqnIZPK6vc9My6ZC3Tik",
  authDomain: "kabani-commodities.firebaseapp.com",
  projectId: "kabani-commodities",
  appId: "1:620220294784:web:184618f011f3df05886865",
  ownerEmail: "rb@kabaniconsulting.com"
};
