# StudyMMO - Game Design Document

## Overview

**Genre:** Educational Idle MMO (mobile-friendly web game)
**Inspiration:** SimpleMMO mechanics adapted for education theme
**Target Audience:** Older students and adults looking for a casual time-killer with progression
**Platform:** Web (PWA, mobile-friendly)
**Language:** English

### Core Concept

Players progress through educational institutions (Prep School → School → College → University), studying subjects, earning grades, leveling up skills, and competing in olympiads. The game combines idle/clicker mechanics with MMO progression systems.

### Unique Selling Points

- Real-world education theme with relatable progression
- Endless study mechanic (no energy limit for core activity)
- Deep progression across multiple subjects
- Competitive olympiad system (PvE + weekly PvP)
- Player-driven economy

---

## Core Systems

### 1. Character

Each account has one character with the following attributes:

| Attribute | Description |
|-----------|-------------|
| Level | Overall character progression (1-100+) |
| Total XP | Cumulative experience points |
| Cash ($) | In-game currency |
| Quest Energy | Resource for tutoring quests |
| Olympiad Energy | Resource for competitions |
| Current Location | Active educational institution |
| Current Class/Specialization | Progress within location |

### 2. Subjects

9 subjects available from start, each with independent leveling:

| ID | Name | Category |
|----|------|----------|
| 1 | Mathematics | exact |
| 2 | Physics | natural |
| 3 | Chemistry | natural |
| 4 | Biology | natural |
| 5 | Literature | humanitarian |
| 6 | History | humanitarian |
| 7 | Foreign Language | humanitarian |
| 8 | Physical Education | physical |
| 9 | Art | creative |

Categories are used for specialization requirements in College/University.

### 3. Locations

Linear progression through educational institutions:

```
Prep School (100%) → School (60%) → College (85%) → University
                            ↓
                     College unlocks at 60% School completion
                     University unlocks at 85% School completion
```

**Prep School**
- Tutorial location
- 1 class to complete (5 grades per subject)
- Subjects: All 9 subjects available
- Unlock requirements for School:
  - 100% Prep School completion
  - Mathematics Level 4
  - Literature Level 5

**School**
- 11 classes (grades 1-11)
- Each class requires 15 grades per subject to complete
- Progress: each class = 9.09% of location
- **Subject restrictions by grade:**
  - Grade 1-2: Mathematics, Literature, Physical Education, Art (4 subjects)
  - Grade 3-4: + History, Foreign Language (6 subjects)
  - Grade 5-11: All 9 subjects (including Physics, Chemistry, Biology)

**College**
- Multiple specializations available
- Requirements: subject levels + minimum grade average + $ cost
- Technical specializations require exact + natural subjects
- Humanitarian specializations require humanitarian subjects

**University**
- Advanced specializations
- Higher requirements than College
- Some accept only top students (A average required)
- Main "endgame grind" location

### 4. Study System (Core Loop)

**Endless clicking mechanic - no energy cost**

Each "Study" click:
- 3 second cooldown between clicks
- Awards XP to 1-3 random subjects
- Awards small character XP
- 15% chance for small $ reward
- Chance for material drops
- Every 10 clicks generates a grade

```javascript
// Study Click Rewards
total_subject_xp = random(10, 25)
subjects_affected = random(1, 3)
xp_per_subject = total_subject_xp / subjects_affected

character_xp = random(3, 8)

cash_chance = 0.15
cash_amount = random(1, 5)

// Equipment bonuses applied multiplicatively
final_xp = base_xp * (1 + equipment_xp_bonus)
```

### 5. Grade System

**Internal score: 0-100, displayed based on user preference**

| Score | A-F (default) | 5-point | 12-point |
|-------|---------------|---------|----------|
| 90-100 | A | 5 | 10-12 |
| 75-89 | B | 4 | 7-9 |
| 60-74 | C | 3 | 4-6 |
| 40-59 | D | 2 | 2-3 |
| 0-39 | F | 1 | 1 |

**Grade Generation Formula:**
```javascript
function generateGrade(subjectLevel, equipmentBonus) {
  const baseScore = random(30, 85)
  const levelBonus = subjectLevel * 0.3
  const equipBonus = equipmentBonus // 0-15 typically
  const finalScore = Math.min(100, baseScore + levelBonus + equipBonus)
  return Math.round(finalScore)
}
```

