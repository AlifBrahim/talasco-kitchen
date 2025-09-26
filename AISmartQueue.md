# AI Smart Queue System

## Overview

The AI Smart Queue is an intelligent kitchen management system that batches and prioritizes items by cooking section and capacity, while preserving FIFO fairness. It merges similar orders for a short window, flips to Cooking as soon as a batch reaches station capacity, and keeps additional items queued without timers until the chef is ready.

## How It Works

### 1) Core Principles
- **FIFO ordering**: Items are prioritized strictly by order placement time.
- **Section-based grouping**: Items are grouped by their section (Grill, Fryer, Salad, Drinks, Dessert, …).
- **Capacity-aware batching**: Groups split into one or more cards sized by `sections.max_capacity`.
- **Lead merge window (3 minutes)**: Only the first card per group (the lead) shows a timer and can accept merges.
- **Immediate cooking when full**: If a card reaches section capacity, it flips to Cooking immediately (ignores remaining timer).
- **Stackable queue**: Additional cards have no timer and can stack indefinitely until cooking begins.

### 2) Database Integration

#### Section configuration
```sql
-- sections table
sectionid | sectionname | max_capacity
1         | Grill       | 4
2         | Fryer       | 3
3         | Salad       | 2
6         | Drinks      | 3
7         | Dessert     | 2
```

#### Menu item mapping
```sql
-- menuitems table
itemid | itemname | sectionid
1      | burger   | 1       -- Grill
2      | fries    | 2       -- Fryer
3      | coffee   | 6       -- Drinks
4      | ice-tea  | 6       -- Drinks
5      | pat      | 7       -- Dessert
```

### 3) Smart Queue Logic (UI)

1. **Order collection**
   - Load active orders; consider items with `status IN ('queued','prepping')` for Smart Queue.
   - Record FIFO timestamp from `orders.placed_at`.

2. **Grouping key**
   - `itemName | note | source` (keeps variants separate; e.g., different notes or dine-in vs delivery).

3. **Batching by capacity**
   - For each group, build cards up to `sections.max_capacity` per card.
   - If a card becomes full while merging, it immediately flips to Cooking.

4. **Lead merge window**
   - The first card per group is the lead.
   - Lead status: **Queuing** for up to 3 minutes; shows timer “Queuing Xs”.
   - During this window, new matching orders may merge into the lead until capacity is reached.
   - When the window expires (or capacity is reached), lead flips to **Cooking** (no timer).
   - Non-lead cards are **Queued** (no timer) and stack indefinitely until they become the next lead.

5. **Status definitions**
   - **Queuing (lead)**: timer visible; accepts merges; flips to Cooking at 0s or when full.
   - **Queued (non-lead)**: no timer; stacks; will become lead later.
   - **Cooking**: chef actively preparing; no timer.

### 4) Visual Design System

#### Section colors (server-driven)
- Colors are provided by `/api/sections` and tied to section names (light gradient + border).
- Item→section mapping comes from `/api/menu-items/sections`.

Reference palettes:
- Grill: #fef3e2 → #fed7aa (border #fb923c)
- Fryer: #fef2f2 → #fecaca (border #f87171)
- Salad: #f0fdf4 → #bbf7d0 (border #4ade80)
- Drinks: #eff6ff → #bfdbfe (border #60a5fa)
- Dessert: #fdf4ff → #e9d5ff (border #a855f7)

#### Card badges & timer
- Queuing (lead): blue badge + “Queuing Xs”.
- Queued (non-lead): blue badge, no timer.
- Cooking: orange badge, no timer.

### 5) Workflow Examples

#### A) Normal operation (Grill capacity 4)
1) Order 1: 2x burger → creates lead Burger card (Queuing 180s).
2) Order 2: 3x burger (within window) → merges: 2+3=5 → split into 4 (Cooking immediately) + 1 (Queued, no timer).
3) Order 3: 1x burger (after 3 min) → creates another Queued card (no timer).

#### B) Fryer overflow (capacity 3)
1) Order 1: 3x fries → first card is full → Cooking immediately.
2) Order 2: 2x fries (arrives later) → new Queued card (no timer) stacks until chef is ready.

### 6) Technical Implementation

#### Key components
- Station Dispatcher API: `/api/kitchen-agents/station-dispatcher` (FIFO recommendations)
- Sections API: `/api/sections` (capacity + colors)
- Menu Item Mappings API: `/api/menu-items/sections` (item→section)
- Smart Queue logic: `recomputeSmartQueue()` in `client/pages/KitchenDisplay.tsx` (grouping, batching, timers)

#### Data flow
1) Fetch active orders.
2) Load sections and item mappings.
3) Group items by name|note|source.
4) Build cards by capacity; determine lead vs queued vs cooking.
5) Render with section colors; show timer only on lead cards in Queuing state.
6) Recompute every second to refresh timers and states.

#### Persistence
- Lead card `createdAt` timestamps persist in `localStorage`.
- On reload, only non-expired (≤3 minutes) timestamps are restored; others are discarded.
- When a card is completed, its metadata is removed so new orders get a fresh timer.

### 7) Traditional Queue (Orders view)
- Cards are sorted oldest→newest (leftmost is oldest) using `placed_at ASC`.
- Ready action is available for both `open` and `in_progress` orders.

### 8) Configuration
- Lead (merge) window: 3 minutes (180,000 ms).
- Section capacities: from `sections.max_capacity` (DB).
- Section colors: from `/api/sections` (server-driven palettes).
- UI refresh cadence: 1 second.

