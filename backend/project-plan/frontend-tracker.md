# Frontend Tracker

## Project Goal
- Build screenshot-aligned artist and producer frontend experiences with reusable modules, clear flow gating, and stable API integration.

## Current Status
- Current phase: Phase 4 - Commerce and Account Flows
- Current module: Discovery + Upload + Resources Integrated
- Resume from: FE-P4-M3

## Phase List
- Phase 1: Foundation and App Shell
- Phase 2: Shared Components and Navigation
- Phase 3: Artist Discovery and Playback Flows
- Phase 4: Commerce and Account Flows
- Phase 5: Producer Onboarding and Subscription Flows
- Phase 6: Upload Wizards and Publish Flows
- Phase 7: Resources and Final Hardening

## Module List
- FE-M1 App Shell (header/nav/player/footer variants)
- FE-M2 Shared UI primitives (buttons, inputs, chips, cards, modal, drawer)
- FE-M3 Discovery (dashboard, beats, sound kits, producer profile)
- FE-M4 Engagement (likes/follows/history/notifications)
- FE-M5 Commerce (cart, checkout [Inferred], orders/downloads)
- FE-M6 Account/Settings (account details, billing, user dropdown)
- FE-M7 Producer Setup (agreement, KYC modal, setup hub, manage subscription)
- FE-M8 Upload Workflows (beat + sound kit steppers)
- FE-M9 Resources (blog, tutorial, help desk, FAQ)
- FE-M10 QA/A11y/Responsive polish

## Checklist of Tasks
## Phase 1: Foundation and App Shell
- [x] FE-P1-M1 Create `project-plan` planning artifacts from source references.
- [x] FE-P1-M2 Define route map for all screenshot-backed pages and inferred pages.
- [x] FE-P1-M3 Implement global layout with two-row header and persistent bottom player (`dashboard.png`).
- [x] FE-P1-M4 Configure role-aware CTA states (`Start Selling` vs `Upload`) in header.
- [x] FE-P1-M5 Implement theme tokens (dark surfaces, purple accent, status colors).
- [ ] FE-P1-M6 Add API client boundaries and typed response models for core endpoints.

## Phase 2: Shared Components and Navigation
- [ ] FE-P2-M1 Build mega menu variants:
- [x] Beats menu (`beat button.png`)
- [x] Browse menu (`browse button.png`)
- [x] Resources menu (`resources button.png`)
- [x] FE-P2-M2 Build user dropdown menu (`user icon dropdown.png`).
- [x] FE-P2-M3 Build notification drawer (`notification.PNG`).
- [x] FE-P2-M4 Build track row/card and price CTA variants (`search.png`, `track info.png`).
- [x] FE-P2-M5 Build filter bar with chips/selects/search/toggle (`search.png`).
- [x] FE-P2-M6 Build reusable stepper sidebar used by setup and uploads.

## Phase 3: Artist Discovery and Playback Flows
- [x] FE-P3-M1 Implement dashboard/listening feed sections (`dashboard.png`).
- [x] FE-P3-M2 Implement beats explore list + sort/filter states (`search.png`).
- [x] FE-P3-M3 Implement track detail + license cards + related tracks (`track info.png`).
- [x] FE-P3-M4 Implement producer profile layout (`producer profile.png`).
- [x] FE-P3-M5 Implement sound kits landing + kits22 card section (`sound kits.png`).
- [ ] FE-P3-M6 Wire play interactions to persistent bottom player.

## Phase 4: Commerce and Account Flows
- [x] FE-P4-M1 Implement cart empty state (`cart in dashbaord.png`).
- [x] FE-P4-M2 Implement cart filled table + summary sidebar (`cart button in dashboarf.png`).
- [ ] FE-P4-M3 Implement checkout page and success state [Inferred].
- [ ] FE-P4-M4 Implement orders/download history pages (`downlaod history button.png`, browse menu).
- [ ] FE-P4-M5 Implement account details page (`account setting.png`).
- [ ] FE-P4-M6 Implement billing address tab/form (`billing address.png`).

## Phase 5: Producer Onboarding and Subscription Flows
- [ ] FE-P5-M1 Implement start selling modal (`start selling.png`).
- [ ] FE-P5-M2 Implement seller agreement page (`seller aggre,ent page.png`).
- [ ] FE-P5-M3 Implement KYC reminder modal and routing (`kyc verifcafion.png`).
- [ ] FE-P5-M4 Implement producer dashboard + analytics cards (`producers dashbaord.png`).
- [x] FE-P5-M5 Implement setup hub account section (`setting button's account section.png`).
- [ ] FE-P5-M6 Implement payout section (`setting butting's payout details.png`).
- [ ] FE-P5-M7 Implement studio setup and studio controls pages (`studio setup.png`, `studio control.png`).
- [ ] FE-P5-M8 Implement manage subscription page (`manage subscription.png`).
- [ ] FE-P5-M9 Implement plans page (`pro plan.png`).

## Phase 6: Upload Wizards and Publish Flows
- [x] FE-P6-M1 Implement upload choice screen with plan-gating copy (`upload beat button top navbar.png`).
- [x] FE-P6-M2 Implement beat upload metadata step (`uplaod now's metadata.png`).
- [x] FE-P6-M3 Implement beat media upload step (`upaod now 's media upload.png`).
- [x] FE-P6-M4 Implement beat license step (`license.png`).
- [x] FE-P6-M5 Implement sound kit type step (`upload sound kit type.png`).
- [x] FE-P6-M6 Implement sound kit metadata step (`kit upload metadaya.png`).
- [x] FE-P6-M7 Implement sound kit upload files step (`kit upload data upload.png`).
- [x] FE-P6-M8 Implement sound kit licensing step (`kit upload license.png`).
- [ ] FE-P6-M9 Add draft-save and unsaved-change guards across wizard steps.

## Phase 7: Resources and Final Hardening
- [x] FE-P7-M1 Implement resources blog listing (`resources's blog sectiopn.png`).
- [x] FE-P7-M2 Implement single blog page (`single blog.png`).
- [x] FE-P7-M3 Implement tutorials page (`resources's tutorial.png`).
- [x] FE-P7-M4 Implement help desk page (`resources's help desk.png`).
- [x] FE-P7-M5 Implement FAQ accordion page (`faq.png`).
- [ ] FE-P7-M6 Complete responsive verification (desktop + mobile) on all primary flows.
- [ ] FE-P7-M7 Complete accessibility pass (keyboard, focus, contrast).
- [ ] FE-P7-M8 Complete visual parity pass against all reference screenshots.

## Notes / Blockers
- Label mismatch: UI should show `Your Orders` while backend domain remains `orders`.
- Checkout/success screens are not explicit in screenshots and are implemented as [Inferred].
- Final iconography and some copy are partly inferred due to screenshot blur.
- Beat and sound-kit upload flows are now wired to real backend draft/media/publish endpoints.

## Resume From Here
- Next task: FE-P4-M3 Implement checkout page and success state [Inferred].
- Dependencies: plan.md page inventory and backend endpoint contracts.
- Risks: route naming drift vs screenshot labels; gating logic coupling with backend entitlements.
