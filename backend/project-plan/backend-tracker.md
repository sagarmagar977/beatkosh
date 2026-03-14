# Backend Tracker

## Project Goal
- Deliver API and domain services that support all screenshot-backed artist/producer flows: discovery, engagement, commerce, onboarding, subscription gating, uploads, and resources.

## Current Status
- Current phase: Phase 5 - Upload Drafts and Publish Pipelines
- Current module: Beat + SoundKit Upload Domains
- Resume from: BE-P2-M6

## Phase List
- Phase 1: Core Domain Foundation
- Phase 2: Discovery and Engagement APIs
- Phase 3: Commerce and Entitlements
- Phase 4: Producer Onboarding and Subscription
- Phase 5: Upload Drafts and Publish Pipelines
- Phase 6: Resources/CMS
- Phase 7: Hardening, Observability, and Release

## Module List
- BE-M1 Identity and Profiles
- BE-M2 Catalog (beats, licenses, sound kits, playlists)
- BE-M3 Engagement (plays, likes, follows, notifications, history)
- BE-M4 Commerce (cart, orders, checkout, transactions)
- BE-M5 Producer Onboarding (agreement, KYC, payout, studio settings)
- BE-M6 Subscription and Plan Entitlements
- BE-M7 Upload Draft and File Metadata Workflows
- BE-M8 Resources/CMS
- BE-M9 Platform concerns (authz, validation, throttling, logs, tests)

## Checklist of Tasks
## Phase 1: Core Domain Foundation
- [x] BE-P1-M1 Build implementation plan and tracker scaffolding from references.
- [ ] BE-P1-M2 Validate current models against required entity set in `project-plan/plan.md`.
- [x] BE-P1-M3 Add/adjust role-aware user profile schema (artist/producer mode).
- [ ] BE-P1-M4 Normalize producer profile fields (verification, stats, social links).
- [ ] BE-P1-M5 Finalize serialization conventions and error envelope shared across APIs.
- [x] BE-P1-M6 Establish permissions matrix for artist-only vs producer-only endpoints.

## Phase 2: Discovery and Engagement APIs
- [ ] BE-P2-M1 Implement dashboard feed endpoint for sectioned blocks (`dashboard.png`).
- [ ] BE-P2-M2 Implement beats search/filter/sort API (`search.png`).
- [x] BE-P2-M3 Implement track detail API with license options and related tracks (`track info.png`).
- [x] BE-P2-M4 Implement sound kits list/filter endpoints (`sound kits.png`).
- [ ] BE-P2-M5 Implement producer profile + beat list endpoint (`producer profile.png`).
- [ ] BE-P2-M6 Implement play event ingestion and play history endpoints (`recently played.png`).
- [ ] BE-P2-M7 Implement like/favorite endpoints (`liked button.png`).
- [ ] BE-P2-M8 Implement follow/unfollow + followed/follower drops endpoints (`followed by u.png`, `follower drops.png`).
- [ ] BE-P2-M9 Implement notifications list/read APIs (`notification.PNG`).

## Phase 3: Commerce and Entitlements
- [ ] BE-P3-M1 Implement cart CRUD with mixed item types beat/soundkit (`cart in dashbaord.png`).
- [ ] BE-P3-M2 Implement license-aware cart item pricing (`cart button in dashboarf.png`).
- [ ] BE-P3-M3 Implement coupon and fee computation service.
- [ ] BE-P3-M4 Implement checkout session creation [Inferred].
- [ ] BE-P3-M5 Implement order placement and order item snapshots.
- [ ] BE-P3-M6 Implement payment transaction state machine.
- [x] BE-P3-M7 Implement download entitlement issuance and download history (`downlaod history button.png`).
- [ ] BE-P3-M8 Implement `Your Orders` listing endpoint (UI label aligned with screenshot).