**Class Completion Requirements:**
- 15 grades from each subject (9 subjects × 15 = 135 grades)
- Grade generated every 10 study clicks
- ~1,350 clicks per class
- ~12 hours total for all 11 school classes

### 6. Equipment System

**5 Equipment Slots:**

| Slot | Example Items |
|------|---------------|
| Pen | Ballpoint Pen, Parker, Einstein's Pen |
| Notebook | Basic Notebook, Moleskine, Da Vinci's Notes |
| Backpack | School Bag, Leather Satchel, Explorer's Pack |
| Calculator | Basic, Scientific, Quantum Calculator |
| Glasses | Reading Glasses, HD Lenses, Glasses of Wisdom |

**6 Rarity Tiers:**

| Rarity | Drop Weight | Stat Bonus | NPC Sell | NPC Buy |
|--------|-------------|------------|----------|---------|
| Common | 60% | 1-3% | $10 | $25 |
| Uncommon | 25% | 4-7% | $35 | $80 |
| Rare | 10% | 8-12% | $150 | $350 |
| Epic | 4% | 13-18% | $750 | $1,500 |
| Legendary | 0.9% | 19-25% | $3,500 | $8,000 |
| Mythic | 0.1% | 26-35% | $15,000 | Not sold |

NPC prices are fixed to prevent market manipulation.

### 7. Quest System (Tutoring)

**Uses Quest Energy (separate from study)**

```
quest_max_energy = 100
quest_energy_regen = 1 per 3 minutes (20/hour)
full_regen = 5 hours
```

**Quest Types:**

| Quest | Energy | Cooldown | Cash | Subject XP | Item Chance |
|-------|--------|----------|------|------------|-------------|
| Basic Tutoring | 5 | 30s | $5-15 | 15-30 | 3% |
| Advanced Tutoring | 10 | 60s | $15-35 | 35-60 | 5% |
| Expert Tutoring | 20 | 120s | $40-80 | 70-120 | 8% |

Advanced quests unlock with character level progression.

### 8. Olympiad System

**Uses Olympiad Energy**

```
olympiad_max_energy = 50
olympiad_energy_regen = 1 per 10 minutes
full_regen = ~8 hours
```

#### Daily PvE Olympiads

| Difficulty | Energy | Win Rate* | Cash | XP | Item Chance |
|------------|--------|-----------|------|-----|-------------|
| School | 5 | 60-70% | $20-40 | 50-80 | 10% |
| District | 10 | 45-55% | $50-100 | 100-150 | 15% |
| City | 15 | 35-45% | $100-200 | 150-250 | 20% |
| National | 25 | 20-30% | $200-500 | 300-500 | 30% |

*Win rate at equal stats

**Battle Formula:**
```javascript
function olympiadBattle(player, npc) {
  const playerPower = 
    player.subjectLevel * 10 +
    player.equipmentBonus +
    random(0, 50)
  
  const npcPower = 
    npc.level * 10 +
    random(0, 50)
  
  return playerPower > npcPower
}
```

#### Weekly PvP Olympiads

- Scheduled: Every Sunday, 1 hour window
- All participants compete simultaneously
- Score = base stats + equipment + buffs + random variance
- Rewards by percentile (top 10%, 25%, 50%)
- Seasonal rankings and exclusive rewards

### 9. Crafting System

**Materials** drop from studying (notes, ink, paper, clips, etc.)

**Recipe Examples:**

| Result | Ingredients | Effect |
|--------|-------------|--------|
| Study Notes | 5 Paper + 2 Ink | +5% XP for 1 hour |
| Cheat Sheet | 10 Notes + 3 Paper | One-time exam boost |
| Textbook | 20 Notes + 5 Binding | Permanent small XP bonus |
| Good Pen | Basic Pen + Quality Ink | Upgraded equipment |

### 10. Market System

**Player-to-player trading**

- List items for sale at custom prices
- 5% transaction fee (cash sink)
- Listings expire after 7 days
- Can always sell to NPC at fixed price (floor)

### 11. Professions (Post-MVP)

Unlocked after School completion:

| Profession | Requirements | Benefits |
|------------|--------------|----------|
| Tutor | Complete School | +20% quest rewards |
| School Teacher | College + Teaching cert | Access to teaching quests |
| College Lecturer | University + high subjects | Better teaching rewards |
| Principal | Multiple maxed professions | Prestige + unique rewards |

---

## Progression & Balancing

### Character XP Curve

```javascript
xp_to_next_level = 100 * (level ^ 1.5)
```

