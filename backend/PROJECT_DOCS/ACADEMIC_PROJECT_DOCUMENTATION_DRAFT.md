# BeatKosh Academic Project Documentation Draft

Version: 0.1  
Prepared from:
- `resources/md/beat-kosh-ida-proejct-idea.md`
- `backend/DOCS/prd.md`
- `backend/DOCS/design.md`
- `backend/PROJECT_DOCS/PRD_BEAT22_ALIGNMENT.md`
- current backend and frontend codebase

## 1. Title

**BeatKosh: A Multi-Vendor Marketplace and Freelance Collaboration Platform for Nepali Music**

## 2. Abstract

BeatKosh is a web-based music platform designed for the Nepali music ecosystem. The system combines a beat marketplace, producer services, artist discovery flows, project collaboration tools, verification features, and commerce infrastructure into one product. The original project idea focused on solving the absence of a Nepal-specific platform where artists could purchase beats, hire producers, and use local payment systems. The current codebase expands that idea into a full-stack implementation using Django, Django REST Framework, Next.js, TypeScript, SQLite/PostgreSQL-compatible data modeling, and local media handling.

The platform supports dual-role users who can operate as artists and producers, browse and upload beats, manage licensing, create orders, access payments and wallet flows, maintain project milestones, use messaging and reviews, and explore supporting resources such as tutorials, blog content, and FAQs. BeatKosh also includes a reference-alignment layer inspired by Beat22, helping the team map implemented features against real-world marketplace patterns. This document reframes the initial proposal into a project documentation draft based on the actual architecture and features present in the codebase.

## 3. Introduction

The Nepali independent music scene is growing rapidly, especially among hip-hop, rap, and digital-first creators. However, many producers and artists still rely on fragmented channels such as Facebook, Instagram, YouTube, TikTok, and private messaging to buy beats, negotiate services, and manage creative projects. These workflows are informal, difficult to trust, and hard to scale.

BeatKosh is proposed as a centralized digital platform where:
- producers can upload and monetize beats, sound kits, and related offerings
- artists can discover music assets, purchase licenses, and manage their purchased library
- artists can request collaboration and milestone-based work from producers
- both sides can use a more trustworthy system with verification, reviews, analytics, and transaction records

The current implementation shows that BeatKosh is not only a concept document but an active software system with backend services, frontend pages, reference-guided design work, and testing infrastructure.

## 4. Problem Statement

The project addresses the following problems:

1. Nepal lacks a dedicated digital platform equivalent to marketplaces such as BeatStars or reference systems like Beat22.
2. Beat selling and music service hiring are often handled through unstructured social communication, which creates risk in pricing, delivery, and ownership.
3. Producers have limited tools to present catalogs, manage uploads, define licenses, and track monetization.
4. Artists have limited ways to discover, compare, and safely purchase local beats in one place.
5. Collaboration on larger projects such as singles, EPs, or albums often lacks milestone tracking, communication structure, and trust signals.
6. Existing global products are not always aligned with local payment expectations, local market behavior, or Nepali creative workflows.

## 5. Motivation

BeatKosh is motivated by both product need and local opportunity.

- It supports Nepali producers by giving them a structured platform for sales and visibility.
- It supports artists by making beat discovery, licensing, and collaboration more accessible.
- It creates a local-first digital product for a growing music and creator economy.
- It offers an academic project with strong practical value because it combines marketplace engineering, role-based systems, media handling, and platform trust.

## 6. Objectives

The main objectives of BeatKosh are:

1. To build a multi-vendor platform where multiple producers can maintain profiles and list music assets.
2. To provide a dual-role user system so users can switch between artist and producer contexts.
3. To support beat uploads, metadata management, license configuration, and media publishing workflows.
4. To enable artists to browse, preview, purchase, and access licensed music content.
5. To implement collaboration flows with project requests, proposals, milestones, deliverables, and messaging.
6. To improve trust through reviews, verification, analytics, and structured order/payment records.
7. To organize educational and support content through resources, tutorials, help desk material, and FAQ pages.

## 7. Scope of the Project

### 7.1 In Scope

