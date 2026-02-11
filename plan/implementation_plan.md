# Dashboard Redesign Implementation Plan

## Goal Description
Redesign the dashboard to improve user experience and interface aesthetics, ensuring it conforms to modern UI/UX best practices. The goal is to create a **"Refined Modern"** interface that feels premium, trustworthy, and responsive. We will avoid generic "AI" aesthetics by introducing texture, deliberate typography, and smooth motion.

## User Review Required
> [!NOTE]
> This redesign will change the visual appearance significantly. I will be introducing a new font (e.g., 'Plus Jakarta Sans' or 'Outfit') and subtle background textures to elevate the feel.

## Proposed Changes

### Global Styles & Theme
#### [MODIFY] [globals.css](file:///Users/chinoyoung/Code/gap-evals/app/globals.css)
- **Palette**: Refine `cobalt` to be more vibrant. Introduce a "surface" palette for subtle depth.
- **Typography**: Import **'Plus Jakarta Sans'** or **'Outfit'** from Google Fonts for a more modern, geometric look than the default sans.
- **Texture**: Add a subtle noise/grain overlay or a soft mesh gradient to the main background to avoid the "flat" look.

### Components
#### [MODIFY] [Card.tsx](file:///Users/chinoyoung/Code/gap-evals/components/ui/Card.tsx)
- **Glassmorphism**: Add a `glass` variant using `backdrop-filter: blur()`, `bg-white/70`, and a delicate border.
- **Interaction**: Add `hover:scale-[1.01]` and `hover:shadow-lg` transitions for tactile feedback.

#### [NEW] [DashboardHeader.tsx](file:///Users/chinoyoung/Code/gap-evals/components/dashboard/DashboardHeader.tsx)
- **Design**: Minimalist, floating header with glass effect.
- **Features**: Dynamic breadcrumbs, search (visual only for now), and profile actions.

### Layout
#### [MODIFY] [app/dashboard/layout.tsx](file:///Users/chinoyoung/Code/gap-evals/app/dashboard/layout.tsx)
- **Sidebar**:
    - **Visuals**: Dark or high-contrast sidebar to anchor the layout, or a floating glass sidebar. Let's go with **Floating Sidebar** style for a modern app feel.
    - **Navigation**: Use "pill" shaped active states with glowing accents.

### Dashboard Overview Page
#### [MODIFY] [app/dashboard/page.tsx](file:///Users/chinoyoung/Code/gap-evals/app/dashboard/page.tsx)
- **Motion**: Use `framer-motion` for a staggered entrance of all elements (header -> stats -> list).
- **Hero**: A specific "Welcome" block with a date/time and a motivational quote or simple status.
- **Stats**:
    - **Design**: "Bento box" grid style.
    - **Visuals**: Use sparklines or trend icons.
- **Active Assignments**:
    - **Table**: A clean, spacious table with "Status" pills (e.g., "Pending" = Amber soft background, "Completed" = Emerald soft background).

## Verification Plan

### Manual Verification
- **Visual Inspection**:
    - Verify the "premium" feel: texture visibility, font rendering, and shadow depth.
    - Check responsiveness at all breakpoints.
- **Motion Check**:
    - Ensure animations are snappy (not sluggish) and add value (context) rather than just distraction.