## Phase 4: Producer Onboarding and Subscription
- [ ] BE-P4-M1 Implement seller agreement acceptance endpoint (`seller aggre,ent page.png`, `start selling.png`).
- [ ] BE-P4-M2 Implement KYC submission/status endpoints (`kyc verifcafion.png`).
- [ ] BE-P4-M3 Implement payout bank account create/update/status endpoints (`setting butting's payout details.png`).
- [ ] BE-P4-M4 Implement studio setup + studio controls endpoints (`studio setup.png`, `studio control.png`).
- [ ] BE-P4-M5 Implement subscription plans list and plan detail endpoints (`pro plan.png`).
- [ ] BE-P4-M6 Implement producer subscription create/upgrade/cancel endpoints (`manage subscription.png`).
- [ ] BE-P4-M7 Implement entitlement check service for upload and feature gating.

## Phase 5: Upload Drafts and Publish Pipelines
- [ ] BE-P5-M1 Implement generic upload draft model/API for multi-step save.
- [ ] BE-P5-M2 Implement beat metadata step validation (`uplaod now's metadata.png`).
- [x] BE-P5-M3 Implement beat media file metadata + storage references (`upaod now 's media upload.png`).
- [ ] BE-P5-M4 Implement beat license payload validation (`license.png`).
- [x] BE-P5-M5 Implement sound kit type and originality assertion validation (`upload sound kit type.png`).
- [x] BE-P5-M6 Implement sound kit metadata and element schema validation (`kit upload metadaya.png`).
- [x] BE-P5-M7 Implement sound kit archive/preview/reference-link handling (`kit upload data upload.png`).
- [x] BE-P5-M8 Implement sound kit licensing/rights distribution validation (`kit upload license.png`).
- [ ] BE-P5-M9 Implement publish transition with gating:
- [ ] account complete
- [ ] payout complete
- [ ] KYC status
- [ ] plan entitlement

## Phase 6: Resources/CMS
- [ ] BE-P6-M1 Implement blog list/detail endpoints (`resources's blog sectiopn.png`, `single blog.png`).
- [ ] BE-P6-M2 Implement tutorial list endpoints (`resources's tutorial.png`).
- [ ] BE-P6-M3 Implement help desk article/category endpoints (`resources's help desk.png`).
- [ ] BE-P6-M4 Implement FAQ list endpoint (`faq.png`).
- [ ] BE-P6-M5 Add lightweight admin workflows for CMS publishing states.

## Phase 7: Hardening, Observability, and Release
- [ ] BE-P7-M1 Add end-to-end API tests for critical flows:
- [ ] discovery to cart
- [ ] checkout to order to download
- [ ] producer onboarding to publish
- [ ] BE-P7-M2 Add audit events for agreement, KYC, payout, subscription, publish.
- [ ] BE-P7-M3 Add rate limits and abuse protection for public list/search APIs.
- [ ] BE-P7-M4 Add background jobs for notification fanout and async file processing [Inferred].
- [ ] BE-P7-M5 Finalize API documentation and integration contracts for frontend.

## Notes / Blockers
- Payment provider and payout rail selection are pending [Inferred].
- File storage constraints for large audio/stem/zip payloads need infrastructure decision.
- Some producer analytics metrics in screenshots are blurred; exact formulas are unknown.
- Implemented now:
- `POST /api/v1/account/start-selling/` enables producer role and switches active mode to `producer`.
- Beat write/upload-draft/publish actions now require active role `producer`.
- `ffmpeg`-based streaming preview generation added for beat uploads/draft updates while preserving HQ source audio.
- `GET /api/v1/orders/downloads/<beat_id>/hq-url/` returns entitled HQ download URL for paid purchases.
- SoundKit domain added end-to-end: list/create, draft save/update, file uploads, publish.

## Resume From Here
- Next task: BE-P1-M2 Validate current models against required entity set in `project-plan/plan.md`.
- Dependencies: existing Django migrations and current API surface.
- Risks: schema churn during subscription/upload gating implementation.