| Level | XP Required | Total XP |
|-------|-------------|----------|
| 1→2 | 100 | 100 |
| 5→6 | 1,118 | 2,847 |
| 10→11 | 3,162 | 13,220 |
| 20→21 | 8,944 | 62,390 |
| 50→51 | 35,355 | 492,000 |

### Subject XP Curve

```javascript
subject_xp_to_next = 50 * (level ^ 1.8)
```

| Level | XP Required |
|-------|-------------|
| 1→2 | 50 |
| 10→11 | 950 |
| 25→26 | 4,200 |
| 50→51 | 16,500 |

Max subject level: 100 (50+ is late game)

### Economy Balance

**Sources:**
- Study clicks: ~$2/click average
- Quests: $5-80 per quest
- Olympiads: $20-500 per battle
- NPC item sales: fixed prices
- Daily login: $50-200

**Sinks:**
- Specialization unlocks: $500-5,000
- NPC shop purchases: $25-8,000
- Crafting materials: $10-100
- Market fees: 5%
- Premium features (AFK tutors): $100-500/hour

### Daily Login Rewards

| Day | Reward |
|-----|--------|
| 1 | $50 |
| 2 | $100 |
| 3 | Random Common item |
| 4 | $150 |
| 5 | $200 + 10 quest energy |
| 6 | Random Uncommon item |
| 7 | $500 + Random Rare item |

Cycle repeats. Streak bonuses in future updates.

---

## Data Model

### Core Tables

