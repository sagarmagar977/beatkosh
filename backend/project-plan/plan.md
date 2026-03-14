# Beat22 Implementation Plan (Frontend + Backend)

## Source of Truth
- Primary references:
  - `reference resource/reference-product-analysis.md`
  - `reference resource/beat22/artist/*.png`
  - `reference resource/beat22/producer/*.png`
- Note: user request mentioned `docs/reference-product-analysis.md`; actual file found at `reference resource/reference-product-analysis.md`.

## Project Summary
- Build a dual-mode music marketplace app:
  - Artist side: discovery, playback, likes/follows, cart/checkout, downloads/history, resources.
  - Producer side: seller onboarding, KYC, payout setup, studio settings, subscription plans, beat/sound-kit upload and sales dashboard.
- Visual and flow parity must follow screenshots first; markdown analysis fills gaps.

## Goals
- Deliver screenshot-aligned UI/UX for artist + producer journeys.
- Provide stable backend domains for catalog, commerce, engagement, onboarding, uploads, and CMS resources.
- Make work resumable with tracker-driven phase execution.

## Assumptions
- [Inferred] Existing Django apps (`accounts`, `beats`, `catalog`, `orders`, `payments`, etc.) will be extended rather than replaced.
- [Inferred] Frontend (Next.js) remains the presentation layer and consumes Django REST APIs.
- [Inferred] Checkout provider integration can start with stubbed/mock payment flow, then real gateway.
- [Inferred] Admin/moderation tooling is API-first and can use Django admin initially.

## Cross-Checked Pages and Flows
## Pages to Build
- Landing/Marketing home (`homepage.png`, `home.png`) [partially inferred long-scroll marketing sections]
- Dashboard/listening feed (`dashboard.png`, `dashabiord lsitening  page.png`)
- Beats explore/list (`search.png`, `trending buttonn.png`)
- Track detail + license selection (`track info.png`, `related tracks.png`)
- Producer profile (`producer profile.png`)
- Sound kit listing (`sound kits.png`, `soundkit.png`)
- Cart (`cart in dashbaord.png`, `cart button in dashboarf.png`)
- Followed by you / follower drops / recent history / download history (`followed by u.png`, `follower drops.png`, `recently played.png`, `downlaod history button.png`)
- Account settings + billing address (`account setting.png`, `billing address.png`)
- Notifications drawer (`notification.PNG`)
- Resources: blog list + single blog + tutorial + help desk + FAQ
- Producer dashboard + plan upsell (`producers dashbaord.png`)
- Seller setup hub: account, payout, studio setup, studio controls, manage subscription
- Upload choice page (`upload beat button top navbar.png`)
- Beat upload wizard: metadata, media, license
- Sound kit upload wizard: kit type, metadata, files, licensing
- Plan/pricing page (`pro plan.png`)
- Seller agreement page + modal gate (`seller aggre,ent page.png`, `start selling.png`)
- KYC modal (`kyc verifcafion.png`)

## Noted Mismatches and Chosen Direction
- Analysis says `Order History`; screenshot menu uses `Your Orders`.
  - Direction: implement `Your Orders` label in UI; map backend resource to `orders`.
- Analysis implies upload is always available; screenshots show gating:
  - sound kit upload blocked on free plan (`upload beat button top navbar.png`)
  - account + bank required before final selling (`uplaod now's metadata.png`, setup pages)
  - Direction: implement capability gating matrix (plan + profile completeness + KYC).
- Analysis treats some pages as inferred (checkout/success/auth); screenshots do not show full states.
  - Direction: implement minimal but complete versions and tag as inferred in docs and trackers.

## Frontend Architecture
- App Shell Layer
  - Header: logo, search + category, notification, cart, user menu, role CTA.
  - Primary nav + mega menus (`Beats`, `Browse`, `Resources`).
  - Persistent bottom audio player.
- Shared UI Layer
  - Buttons, chips, tags, cards, modals, drawers, steppers, form controls, table/list rows.
- Discovery Layer
  - Dashboard sections, beats list with filters, sound kits grid, track row actions, profile page.
- Commerce Layer
  - License cards, cart table, coupon/summary, checkout states, download entitlement views.
- Producer Layer
  - Start selling modal, seller agreement, setup hub forms, subscription screens, upload wizards.
- CMS/Resources Layer
  - Blog list/single, tutorials, help desk, FAQ accordion.
- State and Integration
  - Auth/session context
  - Player state
  - Cart state
  - Notifications state
  - Upload draft state

## Backend Architecture
- Identity & Roles Domain
  - User, roles (artist/producer), producer profile, account settings.
