# Product Reverse Engineering

## 1. Pages
- Landing / Marketing Home (`homepage.png`, `home.png`)
- Artist Dashboard / Listening Feed (`dashboard.png`, `dashabiord lsitening  page.png`)
- Beats Explore List (`search.png`, `trending buttonn.png`)
- Playlist Detail (`new find button.png`)
- Track Detail (`track info.png`, `related tracks.png`)
- Producer Profile (`producer profile.png`)
- Sound Kits Listing (`sound kits.png`, `soundkit.png`)
- Cart (empty + filled) (`cart in dashbaord.png`, `cart button in dashboarf.png`)
- Play History (`recently played.png`)
- Download History (`downlaod history button.png`)
- Followed Producers (`followed by u.png`)
- Follower Drops Feed (`follower drops.png`)
- Account Settings (`account setting.png`, `billing address.png`)
- Notifications Drawer (`notification.PNG`)
- Resources Blog Listing (`resources's blog sectiopn.png`)
- Single Blog Post (`single blog.png`)
- Tutorials (`resources's tutorial.png`)
- Help Desk (`resources's help desk.png`)
- FAQ (`faq.png`)
- Pricing / Plans (`pro plan.png`)
- Seller Agreement (`seller aggre,ent page.png`)
- Producer Dashboard / Selling Mode (`producers dashbaord.png`)
- Producer Setup Hub (Account, Payout, Studio Setup, Studio Controls, Manage Subscription) (`setting button's account section.png`, `setting butting's payout details.png`, `studio setup.png`, `studio control.png`, `manage subscription.png`)
- Upload Choice (Beat vs Sound Kit) (`upload beat button top navbar.png`)
- Beat Upload Wizard (Metadata, Media, License) (`uplaod now's metadata.png`, `upaod now 's media upload.png`, `license.png`)
- Sound Kit Upload Wizard (Kit Type, Metadata, Files, Licensing) (`upload sound kit type.png`, `kit upload metadaya.png`, `kit upload data upload.png`, `kit upload license.png`)
- Key modal states:
- Start Selling modal (`start selling.png`)
- KYC reminder modal (`kyc verifcafion.png`)
- Follow & Download modal (`beat downlaod page.png`)
- Key menu states:
- User dropdown (`user icon dropdown.png`, `setting button.PNG`)
- Mega menus under nav (`beat button.png`, `browse button.png`, `resources button.png`)
- Track row action dropdown (`beat three dots options.png`)

## 2. Page Structures
### Global App Shell (seen on most app pages)
- Header / navbar:
- Left: logo
- Center: search input + category dropdown (`General`)
- Right: notification icon, cart icon with badge, avatar/user trigger, CTA (`Start Selling` or `Upload`)
- Primary nav row:
- `Dashboard`, `Beats`, `Sound Kits`, `Browse`, `Resources`
- Footer:
- In-app pages generally use a persistent bottom audio player instead of a classic footer
- Marketing/resource pages include a multi-column footer with payment badges
- Special sections:
- Persistent bottom audio player with progress, playback controls, share/download/favorite controls, and buy button

### Landing / Marketing Home
- Hero section with headline + CTA
- Product value sections (features, pricing snippets, testimonials/social proof) (inferred from long-scroll structure)
- Cards/carousels for beats and playlists
- Marketing footer with links and payment icons

### Dashboard / Listening Feed
- Filter tabs/chips (`For You`, `Liked`, `Recently Played`, etc.)
- Multiple curated content blocks (cards and rows)
- “Latest Beats” dense list/table at bottom

### Beats Explore / Playlist / History-like List Pages
- Top filter chips / pills
- Filter toolbar (genre, tempo, moods, keys, instruments, price, sort)
- Main content as list rows:
- Play control
- Cover + metadata
- Tags
- Price CTA
- Overflow action menu
- Optional list/grid toggle

