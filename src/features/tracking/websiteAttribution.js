/* Site-wide attribution & routing script reference. Mirrors v2.0 of
   webflow-attribution-and-routing-promo-code.html; keep the two in step when
   the script changes. Written for teammates, not for the person maintaining
   the script: plain language first, exact values where they matter. */
export const WEBSITE_ATTRIBUTION = {
  slug: "website-attribution",
  title: "Site-wide attribution & routing",
  summary: "How a person who taps an ad ends up in the app, the web app, or the store with the campaign and promo code still attached.",

  intro: [
    "Every page of eonrides.com loads one script from Webflow's footer code. The script does not decide which device the visitor is on; AppsFlyer OneLink does that on its servers. The script's job is to build the right link for every button and to keep the campaign details with the visitor from page to page.",
    "Version 2.0 added promo codes. It is verified on staging-eonrides.webflow.io and waiting to be published to production. The file is webflow-attribution-and-routing-promo-code.html, pasted into Webflow under Project Settings, Custom Code, Footer Code.",
  ],
  jobs: [
    "Reads the campaign details off the URL, in either the utm_ form ads use or the af_ form AppsFlyer sends back.",
    "Remembers the first campaign that brought the person here for 30 days, and the latest promo code they used.",
    "Points every tagged button at the right OneLink.",
    "Adds the campaign, click IDs, Mixpanel ID, promo code, and in-app route to that link just before it is tapped.",
    "Adds the same details to every link that stays on eonrides.com, so nothing is lost on the next page or on app.eonrides.com.",
  ],

  /* Campaign link */
  urlIntro: "A campaign link is a normal page URL with the usual UTM parameters and, optionally, a promo code. Ad networks add their own click ID (fbclid, gclid) on top.",
  landingUrl: `https://www.eonrides.com/<page>
  ?utm_source=<channel>
  &utm_medium=<paid | cpc | email>
  &utm_campaign=<ad set>
  &utm_content=<ad or creative>
  &utm_term=<keyword>          // optional
  &code=<PROMO>                // optional`,
  landingExample: "https://www.eonrides.com/electric-car-subscription?code=EON99&utm_source=meta&utm_medium=paid&utm_campaign=subs_sept&utm_content=video_a",
  urlParams: [
    { name: "utm_source", meaning: "The channel: meta, google, and so on", kept: "Kept 30 days from the first visit" },
    { name: "utm_medium", meaning: "paid, cpc, email", kept: "Kept 30 days from the first visit" },
    { name: "utm_campaign", meaning: "The ad set", kept: "Kept 30 days from the first visit" },
    { name: "utm_content", meaning: "The ad or creative", kept: "Kept 30 days from the first visit" },
    { name: "utm_term", meaning: "The keyword", kept: "Kept 30 days from the first visit" },
    { name: "fbclid, gclid", meaning: "Click IDs the ad network adds by itself", kept: "Kept 30 days from the first visit" },
    { name: "code", meaning: "Promo code", kept: "Kept, but a newer code replaces it" },
    { name: "c", meaning: "Overrides the page tag sent to AppsFlyer", kept: "Not kept; read from the URL each time" },
    { name: "mp_id", meaning: "Mixpanel ID handed over from a previous page", kept: "Not kept; read from the URL each time" },
  ],
  urlNote: "Every one of these is passed along to the next internal page and to the OneLink buttons.",

  /* Memory */
  memoryIntro: [
    "On the first visit that carries any campaign detail (a UTM, a click ID, a promo code, or a c tag) the script saves a snapshot in the browser's localStorage under the key eon_attr. It keeps it for 30 days, then forgets it and starts again on the next tagged visit.",
    "The UTMs and click IDs are first touch: the ad that originally brought the person here stays on record even if they come back through a different ad. The promo code is the opposite; whenever a link carries a new code, it replaces the old one, so the person always gets the offer they clicked most recently.",
  ],
  snapshot: `{
  "ts": 1757000000000,                  // when it was saved
  "c": "electric-car-subscription",     // page of the first visit, for reference only
  "utm_source": "meta",                 // first touch, kept 30 days
  "utm_medium": "paid",
  "utm_campaign": "subs_sept",
  "utm_content": "video_a",
  "code": "EON99",                      // last touch, replaced by a newer ?code=
  "click_ids": { "fbclid": "IwAR…" }    // first touch, kept 30 days
}`,
  precedenceIntro: "When the script builds a link it picks each value in this order.",
  precedence: [
    { value: "Campaign (utm_)", order: "The saved snapshot, then the current URL" },
    { value: "Click IDs", order: "The saved snapshot, then the current URL" },
    { value: "Promo code", order: "The current URL, then the saved snapshot" },
    { value: "Page tag (c)", order: "A ?c= on the URL, otherwise the current page's slug (home for the homepage). Never the snapshot" },
    { value: "Mixpanel ID", order: "The Mixpanel SDK on the page, then the mp_ cookie, then mp_id or af_sub4 on the URL" },
  ],
  precedenceNote: "The page tag is deliberately the current page, not the first one. It tells AppsFlyer which page the person converted from; the UTMs tell it which ad brought them in. Two questions, two parameters.",

  /* Buttons */
  buttonsIntro: [
    "A button that should open the app needs two attributes in Webflow and no URL. The script fills in the URL from a table of OneLinks at the top of the file, so changing a destination is one edit and every button on the site follows.",
  ],
  buttonMarkup: `<!-- In Webflow: attributes only, leave the link field empty -->
<a data-onelink="subscription" data-add-slug="true">Subscribe</a>

<!-- Optional -->
<a data-onelink="book" data-add-slug="true"
   data-dlv-pathname="/search"      <!-- screen the app should open -->
   data-dlv-code="SPRING10">        <!-- fixed promo code for this button -->`,
  onelinkKeys: [
    { key: "book", url: "https://go.eonrides.com/nQbG/eonrides" },
    { key: "download", url: "https://go.eonrides.com/nQbG/download_app" },
    { key: "subscription", url: "https://go.eonrides.com/nQbG/subs" },
    { key: "partners", url: "https://go.eonrides.com/nQbG/partner" },
  ],
  stampIntro: "Just before the button is tapped, the script rebuilds its link with everything it knows. Mixpanel loads after the page, so doing this on tap rather than on load is what makes sure the Mixpanel ID is present.",
  stampExample: `// What the person tapped, after a visit from the Meta ad above
https://go.eonrides.com/nQbG/subs
  ?deep_link_value={"pathname":"/subscriptions","code":"EON99"}
  &c=electric-car-subscription    // the page they tapped on
  &af_channel=meta                // utm_source
  &af_adset=subs_sept             // utm_campaign
  &af_ad=video_a                  // utm_content
  &af_sub1=paid                   // utm_medium
  &af_sub2=                       // utm_term
  &af_sub3=fbclid:IwAR…           // click IDs, packed as name:value|name:value
  &af_sub4=f5bd1ba5-…             // Mixpanel distinct_id
  &code=EON99                     // plain copy of the code, for the web app`,
  stampNote: "AppsFlyer has fixed names for its slots, which is why utm_source travels as af_channel and the click IDs share af_sub3. Every value is URL-encoded, and values from the script win over anything already on the link.",

  /* Deep link */
  deepLinkIntro: [
    "The native app receives one JSON object called deep_link_value. It opens the screen named in pathname and, if a code is present, shows the promo popup. This works both when the app is already installed and when it is opened for the first time after installing from the store.",
  ],
  dlvShape: `{ "pathname": "/subscriptions", "code": "EON99" }

// Screens the app knows
/   /search   /subscriptions   /subscriptions/thank-you   /trips
/checkout   /get-the-app   /join-partner-program   /account/*   /partner/*   /terms`,
  overrideIntro: "Each OneLink already has its own deep_link_value set up in AppsFlyer. Anything the script puts on the URL replaces that completely. Sending only a code would wipe the screen out and the app would open nowhere, so the script only sends deep_link_value when it knows which screen to name.",
  dlvRules: [
    { when: "The subscription button, with or without a promo code", sends: "The /subscriptions screen, plus the code if the visit had one" },
    { when: "Book, download, or partners buttons", sends: "Nothing. The OneLink's own screen is kept, and the plain code= parameter still travels for the web app" },
    { when: "Any button with data-dlv-pathname", sends: "That screen, plus the code if the visit had one" },
    { when: "Any button with data-dlv-code", sends: "That fixed code, whatever the visit carried" },
  ],
  dlvNote: "To hand the promo code to the app from another button, either give the button a data-dlv-pathname or add its key to DLV_PATHNAME in the script.",

  /* Across pages */
  forwardIntro: [
    "Every other link that stays on eonrides.com or one of its subdomains gets the campaign details added as query parameters, unless they are already there. This is what carries attribution from www.eonrides.com to app.eonrides.com, and from the app redirect pages' Continue on web button. Anchors, mailto, tel, and the OneLink buttons themselves are left alone.",
    "The Mixpanel ID rides along too, so the web session and the app session are treated as the same person. The site sends it as mp_id on internal links and as af_sub4 on OneLinks; the receiving side calls mixpanel.identify with it before sending any event.",
  ],
  identity: [
    { hop: "Site to OneLink to the native app", carrier: "af_sub4", consumer: "The app calls mixpanel.identify(af_sub4)" },
    { hop: "Site to app.eonrides.com", carrier: "mp_id", consumer: "The web app calls mixpanel.identify(mp_id)" },
    { hop: "OneLink to a redirect page to the web app", carrier: "af_sub4, read back as mp_id", consumer: "Automatic" },
  ],

  /* Coming back from AppsFlyer */
  returnIntro: [
    "When there is no app on the phone, OneLink sends the person to /app-redirect-ios or /app-redirect-android on the site. On desktop it sends them to app.eonrides.com. In both cases AppsFlyer rebuilds the URL with its own parameter names, so the page receives af_channel rather than utm_source. The script translates these back on load; from then on the page behaves like any other tagged landing page.",
  ],
  normalize: [
    { from: "af_channel", to: "utm_source" },
    { from: "af_adset", to: "utm_campaign" },
    { from: "af_ad", to: "utm_content" },
    { from: "af_sub1", to: "utm_medium" },
    { from: "af_sub2", to: "utm_term" },
    { from: "af_sub3, packed as gclid:abc|fbclid:xyz", to: "gclid and fbclid, unpacked" },
    { from: "deep_link_value carrying a code", to: "code" },
  ],
  normalizeNote: "If the URL already has the utm_ or code version, that one wins.",
  redirectIntro: "The redirect pages only render when the app is not installed. Their store buttons link straight to the App Store and Google Play, not back through OneLink, because the click was already recorded and going through OneLink again would loop. The Continue on web button is a plain link to app.eonrides.com; the script adds the attribution to it like any other internal link.",

  /* Devices */
  outcomes: [
    { device: "Desktop", happens: "OneLink sends the person straight to app.eonrides.com with the campaign, code, and Mixpanel ID on the URL. The web app reads them from the query string." },
    { device: "Phone, app installed", happens: "The link opens the app directly. AppsFlyer hands it deep_link_value and the af_ parameters, the app opens the named screen, shows the promo popup, and identifies the Mixpanel user." },
    { device: "Phone, no app, installs it", happens: "OneLink shows the redirect page, the person installs from the store, and on first open AppsFlyer delivers the same deep_link_value as a deferred deep link. Same result as an installed app." },
    { device: "Phone, no app, stays on the web", happens: "The person taps Continue on web and lands on app.eonrides.com with the campaign, code, and Mixpanel ID forwarded." },
  ],

  /* Worked examples */
  examples: [
    { visit: "Someone types eonrides.com and taps Subscribe on the homepage.", result: "No campaign, no code. The link carries the page tag home and opens the Subscriptions screen." },
    { visit: "Someone arrives from the Meta ad with code EON99 and taps Subscribe.", result: "Meta is saved as the first touch. The link carries the campaign, the page tag electric-car-subscription, and opens Subscriptions with the EON99 popup." },
    { visit: "The same person comes back the next day by typing the URL, opens /pricing, and taps Subscribe.", result: "Still attributed to Meta, still EON99, from the snapshot. The page tag is now pricing." },
    { visit: "The same person later arrives from a Google ad with code EON50.", result: "Meta stays as the first touch. The code becomes EON50, because the promo code is always the latest one." },
    { visit: "The same person comes back after more than 30 days with no campaign link.", result: "The snapshot has expired. No campaign, no code, and the link opens Subscriptions plainly." },
    { visit: "Someone without the app lands on /app-redirect-ios with af_channel=meta and a code, and taps Continue on web.", result: "The page translates the AppsFlyer names back, and the web app receives utm_source=meta, the click ID, and the code." },
  ],

  /* Settings */
  config: `const ONELINK_URLS = {
  book:         'https://go.eonrides.com/nQbG/eonrides',
  download:     'https://go.eonrides.com/nQbG/download_app',
  subscription: 'https://go.eonrides.com/nQbG/subs',
  partners:     'https://go.eonrides.com/nQbG/partner'
};

const DLV_PATHNAME = {          // screen the app opens, per button key
  subscription: '/subscriptions'
};

const ROOT_DOMAIN = 'eonrides.com';   // links here and on subdomains are "internal"
const STORAGE_KEY = 'eon_attr';       // where the snapshot lives
const TTL_MS      = 30 * 24 * 60 * 60 * 1000;   // 30 days`,
  identifiers: [
    { label: "OneLink subdomain", value: "go.eonrides.com" },
    { label: "OneLink template", value: "nQbG" },
    { label: "iOS App Store ID", value: "6448188911" },
    { label: "Android package", value: "com.eon.mobile" },
    { label: "Default pid", value: "eonrides_web" },
    { label: "Web app", value: "app.eonrides.com" },
  ],
  appsflyerIntro: "The script assumes AppsFlyer is set up like this. AppsFlyer passes every OneLink parameter through to the redirect URLs, which is what lets the site recover the attribution on the way back.",
  appsflyer: [
    { setting: "Shortlinks", value: "eonrides, download_app, subs, partner, each with its own deep_link_value" },
    { setting: "iOS redirect when the app is missing", value: "https://eonrides.com/app-redirect-ios?utm_source={af_channel}&utm_campaign={af_adset}&utm_medium={af_sub1}&utm_content={af_ad}&utm_term={af_sub2}&af_sub3={af_sub3}" },
    { setting: "Android redirect when the app is missing", value: "https://eonrides.com/app-redirect-android with the same macros" },
    { setting: "Desktop redirect", value: "https://app.eonrides.com with the same macros" },
    { setting: "Universal Links and App Links", value: "The apps claim go.eonrides.com; the AASA and assetlinks.json files are served" },
  ],
  appSide: [
    { surface: "Native app", detail: "In AppsFlyer's onDeepLinking handler, parse deep_link_value, go to pathname, and show the promo popup if there is a code. Handle it both on a direct open and a deferred one. Call mixpanel.identify with af_sub4." },
    { surface: "Web app", detail: "On load, read code, the utm_ parameters, c, and mp_id (or af_sub4) from the query string. Call mixpanel.identify with mp_id." },
  ],

  /* Console */
  consoleIntro: "Open the browser console on any page of the site to see what the script has in hand.",
  debug: `window.__eon.state()        // current page, resolved page tag and code, snapshot, click IDs, Mixpanel ID
window.__eon.firstTouch()   // the saved snapshot, or null
window.__eon.reset()        // forget the snapshot, as a brand-new visitor would
window.__eon.rerun()        // rebuild every link now

// The link a button would open right now
document.querySelector('a[data-onelink="subscription"]').href`,
};
