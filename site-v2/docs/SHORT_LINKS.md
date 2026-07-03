# Short marketing links

These links are implemented in `public/.htaccess` and deploy with the static
Plesk build. They intentionally use `302` redirects because campaign destinations
may change. Existing query parameters are appended to the destination, so
platform click IDs such as `fbclid` and `ttclid` are preserved.

Language can be added after the short link:

```text
https://vivien.lv/ig/lv
https://vivien.lv/ig-book/ru
https://vivien.lv/e/ru/cherry-days
https://vivien.lv/ig/ru/cherry-days
```

Supported site-language segments are `en`, `lv`, `fr`, and `ru`. Missing or
unknown language segments redirect to `/en/` with `lang=en`. French URLs redirect
to `/fr/` with `lang=en`, because the Restoplace booking form currently supports
English, Latvian, and Russian.

Campaign and event placeholders use a path segment. Lead-form links can use
either a campaign-only path or a language-plus-campaign path. For example:

```text
https://vivien.lv/ig-lead/summer_launch
https://vivien.lv/ig-lead/lv/summer_launch
```

redirects with `utm_campaign=summer_launch`. Campaign slugs should use letters,
numbers, dots, underscores, hyphens, or tildes.

Event links use the event `id` from `src/content/site.js`, for example
`cherry-days`. A concrete event link redirects to `#events`, selects that event
in the carousel, and pauses event carousel autoplay for that page view.

Organic social event links also use event ids. Use `/x[/<locale>]/<event>`,
`/ig[/<locale>]/<event>`, `/fb[/<locale>]/<event>`, or
`/tt[/<locale>]/<event>` when the analytics source should stay tied to the
social network. For example, `https://vivien.lv/ig/ru/cherry-days` redirects to
the Russian Cherry Days event with `utm_source=instagram` and
`utm_campaign=event_cherry-days`.

If the locale is omitted, for example `/ig/cherry-days`, the link redirects to
`/en/` with `lang=en`, keeps `event=cherry-days`, and uses the social source
from the short link. A single two-letter segment such as `/ig/es` is still
treated as an unknown language segment and falls back to the English bio link.

Visam partner links also use event ids. Use:

- `/visam[/<locale>]/<event>` for the Visam mobile app placement;
- `/visam-ig[/<locale>]/<event>` for the Visam Instagram blog;
- `/visam-tt[/<locale>]/<event>` for the Visam TikTok blog.

These links keep `utm_source=visam`; the placement is separated through
`utm_medium` and `utm_content`.