### Track Detail
- Left: highlighted track card (artwork, producer, likes/plays/meta/tags)
- Top center/right: license option cards (WAV, WAV+STEMS, EXCLUSIVE)
- Main right: related tracks list
- Bottom persistent player with current track and purchase CTA

### Producer Profile
- Left profile card:
- Avatar, name, verification, stats, follow/share, recognition, about
- Right: producer beat list with prices

### Sound Kits
- Hero/featured kit carousel
- “All Sound Kits” filters
- Card grid of kits with price/credits CTA
- Special “kits22” section with credit-based cards

### Cart
- Empty state illustration + “Buy items now!”
- Filled state:
- Item table/list (item, license, fee, discount, net, actions)
- Summary sidebar (coupon, subtotal, platform fee, total, checkout)

### Resources
- Blog list page: stacked article cards
- Single blog page: hero image + article body + comments form
- Tutorial page: featured video + video card grid
- Help desk page: search, category cards, frequently read, category matrix
- FAQ page: accordion list

### Producer Setup Hub
- Left sidebar: progress nodes + setup sections
- Right panel: section-specific forms/configuration
- Bottom sticky notice prompting completion of account/bank details

### Upload Wizards (Beat + Sound Kit)
- Left stepper sidebar
- Right form panel with warnings, fields, and upload zones
- Footer actions: Back, Save as draft, Next/Submit

## 3. Reusable Components
- GlobalHeader
- MainNav
- BottomAudioPlayer
- SearchBar + CategorySelect
- MegaMenu (Beats/Browse/Resources)
- TrackRow
- TrackCard
- ProducerCard
- PlaylistCard
- SoundKitCard
- LicenseCard
- FilterChip
- TagPill
- PriceButton
- SectionHeader
- StatsCard
- AccordionItem
- FormCard
- StepperSidebar
- FileUploadDropzone
- OrderSummaryCard
- DropdownMenu
- ModalDialog
- NotificationDrawer
- FooterLinksBlock

## 4. UI Elements
- `button` (primary, secondary, ghost, icon-only)
- `input` (search, text, number, URL)
- `textarea`
- `select/dropdown`
- `checkbox`
- `radio`
- `toggle/switch`
- `icon`
- `tag/chip`
- `avatar`
- `badge` (count, `NEW`, verification)
- `tooltip/info hint` (small info icons imply tooltip/help text) (inferred)
- `progress bar/ring`
- `tab`
- `list item row`
- `empty-state illustration`

## 5. Navigation Flow Map
```text
Landing/Home -> App Dashboard -> Beats Explore -> Track Detail -> Cart -> (inferred) Checkout -> (inferred) Order Success

Dashboard -> Producer Profile -> Follow/Unfollow -> Followed By You

Dashboard -> Play Track -> Play History
Dashboard -> Download -> Download History

Resources -> Blog List -> Single Blog
Resources -> Tutorials
Resources -> Help Desk -> FAQ

Start Selling -> Seller Agreement / Start Selling Modal -> Producer Dashboard
Producer Dashboard -> Setup Hub (Account -> Payout -> Studio Setup -> Studio Controls -> Manage Subscription)
Producer Dashboard -> Upload -> Upload Beat Wizard -> Submit
Producer Dashboard -> Upload -> Upload Sound Kit Wizard -> Submit
```

## 6. User Actions
- Search tracks/sound kits/resources
- Select search context/category (`General`)
- Open mega menus from nav
- Switch between list/grid views
- Apply filters and sort
- Play/pause/seek audio in rows and persistent player
- Share, favorite, download, view lyrics from row actions
- Follow/unfollow producer
- View producer profile
- Select license tier for a beat
- Add track/kit to cart
- Remove/edit cart line items
- Apply coupon code
- Start checkout
- Open notifications drawer
- Open user dropdown and navigate to settings/support/FAQ/logout
- Edit account details and add billing address
- Complete seller verification/KYC
- Submit payout bank details
- Configure studio controls (e.g., global negotiation)
- Choose subscription plan / upgrade
- Upload media files and metadata
- Save draft and submit upload
- Accept terms/agreements in modals/forms