```sql
-- Users & Authentication
users
  id: uuid PK
  email: string unique
  password_hash: string
  username: string unique
  grade_display_system: enum('letter', '5-point', '12-point') default 'letter'
  created_at: timestamp
  last_login: timestamp

-- Characters (1:1 with users)
characters
  id: uuid PK
  user_id: uuid FK -> users.id unique
  city_id: uuid FK -> cities.id
  level: int default 1
  total_xp: bigint default 0
  cash: bigint default 0
  quest_energy: int default 100
  quest_energy_max: int default 100
  quest_energy_last_regen: timestamp
  olympiad_energy: int default 50
  olympiad_energy_max: int default 50
  olympiad_energy_last_regen: timestamp
  current_location_id: uuid FK -> locations.id
  current_class_id: uuid FK -> classes.id nullable
  current_specialization_id: uuid FK -> specializations.id nullable
  total_study_clicks: bigint default 0
  created_at: timestamp

-- World
cities
  id: uuid PK
  name: string
  country: string

locations
  id: uuid PK
  city_id: uuid FK -> cities.id
  type: enum('prep_school', 'school', 'college', 'university')
  name: string
  unlock_requirement: jsonb -- {previous_location_percent: 60}
  order_index: int

classes
  id: uuid PK
  location_id: uuid FK -> locations.id
  grade_number: int -- 1-11 for school
  required_grades_per_subject: int default 15

specializations
  id: uuid PK
  location_id: uuid FK -> locations.id
  name: string
  requirements: jsonb -- {math: 50, physics: 40, min_avg_grade: 75}
  unlock_cost: int

-- Subjects & Progress
subjects
  id: uuid PK
  name: string
  category: enum('exact', 'natural', 'humanitarian', 'physical', 'creative')

character_subjects
  id: uuid PK
  character_id: uuid FK -> characters.id
  subject_id: uuid FK -> subjects.id
  level: int default 1
  current_xp: int default 0
  UNIQUE(character_id, subject_id)

character_grades
  id: uuid PK
  character_id: uuid FK -> characters.id
  class_id: uuid FK -> classes.id
  subject_id: uuid FK -> subjects.id
  score: int -- 0-100
  created_at: timestamp

character_location_progress
  id: uuid PK
  character_id: uuid FK -> characters.id
  location_id: uuid FK -> locations.id
  completion_percent: decimal default 0
  is_completed: boolean default false
  UNIQUE(character_id, location_id)

-- Equipment & Inventory
items
  id: uuid PK
  name: string
  description: string
  slot: enum('pen', 'notebook', 'backpack', 'calculator', 'glasses')
  rarity: enum('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic')
  stats: jsonb -- {xp_bonus: 5, cash_bonus: 3}
  npc_sell_price: int
  npc_buy_price: int nullable
  is_tradeable: boolean default true

character_equipment
  id: uuid PK
  character_id: uuid FK -> characters.id
  slot: enum('pen', 'notebook', 'backpack', 'calculator', 'glasses')
  item_id: uuid FK -> items.id
  UNIQUE(character_id, slot)

character_inventory
  id: uuid PK
  character_id: uuid FK -> characters.id
  item_id: uuid FK -> items.id
  quantity: int default 1
  UNIQUE(character_id, item_id)

-- Crafting
materials
  id: uuid PK
  name: string
  rarity: enum('common', 'uncommon', 'rare', 'epic')
  description: string

character_materials
  id: uuid PK
  character_id: uuid FK -> characters.id
  material_id: uuid FK -> materials.id
  quantity: int default 0
  UNIQUE(character_id, material_id)

recipes
  id: uuid PK
  name: string
  result_item_id: uuid FK -> items.id nullable
  result_material_id: uuid FK -> materials.id nullable
  result_quantity: int default 1
  ingredients: jsonb -- [{type: 'material', id: uuid, quantity: 5}, ...]
  required_character_level: int default 1

-- Quests
quests
  id: uuid PK
  name: string
  description: string
  type: enum('tutoring', 'teaching')
  energy_cost: int
  cooldown_seconds: int
  rewards: jsonb -- {cash: [10, 20], subject_xp: 'random', item_chance: 0.05}
  required_character_level: int default 1
  required_subject_level: int default 1

character_quest_cooldowns
  id: uuid PK
  character_id: uuid FK -> characters.id
  quest_id: uuid FK -> quests.id
  available_at: timestamp
  UNIQUE(character_id, quest_id)

-- Olympiads
olympiad_types
  id: uuid PK
  name: string
  difficulty: enum('school', 'district', 'city', 'national')
  subject_id: uuid FK -> subjects.id nullable -- null = multi-subject
  energy_cost: int
  npc_level_range: jsonb -- {min: -5, max: 5} relative to player
  rewards: jsonb
  required_character_level: int default 1

olympiad_weekly_events
  id: uuid PK
  subject_id: uuid FK -> subjects.id nullable
  starts_at: timestamp
  ends_at: timestamp
  rewards_by_percentile: jsonb

olympiad_weekly_participants
  id: uuid PK
  event_id: uuid FK -> olympiad_weekly_events.id
  character_id: uuid FK -> characters.id
  score: int
  rank: int nullable
  rewards_claimed: boolean default false
  UNIQUE(event_id, character_id)

-- Market
market_listings
  id: uuid PK
  seller_id: uuid FK -> characters.id
  item_id: uuid FK -> items.id
  quantity: int
  price_per_unit: int
  created_at: timestamp
  expires_at: timestamp
  is_active: boolean default true

market_transactions
  id: uuid PK
  listing_id: uuid FK -> market_listings.id
  buyer_id: uuid FK -> characters.id
  quantity: int
  total_price: int
  fee: int
  created_at: timestamp

-- Professions (post-MVP)
professions
  id: uuid PK
  name: string
  type: enum('tutoring', 'teaching', 'administration')
  requirements: jsonb
  benefits: jsonb

character_professions
  id: uuid PK
  character_id: uuid FK -> characters.id
  profession_id: uuid FK -> professions.id
  level: int default 1
  current_xp: int default 0
  UNIQUE(character_id, profession_id)

-- Daily Rewards
character_daily_rewards
  id: uuid PK
  character_id: uuid FK -> characters.id
  current_day: int default 1 -- 1-7 cycle
  last_claim: date
  UNIQUE(character_id)
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | NestJS (TypeScript) |
| Frontend | Next.js 16+ (React, App Router) |
| Database | PostgreSQL |
| ORM | Prisma |
| Cache/Queue | Redis |
| Auth | JWT + Refresh Tokens |
| Realtime | Socket.io (NestJS Gateway) |
| Deployment | Docker Compose |

---

## UI Design

**Theme:** Dark mode with SimpleMMO-inspired aesthetics

### Color Palette

| Variable | Value | Usage |
|----------|-------|-------|
| --bg-primary | #0a0a0f | Main background |
| --bg-secondary | #12121a | Section backgrounds |
| --bg-card | #16161f | Card backgrounds |
| --accent | #10b981 | Primary actions, highlights |
| --accent-hover | #34d399 | Hover states |
| --text-primary | #f1f5f9 | Main text |
| --text-secondary | #94a3b8 | Secondary text |
| --text-muted | #64748b | Muted labels |
| --border | #1e293b | Card borders |
| --success | #10b981 | Positive actions |
| --warning | #f59e0b | Warnings |
| --danger | #ef4444 | Destructive actions |

### Design Principles

1. **Glass Morphism**: Cards use `backdrop-blur` with semi-transparent backgrounds
2. **Gradient Accents**: Primary buttons use gradient backgrounds with glow effects
3. **Rounded Elements**: All cards use `rounded-2xl`, buttons use `rounded-xl`
4. **Subtle Shadows**: Glow effects using accent color for interactive elements
5. **Mobile-First**: Bottom navigation, touch-friendly tap targets

### Art Style

**Pixel Art** - All game sprites and visual assets use retro pixel art style:

| Asset Type | Description |
|------------|-------------|
| Item Icons | 32x32 or 64x64 pixel sprites for equipment (pens, notebooks, etc.) |
| Character Avatars | Customizable pixel art avatars for player profiles |
| Location Backgrounds | Pixel art scenes for each educational institution |
| UI Elements | Pixel-styled icons and decorative elements |

Future art additions:
- Item sprites for all equipment slots and rarities
- Avatar customization (hairstyles, outfits, accessories)
- Achievement badges and medals
- Animated sprites for special effects

### Component Variants

**Buttons:**
- `primary`: Gradient accent with glow shadow
- `secondary`: Glass background with border
- `ghost`: Transparent with hover effect
- `danger`: Red gradient

**Cards:**
- `default`: Standard glass card
- `glow`: Card with accent border glow (for important sections)

**Progress Bars:**
- Colors: blue, green, yellow, red, purple, accent
- Sizes: sm (1.5px), md (2px), lg (3px)
- Optional glow effect at >10% fill

### Navigation

- **Header**: App title + cash display
- **Bottom Nav**: 5 tabs (Study, Profile, Items, Quests, More)
- Active state: Accent color + dot indicator

---

## Project Structure

```
eduquest/
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── .env.example
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   │
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   │
│   │   ├── common/
│   │   │   ├── decorators/
│   │   │   │   ├── current-user.decorator.ts
│   │   │   │   └── public.decorator.ts
│   │   │   ├── guards/
│   │   │   │   └── jwt-auth.guard.ts
│   │   │   ├── filters/
│   │   │   │   └── http-exception.filter.ts
│   │   │   ├── interceptors/
│   │   │   │   └── transform.interceptor.ts
│   │   │   └── utils/
│   │   │       ├── formulas.ts          # XP curves, grade generation
│   │   │       └── random.ts
│   │   │
│   │   ├── config/
│   │   │   ├── config.module.ts
│   │   │   ├── database.config.ts
│   │   │   ├── jwt.config.ts
│   │   │   └── game.config.ts           # Game balance constants
│   │   │
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── strategies/
│   │   │   │   │   ├── jwt.strategy.ts
│   │   │   │   │   └── jwt-refresh.strategy.ts
│   │   │   │   └── dto/
│   │   │   │       ├── register.dto.ts
│   │   │   │       ├── login.dto.ts
│   │   │   │       └── tokens.dto.ts
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   └── dto/
│   │   │   │       └── update-settings.dto.ts
│   │   │   │
│   │   │   ├── characters/
│   │   │   │   ├── characters.module.ts
│   │   │   │   ├── characters.controller.ts
│   │   │   │   ├── characters.service.ts
│   │   │   │   └── dto/
│   │   │   │       └── character-response.dto.ts
│   │   │   │
│   │   │   ├── study/
│   │   │   │   ├── study.module.ts
│   │   │   │   ├── study.controller.ts
│   │   │   │   ├── study.service.ts
│   │   │   │   ├── study.gateway.ts     # WebSocket for real-time updates
│   │   │   │   └── dto/
│   │   │   │       └── study-result.dto.ts
│   │   │   │
│   │   │   ├── subjects/
│   │   │   │   ├── subjects.module.ts
│   │   │   │   ├── subjects.controller.ts
│   │   │   │   └── subjects.service.ts
│   │   │   │
│   │   │   ├── locations/
│   │   │   │   ├── locations.module.ts
│   │   │   │   ├── locations.controller.ts
│   │   │   │   ├── locations.service.ts
│   │   │   │   └── dto/
│   │   │   │       └── location-progress.dto.ts
│   │   │   │
│   │   │   ├── grades/
│   │   │   │   ├── grades.module.ts
│   │   │   │   ├── grades.controller.ts
│   │   │   │   └── grades.service.ts
│   │   │   │
│   │   │   ├── inventory/
│   │   │   │   ├── inventory.module.ts
│   │   │   │   ├── inventory.controller.ts
│   │   │   │   ├── inventory.service.ts
│   │   │   │   └── dto/
│   │   │   │       ├── equip-item.dto.ts
│   │   │   │       └── inventory-response.dto.ts
│   │   │   │
│   │   │   ├── items/
│   │   │   │   ├── items.module.ts
│   │   │   │   ├── items.controller.ts
│   │   │   │   └── items.service.ts
│   │   │   │
│   │   │   ├── quests/
│   │   │   │   ├── quests.module.ts
│   │   │   │   ├── quests.controller.ts
│   │   │   │   ├── quests.service.ts
│   │   │   │   └── dto/
│   │   │   │       └── quest-result.dto.ts
│   │   │   │
│   │   │   ├── olympiads/
│   │   │   │   ├── olympiads.module.ts
│   │   │   │   ├── olympiads.controller.ts
│   │   │   │   ├── olympiads.service.ts
│   │   │   │   ├── olympiads.scheduler.ts  # Weekly event creation
│   │   │   │   └── dto/
│   │   │   │       ├── battle-result.dto.ts
│   │   │   │       └── leaderboard.dto.ts
│   │   │   │
│   │   │   ├── crafting/
│   │   │   │   ├── crafting.module.ts
│   │   │   │   ├── crafting.controller.ts
│   │   │   │   ├── crafting.service.ts
│   │   │   │   └── dto/
│   │   │   │       └── craft-item.dto.ts
│   │   │   │
│   │   │   ├── market/
│   │   │   │   ├── market.module.ts
│   │   │   │   ├── market.controller.ts
│   │   │   │   ├── market.service.ts
│   │   │   │   └── dto/
│   │   │   │       ├── create-listing.dto.ts
│   │   │   │       └── buy-item.dto.ts
│   │   │   │
│   │   │   ├── daily-rewards/
│   │   │   │   ├── daily-rewards.module.ts
│   │   │   │   ├── daily-rewards.controller.ts
│   │   │   │   └── daily-rewards.service.ts
│   │   │   │
│   │   │   ├── energy/
│   │   │   │   ├── energy.module.ts
│   │   │   │   └── energy.service.ts     # Shared energy regen logic
│   │   │   │
│   │   │   └── cities/
│   │   │       ├── cities.module.ts
│   │   │       ├── cities.controller.ts
│   │   │       └── cities.service.ts
│   │   │
│   │   └── prisma/
│   │       ├── prisma.module.ts
│   │       └── prisma.service.ts
│   │
│   └── test/
│       ├── app.e2e-spec.ts
│       └── jest-e2e.json
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── .env.example
│   │
│   ├── public/
│   │   ├── icons/
│   │   └── images/
│   │
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx                  # Landing redirect
│       │   ├── globals.css               # Dark theme with glass morphism
│       │   │
│       │   ├── login/
│       │   │   └── page.tsx
│       │   ├── register/
│       │   │   └── page.tsx
│       │   │
│       │   └── game/
│       │       ├── layout.tsx            # Game layout with BottomNav
│       │       ├── page.tsx              # Study page (main game screen)
│       │       ├── profile/
│       │       │   └── page.tsx          # Player stats, energy, subjects
│       │       ├── inventory/
│       │       │   └── page.tsx          # Equipment & items
│       │       ├── quests/
│       │       │   └── page.tsx          # Tutoring quests
│       │       └── settings/
│       │           └── page.tsx          # User preferences
│       │
│       ├── components/
│       │   ├── ui/                       # Reusable UI components
│       │   │   ├── Button.tsx            # Gradient buttons with glow
│       │   │   ├── Card.tsx              # Glass cards with variants
│       │   │   ├── Modal.tsx
│       │   │   ├── ProgressBar.tsx       # Multi-color with glow
│       │   │   └── Input.tsx
│       │   │
│       │   ├── game/                     # Game-specific components
│       │   │   ├── StudyButton.tsx       # Animated study click button
│       │   │   ├── CharacterStats.tsx    # Compact level & XP display
│       │   │   ├── SubjectCard.tsx
│       │   │   ├── ItemSlot.tsx
│       │   │   └── QuestCard.tsx
│       │   │
│       │   └── layout/
│       │       ├── Header.tsx            # App header with cash display
│       │       └── BottomNav.tsx         # Mobile-first 5-tab navigation
│       │
│       ├── lib/
│       │   └── api.ts                    # API client with auth
│       │
│       ├── stores/                       # Zustand stores
│       │   ├── authStore.ts              # JWT auth state
│       │   └── characterStore.ts         # Character data & actions
│       │
│       └── types/
│           └── api.ts                    # API response types
│
└── shared/                               # Shared types (optional)
    └── types/
        ├── api.ts
        └── game.ts