| Short URL | Destination |
| --- | --- |
| `/e[/<locale>]` | `/<locale>/?lang=<booking-lang>&utm_source=shortlink&utm_medium=event&utm_campaign=events#events` |
| `/e[/<locale>]/<event>` | `/<locale>/?lang=<booking-lang>&event=<event>&utm_source=shortlink&utm_medium=event&utm_campaign=event_<event>#events` |
| `/visam[/<locale>]` | `/<locale>/?lang=<booking-lang>&utm_source=visam&utm_medium=partner_app&utm_campaign=events&utm_content=mobile_app#events` |
| `/visam[/<locale>]/<event>` | `/<locale>/?lang=<booking-lang>&event=<event>&utm_source=visam&utm_medium=partner_app&utm_campaign=event_<event>&utm_content=mobile_app#events` |
| `/visam-ig[/<locale>]` | `/<locale>/?lang=<booking-lang>&utm_source=visam&utm_medium=partner_social&utm_campaign=events&utm_content=instagram_blog#events` |
| `/visam-ig[/<locale>]/<event>` | `/<locale>/?lang=<booking-lang>&event=<event>&utm_source=visam&utm_medium=partner_social&utm_campaign=event_<event>&utm_content=instagram_blog#events` |
| `/visam-tt[/<locale>]` | `/<locale>/?lang=<booking-lang>&utm_source=visam&utm_medium=partner_social&utm_campaign=events&utm_content=tiktok_blog#events` |
| `/visam-tt[/<locale>]/<event>` | `/<locale>/?lang=<booking-lang>&event=<event>&utm_source=visam&utm_medium=partner_social&utm_campaign=event_<event>&utm_content=tiktok_blog#events` |
| `/x[/<locale>]` | `/<locale>/?lang=<booking-lang>&utm_source=x&utm_medium=organic_social&utm_campaign=bio&utm_content=profile#menu` |
| `/x[/<locale>]/<event>` | `/<locale>/?lang=<booking-lang>&event=<event>&utm_source=x&utm_medium=organic_social&utm_campaign=event_<event>&utm_content=event_link#events` |
| `/x-book[/<locale>]` | `/<locale>/?openBooking=1&lang=<booking-lang>&booking_source=x_pinned_post&utm_source=x&utm_medium=organic_social&utm_campaign=x_launch&utm_content=pinned_post` |
| `/ig[/<locale>]` | `/<locale>/?lang=<booking-lang>&utm_source=instagram&utm_medium=organic_social&utm_campaign=bio&utm_content=profile` |
| `/ig[/<locale>]/<event>` | `/<locale>/?lang=<booking-lang>&event=<event>&utm_source=instagram&utm_medium=organic_social&utm_campaign=event_<event>&utm_content=event_link#events` |
| `/ig-book[/<locale>]` | `/<locale>/?openBooking=1&lang=<booking-lang>&booking_source=instagram_bio_booking&utm_source=instagram&utm_medium=organic_social&utm_campaign=bio&utm_content=booking` |
| `/ig-lead[/<locale>]/<campaign>` | `/<locale>/?openBooking=1&lang=<booking-lang>&booking_source=instagram_lead_form&utm_source=instagram&utm_medium=paid_social&utm_campaign=<campaign>&utm_content=lead_form_thank_you` |
| `/fb[/<locale>]` | `/<locale>/?lang=<booking-lang>&utm_source=facebook&utm_medium=organic_social&utm_campaign=bio&utm_content=profile` |
| `/fb[/<locale>]/<event>` | `/<locale>/?lang=<booking-lang>&event=<event>&utm_source=facebook&utm_medium=organic_social&utm_campaign=event_<event>&utm_content=event_link#events` |
| `/fb-book[/<locale>]` | `/<locale>/?openBooking=1&lang=<booking-lang>&booking_source=facebook_page_cta&utm_source=facebook&utm_medium=organic_social&utm_campaign=page_cta&utm_content=booking` |
| `/fb-organic-book[/<locale>]` | `/<locale>/?openBooking=1&lang=<booking-lang>&booking_source=facebook_organic_booking&utm_source=facebook&utm_medium=organic_social&utm_campaign=organic_post&utm_content=booking` |
| `/fb-lead[/<locale>]/<campaign>` | `/<locale>/?openBooking=1&lang=<booking-lang>&booking_source=facebook_lead_form&utm_source=facebook&utm_medium=paid_social&utm_campaign=<campaign>&utm_content=lead_form_thank_you` |
| `/meta-lead[/<locale>]/<campaign>` | `/<locale>/?openBooking=1&lang=<booking-lang>&booking_source=meta_lead_form&utm_source=meta&utm_medium=paid_social&utm_campaign=<campaign>&utm_content=lead_form_thank_you` |
| `/tt[/<locale>]` | `/<locale>/?lang=<booking-lang>&utm_source=tiktok&utm_medium=organic_social&utm_campaign=bio&utm_content=profile` |
| `/tt[/<locale>]/<event>` | `/<locale>/?lang=<booking-lang>&event=<event>&utm_source=tiktok&utm_medium=organic_social&utm_campaign=event_<event>&utm_content=event_link#events` |
| `/tt-book[/<locale>]` | `/<locale>/?openBooking=1&lang=<booking-lang>&booking_source=tiktok_bio_booking&utm_source=tiktok&utm_medium=organic_social&utm_campaign=bio&utm_content=booking` |
| `/tt-lead[/<locale>]/<campaign>` | `/<locale>/?openBooking=1&lang=<booking-lang>&booking_source=tiktok_lead_form&utm_source=tiktok&utm_medium=paid_social&utm_campaign=<campaign>&utm_content=lead_form_thank_you` |

The lead links also support the base path without a campaign segment, using
`utm_campaign=lead_form`.
