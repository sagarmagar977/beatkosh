# BeatKosh Frontend Design Specification

Version: 1.0
Source: Derived from `DOCS/prd.md`
Target Stack: Next.js App Router + TypeScript + Tailwind CSS
Scope: Frontend experience for the backend-first BeatKosh marketplace and collaboration platform

---

## 1. Purpose

This document translates the product requirements in `prd.md` into a frontend design and implementation specification.

The goal is to define:

- page structure
- user journeys
- component system
- UI states
- dashboard behavior
- responsive layout rules
- API integration expectations

This spec assumes the backend already exists or is being built in parallel.

---

## 2. Product Positioning

BeatKosh is a hybrid product:

- BeatStars-style marketplace for beats, bundles, and beat tapes
- Fiverr-style producer hiring and project collaboration

The frontend should feel:

- creator-first
- music-native
- trustworthy
- fast to browse
- easy to purchase
- clear when switching between artist and producer roles

---

## 3. Core Frontend Goals

The frontend should help users do four things quickly:

1. Discover and preview beats
2. Buy beats, bundles, and beat tapes with the correct license
3. Hire producers and manage music projects
4. Build trust through profile quality, verification, and reviews

Secondary goals:

- support role switching cleanly
- surface trust signals everywhere important
- make local payment checkout feel reliable
- keep the MVP functional before becoming highly decorative

---

## 4. Primary User Types

### Artist mode

Primary tasks:

- browse beats
- filter catalog
- preview audio
- purchase licenses
- hire producers
- manage active projects

### Producer mode

Primary tasks:

- manage profile
- upload beats
- create bundles
- create beat tapes
- review hiring requests
- manage delivery milestones
- track sales and wallet status

### Admin

Admin UI is not part of the public frontend MVP unless a separate internal panel is later required.

---

## 5. Experience Principles

### 5.1 Discovery first

The marketplace homepage and catalog must immediately surface playable content, filters, genres, trust signals, and pricing.

### 5.2 Audio is the product

Beat cards and beat detail pages should prioritize:

- cover art
- waveform or progress bar
- preview playback
- BPM / key / mood / genre metadata

### 5.3 Trust must be visible

Profiles, listings, and hiring surfaces should show:

- verification badge
- rating
- review count
- total sales
- response time if available

### 5.4 Role context should never be ambiguous

A user with both artist and producer access must always know:

- current active role
- what actions are available in that role
- how to switch mode

### 5.5 Commerce should feel low friction

The path from preview to checkout should be short and obvious.

---

## 6. Recommended Frontend Architecture

### 6.1 Tech choices

- Next.js App Router
- TypeScript
- Tailwind CSS
- TanStack Query for data fetching and caching
- Zustand or Context for lightweight client state such as player, cart, and active role
- React Hook Form + Zod for forms

### 6.2 App zones

The frontend should be split into four main zones:

1. Public marketing and discovery pages
2. Marketplace pages
3. Authenticated user dashboards
4. Shared commerce and messaging flows

### 6.3 Suggested route structure

```txt
/
/beats
/beats/[slug]
/bundles
/bundles/[slug]
/tapes
/tapes/[slug]
/producers
/producers/[slug]
/cart
/checkout
/login
/register
/account
/account/switch-role
/dashboard
/dashboard/library
/dashboard/orders
/dashboard/projects
/dashboard/messages
/dashboard/profile
/dashboard/verification
/dashboard/wallet
/dashboard/producer/beats
/dashboard/producer/bundles
/dashboard/producer/tapes
/dashboard/producer/upload
/dashboard/producer/hiring
```

---

## 7. Navigation Design

### 7.1 Global header

Desktop navigation should include:

- logo
- search
- browse beats
- bundles
- beat tapes
- producers
- projects or hire producer
- cart
- role switcher if authenticated
- profile menu

### 7.2 Mobile navigation

Use a bottom or drawer-based navigation prioritizing:

- Home
- Beats
- Search
- Cart
- Dashboard

### 7.3 Role switcher

Authenticated users with multiple roles should see a compact switcher in the header and dashboard shell.

Switcher behavior:

- displays current active role
- updates client state immediately
- confirms with backend API
- reroutes user to the matching dashboard context