- Catalog Domain
  - Beat, beat metadata facets, beat licenses, sound kits, playlists, tags.
- Engagement Domain
  - likes/favorites, follows, play history, download history, notifications.
- Commerce Domain
  - cart/cart items, orders/order items, coupon logic, transactions, payout shares.
- Producer Onboarding Domain
  - seller agreement acceptance, KYC verification, payout bank account, studio setup/controls.
- Subscription Domain
  - plans, producer subscriptions, credits/limits, entitlement checks.
- Upload Domain
  - upload drafts, file processing metadata, publish workflow.
- Resources/CMS Domain
  - blog posts, tutorials, help articles, FAQ entries.

## Database Entities (Implementation Set)
- User, ProducerProfile
- Beat, BeatLicense, SoundKit, Playlist
- Cart, CartItem, Order, OrderItem, PaymentTransaction
- Follow, LikeFavorite, PlayHistory, DownloadHistory, Notification
- KYCVerification, PayoutBankAccount, SellerAgreementAcceptance
- SubscriptionPlan, ProducerSubscription
- UploadDraft
- BlogPost, Tutorial, HelpArticle, FAQItem

## API / Domain Features
- Auth/Profile
  - register/login/logout, session/profile read/update, role switch, billing address.
- Discovery
  - dashboard feed blocks, beats search/filter/sort, sound kits list/filter, related tracks.
- Player + Engagement
  - play ping/history, like/unlike, follow/unfollow, notification read state.
- Commerce
  - add/remove cart item, license selection, coupon apply, checkout create, order list/detail, downloads.
- Producer Setup
  - seller agreement accept, KYC submit/status, payout submit/status, studio settings update.
- Subscription
  - plans list, subscribe/upgrade, entitlement check endpoint.
- Upload Workflows
  - create draft, save step payload, upload files, validate licensing fields, publish.
- Resources
  - blog/tutorial/help/faq list + detail.

## Frontend-Backend Integration Points
- `/api/me` + `/api/auth/*` for shell and access control.
- `/api/dashboard/*`, `/api/beats`, `/api/soundkits`, `/api/producers/:id`.
- `/api/player/events`, `/api/follows`, `/api/likes`, `/api/notifications`.
- `/api/cart`, `/api/orders`, `/api/checkout`, `/api/downloads`.
- `/api/producer/setup/*`, `/api/producer/subscription/*`, `/api/producer/uploads/*`.
- `/api/resources/*`.

## Module Dependencies
- Auth + user profile is prerequisite for all personalized surfaces.
- Catalog must exist before dashboard, search, track detail, and cart.
- Subscription + setup status must be available before upload/publish actions.
- Cart depends on catalog + license entities.
- Orders/transactions depend on cart checkout.
- Download history depends on fulfilled orders or free-download entitlements.
- Notifications depend on engagement + commerce + onboarding events.

## Build Order
1. Foundation: auth/session, app shell, design tokens, shared components.
2. Discovery core: dashboard, beats list, track detail, sound kits, producer profile.
3. Engagement + player events: likes/follows/history/notifications.
4. Commerce: cart, checkout (inferred), orders/download history.
5. Producer setup: agreement, KYC, account/payout/studio controls, subscription.
6. Upload workflows: beat + sound kit multi-step draft + publish.
7. Resources/CMS pages.
8. QA hardening, accessibility, responsive tuning, telemetry.

## Milestones
- M1: Shell + Auth + Discovery read-only parity.
- M2: Interactive discovery + engagement + notifications.
- M3: Cart to order flow complete.
- M4: Producer onboarding + subscription gating complete.
- M5: Beat and sound-kit publishing complete.
- M6: Resources and final cross-flow QA complete.

## Phase-by-Phase Roadmap
- Phase 1: Platform foundation
- Phase 2: Artist discovery and playback surfaces
- Phase 3: Commerce and entitlements
- Phase 4: Producer onboarding and subscription
- Phase 5: Upload creation and publishing
- Phase 6: Resources/CMS
- Phase 7: Stabilization and release readiness

## Risks and Unknowns
- Final payment gateway and payout provider specs are unknown [Inferred].
- Exact subscription limit semantics (uploads, credits, commissions) need product confirmation.
- License legal wording/versioning for seller agreement and terms may require compliance review.
- Audio processing/storage constraints (large files, stems, kit archives) may impact infra sizing.
- Some screens include blurred metrics/content; exact field-level requirements are partially inferred.

## Resumability Rules
- Every implementation PR must reference tracker phase + module + task ID.
- Update tracker `Current Status` and `Resume From Here` after each work session.
- Mark inferred implementations explicitly in PR notes until validated against additional references.