## 7. Backend Data Models
### User
- `id`, `email`, `password_hash` (inferred), `role` (buyer/producer), `display_name`, `avatar_url`, `phone`, `is_verified`, `created_at`

### ProducerProfile
- `id`, `user_id`, `stage_name`, `bio`, `social_links`, `followers_count`, `beats_count`, `verified_badge`, `recognition_metrics`

### Beat
- `id`, `producer_id`, `title`, `cover_image`, `bpm`, `key`, `genre`, `moods[]`, `instruments[]`, `tags[]`, `duration`, `is_published`, `created_at`

### BeatLicense
- `id`, `beat_id`, `type` (WAV/STEMS/Exclusive), `price`, `publishing_rights_pct`, `master_rights_pct`, `recording_limit`, `license_period`, `is_negotiable`, `free_download_enabled`

### SoundKit
- `id`, `producer_id`, `title`, `kit_type`, `description`, `cover_image`, `files_archive_url`, `preview_files[]`, `reference_links[]`, `license_fee`, `publishing_rights_pct`, `profit_share_pct`, `credit_cost`

### Playlist
- `id`, `name`, `owner_type` (system/user), `cover_image`, `description`, `followers_count`, `track_count`, `updated_at`

### Cart
- `id`, `user_id`, `status`, `subtotal`, `discount_total`, `platform_fee`, `grand_total`, `updated_at`

### CartItem
- `id`, `cart_id`, `item_type` (beat/soundkit), `item_id`, `selected_license_id`, `unit_price`, `discount`, `net_price`

### Order
- `id`, `user_id`, `order_no`, `status`, `subtotal`, `discount_total`, `platform_fee`, `total`, `payment_status`, `created_at`

### OrderItem
- `id`, `order_id`, `item_type`, `item_id`, `license_snapshot`, `price_paid`, `download_entitlement`

### PaymentTransaction
- `id`, `order_id`, `provider`, `provider_txn_id`, `amount`, `currency`, `status`, `failure_reason`, `created_at`

### Follow
- `id`, `follower_user_id`, `producer_id`, `created_at`

### LikeFavorite
- `id`, `user_id`, `target_type` (beat/kit), `target_id`, `created_at`

### PlayHistory
- `id`, `user_id`, `beat_id`, `played_at`, `play_duration_sec`

### DownloadHistory
- `id`, `user_id`, `item_type`, `item_id`, `source` (purchase/free-follow), `downloaded_at`

### Notification
- `id`, `user_id`, `type`, `title`, `body`, `is_read`, `link_url`, `created_at`

### KYCVerification
- `id`, `user_id`, `status`, `mobile_verified`, `identity_doc_type`, `identity_doc_ref`, `submitted_at`, `verified_at`

### PayoutBankAccount
- `id`, `user_id`, `account_name`, `account_number_masked`, `ifsc_code`, `status`, `verified_at`

### SubscriptionPlan
- `id`, `name`, `tier`, `monthly_price`, `yearly_price`, `features[]`, `limits`

### ProducerSubscription
- `id`, `producer_id`, `plan_id`, `status`, `started_at`, `expires_at`, `credits_balance`

### BlogPost / Tutorial / HelpArticle / FAQItem
- Basic CMS entities with `title`, `slug`, `content`, `thumbnail`, `category`, `published_at`, `status`

### SellerAgreementAcceptance
- `id`, `user_id`, `agreement_version`, `accepted_at`, `ip_address` (inferred)

### UploadDraft
- `id`, `user_id`, `content_type` (beat/soundkit), `step`, `payload_json`, `status`, `updated_at`

