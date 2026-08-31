# TLUXE Hairs — Shopify Theme

Classic Shopify Liquid theme for **TLUXE Hairs**, a premium Nigerian human-hair storefront. The theme is the customer-facing Online Store layer: catalog, product selection, cart, and handoff to **Shopify Checkout**. It does not process cards or bank payments.

**Live storefront:** [https://tluxehairs.shop](https://tluxehairs.shop)

This repository is source control for the theme. It is not the live Shopify deployment pipeline. Publishing a theme happens in Shopify Admin.

---

## Project status

| Area | Status |
| --- | --- |
| Classic Liquid storefront (templates, snippets, assets) | Implemented |
| Product pages, variant matching, Add to Bag | Implemented and tested on multiple catalog products |
| AJAX cart, cart drawer, cart page | Implemented and tested |
| Handoff to Shopify Checkout | Implemented and tested (302 to hosted checkout) |
| Native Shopify search | Implemented and tested (results and empty state) |
| Theme wishlist (localStorage) | Implemented |
| Customer account links (Shopify-native routes) | Implemented; New Customer Accounts redirect tested |
| Responsive layout and mobile navigation | Implemented |
| Accessibility (skip link, labels, drawer/menu keyboard) | Implemented |
| PWA manifest + service worker (non-aggressive) | Implemented |
| Judge.me review hooks | Implemented; no store reviews yet |
| PayPal Hosted Button (existing ID, gated off) | Implemented, **disabled** |
| Nigeria shipping rates in Shopify Admin | Configured; theme copy aligned |
| Nigeria + US shipping quotes for a real cart | Verified via Shopify Ajax `/cart/shipping_rates.json` (same engine Checkout uses) |
| Checkout payment methods (from Checkout payload) | Paystack, ONERWAY (Direct), Bank Deposit, PayPal Express appear as available lines — **no test payment completed** |
| Flutterwave | Not present in Checkout payload |
| Lagos address + shipping-rate picker in hosted checkout | Rates confirmed for Lagos/Nigeria and a US address; a filled Checkout UI session was not completed |
| Gift card template | Implemented |
| Header and mobile search forms | Implemented |
| Theme Check GitHub Action | Replaced by Theme CI (Liquid Theme Check + static validation) |
| Live theme publish | Requires explicit approval — development theme is not the live theme |

---

## Engineering highlights

Work already done on this theme and storefront, based on the live catalog and Admin—not a template rewrite:

- **Correct variant submission.** Product options resolve to a Shopify variant ID. If the combination is unavailable, the hidden variant field is cleared and Add to Bag is disabled. The form does not silently submit the first variant.
- **Honest catalog prices.** Product cards use `selected_or_first_available_variant` so sold-out cheaper lengths are not shown as the selling price.
- **Shopify cart as source of truth.** Add, change quantity, and remove go through `/cart/add.js` and `/cart/change.js`. Checkout is `GET /checkout` only.
- **Currency from the shop.** Liquid `| money` and JavaScript `shop.money_format` (NGN). Wishlist stores Shopify cents and formats with the same money helper.
- **Shipping copy matches Admin.** Theme no longer promises free shipping over ₦50,000. Nigeria checkout rates exist on the default delivery profile (Standard / Economy / Express).
- **Reviews are not invented.** Fake review names, scores, and a theme review form were removed. Judge.me widgets render when real reviews exist.
- **PayPal Hosted Button is isolated.** The existing hosted button is off by default and is documented as a separate PayPal path—not synced to Shopify variant, quantity, cart, tax, or shipping.
- **Safer storefront JS.** Cart drawer line items are built with DOM APIs (no product HTML injection); WhatsApp URLs are allowlisted; the service worker does not cache cart, checkout, or account.

---

## Technology stack

- **Shopify Online Store** — classic Liquid theme (no `sections/` directory)
- **Liquid** — layout, templates, snippets
- **JavaScript** — `assets/tluxe.js` (cart, variants, wishlist, PWA install prompt)
- **CSS** — `assets/tluxe.css`
- **Shopify Ajax Cart API** — `/cart.js`, `/cart/add.js`, `/cart/change.js`
- **Shopify Checkout** — hosted checkout, not a theme-built checkout
- **Judge.me** — review badge and product widget (app embed)
- **PWA** — web app manifest (generated with CDN icon URLs) and `assets/sw.js`

---

## Shopify architecture

This is a **classic Liquid theme**. Templates live under `templates/`. Shared UI lives in `snippets/`. There is intentionally no Online Store 2.0 `sections/` tree.

```
Customer
  → Liquid storefront (this repo)
  → POST /cart/add.js  (selected variant + quantity)
  → Shopify cart
  → GET /checkout
  → Shopify Checkout  (shipping, taxes, payment — Admin)
```

Shop currency is **NGN**. Presentment currencies in Admin are NGN only.

The customer domain is **tluxehairs.shop**. Theme CLI development uses the shop’s `.myshopify.com` store. This repo does not contain Admin API tokens.

---

## Major features

### Product and variant system

- Product gallery (images, optional video, mobile swipe, dots, thumbnails)
- Option swatches (length and other options from Shopify variants)
- Price and availability update from `window.TLUXE_VARIANTS`
- Quantity stepper
- Add to Bag posts the selected `id` via the product form
- Sold-out options are marked and cannot be added from the theme UI
- Quick Add on cards uses the first **available** variant only

### AJAX cart and cart drawer

- Header bag opens a dialog drawer
- Line items, variant titles, quantities, remove, and NGN subtotal from `/cart.js`
- Empty cart disables the drawer checkout button
- Dedicated cart page with Shopify `updates[line_key]` fields

### Shopify Checkout

- Drawer and cart page send customers to `/checkout`
- Theme does not collect card or bank details
- Checkout handoff has been confirmed (HTTP 302 to Shopify Checkout on the development preview)

Payment methods shown *inside* Checkout depend on **Settings → Payments**. A development Checkout session listed Paystack, ONERWAY (Direct), Bank Deposit, and PayPal Express as available lines. No test payment was completed. Flutterwave was not listed. The theme Hosted PayPal button stays disabled so it does not compete with Shopify Checkout.

### Search

- Header search goes to Shopify `/search`
- `templates/search.liquid` — product-only query, results grid, empty state, pagination when needed

### Wishlist

- Theme wishlist is **browser localStorage** (`tluxe_wishlist`)
- Heart controls on cards and product pages; list on `/pages/wishlist`
- Product URLs stored for the wishlist must be same-origin relative paths
- A Shopify wishlist app embed may also be installed on the shop; that is separate from this theme list

### Customer accounts

- Header and mobile menu use `routes.account_login_url`, `routes.account_register_url`, `routes.account_url`, and `routes.account_logout_url`
- Storefront login redirects to **Shopify New Customer Accounts**
- No custom authentication, passwords, or session store in the theme

### Responsive / mobile

- Mobile hamburger menu (same navigation source as desktop)
- Product swipe gallery and quantity/ATC layout for small viewports
- Cart drawer and floating WhatsApp control
- CSS wrapping for a long Admin navigation menu

### Accessibility

- Skip link to main content
- Labeled search and quantity controls
- Cart drawer as a dialog; Escape closes drawer and mobile menu
- Focus returns to the bag control when the drawer closes
- Variant buttons expose pressed/sold-out state

### PWA

- Manifest (name, icons, standalone display) injected with Shopify CDN icon URLs
- Service worker caches **static assets only**, network-first
- No caching of `/cart`, `/checkout`, `/account`, `/payments`, or checkout paths
- HTML navigations are network-only so prices and products are not served stale
- Install banner appears only when the browser fires `beforeinstallprompt`

This is not an offline store.

### Shipping

Shopify Admin (default General delivery profile, Lagos location) currently includes a **Nigeria** zone. Shopify’s Ajax shipping-rate API returned these quotes for a real RINA cart with a Lagos address:

| Method | Rate |
| --- | --- |
| Standard | ₦25,000 |
| Economy | ₦40,000 |
| Express | ₦55,000 |

The same cart with a New York address returned international Standard ₦45,000 / Economy ₦55,000 / Express ₦75,000. Theme copy states that shipping is calculated at checkout. There is **no** free-shipping threshold in Admin.

A second non-default **Rest of World** profile still lists Nigeria, Canada, UAE, and the United States at Nigeria domestic rates, but it has **no products assigned**. Catalog products use the default profile. Do not delete that profile without owner approval.

### Reviews (Judge.me)

- Product cards and PDPs expose Judge.me badge/widget containers and metafields
- Theme does not render invented names, star counts, or a fake review form
- Catalog currently has no Judge.me reviews; empty badges stay hidden per the app setting

### PayPal Hosted Button

An existing PayPal Hosted Button can render on product pages when the theme setting **Show PayPal Hosted Button on product pages** is enabled. It is **off by default**.

**Limitation:** that button is a separate PayPal purchase path. It does not read the selected Shopify variant, quantity, cart, taxes, or shipping. It must not be described as Shopify Checkout.

The Hosted Button ID is not changed in this repository. A second PayPal SDK is not added. If PayPal should be offered as a normal checkout method, that belongs in Shopify Admin Payments—not a second hosted button.

### WhatsApp

Theme WhatsApp links use the theme setting (default: a `wa.me` message link). Only `https://wa.me/` and `https://api.whatsapp.com/` URLs are accepted. No phone number is invented in the theme.

Footer Instagram, TikTok, and Facebook use theme settings (current brand URLs as defaults). Snapchat is omitted until a confirmed business URL is entered in Theme settings → Social & SEO. Contact and footer email use `shop.email`.

---

## Security considerations

- No Admin API tokens, `.env` files, or payment secrets in this repo
- Cart drawer interpolates titles and URLs through an HTML escape helper
- Wishlist ignores non-relative product URLs
- WhatsApp `href` values are allowlisted
- Service worker does not intercept commerce or account requests
- Theme never asks for card numbers, bank details, or payment credentials

---

## Performance considerations

- Single theme CSS/JS pair (`tluxe.css`, `tluxe.js`)
- PayPal SDK loads only on product templates **and** only if the Hosted Button setting is on
- Google Fonts load from the layout with `preconnect` (not a CSS `@import`)
- Product images use Shopify `image_url` and lazy-load except hero/logo
- Service worker does not cache HTML storefront pages

Shopify Theme Check reports `RemoteAsset` warnings for Google Fonts and the gated PayPal SDK. Those remotes are intentional.

---

## Validation and testing performed

| Check | Result |
| --- | --- |
| `shopify theme check` | 0 errors; RemoteAsset warnings on fonts and gated PayPal SDK |
| `node --check` on `tluxe.js` and `sw.js` | Pass |
| Homepage, collections, 5 product PDPs, search, cart, wishlist, contact, shipping page | HTTP 200 on development preview |
| `/pages/shipping-policy` | 200 — customer URL; uses the `page.shipping-returns` template |
| `/pages/shipping-returns` | 404 — no page has that handle; theme links do not use it |
| Hero file `curly-wig-back-no-watermark.png` | Present on Shopify Files/CDN (HTTP 200); earlier CLI proxy 502 was transient |
| Add to cart (multiple products / correct variant IDs) | 200, currency NGN |
| Checkout handoff | 302 to Shopify Checkout (`en-ng`) with the development preview theme |
| Lagos shipping quotes | Standard ₦25,000 / Economy ₦40,000 / Express ₦55,000 |
| US shipping quotes | Standard ₦45,000 / Economy ₦55,000 / Express ₦75,000 |
| Customer account URLs | 302 to New Customer Accounts (`region_country=AE`) |

A filled hosted Checkout address form (browser UI) was **not** completed. No real payment was taken.

---

## Shopify CLI development workflow

From this theme directory, with Shopify CLI authenticated to the shop:

```bash
shopify theme check
shopify theme list --store=YOUR_STORE.myshopify.com
shopify theme dev --store=YOUR_STORE.myshopify.com
```

`theme dev` syncs local files to a **development** theme only. It does not publish the live theme.

GitHub Actions runs **Theme CI** on `main`: Shopify Theme Check plus JSON, JavaScript syntax, practical CSS, secret-pattern, and repository-integrity checks (`scripts/ci-validate.js`). This repository is a Liquid theme, not a Node.js/npm package. There is no `package.json` and no `npm ci` workflow.

Do not run `shopify theme publish` unless the store owner explicitly approves replacing the live theme.

---

## Repository structure

```
layout/theme.liquid          Site chrome, SEO, cart drawer, PWA, WhatsApp
templates/                   Classic templates (index, product, collection, cart, search, pages, blog, 404, password, gift_card)
.github/workflows/           Theme CI (not Node/npm CI)
scripts/ci-validate.js       JSON, JS, CSS, secrets, integrity checks
snippets/                    product-card, page-hero, whatsapp-url
assets/                      tluxe.css, tluxe.js, sw.js, icons, leftover static manifest
config/                      settings_schema.json, settings_data.json, markets.json
locales/en.default.json
```

There is no `sections/` directory.

---

## Known limitations

- **Payments** appear in Checkout (Paystack, ONERWAY, Bank Deposit, PayPal Express) but no test order has been paid. Do not treat them as production-proven until a test/live transaction succeeds. Flutterwave is not listed.
- **Hosted PayPal button** is a parallel path and stays disabled for normal catalog checkout.
- **Nigeria market** in Admin is named Nigeria but still uses legacy handle `ae`. Account login can still redirect with `region_country=AE`. Checkout handoff in this pass used `en-ng`. The country Nigeria currently sits on the primary **Rest of World** market. Do not rename the handle alone — that does not move Nigeria.
- **Navigation** comes from Shopify `main-menu-1` (fallback `main-menu`). The live menu is long; the theme wraps it and skips duplicate URLs.
- **Sold-out variants** are blocked in the theme UI. Shopify `/cart/add.js` may still accept a crafted request for a DENY/zero-inventory variant; Checkout can refuse it later.
- **Judge.me** will look empty until customers leave real reviews.
- **Wishlist:** the theme list (`localStorage` on `/pages/wishlist`) should be the storefront source of truth. A separate Wishlist app embed can show a second heart. Disable the app embed in the theme editor if you want one control. Do not uninstall the app until that is confirmed.
- This GitHub remote is **not** what publishes the live shop.

---

## Deployment workflow

1. Develop and preview with `shopify theme dev` (development theme).
2. Review Theme Check and storefront flows (product → cart → checkout).
3. Push theme files with Shopify CLI or the theme editor when ready — **not** via `git push`.
4. Publish in Shopify Admin only after owner approval.

`git push` updates this GitHub backup. It does not change [tluxehairs.shop](https://tluxehairs.shop).

This storefront is **not** deployed on Vercel. Shopify Online Store is the host.

---

## License

Theme source for TLUXE Hairs. Not a general-purpose theme distribution.