- User registration and authentication
- Artist and producer profiles
- Role switching
- Beat listing, detail viewing, and upload drafts
- Sound kit, bundle, and beat tape support
- Orders and payment lifecycle support
- Wallet, subscription, and payout profile features
- Project collaboration flows
- Messaging between project participants
- Reviews and verification requests
- Analytics such as listening history and activity drops
- Resources center with article and FAQ support
- Reference hub for Beat22-inspired implementation tracking

### 7.2 Out of Scope or Partial

- fully production-ready external payment gateway deployment
- advanced audio fingerprinting and copyright detection
- native mobile application
- complete seller agreement workflow and polished KYC onboarding UX
- deep recommendation engine implementation beyond current baseline

## 8. Proposed System Overview

BeatKosh is implemented as a full-stack web application with a Django backend and a Next.js frontend.

### 8.1 Backend Overview

The backend is organized into domain-specific Django apps:

- `accounts`: user roles, profiles, follows, likes
- `beats`: beat data, license types, tags, upload drafts
- `catalog`: bundles, beat tapes, sound kits, sound kit drafts
- `orders`: order records, order items, license purchases, download access
- `payments`: payment lifecycle, transactions, wallet, plans, subscriptions, payout profiles
- `projects`: project requests, proposals, projects, milestones, deliverables
- `messaging`: conversations and messages
- `reviews`: producer review model and APIs
- `verification`: verification request flows
- `analytics_app`: analytics events, listening history, activity drops
- `reference_hub`: Beat22 reference indexing and image serving
- `resources_app`: articles and FAQ content for the resources center

### 8.2 Frontend Overview

The frontend is built with Next.js App Router and TypeScript. Current route groups include:

- public discovery and landing pages
- beat exploration pages
- producer and artist studio pages
- upload and settings pages for producers
- resource center and article detail pages
- orders, library, wallet, verification, projects, and activity pages
- reference hub pages for implementation comparison and design alignment

## 9. Development Environment and Technology Stack

### 9.1 Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4

### 9.2 Backend

- Python
- Django
- Django REST Framework
- drf-spectacular for API schema and API docs

### 9.3 Storage and Media

- SQLite in current local setup
- PostgreSQL-compatible project direction
- local media storage in development
- design intention for cloud/object storage support

### 9.4 Other Platform Concepts

- JWT-based authentication flow
- media upload support for beats and sound kits
- structured REST endpoints under `/api/v1`

## 10. Functional Requirements

### 10.1 User and Role Management

- users can register and log in
- users can have artist and producer capabilities
- users can switch active role
- users can view and update their own profile information

### 10.2 Marketplace

- artists can browse beat listings
- artists can view beat detail pages
- producers can upload beats through draft and publish flows
- license data is attached to beats
- catalog supports bundles, beat tapes, and sound kits

### 10.3 Commerce

- artists can create orders
- purchased items generate access records
- payment initiation and confirmation flows exist
- producer wallet and ledger data are supported
- subscriptions and payout profile data are supported

### 10.4 Collaboration

- artists can create project requests
- proposals can be created and managed
- projects contain milestones and deliverables
- conversations and messages support communication

### 10.5 Trust and Growth

- producers can receive reviews
- users can submit verification requests
- listening history and activity feed data exist
- users can like beats and follow producers

### 10.6 Resources and Support

- the system includes resource articles
- article detail pages are available
- FAQ entries are modeled in the backend
- frontend resources pages expose educational/help content

## 11. Non-Functional Requirements

- clean separation between frontend and backend
- scalable app-based backend organization
- API consistency through versioned routes
- support for maintainability and future extension
- role-aware access control
- test coverage for major flows
- development readiness for future production hardening

## 12. System Design and Architecture

### 12.1 Architectural Style

The system follows a client-server architecture:

- Next.js frontend consumes backend APIs
- Django REST Framework exposes application services
- media and database resources are managed server-side

### 12.2 Route and API Design

The backend exposes routes such as:

- `/api/v1/account/*`
- `/api/v1/beats/*`
- `/api/v1/orders/*`
- `/api/v1/payments/*`
- `/api/v1/projects/*`
- `/api/v1/reviews/*`
- `/api/v1/verification/*`
- `/api/v1/analytics/*`
- `/api/v1/reference/*`
- `/api/v1/resources/*`