## 8. UI Patterns
- Card grid layout (dashboard sections, sound kits, tutorials)
- Mixed list + grid browsing
- Search with faceted filtering
- Sticky global audio player
- Tab/chip navigation
- Sidebar stepper workflows
- Modal dialogs for key gates/actions
- Right-side drawer for notifications
- Dropdown action menus (row-level and user-level)
- Accordion FAQ
- Empty states with CTA
- Multi-step upload wizard with draft save
- Pricing comparison section/table
- Pagination is not explicitly visible; list continuation may use long scroll (inferred)

## 9. Design System
- Color palette:
- Primary: vivid purple/violet
- Base: dark charcoal/black surfaces
- Accent: blue (links/secondary CTA), green (success), yellow (warnings), pink avatar accents
- Typography hierarchy:
- Large page titles
- Medium section headers
- Small metadata/captions in rows/cards
- Body text with muted gray variants
- Spacing system:
- Consistent card paddings and vertical rhythm (roughly 8/12/16/24 scale inferred)
- Button styles:
- Solid purple primary
- Dark/outline secondary
- Rounded corners, pill variants, icon buttons
- Card styles:
- Dark elevated panels with subtle borders/shadows
- Border radius:
- Mostly medium rounded corners; pills for chips/buttons
- Shadows/glow:
- Soft glow around high-emphasis actions (avatar/cart/upload)

## 10. Missing or Inferred Pages
- Authentication pages (login/sign up) (inferred)
- Password reset/change flow (partially implied by “Change Password?”) (inferred)
- Dedicated checkout/payment page (inferred from cart checkout CTA)
- Order confirmation / receipt page (inferred)
- Full order history page (only downloads/history variants shown) (inferred)
- Liked items page detail (liked state shown, full page not clearly shown) (inferred)
- Negotiations page detail (menu entry exists) (inferred)
- My Lyrics page detail (menu entry exists) (inferred)
- License terms detail page/modal (`View Terms` suggests destination) (inferred)
- Notification detail/deeplink destinations (inferred)
- Admin/moderation dashboards for content/KYC/review (inferred)

## 11. Suggested Component Architecture
- `AppShell`
- `TopHeader`
- `PrimaryNav`
- `NowPlayingBar`
- `PageContainer`

- `Navigation`
- `MegaMenuBeats`
- `MegaMenuBrowse`
- `MegaMenuResources`
- `UserMenu`
- `NotificationDrawer`

- `Discovery`
- `FilterBar`
- `FilterChipGroup`
- `TrackList`
- `TrackRow`
- `TrackCard`
- `PlaylistCard`
- `SoundKitCard`
- `TagPillList`
- `SortSelect`

- `Commerce`
- `LicenseCardGroup`
- `PriceButton`
- `CartItemTable`
- `OrderSummaryPanel`
- `CouponForm`
- `CheckoutActionBar`

- `Profile`
- `ProducerProfileCard`
- `ProfileStats`
- `FollowActions`
- `AboutPanel`

- `Resources`
- `BlogList`
- `ArticleView`
- `TutorialGrid`
- `HelpDeskHome`
- `FAQAccordion`

- `Seller Onboarding`
- `KYCModal`
- `SellerAgreementView`
- `SetupProgressSidebar`
- `AccountForm`
- `PayoutForm`
- `StudioSetupForm`
- `StudioControlsPanel`
- `SubscriptionPanel`

- `Upload`
- `UploadChoiceCards`
- `UploadWizardLayout`
- `BeatMetadataStep`
- `BeatMediaStep`
- `BeatLicenseStep`
- `KitTypeStep`
- `KitMetadataStep`
- `KitFilesStep`
- `KitLicensingStep`

- `Shared UI Primitives`
- `Button`
- `Input`
- `Select`
- `Checkbox`
- `Radio`
- `Switch`
- `Tabs`
- `Card`
- `Modal`
- `Drawer`
- `Badge`
- `Avatar`
- `Icon`
- `Tooltip`
- `EmptyState`