Examples:

- Artist Mode -> purchase and project tracking emphasis
- Producer Mode -> upload, sales, and hiring management emphasis

---

## 8. Core Page Specifications

## 8.1 Home page

Purpose:

- explain product value fast
- promote discovery
- highlight trust and activity

Sections:

- hero with search and CTA
- trending beats carousel or grid
- featured producers
- highlighted bundles
- highlighted beat tapes
- how BeatKosh works
- verification and trust section
- local payment trust strip

Primary CTAs:

- Browse Beats
- Hire a Producer
- Start Selling

---

## 8.2 Beat catalog page

Purpose:

- help users discover beats efficiently

Layout:

- left filter sidebar on desktop
- sticky top filter bar on mobile
- grid or list of beat cards
- persistent mini-player if audio is active

Filters:

- genre
- mood
- BPM range
- key
- price
- producer
- sort by trending / newest / price / popularity

Beat card content:

- cover art
- title
- producer name
- genre
- BPM
- key
- preview controls
- starting price
- verification / rating marker

Interactions:

- play preview
- add to cart
- open beat detail
- save for later if wishlist is later added

---

## 8.3 Beat detail page

Purpose:

- convert discovery into purchase

Main content:

- large artwork
- title and producer
- audio player with waveform or progress UI
- metadata block
- description
- license selector
- pricing table
- add to cart CTA
- hire this producer CTA

Supporting content:

- related beats
- producer mini-card
- trust indicators
- reviews if available

License UI must clearly compare:

- Basic
- Premium
- Unlimited
- Exclusive

Each license row should show:

- format
- stream limit
- exclusivity
- stems availability
- whether the beat remains on the marketplace

Exclusive purchase should carry a strong warning that the listing will be removed after purchase.

---

## 8.4 Bundle catalog and detail pages

Purpose:

- sell grouped beat packages clearly

Bundle cards should show:

- title
- producer
- beat count
- original price
- discounted price
- savings amount

Bundle detail page should include:

- bundle overview
- included beat list
- audio previews for each included beat
- pricing summary
- add to cart CTA

---

## 8.5 Beat tape catalog and detail pages

Purpose:

- present tapes like structured music collections

Beat tape cards should show:

- cover art
- title
- producer
- track count
- price

Beat tape detail page should include:

- description
- ordered track list
- playable previews
- total price
- add to cart CTA

---

## 8.6 Producer profile page

Purpose:

- drive trust and hiring conversion

Main sections:

- producer hero section
- verification badges
- rating and review summary
- total sales
- genres and expertise
- portfolio links
- listed beats
- bundles
- beat tapes
- reviews

Primary CTA:

- Hire Producer

Secondary CTA:

- Browse Beats by this Producer

The top section should be optimized for trust:

- avatar or brand image
- producer name
- verified indicator
- response time
- completed sales
- average rating

---

## 8.7 Hiring request flow

Flow:

1. Artist opens producer profile
2. Clicks `Hire Producer`
3. Modal or dedicated page opens
4. Artist submits project brief
5. Producer receives request

Form fields:

- project title
- description / brief
- budget range
- timeline
- optional references
- optional file attachments

Status states:

- pending
- accepted
- rejected
- custom offer sent

This flow should be a dedicated product journey, not hidden inside generic messaging.

---

## 8.8 Cart page

Purpose:

- review items before payment

Cart supports mixed product types:

- beat with chosen license
- bundle
- beat tape

Each item should show:

- product image
- product type
- title
- producer
- selected license if applicable
- price
- remove action

Summary panel:

- subtotal
- commission info only if user-facing and necessary
- total
- checkout CTA

---

## 8.9 Checkout page

Purpose:

- complete purchase with local payment providers

Sections:

- order summary
- payment method selector
- billing or purchase confirmation details
- terms acknowledgement
- pay CTA

Payment methods:

- eSewa
- Khalti
- ConnectIPS

The UI should communicate:

- secure transaction
- download access after successful payment
- exclusive license removal behavior if applicable

---

## 8.10 Artist dashboard

Primary modules:

- purchased library
- recent orders
- active projects
- messages
- account settings
- verification status

Key dashboard cards:

