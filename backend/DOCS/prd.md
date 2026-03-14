1️⃣ **BeatKosh Backend-First PRD (core marketplace + hiring + architecture)**
2️⃣ **Role Switching + Verification System design**

I merged them into a **single clean, structured FULL PRD** that includes everything:

* Marketplace
* Bundles
* Beat tapes
* Licensing
* Direct hiring
* Role switching
* Verification badges
* Trust system
* Django backend architecture
* Apps & models
* APIs
* Development plan

This version is **ready to paste into Notion or use for development**.

---

# BeatKosh — Complete Backend-First Product Requirement Document

Version: 1.0
Product Type: Multi-Vendor Beat Marketplace + Freelance Music Collaboration Platform
Backend Stack: Django + Django REST Framework + PostgreSQL + Celery + FFmpeg + AWS S3

---

# 1. Product Overview

BeatKosh is a **multi-vendor music marketplace and freelance collaboration platform** designed for the Nepali music ecosystem.

The platform enables:

### Artists to

• buy beats
• buy beat bundles
• buy beat tapes
• hire producers directly
• collaborate on music projects

### Producers to

• upload beats
• sell beats
• sell bundles
• sell beat tapes
• receive hiring requests
• collaborate with artists

BeatKosh combines:

**BeatStars-style beat marketplace + Fiverr-style collaboration system.**

---

# 2. Core Product Pillars

The platform is built on **three main systems**.

### 1️⃣ Beat Marketplace

Producers upload beats and artists purchase licenses.

---

### 2️⃣ Beat Collections

Producers can sell beats as:

• bundles
• beat tapes

---

### 3️⃣ Freelance Collaboration

Artists can **hire producers directly from their profile**.

Projects are managed through **milestones and deliverables**.

---

# 3. Actors (User Roles)

## Artist

Users who buy beats or hire producers.

Capabilities:

• browse beats
• buy beats
• buy bundles
• buy beat tapes
• hire producers
• manage projects

---

## Producer

Users who create beats and collaborate with artists.

Capabilities:

• upload beats
• create bundles
• create beat tapes
• accept hiring requests
• manage projects

---

## Admin

Platform moderator.

Capabilities:

• moderate users
• moderate beats
• manage verification
• handle disputes
• manage analytics

---

# 4. Role Switching System

Users can switch between:

**Artist Mode ↔ Producer Mode**

Similar to **InDrive driver/passenger switching**.

Many creators are both:

• artists
• producers

Example:

A rapper might produce occasionally, while a producer may buy beats from others.

---

## User Structure

One account can have **multiple roles**.

```
User
 ├ ArtistProfile
 └ ProducerProfile
```

---

## User Model

```
User
id
email
username
password
is_artist
is_producer
active_role
date_joined
```

Example

```
is_artist = True
is_producer = True
active_role = "producer"
```

---

## Switching Role API

Endpoint

```
POST /account/switch-role
```

Payload

```
{
  "role": "producer"
}
```

Backend logic

```
if user.is_producer:
    user.active_role = "producer"
```

---

# 5. Profiles

## Artist Profile

```
ArtistProfile
id
user
stage_name
bio
genres
social_links
verified
created_at
```

---

## Producer Profile

```
ProducerProfile
id
user
producer_name
bio
genres
experience_years
portfolio_links
verified
rating
total_sales
created_at
```

---

# 6. Beat Marketplace

Producers upload beats that artists can purchase.

### Beat Metadata

```
Beat
id
title
producer
genre
bpm
key
mood
description
cover_art
preview_audio
audio_file
created_at
is_active
```

---

### Purchase Flow

```
Browse Beats
→ View Beat
→ Choose License
→ Add to Cart
→ Checkout
→ Payment
→ Download Access
```

---

# 7. Beat Bundles

Bundles allow producers to sell multiple beats at a discounted price.

Example

```
Bundle: Trap Starter Pack
5 beats
Price: $40
Original price: $75
```

---

### Bundle Models

```
Bundle
id
producer
title
price
discount
created_at
```

```
BundleItem
bundle
beat
```

---

# 8. Beat Tapes

Beat tapes are **albums of beats sold as one product**.

Example

```
NepHop Vol.1
10 beats
Price: $60
```

---

### Beat Tape Models

```
BeatTape
id
producer
title
description
price
created_at
```

```
BeatTapeTrack
tape
beat
order
```

---

# 9. Licensing System

Beats are **licensed rather than sold outright**.

---

## Basic License

```
Format: MP3
Streams limit: 50k
Non-exclusive
```

---

## Premium License

```
Format: WAV
Streams limit: 500k
Non-exclusive
```

---

## Unlimited License

```
Unlimited streams
WAV + stems
```

---

## Exclusive License

```
Full ownership
Beat removed from store
```

---

### Beat Removal Rules

| License   | Beat removed |
| --------- | ------------ |
| Basic     | No           |
| Premium   | No           |
| Unlimited | No           |
| Exclusive | Yes          |

---

# 10. Freelance Hiring System

Artists can hire producers directly from their profile.

---

### Hiring Flow

```
Artist views producer profile
→ Clicks Hire Producer
→ Submits project brief
```