### 9) Benefits
- Efficiency via intelligent batching and capacity-aware merging.
- Fairness via FIFO ordering.
- Clear UI via section colors and minimized timers.
- Resilient persistence and defensive cleanup.

---

This system provides a robust, scalable solution for kitchen order management that balances efficiency with fairness, while giving chefs a clear, color‑coded view of what to cook now vs what stacks next.
# AI Smart Queue System

## Overview

The AI Smart Queue is an intelligent kitchen management system that automatically groups and prioritizes menu items based on cooking stations and capacity constraints. It optimizes kitchen workflow by merging similar orders and respecting station capacities while maintaining FIFO (First In, First Out) ordering.

## How It Works

### 1. Core Principles

- **FIFO Ordering**: Orders are processed in the order they were placed
- **Station-Based Grouping**: Items are grouped by their assigned cooking station (Grill, Fryer, Salad, Drinks, Dessert)
- **Capacity-Aware Batching**: Items are batched according to station capacity limits
- **3-Minute Merge Window**: Similar items can be merged within a 3-minute window for efficiency

### 2. Database Integration

#### Section Configuration
```sql
-- sections table
sectionid | sectionname | max_capacity
1         | Grill       | 4
2         | Fryer       | 3
3         | Salad       | 2
6         | Drinks      | 3
7         | Dessert     | 2
```

#### Menu Item Mapping
```sql
-- menuitems table with section assignment
itemid | itemname   | sectionid
1      | burger     | 1        -- Grill
2      | fries      | 2        -- Fryer
3      | coffee     | 6        -- Drinks
4      | ice-tea    | 6        -- Drinks
5      | pat        | 7        -- Dessert
```

### 3. Smart Queue Logic

#### Step 1: Order Collection
- System fetches all active orders with `status IN ('queued', 'prepping')`
- Each order item is tagged with its placement time for FIFO processing

#### Step 2: Item Grouping
- Items are grouped by: `itemName + note + source`
- This ensures items with different notes or sources (dine-in vs takeout) are kept separate

#### Step 3: Capacity-Based Batching
- Each item type has a maximum capacity based on its assigned station
- Example: 3x burger + 3x burger = 4x burger + 2x burger (Grill capacity: 4)

#### Step 4: Merge Window Logic
- **Open Phase (0-3 minutes)**: New orders of the same type can merge into existing cards
- **Locked Phase (3+ minutes)**: No more merging allowed, card must be completed

### 4. Visual Design System

#### Section Colors
Each station has its own color scheme for easy identification:

- **Grill**: Warm orange tones (#fef3e2 → #fed7aa)
- **Fryer**: Light red tones (#fef2f2 → #fecaca)  
- **Salad**: Fresh green tones (#f0fdf4 → #bbf7d0)
- **Drinks**: Cool blue tones (#eff6ff → #bfdbfe)
- **Dessert**: Soft purple tones (#fdf4ff → #e9d5ff)

#### Card States
- **PreppingOpen**: Yellow badge, shows countdown timer
- **Locked**: Gray badge, no merging allowed

### 5. Workflow Example

#### Scenario 1: Normal Operation
1. **Order 1**: 2x burger placed at 12:00 PM
   - Creates Burger card (Open, 3min timer starts)
   - Color: Grill orange
   - Status: "Open 180s"

2. **Order 2**: 3x burger placed at 12:01 PM (within merge window)
   - Merges into existing Burger card
   - Total: 5x burger (capacity: 4) → Split into 4x + 1x cards
   - Timer resets to 3 minutes

3. **Order 3**: 1x burger placed at 12:04 PM (after merge window)
   - Creates separate Burger card (Locked)
   - Previous card is now "Locked"

#### Scenario 2: Capacity Overflow
1. **Order 1**: 3x fries (Fryer capacity: 3)
   - Creates Fries card: 3x fries

2. **Order 2**: 2x fries (within merge window)
   - Cannot merge (capacity reached)
   - Creates separate Fries card: 2x fries

### 6. Technical Implementation

#### Key Components
- **Station Dispatcher API**: `/api/kitchen-agents/station-dispatcher`
- **Sections API**: `/api/sections`
- **Menu Item Mappings API**: `/api/menu-items/sections`
- **Smart Queue Logic**: `recomputeSmartQueue()` function

#### Data Flow
1. Fetch active orders from database
2. Load section configurations and menu mappings
3. Group items by type and station
4. Apply capacity constraints and merge logic
5. Generate visual cards with appropriate colors
6. Update UI with real-time timers

#### Persistence
- Card timers are persisted in localStorage
- Prevents timer reset on page refresh
- Automatic cleanup of expired cards
- Metadata removed when cards are completed

### 7. Benefits

- **Efficiency**: Reduces cooking time through intelligent batching
- **Consistency**: Maintains FIFO ordering while optimizing workflow
- **Visual Clarity**: Color-coded stations for easy identification
- **Flexibility**: Adapts to different station capacities and merge windows
- **Reliability**: Handles errors gracefully with proper fallbacks

### 8. Configuration

#### Customizable Parameters
- **Merge Window**: Currently 3 minutes (180,000ms)
- **Station Capacities**: Defined in database
- **Section Colors**: Configurable in `/api/sections`
- **Update Frequency**: 1 second intervals

#### Database Requirements
- `sections` table with capacity limits
- `menuitems` table with section assignments
- `orders` and `orderitems` tables for order data
- Proper foreign key relationships

This system provides a robust, scalable solution for kitchen order management that balances efficiency with fairness in order processing.
