# Questions Library — Grouped Accordion Redesign

**Date:** 2026-03-10
**Status:** Approved

## Problem

The current Questions Library page displays all questions in a flat paginated list with drag-and-drop reordering. With 20-50 questions, this feels visually cluttered and hard to navigate. The drag handles, dense rows, and lack of grouping make it difficult to scan and manage questions efficiently.

## Solution

Redesign the Questions tab as a **Grouped Accordion** layout where questions are organized into admin-defined categories. Each category is a collapsible section showing a summary of its contents. Add a search bar and summary stats to improve navigation.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Layout | Grouped Accordion | Hides complexity, clear mental model, scales well |
| Categories | Admin-defined (free create/rename/delete) | Flexible as needs evolve |
| Uncategorized | Not allowed — every question requires a category | Keeps things organized from the start |
| Drag-and-drop | Removed from questions tab | Adds clutter, user open to replacing it |
| Ordering | Categories alphabetical, questions by creation date | Simple, predictable |
| Search | Filters across all categories, auto-expands matches | Quick navigation to specific questions |

## UI Specification

### Page Layout (Questions Tab)

1. **Search bar** — full-width input with search icon, filters question text across all categories
2. **Type filter tabs** — All / Scale / Paragraph (existing, kept as-is)
3. **"+ New Category" button** — next to filter row
4. **Summary stats row** — 4 cards: Total Questions, Scale count, Text count, Categories count
5. **Category accordion sections** — one per category, collapsible

### Category Section

- **Header (always visible):** Chevron icon, category name, question count, type breakdown badges (e.g. "5 scale · 3 text"), ··· menu
- **Expanded body:** Compact question rows with type badge, text, edit/delete actions on hover
- **Multiple categories can be open simultaneously**

### Category ··· Menu

- Rename category
- Delete category (must reassign questions to another category)
- Add question to this category

### Add/Edit Question Modal (updated)

- Question text (existing)
- Type selector: Scale / Text (existing)
- **Category dropdown (new, required)**
- Scope selector: All / Self (existing)

### New Category Modal

- Name input field
- Save / Cancel buttons

### Delete Category Modal

- Warning text: "X questions will be reassigned"
- Category dropdown to select reassignment target
- Confirm / Cancel buttons

### Search Behavior

- Filters question text across all categories
- Auto-expands categories that contain matching questions
- Hides categories with no matches
- Highlights matching text in question rows

## Data Changes

### New Firestore Collection: `question_categories/`

```
{
  id: string,        // Firestore document ID
  name: string,      // Category display name
  createdAt: Timestamp
}
```

### Modified: `questions/` documents

- **Add:** `categoryId: string` (required, references a `question_categories` doc)
- **Remove:** `order: number` (no longer needed)

### Migration

Bootstrap-on-load: if no categories exist but questions do, auto-create a "General" category and assign all existing questions to it.

## What's NOT Changing

- Presets tab (keep as-is with drag-and-drop)
- Question data model (text, type, scope remain the same)
- Admin-only access control
- Firebase/Firestore backend
