# BeatKosh Backend Development Plan

Version: 1.0  
Last Updated: 2026-03-07  
Primary Reference: `DOCS/prd.md`

## 1. Goal

Build a backend-first platform for BeatKosh with:
- Beat marketplace
- Bundles and beat tapes
- Licensing and orders
- Direct hiring and project milestones
- Messaging
- Verification and trust
- Local payment gateways

## 2. Tech Stack

- Python + Django + Django REST Framework
- PostgreSQL
- Celery + Redis
- FFmpeg for preview generation
- AWS S3 (or S3-compatible storage) for media
- JWT auth (DRF SimpleJWT)

## 3. Backend App Structure

- `accounts`
- `beats`
- `catalog`
- `orders`
- `payments`
- `projects`
- `messaging`
- `reviews`
- `verification`
- `analytics`
- `storage` (integration layer)

## 4. Cross-Cutting Standards

- API versioning: `/api/v1/...`
- OpenAPI docs enabled from day 1
- Role-aware permissions (`artist`, `producer`, admin)
- Atomic order/payment workflows with idempotency keys
- Async jobs for media processing and notifications
- Unit + integration tests for every shipped endpoint
- No feature considered done without `DOCS/progress.md` update

## 5. Phase Plan

## Phase 0: Foundation

### Scope
- Environment and configuration hardening
- Base project conventions
- CI-ready test setup

### Deliverables
- Environment config (`.env.example`)
- DRF + authentication setup
- Base response/error format
- Health check endpoint
- Initial OpenAPI docs endpoint

### Exit Criteria
- Server boots cleanly
- Health endpoint works
- Auth token issue/refresh endpoints work
- CI test command passes locally

## Phase 1: Accounts + Role Switching

### Scope
- Custom user model and profiles
- Artist/producer role switching
- Profile CRUD

### Core Models
- `User` (`is_artist`, `is_producer`, `active_role`)
- `ArtistProfile`
- `ProducerProfile`

### APIs
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/account/switch-role`
- `GET/PUT /api/v1/account/me`
- `GET /api/v1/producers/{id}`

### Exit Criteria
- Role switch works with permission checks
- Profile update flows validated by tests

## Phase 2: Beats + Catalog

### Scope
- Beat upload and metadata
- License options
- Bundles and beat tapes

### Core Models
- `Beat`, `BeatAudio`, `LicenseType`, `BeatTag`
- `Bundle`, `BundleItem`
- `BeatTape`, `BeatTapeTrack`

### APIs
- `GET /api/v1/beats`
- `GET /api/v1/beats/{id}`
- `POST /api/v1/beats/upload`
- `GET /api/v1/bundles`
- `POST /api/v1/bundles`
- `GET /api/v1/tapes`
- `POST /api/v1/tapes`

### Exit Criteria
- Producer can upload and publish beats
- Artist can browse beats, bundles, tapes
- Media preview generation pipeline is functional

## Phase 3: Orders + Payments + Wallet

### Scope
- Cart/order pipeline
- Payment verification and settlement
- Producer wallet and transactions

### Core Models
- `Order`, `OrderItem`, `PurchaseLicense`, `DownloadAccess`
- `Payment`, `Transaction`, `ProducerWallet`, `Payout`

### Gateways (planned)
- eSewa
- Khalti
- ConnectIPS
- PayU

### APIs
- `POST /api/v1/orders/create`
- `GET /api/v1/orders/{id}`
- `POST /api/v1/payments/initiate`
- `POST /api/v1/payments/webhook/{gateway}`
- `GET /api/v1/wallet/me`

### Exit Criteria
- End-to-end paid order completion works in sandbox mode
- Download access grants only valid purchases

## Phase 4: Hiring + Projects + Messaging

### Scope
- Hire producer flow
- Milestones and deliverables
- Project chat

### Core Models
- `ProjectRequest`, `Proposal`, `Project`, `Milestone`, `Deliverable`
- `Conversation`, `Message`

### APIs
- `POST /api/v1/projects/request`
- `POST /api/v1/projects/proposal`
- `GET /api/v1/projects`
- `GET /api/v1/conversations`
- `POST /api/v1/messages`

### Exit Criteria
- Artist-producer hiring flow works with milestone states
- Project messaging isolated by conversation permissions

## Phase 5: Trust + Reviews + Verification + Analytics

### Scope
- Verification requests and moderation
- Reviews and rating aggregation
- Base analytics events

### Core Models
- `Review`
- `VerificationRequest`, `VerificationDocument`
- Analytics event tables

### APIs
- `POST /api/v1/verification/requests`
- `GET /api/v1/verification/me`
- `POST /api/v1/reviews`
- `GET /api/v1/analytics/producer/{id}`

### Exit Criteria
- Verification workflow runs end-to-end
- Rating and trust signals appear in producer profile API

## 6. Testing Strategy

- Unit tests for models, serializers, permissions
- API integration tests for all critical flows
- Payment webhook signature validation tests
- Media processing task tests (mock FFmpeg where needed)

## 7. Release Strategy

- Milestone releases by phase (`v0.1`, `v0.2`, ...)
- Migration-safe deployments
- Rollback-ready release notes

## 8. Definition of Done (DoD)

A feature is done only when:
- Code merged
- Tests added and passing
- API docs updated
- Security/permission checks verified
- `DOCS/progress.md` updated (completed + changelog)

