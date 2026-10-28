# Hausa wording to review

The Hausa in `src/locales/ha/*.json` aims for plain, everyday Minna Hausa. The terms below are the ones
a native speaker should check before launch. Each line gives the key (namespace:path), the current Hausa,
and what to look at. When a term changes, change it everywhere it is used: the same word should mean the
same thing across the app.

Booking and renewal reminder texts are not in the JSON files. Their Hausa versions are in
`src/features/reminders/templates.ts` (look for `ha:`).

## Trades and roles

- // REVIEW `common:trade.plumber.label`: "Mai aikin famfo". Would "Mai gyaran famfo" or "Fanfo" be more natural in Minna?
- // REVIEW `common:trade.electrician.label`: "Mai aikin wuta". Do people also say "Mai gyaran wuta" or "Lantarki"?
- // REVIEW `common:trade.dispatch_rider.label`: "Ɗan aike". This is different from the rider role ("Mai kai kaya"). Should they match?
- // REVIEW `common:trade.mechanic.label`: "Makanike". This is the common loanword. Check the spelling.
- // REVIEW `common:trade.hair_stylist.browse`: "Gyaran gashi da kwalliya".
- // REVIEW `common:role.provider.label` and `vendor` wording everywhere: "Mai sana’a". It is used for every vendor, including shops that only sell goods. Is "Mai sana’a" fine for a shop owner, or should shops be "Mai shago"?
- // REVIEW `common:role.admin.label`: "Ma’aikacin Gwani".
- // REVIEW `common:vehicle.tricycle`: "Keke NAPEP (adaidaita sahu)". Which name do Minna riders use?

## Actions and navigation

- // REVIEW `discovery:profile.action.service`: "Nemi aiki" (Book now). Also `jobs:request.pageTitle`. It could read as "look for work". Would "Kira shi aiki" or "Ɗauki aiki" be clearer?
- // REVIEW `discovery:profile.action.retail`: "Yi oda" (Request, for shops).
- // REVIEW `discovery:filters.title`: "Tacewa" (Filters), and "Tace …" in labels.
- // REVIEW `discovery:sort.label`: "Jera ta" (Sort by).
- // REVIEW `common:nav.dashboard`: "Babban shafi".
- // REVIEW `common:nav.subscription` and `vendor:subscription.title`: "Tsarin biyan kuɗi". Other texts say "biyan kuɗi na wata-wata".
- // REVIEW `vendor:verification.*` and `common:tier.*`: "Tantancewa" (verification) and "An tantance …". These replace earlier "tabbatarwa", which now only means "confirm" (e.g. confirming a job is done).

## Jobs, orders and payments

- // REVIEW `jobs:status.*`: "An nema / An ba da farashi / An tsara / Ana aiki / Ana jiran tabbatarwa / An kammala / An rufe". In particular, check that "An tsara" (Scheduled) is understood as "booked for a time".
- // REVIEW "farashi" for a vendor’s quote, e.g. `jobs:quote.quote`, "Aika farashi". Is "kuɗin aiki" or "ƙiyasin farashi" clearer for "quote"?
- // REVIEW "ƙorafi" for dispute or problem report, e.g. "Kai ƙorafi", "Akwai ƙorafi".
- // REVIEW "Soke a makare" for late cancellation (`jobs:policy.*`).
- // REVIEW `jobs:order.method.pickup`: "Ɗauka da kai" (Pickup). And `delivery`: "Kai kaya".
- // REVIEW `jobs:order.status.dispatched`: "An tura" (Dispatched).
- // REVIEW "escrow" is left in English (e.g. "A riƙe a escrow"). Should it be "a riƙe a amana" or similar?
- // REVIEW "kwamishon" for the platform commission.
- // REVIEW "Rasiti" (receipt) and "Takardar mayar da kuɗi" (refund note).
- // REVIEW "push", "SMS", "USSD", "PIN" and "PDF" are kept as English loanwords.
- // REVIEW `payments:tx.title`: "Biyan kuɗi" (Payments page).

## Vendor dashboard

- // REVIEW `vendor:subscription.status.grace` and `vendor:banner.*`: "Lokacin rangwame" (grace period).
- // REVIEW `vendor:subscription.kind.upgrade` and `downgrade`: "Ƙarawa / Ragewa (gwargwadon kwanaki)" for prorated upgrade and downgrade.
- // REVIEW `vendor:plan.*.name`: Starter, Standard and Premium are kept in English as product names. Should they be translated?
- // REVIEW `vendor:association.*`: "Tsarin ƙungiya" for the association bundle.
- // REVIEW `vendor:products.stockFilter.low_stock.label`: "Kaya sun yi ƙasa" (Low stock).
- // REVIEW `common:import.*` and `vendor:products.col.*`: spreadsheet words ("ginshiƙi" column, "layi" row, "fayil ɗin lissafi" spreadsheet).
- // REVIEW `vendor:profile.hours.copyPrefix` / `copySuffix`: "Kwafi lokutan [day] zuwa kowace rana" is split around the day picker. Check it reads naturally.
- // REVIEW `vendor:completeness.*`: "Ƙarfin shafinka" (Profile strength), "Shafi ya cika {{percent}}%" (Profile X% complete) and the labels "Ana farawa / Da kyau / Ya kusa / Ya cika".

## Grammar and gender

- // REVIEW **Gender defaults.** Sentences about a vendor or customer use masculine forms ("yana", "zai", "ya", "shafinsa") because the app doesn’t know the person’s gender. Is that acceptable, or should we rephrase to avoid gendered pronouns where possible?
- // REVIEW **"Kai/ka" for "you"** is masculine singular throughout ("Ka soke", "Kana"). Same question as above.
- // REVIEW **Plurals.** Hausa nouns after a number are usually singular ("awa 3", "kwana 2"), so many `_one`/`_other` pairs are identical. Check the plural forms used where they differ ("kwanaki", "ayyuka", "kayayyaki", "ra’ayoyi", "membobi", "rasitoci").
- // REVIEW **Number before or after noun.** Most texts put the noun first ("aiki 3", "minti 15"). A few put the number first ("{{count}} a shirye"). Check these read naturally.

## Dates and times (`src/i18n/dateLocale.ts`)

- // REVIEW Month and weekday names, e.g. Janairu, Faburairu, Litinin, Talata, Jumma’a. Check the spellings.
- // REVIEW Short weekday names (Lit, Tal, Lar, Alh, Jum, Asa, Lah) as used in the calendar header.
- // REVIEW Times of day: every time before noon gets "na safe" and every time after noon gets "na yamma" (e.g. "1:00 na yamma", "8:00 na yamma"). Should early afternoon be "na rana" and late evening "na dare"? The job time windows (`jobs:timeWindow.*`) already say "12 na rana".
- // REVIEW Relative times: "cikin minti 5" (in 5 minutes) and "minti 5 da suka wuce" (5 minutes ago).

## Booking and renewal reminders (`src/features/reminders/templates.ts`)

- // REVIEW The SMS versions must stay within one 160-character SMS once filled in. Hausa is often longer: check them in the reminder dev panel (/dev/reminders).
- // REVIEW "Tsari" is used for a booking ("Tsari gobe" = booking tomorrow).