```

---

## MVP Roadmap

### v0.1 - Core Loop ✅
- [x] Auth (register, login, JWT)
- [x] Character creation with city selection
- [x] 9 subjects with leveling
- [x] Study mechanic (endless clicks)
- [x] Grade generation
- [x] Prep School + School locations
- [x] Class completion
- [x] Basic UI (dashboard, study, progress)
- [x] Mobile-responsive design

### v0.2 - Economy & Equipment ✅
- [x] Equipment system (5 slots)
- [x] Item drops from study
- [x] Inventory management
- [x] NPC shop (buy/sell)
- [x] Cash display and transactions

### v0.3 - Quests ✅
- [x] Quest energy system
- [x] 5-6 tutoring quests
- [x] Cooldowns
- [x] Quest rewards

### v0.4 - Olympiads PvE ✅
- [x] Olympiad energy system
- [x] Daily PvE battles
- [x] 4 difficulty tiers (School, District, City, National)
- [x] Battle formula (player score vs NPC score)
- [x] Rewards (cash, XP, item drops)
- [x] Olympiad UI with battle result modal

### v0.5 - Crafting ✅
- [x] Materials system
- [x] Material drops (8% chance on study)
- [x] 3 starter recipes (Study Notes, Handmade Notebook, Quality Pen)
- [x] Crafting UI with recipes and materials tabs

### v0.6 - Market ✅
- [x] Create listings from inventory
- [x] Browse and buy from other players
- [x] 5% transaction fee
- [x] 7-day listing expiration
- [x] Market UI (browse, my listings, transaction history)
- [x] Cancel listings and return items to inventory

### v0.7 - College ✅
- [x] College location (unlocks at 60% School)
- [x] 6 Specializations (Computer Science, Engineering, Natural Sciences, Literature & Languages, Business Administration, Arts & Design)
- [x] Requirements checking (subject levels, grade average, cost)
- [x] Specialization selection UI with requirements display

### v0.8 - Weekly Olympiads ✅
- [x] Scheduled weekly events (Sundays)
- [x] Leaderboards with rankings
- [x] Percentile rewards (top 10%, 25%, 50%, participation)
- [x] Join event and compete for score

### v0.9 - Daily Login Rewards ✅
- [x] 7-day reward cycle (cash, items, quest energy)
- [x] Daily claim system with reset at midnight
- [x] Reward preview modal showing all 7 days
- [x] Animated claim button and result display

### Future
- [ ] University (advanced specializations)
- [ ] Professions (Tutor, Teacher, Lecturer, Principal)
- [ ] Guilds/Groups
- [ ] Achievements
- [ ] Push notifications
- [ ] AFK tutors
- [ ] Admin panel for items/quests management

---

## Quick Reference - Balance Constants

```typescript
// config/game.config.ts