- purchased beats
- active collaborations
- pending approvals
- unread messages

---

## 8.11 Producer dashboard

Primary modules:

- uploaded beats
- bundles
- beat tapes
- hiring requests
- active projects
- wallet and payout summary
- analytics snapshot
- profile and verification

Important quick actions:

- Upload Beat
- Create Bundle
- Create Beat Tape
- Review Requests

Producer dashboard home should show:

- total sales
- recent orders
- wallet balance
- active projects
- verification status

---

## 8.12 Projects dashboard

Used by both artists and producers, with role-sensitive actions.

Project detail sections:

- overview
- participants
- status
- milestones
- deliverables
- timeline
- conversation panel

Milestone states:

- draft
- funded
- in progress
- delivered
- approved

Actions:

- fund milestone
- upload deliverable
- request revision
- approve delivery

---

## 8.13 Messages

Messaging UI should support:

- conversation list
- active thread
- project-linked context
- attachment sending

Useful behaviors:

- show participant role
- show linked project name
- allow entry from project pages and profile hiring flow

---

## 8.14 Verification page

Purpose:

- explain verification value
- submit documents
- display review status

Sections:

- verification benefits
- requirements
- upload form
- status tracker

Possible statuses:

- not started
- pending review
- approved
- rejected

Badges should not appear decorative only. They must indicate meaningful trust state.

---

## 9. Shared Component System

The frontend should define reusable components for the following:

### Marketplace components

- BeatCard
- BeatPlayer
- WaveformBar or AudioProgress
- LicenseSelector
- PriceBadge
- FilterSidebar
- SortMenu
- ProducerBadge

### Commerce components

- CartItem
- OrderSummary
- PaymentMethodCard
- CheckoutStatusBanner

### Profile and trust components

- ProfileHero
- VerificationBadge
- RatingSummary
- SalesStat
- ReviewCard

### Collaboration components

- ProjectCard
- MilestoneStepper
- DeliverableItem
- ConversationList
- MessageBubble
- HireProducerForm

### Layout components

- AppHeader
- AppFooter
- DashboardSidebar
- DashboardTopbar
- EmptyState
- ErrorState
- LoadingSkeleton

---

## 10. Design Direction

### 10.1 Visual tone

The interface should feel like a modern music product, not a generic SaaS dashboard.

Recommended direction:

- dark-neutral or deep-charcoal content surfaces for player-heavy areas
- warm accent color for actions and brand highlights
- strong album-art-style cards
- bold typography for titles
- compact metadata labels

If a lighter theme is used, audio and commerce sections should still retain contrast and visual weight.

### 10.2 Mood keywords

- creative
- credible
- high-energy
- modern
- local-but-premium

### 10.3 Typography

Use a clean modern sans-serif for UI and a more expressive display font for hero headings only if it stays readable.

Typography hierarchy:

- strong hero title
- medium section titles
- compact metadata text
- readable body copy

### 10.4 Spacing and density

Marketplace cards should be moderately dense because music browsing often involves scanning many items quickly.

Dashboards should be more structured and less visually loud than public pages.

---

## 11. Responsive Behavior

### Desktop

- filter sidebar visible in catalog
- multi-column marketplace grids
- split-view messages and projects
- richer metadata visible by default

### Tablet

- collapsible filters
- 2-column or 3-column cards
- simplified dashboard side navigation

### Mobile

- prioritize search, playback, and purchase
- use sticky bottom actions on product pages
- use drawers for filters and role switch if needed
- collapse secondary stats into compact chips

Mobile product pages should keep `Add to Cart` or `Hire Producer` easily reachable without excessive scrolling.

---

## 12. Core User Flows

## 12.1 Beat purchase flow

```txt
Home or Catalog
-> Beat Detail
-> Select License
-> Add to Cart
-> Checkout
-> Payment Gateway
-> Order Success
-> Download Access in Dashboard
```

## 12.2 Bundle purchase flow

```txt
Bundles
-> Bundle Detail
-> Add to Cart
-> Checkout
-> Payment
-> Library Access
```

## 12.3 Hire producer flow

```txt
Producer Profile
-> Hire Producer
-> Submit Brief
-> Producer Responds
-> Project Created
-> Milestones Managed
-> Deliverables Approved
```