The frontend uses a shared API helper in `frontend/lib/api.ts` to normalize requests and media URLs.

### 12.3 High-Level Flow

1. Users authenticate and enter the platform.
2. Artists browse beats, resources, and producer profiles.
3. Producers manage uploads, subscriptions, and settings.
4. Orders and payment records support commercial flows.
5. Projects and messaging support collaboration beyond one-time purchases.

## 13. Database and Core Data Entities

Important modeled entities in the current codebase include:

- `ArtistProfile`
- `ProducerProfile`
- `ProducerFollow`
- `BeatLike`
- `LicenseType`
- `BeatTag`
- `Beat`
- `BeatUploadDraft`
- `Bundle`
- `BeatTape`
- `SoundKit`
- `SoundKitUploadDraft`
- `Order`
- `OrderItem`
- `PurchaseLicense`
- `DownloadAccess`
- `Payment`
- `Transaction`
- `ProducerWallet`
- `WalletLedgerEntry`
- `ProducerPlan`
- `ProducerSubscription`
- `ProducerPayoutProfile`
- `ProjectRequest`
- `Proposal`
- `Project`
- `Milestone`
- `Deliverable`
- `Conversation`
- `Message`
- `Review`
- `VerificationRequest`
- `AnalyticsEvent`
- `ListeningHistory`
- `ActivityDrop`
- `ResourceArticle`
- `FAQItem`

## 14. Current Feature Mapping Against the Original Idea

### 14.1 Already Implemented Well

- multi-vendor architecture direction
- artist and producer role flows
- beat uploads and marketplace browsing
- order and payment baseline
- collaboration project baseline
- resource/help center support
- verification, reviews, and analytics baseline
- reference-driven UI alignment work

### 14.2 Partially Implemented or Still Evolving

- polished KYC and seller agreement workflow
- final production-grade payment ecosystem
- advanced recommendation engine maturity
- mobile app path
- copyright fingerprinting workflow

## 15. Testing and Quality Assurance

The project includes a testing and verification direction through:

- Django app tests across multiple modules
- project-level validation scripts in `PROJECT_DOCS/scripts`
- API schema support through drf-spectacular
- frontend lint/build workflow
- CI pipeline references in project documentation

## 16. Business Model Alignment

The original idea proposed a platform fee and premium producer features. The current codebase already supports parts of that strategy through:

- marketplace transactions
- wallet and payout structures
- plan and subscription models
- producer settings related to monetization

This means the codebase is aligned with a realistic future revenue model even if some business logic will continue to evolve.

## 17. Conclusion

BeatKosh has moved beyond a simple academic proposal into a working product foundation. The implemented system reflects the central idea of a Nepal-focused music marketplace and collaboration platform while also adding structured engineering decisions, domain modeling, feature expansion, and reference-based UI alignment. The codebase demonstrates that the concept is technically feasible and already operational across major platform areas such as accounts, catalog, commerce, collaboration, trust, and resources.

For final academic submission, this draft can be expanded into a polished report with diagrams, screenshots, methodology, testing evidence, timeline tables, and chapter formatting required by the institution.

## 18. Future Enhancements

Recommended future enhancements include:

1. complete seller agreement and KYC onboarding journey
2. improve payment gateway production readiness
3. add advanced recommendation and personalization
4. add audio fingerprinting and copyright monitoring
5. create richer analytics dashboards for producers
6. build native or cross-platform mobile clients
7. strengthen admin moderation and dispute workflows

## 19. Suggested Next Documentation Set

To turn this draft into a submission-ready project report, the next files should be prepared:

1. `Chapter 1 - Introduction`
2. `Chapter 2 - Literature Review or Reference Study`
3. `Chapter 3 - System Analysis and Requirements`
4. `Chapter 4 - System Design and Architecture`
5. `Chapter 5 - Implementation Details`
6. `Chapter 6 - Testing and Results`
7. `Chapter 7 - Conclusion and Future Work`
8. `Appendix - API routes, screenshots, schema, and sample data`
