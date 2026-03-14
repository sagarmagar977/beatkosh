# BeatKosh PRD and Technical Documentation (Beat22 Alignment)

## 1. Product Goal

BeatKosh is a dual-role music platform where users can:

- Discover and license beats as artists.
- Upload, sell, and manage monetization as producers.
- Hire producers and manage project collaboration.
- Use verification and payment flows for trust and commerce.

This update aligns the product direction to `reference resource/beat22` (artist + producer reference sets) and introduces a direct reference-to-feature mapping layer.

## 2. Current System Architecture

### 2.1 Backend Stack

- Django + Django REST Framework
- JWT authentication (`rest_framework_simplejwt`)
- SQLite (local dev) / PostgreSQL (env-driven)

### 2.2 Frontend Stack

- Next.js App Router + TypeScript
- Tailwind-based styling
- API proxy rewrite through `/backend/*` to Django server

### 2.3 Domain Apps

- `accounts`: users, roles, artist/producer profiles, role switching
- `beats`: beats, tags, license types, upload endpoint
- `catalog`: bundles and beat tapes
- `orders`: order creation, items, download access
- `payments`: payment initiation/webhooks/simulation + producer wallet
- `projects`: artist-producer collaboration requests and milestones
- `messaging`, `reviews`, `verification`, `analytics_app`, `common`
- `reference_hub` (new): Beat22 reference indexing API and image serving
- `resources_app` (new): resources/blog/tutorial/help content and FAQ APIs

## 3. Beat22 Reference Integration

### 3.1 Source

- Root: `reference resource/beat22`
- Roles:
  - `artist` (33 images)
  - `producer` (21 images)

### 3.2 New Backend Module

Added app: `reference_hub`

Key endpoints:

- `GET /api/v1/reference/beat22/`
  - Returns role-wise screens, categories, tags, and implementation feature map.
- `GET /api/v1/reference/beat22/<role>/<slug>/image/`
  - Streams reference image files safely from local workspace.

Included in:

- `django_project/settings.py` (`INSTALLED_APPS`)
- `django_project/urls.py` (`/api/v1/reference` routes)

### 3.3 Data Returned

- Screen metadata: title, slug, category, tags, relative path, image URL.
- Totals by role and category.
- Feature implementation map for artist and producer tracks:
  - `live`
  - `in_progress`
  - `planned`

## 4. Frontend Enhancements (Beat22-aligned)

### 4.1 New Pages

- `/reference-hub`
  - Unified hub for Beat22 references
  - Artist/producer feature-track status cards
  - Screen galleries for both roles

- `/artist/studio`
  - Artist dashboard/discovery surface
  - Trending beats + artist feature map
  - Artist reference gallery

- `/producer/studio`
  - Producer dashboard surface
  - Upload form (metadata starter flow)
  - License + wallet visibility
  - Producer feature map + gallery

### 4.2 Navigation Updates

Main navigation now includes:

- Reference Hub
- Artist Studio
- Producer Studio

### 4.3 Reusable Frontend Modules

- `frontend/lib/reference.ts`
  - Typed models for reference summary and feature tracks
  - API fetch utility for Beat22 summary
  - image URL proxy helper

- `frontend/components/reference-screen-grid.tsx`
  - Shared reference gallery UI

- `frontend/components/feature-track-list.tsx`
  - Shared feature roadmap/status UI

## 5. Backend + Frontend Capability Matrix

### 5.1 Artist-facing

- Discovery/search/trending: **Live**
- Cart/checkout baseline: **Live**
- Download history and listening memory: **Live** (`/orders/history`, `/orders/downloads`, `/analytics/listening/*`, frontend `/library`)
- Resources/blog/help center: **Live** (`/resources/articles`, `/resources/faq`, frontend `/resources`)
- Likes/follows/drops feed: **Live** (`/account/follows/*`, `/account/likes/beats/*`, `/analytics/drops/feed`, frontend `/activity`)

### 5.2 Producer-facing

- Beat upload baseline: **Live**
- Upload wizard (media + metadata + license): **Live** (`/beats/upload-drafts*` backend + `/producer/upload-wizard` frontend)
- Wallet visibility: **Live**
- Subscription/pro-plan/settings parity: **Live** (`/payments/plans`, `/payments/subscription/me`, `/payments/payout-profile/me`, frontend `/producer/settings`)
- Seller agreement and advanced onboarding: **Planned**

## 6. API Contracts Introduced

### 6.1 `GET /api/v1/reference/beat22/`

Returns:

- `reference_name`
- `reference_root`
- `roles.artist` / `roles.producer`
- `totals`
- `feature_map.artist[]`
- `feature_map.producer[]`

### 6.2 `GET /api/v1/reference/beat22/<role>/<slug>/image/`

- Allowed roles: `artist`, `producer`
- Returns image binary with inferred content type
- 404 when role/slug is unknown or file missing

## 7. QA and Automation

### 7.1 Added Backend Test

- `reference_hub/tests.py`
  - summary endpoint response check
  - image endpoint binary response check

### 7.2 Verification Plan

- Backend:
  - Run `manage.py test reference_hub`
- Frontend:
  - Run `npm run lint` and `npm run build` in `frontend`
  - Navigate to new routes and verify data rendering and image loading

## 8. Next-phase Work (Recommended)

1. Implement real artist library/download-history models and APIs.
2. Split producer upload into full multi-step wizard with draft persistence.
3. Add resources/blog/help-center content models and admin tools.
4. Add notifications/activity feed models (follows, likes, drops).
5. Implement subscription/pro-plan backend with entitlement checks.

## 9. File Change Summary

Backend:

- `reference_hub/apps.py` (new)
- `reference_hub/urls.py` (new)
- `reference_hub/views.py` (new)
- `reference_hub/tests.py` (new)
- `django_project/settings.py` (updated)
- `django_project/urls.py` (updated)

Frontend:

- `frontend/lib/reference.ts` (new)
- `frontend/components/reference-screen-grid.tsx` (new)
- `frontend/components/feature-track-list.tsx` (new)
- `frontend/app/reference-hub/page.tsx` (new)
- `frontend/app/artist/studio/page.tsx` (new)
- `frontend/app/producer/studio/page.tsx` (new)
- `frontend/components/app-shell.tsx` (updated)
- `frontend/app/page.tsx` (updated)

Documentation:

- `PROJECT_DOCS/README.md` (new)
- `PROJECT_DOCS/PRD_BEAT22_ALIGNMENT.md` (new)
