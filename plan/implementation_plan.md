# Dashboard Redesign Implementation Plan

## Goal Description
Redesign the dashboard to improve user experience and interface aesthetics, ensuring it conforms to modern UI/UX best practices. The goal is to create a "premium," "clean," and "user-friendly" interface that feels responsive and professional.

## User Review Required
> [!NOTE]
> This redesign will change the visual appearance of the dashboard significantly. I will be using the existing Tailwind CSS setup but refining the utility classes used.

## Proposed Changes

### Global Styles & Theme
#### [MODIFY] [globals.css](file:///Users/chinoyoung/Code/gap-evals/app/globals.css)
- Refine the color palette to include softer neutrals for background and clearer accent colors.
- Ensure dark mode support is robust and high-contrast where needed, but easier on the eyes (e.g., avoiding pure black/white).

### Components
#### [MODIFY] [Card.tsx](file:///Users/chinoyoung/Code/gap-evals/components/ui/Card.tsx) (if exists, or where used)
- Add subtle border handling for dark mode.
- Increase padding and use softer shadows (`shadow-sm` or `shadow-md` with custom colors).

### Layout
#### [MODIFY] [app/dashboard/layout.tsx](file:///Users/chinoyoung/Code/gap-evals/app/dashboard/layout.tsx)
- **Sidebar**:
    - Improve spacing of navigation items.
    - Use active states that are more distinct (e.g., subtle background fill + accent color text).
    - Add a "Collapse" feature or just refine the width/responsiveness.
    - Ensure the brand area at the top is more prominent.
- **Header (Mobile)**:
    - Ensure the mobile menu transition is smooth (using `framer-motion` as currently implemented, but refined).

### Dashboard Overview Page
#### [MODIFY] [app/dashboard/page.tsx](file:///Users/chinoyoung/Code/gap-evals/app/dashboard/page.tsx)
- **Welcome Section**:
    - Add a date/time display or a more welcoming header area.
- **Stats Grid**:
    - Redesign the stats cards to be more visually interesting (maybe add a subtle pattern or gradient).
    - Ensure icons have a dedicated container with a complementary background color.
- **Active Assignments**:
    - Convert user list to a more detailed table or list view with clear status badges.
    - Add hover effects to rows/cards.
- **Resources Section**:
    - Make the "Evaluation Guide" card stand out as a "hero" element in that column.

## Verification Plan

### Manual Verification
- **Visual Inspection**:
    - Check the dashboard at desktop (1440px+), tablet (768px), and mobile (375px) breakpoints.
    - Verify dark mode toggle (if available in UI or system preference) looks correct.
- **Interaction Testing**:
    - Hover states on all interactive elements (buttons, links, cards).
    - Mobile menu opening/closing smoothness.
    - Navigation between dashboard pages to ensure layout stability.
- **Browser Testing**:
    - I will check the implementation using the browser tool to render the page and take screenshots for review.