Producer receives request and can:

```
Accept
Reject
Send custom offer
```

---

### Project Lifecycle

```
Project created
→ Milestones defined
→ Artist funds milestone
→ Producer delivers work
→ Artist approves delivery
```

---

# 11. Project Models

```
Project
id
artist
producer
title
description
budget
status
created_at
```

---

### Milestone

```
Milestone
project
title
amount
status
due_date
```

Example milestones

```
Beat production
Mixing
Mastering
Final delivery
```

---

# 12. Messaging System

Artists and producers communicate through chat.

---

### Conversation

```
Conversation
participants
project
created_at
```

---

### Message

```
Message
conversation
sender
content
attachments
timestamp
```

---

# 13. Verification Badge System

Verification builds trust and authenticity.

Badges

```
✔ Verified Producer
✔ Verified Artist
⭐ Top Producer
```

---

# Verification Methods

### Identity Verification

User uploads

• government ID
• selfie verification

---

### Manual Admin Review

Requirements

• portfolio review
• complete profile
• community reputation

---

### Performance-Based Verification

Example

```
20+ beat sales
rating > 4.5
```

---

# Verification Model

```
VerificationRequest
id
user
verification_type
status
submitted_documents
approved_by
approved_at
```

Status

```
pending
approved
rejected
```

---

# 14. Trust Signals

Profiles display credibility indicators.

Examples

```
⭐ Rating
Reviews
Total beat sales
Response time
Portfolio strength
```

Example

```
⭐ 4.8 rating
120 reviews
500 beats sold
```

---

# 15. Payment System

Supported gateways

```
eSewa
Khalti
ConnectIPS
```

---

### Payment Flow

```
Checkout
→ Payment gateway
→ Payment verification
→ Order completed
```

---

# Revenue Model

```
Beat sales commission → 10%
Freelance projects → 15%
```

---

# 16. Producer Wallet

```
ProducerWallet
producer
balance
```

```
Transaction
amount
type
date
```

---

# 17. Order System

```
Order
id
buyer
total_price
status
created_at
```

```
OrderItem
order
product_type
product_id
license
price
```

Products

```
Beat
Bundle
BeatTape
```

---

# 18. Audio Processing

When producer uploads a beat

```
Upload file
→ FFmpeg generates preview
→ waveform generated
→ metadata stored
→ beat published
```

Future feature

```
audio fingerprinting
```

---

# 19. Recommendation System (Future)

Recommendations based on

```
listening history
purchase history
genre preference
```

Outputs

```
recommended beats
recommended producers
```

---

# 20. Django Backend Architecture

Recommended apps

```
accounts
beats
catalog
orders
payments
projects
messaging
reviews
verification
analytics
storage
```

---

# accounts app

```
User
ArtistProfile
ProducerProfile
```

---

# beats app

```
Beat
BeatAudio
LicenseType
BeatTag
```

---

# catalog app

```
Bundle
BundleItem
BeatTape
BeatTapeTrack
```

---

# orders app

```
Order
OrderItem
PurchaseLicense
DownloadAccess
```

---

# payments app

```
Payment
Transaction
ProducerWallet
Payout
```

---

# projects app

```
ProjectRequest
Proposal
Project
Milestone
Deliverable
```

---

# messaging app

```
Conversation
Message
```

---

# reviews app

```
Review
rating
comment
```

---

# verification app

```
VerificationRequest
VerificationDocument
VerificationStatus
```

---

# analytics app

Tracks

```
plays
sales
skip rate
conversion rate
```

---

# storage app

Stores

```
beats
preview audio
cover art
project files
```

Uses

```
AWS S3
```

---

# 21. API Structure

### Beats

```
GET /beats
GET /beats/{id}
POST /beats/upload
GET /beats/trending
```

---

### Bundles

```
GET /bundles
GET /bundles/{id}
POST /bundles
```

---

### Beat Tapes

```
GET /tapes
GET /tapes/{id}
POST /tapes
```

---

### Orders

```
POST /orders/create
GET /orders/{id}
```

---

### Projects

```
POST /projects/request
POST /projects/proposal
GET /projects
```

---

### Messaging

```
GET /conversations
POST /messages
```

---

# 22. MVP Development Plan

Because the project is **backend-first**, development should follow this order.

---

### Phase 1

Core systems

```
accounts
beats
catalog
```

---

### Phase 2

Commerce

```
orders
payments
```

---

### Phase 3

Freelance system

```
projects
messaging
```

---

### Phase 4

Advanced features

```
verification
analytics
audio fingerprinting
```

---

# 23. UI Development Strategy

Start with **simple functional UI**.

Pages

```
Beat catalog
Beat detail
Producer profile
Cart
Checkout
Project dashboard
```

After backend stabilizes

```
Improve UX
Improve discovery
Add advanced design
```

---

# 24. Competitive Advantage

BeatKosh uniquely combines

```
Beat marketplace
+
Beat bundles
+
Beat tapes
+
Direct producer hiring
+
Role switching
+
Verification badges
+
Local payment integration
```

This creates a **complete digital music ecosystem for Nepali creators.**

---