## 12.4 Role switching flow

```txt
Authenticated Session
-> Toggle Role
-> Backend Confirms active_role
-> Dashboard and available actions update
```

---

## 13. State Design

The frontend must handle these state categories clearly.

### Auth state

- guest
- authenticated artist
- authenticated producer
- authenticated dual-role user

### Product state

- loading
- empty catalog
- filter result empty
- playback active
- purchase unavailable

### Commerce state

- cart empty
- checkout processing
- payment success
- payment failed

### Project state

- no active projects
- awaiting response
- active milestone
- deliverable awaiting approval

### Verification state

- unverified
- pending
- approved
- rejected

---

## 14. API Integration Expectations

The frontend should expect backend APIs close to the PRD structure.

### Example service domains

- `/beats`
- `/bundles`
- `/tapes`
- `/orders`
- `/projects`
- `/conversations`
- `/messages`
- `/account/switch-role`

### Frontend data requirements for marketplace cards

Each listing payload should ideally include:

- id
- slug
- title
- cover art URL
- producer name
- producer slug
- price or starting price
- genre
- BPM
- key
- preview URL
- trust indicators

### Frontend data requirements for producer profile

- producer name
- bio
- genres
- portfolio links
- verified flag
- rating
- total sales
- beat list
- bundle list
- tape list
- reviews

The backend may need serializer shaping for frontend performance. Avoid forcing the frontend to assemble core listing data from multiple requests.

---

## 15. Suggested Next.js App Structure

```txt
frontend/
  app/
    (public)/
    (marketplace)/
    (auth)/
    dashboard/
  components/
    marketplace/
    commerce/
    profile/
    projects/
    messaging/
    layout/
    ui/
  lib/
    api/
    auth/
    player/
    cart/
    utils/
  hooks/
  types/
```

Suggested route grouping:

- `(public)` for landing and marketing
- `(marketplace)` for beats, bundles, tapes, and producer discovery
- `(auth)` for login/register flows
- `dashboard` for role-aware authenticated views

---

## 16. MVP Priorities For Frontend Build

Build in this order:

### Phase 1

- app shell
- home page
- beat catalog
- beat detail
- producer profile

### Phase 2

- cart
- checkout
- artist library
- order history

### Phase 3

- producer dashboard
- beat upload UI
- bundle and tape management

### Phase 4

- hiring flow
- projects dashboard
- messaging
- verification UI

### Phase 5

- analytics views
- recommendations
- advanced discovery polish

---

## 17. UX Risks To Avoid

- making role switching hidden or confusing
- making licensing differences unclear
- treating hiring as just another contact form
- weak trust presentation on producer profiles
- overloading the first MVP with too many dashboard metrics
- building generic cards that ignore music metadata
- forcing too many clicks between preview and purchase

---

## 18. Design Deliverables Recommended Before Development

Before full frontend implementation, create:

1. sitemap
2. low-fidelity wireframes for core pages
3. UI component inventory
4. mobile and desktop layout references
5. state diagrams for checkout, project milestones, and role switching

Priority screens to design first:

1. Home
2. Beat catalog
3. Beat detail
4. Producer profile
5. Cart
6. Checkout
7. Artist dashboard
8. Producer dashboard
9. Project detail
10. Messages

---

## 19. Implementation Notes For Next.js

- Use server components for read-heavy catalog pages where possible.
- Use client components for audio playback, cart interactions, filters with immediate feedback, and messaging.
- Keep a global audio player store so playback persists across route changes.
- Use optimistic UI carefully for role switching, cart actions, and message sending.
- Use route-level loading and error states for all main pages.
- Protect dashboard routes with auth middleware or server-side session checks.

---

## 20. Final Summary

The BeatKosh frontend should be built as a music-first marketplace and collaboration product, not a generic ecommerce interface.

The MVP frontend must prioritize:

- beat discovery
- clear license purchasing
- trusted producer profiles
- direct hiring
- role-aware dashboards
- reliable local checkout

If implemented well, the frontend will clearly communicate BeatKosh's unique value:

**a single platform where Nepali artists can discover beats, buy licenses, and hire producers for real collaboration.**
