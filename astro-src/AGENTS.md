# Frontend (Astro) Agent Guidelines

## CRITICAL RULES FOR THIS MODULE

1. **ALWAYS use SST's astro-sst adapter** - NEVER use standard Astro adapters
2. **ALWAYS use Alpine.js for interactivity** - NEVER add React/Vue/Svelte
3. **ALWAYS use DaisyUI components** - NEVER create custom UI components from scratch
4. **ALWAYS handle loading and error states** in components
5. **NEVER use `bun run dev`** - Astro requires SST server (`bun run sst-dev`)

## COMMON MISTAKES IN FRONTEND

❌ Using React components → ✅ Use Alpine.js directives
❌ Custom styling → ✅ Use Tailwind + DaisyUI classes
❌ Client-side API calls → ✅ Use Astro's server-side data fetching
❌ Creating new CSS files → ✅ Use Tailwind utilities
❌ Forgetting TypeScript → ✅ All components use TypeScript

## PATTERNS TO FOLLOW

### Astro Component Structure
```astro
---
// See components/BuildingCard.astro for patterns
import type { BuildingData } from "../types";
import { getBuildings } from "../../data/buildings";

// Server-side data fetching
const buildings = await getBuildings();
---

<div class="card bg-base-100 shadow-xl">
  <!-- Use DaisyUI classes -->
</div>
```

### Alpine.js Integration
```astro
<!-- See components/UnitCard.astro for Alpine patterns -->
<div x-data="{ open: false }">
  <button @click="open = !open" class="btn btn-primary">
    Toggle
  </button>
  <div x-show="open" x-transition>
    <!-- Content -->
  </div>
</div>
```

### Form Handling
```astro
<!-- See components/forms/ for patterns -->
<form 
  method="POST" 
  action="/api/buildings"
  x-data="{ submitting: false }"
  @submit="submitting = true"
>
  <button 
    class="btn btn-primary" 
    :disabled="submitting"
  >
    <span x-show="!submitting">Save</span>
    <span x-show="submitting" class="loading loading-spinner"></span>
  </button>
</form>
```

### DaisyUI Components
- Cards: `card`, `card-body`, `card-title`
- Buttons: `btn`, `btn-primary`, `btn-ghost`
- Forms: `input`, `select`, `textarea` with `input-bordered`
- Loading: `loading`, `loading-spinner`
- Modals: `modal`, `modal-box`

## FILE STRUCTURE

- `components/` - Reusable Astro components
  - `forms/` - Form-specific components
- `layouts/` - Page layouts
- `pages/` - Route-based pages
- `styles/` - Global styles (minimal, use Tailwind)
- `types/` - TypeScript type definitions

## ASTRO-SPECIFIC RULES

1. **Data Fetching**: Always in component frontmatter, not client-side
2. **Props**: Define interfaces for all component props
3. **Slots**: Use named slots for flexibility
4. **Styling**: Scoped styles only when absolutely necessary

## TESTING REQUIREMENTS

- Test components render correctly with various props
- Test Alpine.js interactions work
- Test form submissions
- Mock data layer calls
- Tests are completely isolated - no SST server or AWS credentials needed
- Run tests with `bun test`
- See tests/astro/ for patterns (when created)