export const GAME_CONFIG = {
  // Study
  STUDY_COOLDOWN_MS: 3000,
  STUDY_SUBJECT_XP_MIN: 10,
  STUDY_SUBJECT_XP_MAX: 25,
  STUDY_SUBJECTS_AFFECTED_MIN: 1,
  STUDY_SUBJECTS_AFFECTED_MAX: 3,
  STUDY_CHARACTER_XP_MIN: 3,
  STUDY_CHARACTER_XP_MAX: 8,
  STUDY_CASH_CHANCE: 0.15,
  STUDY_CASH_MIN: 1,
  STUDY_CASH_MAX: 5,
  STUDY_CLICKS_PER_GRADE: 10,

  // XP Curves
  CHARACTER_XP_BASE: 100,
  CHARACTER_XP_EXPONENT: 1.5,
  SUBJECT_XP_BASE: 50,
  SUBJECT_XP_EXPONENT: 1.8,

  // Grades
  GRADE_BASE_MIN: 30,
  GRADE_BASE_MAX: 85,
  GRADE_LEVEL_BONUS_PER_LEVEL: 0.3,
  GRADES_TO_COMPLETE_CLASS: 15,

  // Energy - Quest
  QUEST_ENERGY_MAX: 100,
  QUEST_ENERGY_REGEN_MINUTES: 3,

  // Energy - Olympiad
  OLYMPIAD_ENERGY_MAX: 50,
  OLYMPIAD_ENERGY_REGEN_MINUTES: 10,

  // Market
  MARKET_FEE_PERCENT: 5,
  MARKET_LISTING_DAYS: 7,

  // NPC Prices
  NPC_PRICES: {
    common: { sell: 10, buy: 25 },
    uncommon: { sell: 35, buy: 80 },
    rare: { sell: 150, buy: 350 },
    epic: { sell: 750, buy: 1500 },
    legendary: { sell: 3500, buy: 8000 },
    mythic: { sell: 15000, buy: null },
  },

  // Drop Rates
  RARITY_WEIGHTS: {
    common: 60,
    uncommon: 25,
    rare: 10,
    epic: 4,
    legendary: 0.9,
    mythic: 0.1,
  },

  // Daily Rewards
  DAILY_REWARDS: [
    { day: 1, cash: 50 },
    { day: 2, cash: 100 },
    { day: 3, cash: 0, item_rarity: 'common' },
    { day: 4, cash: 150 },
    { day: 5, cash: 200, quest_energy: 10 },
    { day: 6, cash: 0, item_rarity: 'uncommon' },
    { day: 7, cash: 500, item_rarity: 'rare' },
  ],
};
```

---

## Getting Started (for Claude Code)

1. Create the project structure as defined above
2. Initialize backend:
   ```bash
   cd backend
   npm init -y
   npm install @nestjs/cli
   npx nest new . --skip-git --package-manager npm
   npm install @prisma/client @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer @nestjs/websockets @nestjs/platform-socket.io socket.io
   npm install -D prisma @types/passport-jwt @types/bcrypt
   npx prisma init
   ```

3. Initialize frontend:
   ```bash
   cd frontend
   npx create-next-app@latest . --typescript --tailwind --app --src-dir
   npm install zustand socket.io-client
   ```

4. Set up Docker Compose for PostgreSQL and Redis

5. Create Prisma schema based on Data Model section

6. Implement modules in order: Auth → Users → Characters → Subjects → Study → Locations → Grades

---

*Document Version: 1.5*
*Last Updated: December 2024*

---

## Changelog

### v1.1 (December 2024)
- Added UI Design section with SimpleMMO-inspired dark theme
- Updated MVP Roadmap: v0.1, v0.2, v0.3 completed
- Updated frontend structure to reflect actual implementation
- Renamed "subjects" page to "profile" (now contains player stats, energy, subjects)
- Simplified Study page (removed energy display, moved to Profile)

### v1.2 (December 2024)
- **v0.4 Olympiads PvE completed**: Full battle system with 4 difficulty tiers, energy management, rewards
- Added class-to-class progression UI (Grade 1 → Grade 2 → ... → Grade 11)
- Now shows "Advance to Grade X" with per-subject grade requirements
- Location transition only shown after all classes completed
- Debug tools: cooldown toggle, energy renew, grade granting, account reset
- **Global Chat**: Real-time chat system with 50 message history, accessible from header

### v1.3 (December 2024)
- **Grade XP Bonus**: Receiving a grade now grants 1.5x XP to that subject (50% bonus on top of regular XP)
- **School unlock requirements**: Mathematics Lv.4 + Literature Lv.5 + 100% Prep School
- **Subject restrictions by grade**: Grade 1-2 only has basic subjects (Math, Literature, PE, Art), advanced subjects unlock in later grades
- **Simplified progress display**: Location progress now shows only current % instead of "X%/100%"

### v1.4 (December 2024)
- **v0.5 Crafting system completed**: Materials drop from studying (8% chance), 3 starter recipes, crafting UI with recipes/materials tabs
- **v0.6 Market system completed**: Player-to-player trading with 5% fee, 7-day listing expiration, browse/my-listings/history tabs
- Updated bottom navigation: consolidated Quests, Olympiads, and Market into "More" dropdown menu
- Added "List on Market" button in inventory with quantity/price modal

### v1.5 (December 2024)
- **v0.7 College system completed**: 6 specializations with subject level, grade average, and cost requirements
- **v0.8 Weekly Olympiads completed**: Scheduled Sunday events with leaderboards and percentile rewards
- **v0.9 Daily Login Rewards completed**: 7-day reward cycle with cash, items, and quest energy
- Renamed project from EduQuest to StudyMMO
- Fixed market controller bug (incorrect JWT payload field usage)