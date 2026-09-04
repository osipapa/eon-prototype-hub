/* Site-wide attribution & routing script reference. Mirrors the v2.0
   spec for webflow-attribution-and-routing-promo-code.html; keep the two in
   step when the script changes. */
export const WEBSITE_ATTRIBUTION = {
  slug: "website-attribution",
  title: "Site-wide attribution & routing",
  version: "2.0",
  date: "2026-09-04",
  file: "webflow-attribution-and-routing-promo-code.html",
  livesIn: "Webflow → Project Settings → Custom Code → Footer Code (every page)",
  status: [
    { label: "Verified on staging-eonrides.webflow.io", tone: "shipped" },
    { label: "Pending production publish", tone: "draft" },
  ],
  summary: "One script, loaded on every page of eonrides.com, makes sure whoever arrives from an ad ends up in the right place — native app, web app, or store — with their attribution and promo code intact.",
  note: "Device routing (iOS / Android / desktop, app installed or not) is not done in JS. AppsFlyer OneLink does it server-side. The script only builds the right URL.",

  jobs: [
    { title: "Normalize", detail: "Turns incoming af_* params back into utm_*, unpacks packed click IDs and deep_link_value." },
    { title: "Capture", detail: "Stores first-touch UTMs + click IDs (and the last-touch promo code) in localStorage for 30 days." },
    { title: "Route", detail: "Sets every tagged CTA to the correct OneLink URL from one central table." },
    { title: "Stamp", detail: "Rewrites OneLink hrefs with campaign, UTMs, click IDs, Mixpanel ID, promo code, and in-app route." },
    { title: "Forward", detail: "Appends the same attribution to every internal / *.eonrides.com link so nothing is lost between pages or subdomains." },
  ],

  /* Campaign landing URL, §3.1 */
  landingUrl: "https://www.eonrides.com/<page>?utm_source=<src>&utm_medium=<med>&utm_campaign=<adset>&utm_content=<ad>[&utm_term=<term>][&code=<PROMO>]",
  landingExample: "https://www.eonrides.com/electric-car-subscription?code=EON99&utm_source=meta&utm_medium=paid&utm_campaign=subs_sept&utm_content=video_a",
  landingParams: [
    { name: "utm_source", purpose: "channel (meta, google, …)", stored: "first-touch", forwarded: true },
    { name: "utm_medium", purpose: "paid, cpc, email …", stored: "first-touch", forwarded: true },
    { name: "utm_campaign", purpose: "ad set", stored: "first-touch", forwarded: true },
    { name: "utm_content", purpose: "ad / creative", stored: "first-touch", forwarded: true },
    { name: "utm_term", purpose: "keyword", stored: "first-touch", forwarded: true },
    { name: "fbclid, gclid, …", purpose: "platform click ID, auto-appended by the ad network", stored: "first-touch", forwarded: true },
    { name: "code", purpose: "promo code", stored: "last-touch", forwarded: true },
    { name: "c", purpose: "override campaign / page tag", stored: "not stored", forwarded: true },
    { name: "mp_id", purpose: "Mixpanel distinct_id from a previous hop", stored: "not stored", forwarded: true },
  ],
  redirectUrl: "/app-redirect-ios?utm_source={af_channel}&utm_campaign={af_adset}&utm_medium={af_sub1}&utm_content={af_ad}&utm_term={af_sub2}&af_sub3={af_sub3}",
  redirectNote: "When OneLink redirects to /app-redirect-ios, /app-redirect-android, or app.eonrides.com, the URL carries af_* params (AppsFlyer macros), not utm_*, plus anything else that was on the OneLink (c, af_sub4, code, deep_link_value, pid, shortlink, …). The script normalizes these so the redirect page behaves exactly like a normal landing page.",

  /* Central configuration, §4 */
  config: `const ONELINK_URLS = {
  book:         'https://go.eonrides.com/nQbG/eonrides',
  download:     'https://go.eonrides.com/nQbG/download_app',
  subscription: 'https://go.eonrides.com/nQbG/subs',
  partners:     'https://go.eonrides.com/nQbG/partner'
};
const DLV_PATHNAME = {           // in-app route per CTA
  subscription: '/subscriptions'
};
const ROOT_DOMAIN = 'eonrides.com';
const STORAGE_KEY = 'eon_attr';
const TTL_MS      = 30 days;`,
  configMeaning: [
    { name: "ONELINK_URLS", detail: "Single source of truth for every CTA destination. Change a link here, every button on the site updates." },
    { name: "DLV_PATHNAME", detail: "Route the app should open for a CTA when the script has to send its own deep_link_value." },
    { name: "ROOT_DOMAIN", detail: "Anything on eonrides.com or *.eonrides.com is internal and gets forwarding." },
    { name: "STORAGE_KEY / TTL_MS", detail: "First-touch snapshot location and lifetime." },
  ],
  identifiers: [
    { label: "OneLink subdomain", value: "go.eonrides.com" },
    { label: "OneLink template", value: "nQbG" },
    { label: "iOS App Store ID", value: "6448188911" },
    { label: "Android package", value: "com.eon.mobile" },
    { label: "Default pid", value: "eonrides_web" },
    { label: "Web app", value: "app.eonrides.com" },
  ],

  /* Pipeline, §5 */
  pipeline: [
    {
      step: "5.1", title: "Normalize", tag: "at load",
      summary: "Translate af_* back into utm_* before anything is stored. Existing utm_* / code on the URL always win over the translated value.",
      points: [
        "af_channel → utm_source, af_adset → utm_campaign, af_ad → utm_content, af_sub1 → utm_medium, af_sub2 → utm_term.",
        "af_sub3 = gclid:abc|fbclid:xyz is unpacked into gclid=abc, fbclid=xyz.",
        "deep_link_value={\"code\":\"X\"} becomes code=X so the promo round-trips through the redirect page.",
      ],
    },
    {
      step: "5.2", title: "Capture", tag: "first touch",
      summary: "Runs when there is no valid snapshot in localStorage and the URL carries any signal: c, any utm_*, any click ID, or code.",
      points: [
        "utm_* and click IDs are first-touch: never overwritten until the 30-day expiry.",
        "code is last-touch: overwritten whenever a new ?code= arrives.",
        "c is stored for reference only; the live value is always the current page.",
        "A snapshot older than 30 days is deleted and re-captured.",
      ],
    },
    {
      step: "5.3", title: "Resolve", tag: "per page",
      summary: "Decide which value to use right now. c is deliberately last-touch: it tells AppsFlyer which page produced the click, while utm_* says which ad brought the user in.",
      points: [
        "c: URL ?c= → current page slug (home for /).",
        "utm_* and click IDs: stored snapshot → URL → none.",
        "code: URL → stored snapshot → none.",
        "Mixpanel ID: mixpanel.get_distinct_id() → mp_ cookie → URL mp_id / af_sub4 → none ($device: prefix stripped).",
      ],
    },
    {
      step: "5.4", title: "Route", tag: "step 0",
      summary: "Every <a data-onelink=\"<key>\"> gets href = ONELINK_URLS[key]. Whatever URL was typed in Webflow is ignored.",
      points: [],
    },
    {
      step: "5.5", title: "Stamp", tag: "OneLink hrefs",
      summary: "For every <a data-add-slug=\"true\"> on go.eonrides.com or *.onelink.me, the href is rebuilt with deep_link_value, c, af_channel…af_sub4, and a flat code.",
      points: [
        "Every value is encodeURIComponent()-ed individually.",
        "Script values override params already on the href.",
      ],
    },
    {
      step: "5.6", title: "Forward", tag: "internal links",
      summary: "Every other <a href> to the same host, eonrides.com, or *.eonrides.com gets c, utm_*, every click ID, mp_id, and code appended — only if not already present.",
      points: [
        "Skips #anchors, mailto:, tel:, javascript:, OneLink hosts, and same-page hash jumps.",
        "This keeps attribution alive across www → app.eonrides.com and on the redirect pages' Continue on web button.",
      ],
    },
    {
      step: "5.7", title: "Re-stamp", tag: "on click",
      summary: "A capture-phase click listener re-runs stamp and forward on the clicked link just before navigation.",
      points: [
        "Mixpanel loads asynchronously; at first paint af_sub4 / mp_id may still be empty.",
      ],
    },
  ],

  /* Normalize mapping, §5.1 */
  normalize: [
    { from: "af_channel", to: "utm_source" },
    { from: "af_adset", to: "utm_campaign" },
    { from: "af_ad", to: "utm_content" },
    { from: "af_sub1", to: "utm_medium" },
    { from: "af_sub2", to: "utm_term" },
    { from: "af_sub3 = gclid:abc|fbclid:xyz", to: "gclid=abc, fbclid=xyz", note: "packed on the way out, unpacked on the way back" },
    { from: "deep_link_value={\"code\":\"X\"}", to: "code=X", note: "promo round-trips through the redirect page" },
  ],

  /* Snapshot, §5.2 */
  snapshot: [
    { key: "ts", value: "1757000000000", tone: "meta" },
    { key: "c", value: "\"electric-car-subscription\"", tone: "reference" },
    { key: "utm_source", value: "\"meta\"", tone: "first" },
    { key: "utm_medium", value: "\"paid\"", tone: "first" },
    { key: "utm_campaign", value: "\"subs_sept\"", tone: "first" },
    { key: "utm_content", value: "\"video_a\"", tone: "first" },
    { key: "code", value: "\"EON99\"", tone: "last" },
    { key: "click_ids", value: "{ \"fbclid\": \"IwAR…\" }", tone: "first" },
  ],
  snapshotLegend: [
    { tone: "first", label: "First-touch", detail: "The ad that originally brought the user. Kept until the 30-day expiry." },
    { tone: "last", label: "Last-touch", detail: "The most recent promo the user clicked. Overwritten by every new ?code=." },
    { tone: "reference", label: "Reference only", detail: "Live value is always the current page." },
  ],

  /* Resolve precedence, §5.3 */
  precedence: [
    { value: "c", chain: ["URL ?c=", "current page slug"] },
    { value: "utm_*", chain: ["stored snapshot", "URL", "none"] },
    { value: "click IDs", chain: ["stored snapshot", "URL", "none"] },
    { value: "code", chain: ["URL", "stored snapshot", "none"] },
    { value: "Mixpanel ID", chain: ["mixpanel.get_distinct_id()", "mp_ cookie", "URL mp_id / af_sub4", "none"] },
  ],

  /* Stamp output, §5.5 */
  stampShape: "<origin><path>?deep_link_value=<json>&<existing params>&c=…&af_channel=…&af_adset=…&af_ad=…&af_sub1=…&af_sub2=…&af_sub3=…&af_sub4=…&code=…",
  stampParams: [
    { param: "deep_link_value", from: "{pathname, code}", example: "{\"pathname\":\"/subscriptions\",\"code\":\"EON99\"}" },
    { param: "c", from: "resolved c", example: "electric-car-subscription" },
    { param: "af_channel", from: "utm_source", example: "meta" },
    { param: "af_adset", from: "utm_campaign", example: "subs_sept" },
    { param: "af_ad", from: "utm_content", example: "video_a" },
    { param: "af_sub1", from: "utm_medium", example: "paid" },
    { param: "af_sub2", from: "utm_term", example: "—" },
    { param: "af_sub3", from: "click IDs packed k:v|k:v", example: "fbclid:IwAR…" },
    { param: "af_sub4", from: "Mixpanel distinct_id", example: "f5bd1ba5-…" },
    { param: "code", from: "resolved promo code (flat copy for the web app)", example: "EON99" },
  ],

  /* deep_link_value contract, §6 */
  dlvShape: "{ \"pathname\": \"/subscriptions\", \"code\": \"EON99\" }",
  dlvEncoded: "deep_link_value=%7B%22pathname%22%3A%22%2Fsubscriptions%22%2C%22code%22%3A%22EON99%22%7D",
  dlvRoutes: ["/", "/search", "/subscriptions", "/subscriptions/thank-you", "/trips", "/checkout", "/get-the-app", "/join-partner-program", "/account/*", "/partner/*", "/terms"],
  dlvOverride: "Each OneLink shortlink (/subs, /eonrides, …) has its own deep_link_value configured in AppsFlyer. A deep_link_value on the URL replaces it entirely. Sending only {\"code\":\"EON99\"} would strip the route and the app would open nowhere — so the script only emits deep_link_value when it knows the route.",
  dlvMatrix: [
    { button: "subscription", pathname: "/subscriptions (map)", code: "—", visit: "no", emitted: "{\"pathname\":\"/subscriptions\"}" },
    { button: "subscription", pathname: "/subscriptions (map)", code: "—", visit: "EON99", emitted: "{\"pathname\":\"/subscriptions\",\"code\":\"EON99\"}" },
    { button: "book / download / partners", pathname: "none", code: "—", visit: "any", emitted: "none — shortlink's own value kept; flat code= still sent" },
    { button: "any", pathname: "none", code: "PROMO1", visit: "any", emitted: "{\"code\":\"PROMO1\"} (explicit attribute, legacy)" },
    { button: "any", pathname: "/x (attribute)", code: "—", visit: "EON99", emitted: "{\"pathname\":\"/x\",\"code\":\"EON99\"}" },
  ],
  dlvTip: "To deliver the promo code in-app on another CTA: add it to DLV_PATHNAME or set data-dlv-pathname on the button.",

  /* Webflow attributes, §7 */
  attributes: [
    { name: "data-onelink=\"book|download|subscription|partners\"", on: "OneLink CTAs", effect: "href replaced with ONELINK_URLS[key]" },
    { name: "data-add-slug=\"true\"", on: "OneLink CTAs", effect: "href stamped (only on OneLink hosts)" },
    { name: "data-dlv-pathname=\"/route\"", on: "OneLink CTAs (optional)", effect: "Sets deep_link_value.pathname; overrides DLV_PATHNAME" },
    { name: "data-dlv-code=\"PROMO\"", on: "OneLink CTAs (optional)", effect: "Hard-codes deep_link_value.code; overrides URL code" },
  ],
  attributesNote: "A standard CTA needs exactly two attributes: data-onelink + data-add-slug. No URL needs to be typed in Webflow.",
  legacyAttributes: ["data-ios-href", "data-android-href", "data-mobile-href", "data-forward-attribution"],

  /* Redirect pages, §8 */
  redirectPages: [
    { element: "App Store button", url: "direct apps.apple.com link", why: "Attribution is already recorded at the OneLink click. Pointing this at OneLink again would loop with the fallback." },
    { element: "Play Store button", url: "direct play.google.com link", why: "Same." },
    { element: "Continue on web", url: "https://app.eonrides.com/", why: "Script forwards c, UTMs, click IDs, mp_id, code automatically." },
  ],
  redirectSettings: "Configured in AppsFlyer as the OneLink custom redirect URLs for “app not installed”; they render only in that case. Sitemap indexing off (noindex), platform-specific title, and the Android page must show Android copy.",

  /* Outcome by device, §9 */
  outcomes: [
    { icon: "desktop", device: "Desktop", path: "OneLink → desktop redirect", arrives: "app.eonrides.com/…?code=…&deep_link_value=…&c=…&af_sub4=…&utm_*", result: "Web app reads ?code=, utm_*, mp_id / af_sub4." },
    { icon: "installed", device: "iOS / Android, app installed", path: "Universal Link / App Link → app", arrives: "deep_link_value + all af_* via AppsFlyer UDL", result: "App opens pathname, shows the code popup, identifies Mixpanel from af_sub4." },
    { icon: "store", device: "iOS / Android, no app → store", path: "OneLink fallback → /app-redirect-* → store → install", arrives: "deep_link_value via deferred deep link on first open", result: "Same as installed." },
    { icon: "web", device: "iOS / Android, no app → web", path: "/app-redirect-* → Continue on web", arrives: "forwarded ?code=&utm_*&mp_id=", result: "Web app." },
  ],

  /* Identity across hops, §10 */
  identity: [
    { hop: "site → OneLink → native app", carrier: "af_sub4 = Mixpanel distinct_id", consumer: "call mixpanel.identify(af_sub4) before any event" },
    { hop: "site → app.eonrides.com", carrier: "mp_id", consumer: "call mixpanel.identify(mp_id) before any event" },
    { hop: "OneLink → redirect page → web", carrier: "af_sub4 re-read as mp_id fallback", consumer: "automatic" },
  ],

  /* Behavior matrix, §11 */
  behavior: [
    { scenario: "Direct visit /, click", c: "home", channel: "—", code: "—", dlv: "{\"pathname\":\"/subscriptions\"}" },
    { scenario: "Meta ad → /electric-car-subscription?utm_source=meta&code=EON99", c: "electric-car-subscription", channel: "meta", code: "EON99", dlv: "{\"pathname\":\"/subscriptions\",\"code\":\"EON99\"}" },
    { scenario: "Same user, next day, direct visit /pricing, click", c: "pricing", channel: "meta (stored)", code: "EON99 (stored)", dlv: "…\"code\":\"EON99\"" },
    { scenario: "Same user, Google ad ?utm_source=google&code=EON50", c: "page slug", channel: "meta (first-touch kept)", code: "EON50 (last-touch)", dlv: "…\"code\":\"EON50\"" },
    { scenario: "31+ days later, direct visit", c: "page slug", channel: "—", code: "—", dlv: "{\"pathname\":\"/subscriptions\"}" },
    { scenario: "Lands on /app-redirect-ios?af_channel=meta&af_sub3=fbclid:abc&deep_link_value={\"code\":\"EON99\"} → Continue on web", c: "app-redirect-ios", channel: "meta", code: "EON99", dlv: "n/a — internal link gets ?utm_source=meta&fbclid=abc&code=EON99" },
  ],

  /* AppsFlyer configuration, §12 */
  appsflyer: [
    { setting: "OneLink template", value: "nQbG on go.eonrides.com" },
    { setting: "Shortlinks", value: "eonrides, download_app, subs, partner — each with its own deep_link_value" },
    { setting: "iOS custom redirect (no app)", value: "https://eonrides.com/app-redirect-ios?utm_source={af_channel}&utm_campaign={af_adset}&utm_medium={af_sub1}&utm_content={af_ad}&utm_term={af_sub2}&af_sub3={af_sub3}" },
    { setting: "Android custom redirect (no app)", value: "https://eonrides.com/app-redirect-android?…same macros…" },
    { setting: "Desktop redirect", value: "https://app.eonrides.com/…same macros…" },
    { setting: "Universal Links / App Links", value: "apps claim go.eonrides.com; AASA and assetlinks.json served" },
  ],
  appsflyerNote: "AppsFlyer appends every OneLink param (including c, af_sub4, code, deep_link_value) to the redirect URLs, so nothing is lost on the way back to the site.",

  /* App-side requirements, §13 */
  appSide: [
    { surface: "Native app", detail: "AppsFlyer UDL onDeepLinking: parse the deep_link_value JSON → navigate to pathname; if code, show the promo popup. Handle both direct and deferred. mixpanel.identify(af_sub4)." },
    { surface: "Web app", detail: "On load read code, utm_*, c, mp_id (or af_sub4) from the query string. mixpanel.identify(mp_id)." },
  ],

  /* Debug helpers, §14 */
  debug: [
    { call: "window.__eon.state()", returns: "{ currentSlug, effectiveC, effectiveCode, stored, clickIdBlob, mpId }" },
    { call: "window.__eon.firstTouch()", returns: "the stored snapshot or null" },
    { call: "window.__eon.reset()", returns: "clears the snapshot (simulate a new user)" },
    { call: "window.__eon.rerun()", returns: "re-stamps all links" },
    { call: "document.querySelector('a[data-onelink=\"subscription\"]').href", returns: "the final stamped URL" },
  ],

  /* QA checklist, §15 */
  qa: [
    "window.__eon.reset(), then open /electric-car-subscription?utm_source=meta&code=EON99.",
    "window.__eon.state() → effectiveC = \"electric-car-subscription\", effectiveCode = \"EON99\", stored.utm_source = \"meta\".",
    "Subscription CTA href contains the encoded {\"pathname\":\"/subscriptions\",\"code\":\"EON99\"}, af_channel=meta, code=EON99, af_sub4=<mixpanel id>.",
    "Navigate to another page with no params → CTA href still carries af_channel=meta and code=EON99; c changes to the new slug.",
    "Desktop click → app.eonrides.com/subscriptions?code=EON99&…&c=…&af_sub4=…  ✅ verified on staging 2026-09-04.",
    "Phone with app → app opens Subscriptions with the EON99 popup.",
    "Phone without app → /app-redirect-* → install → first open shows Subscriptions with the EON99 popup.",
    "/app-redirect-ios?af_channel=meta&af_sub3=fbclid:abc → Continue on web href contains utm_source=meta&fbclid=abc.",
    "Reset, open /electric-car-subscription with no params → href has {\"pathname\":\"/subscriptions\"} and no code.",
  ],

  rollout: [
    "Paste webflow-attribution-and-routing-promo-code.html into Webflow → Project Settings → Custom Code → Footer Code. Publish to www.eonrides.com.",
    "Run QA steps 1–5 on production.",
    "Launch campaigns with the campaign landing URL format.",
  ],

  changes: [
    "Unpack deep_link_value.code → code on incoming URLs.",
    "?code= counts as an attribution signal (creates the snapshot).",
    "code is stored in the snapshot, and is last-touch: a new ?code= overwrites it.",
    "resolveCode() / effectiveCode.",
    "deep_link_value.code from the URL code, only when a route is known.",
    "Flat code= param on OneLink hrefs (for the web app on desktop).",
    "code forwarded on internal links.",
    "DLV_PATHNAME route map (subscription → /subscriptions).",
    "window.__eon.state() exposes effectiveCode.",
  ],
  changesNote: "Existing behavior (c, af_*, click IDs, af_sub4, mp_id, forwarding, click re-stamp) is unchanged.",
};
