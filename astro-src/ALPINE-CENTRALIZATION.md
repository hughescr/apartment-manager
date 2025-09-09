# Alpine.js component architectural design

## Final Architecture

### Centralized Registration Pattern

All Alpine.js components are now registered through a single entry point:

```typescript
// astro-src/lib/alpine-registry.ts
function registerAlpineComponents(Alpine: Alpine): void {
    // Standard components
    Alpine.data('buildingStateData', createBuildingState);
    Alpine.data('petPolicyData', createPetPolicyState);

    // Factory-based components (for parameterized components)
    Alpine.data('unitTypeCardData', createUnitTypeCardFactory);
    Alpine.data('unitTypeFormData', createUnitTypeFormFactory);
    Alpine.data('locationMapData', createLocationMapFactory);
}
```

### Data Attributes Pattern

Components that need configuration data use HTML data attributes:

```html
<!-- UnitTypeCard.astro -->
<div
  x-data="unitTypeCardData"
  data-unit-type={JSON.stringify(unitType)}
  data-building-amenities={JSON.stringify(buildingAmenities)}
  data-api-url={apiURL}
>
```

Factory functions extract configuration from these attributes:

```typescript
// Factory function pattern
export function createUnitTypeCardFactory(this: AlpineContext) {
    const element = this.$root || this.$el;
    const unitType = JSON.parse(element?.dataset?.unitType || '{}');
    const buildingAmenities = JSON.parse(element?.dataset?.buildingAmenities || '[]');
    const apiURL = element?.dataset?.apiUrl || '';

    return {
        // Component state and methods...
    };
}
```

### Component Categories

1. **Standard Components**: Direct function registration
   - buildingStateData, petPolicyData, addBuildingFormData, etc.

2. **Factory Components**: For parameterized components
   - unitTypeCardData, unitTypeFormData, locationMapData

3. **Special Components**: Component-specific registration
   - toastController (handled in Toast.astro)

## Developer Guide

### Creating New Alpine.js Components

When adding new Alpine.js components to the project, follow this pattern:

#### 1. Standard Components (No Parameters)

For components that don't need external configuration:

```typescript
// astro-src/lib/my-component/myComponentState.ts
export function createMyComponentState() {
    return {
        someProperty: 'default value',

        init() {
            // Component initialization
        },

        // Component methods...
    };
}
```

Register in `alpine-registry.ts`:

```typescript
import { createMyComponentState } from './my-component/myComponentState';

// In registerAlpineComponents function:
Alpine.data('myComponentData', createMyComponentState);
```

Use in Astro components:

```html
<div x-data="myComponentData">
    <!-- Component template -->
</div>
```

#### 2. Factory Components (With Parameters)

For components that need configuration data:

```typescript
// astro-src/lib/my-component/factory.ts
interface AlpineContext {
    $root?: HTMLElement
    $el?: HTMLElement
    $dispatch: (event: string, detail: unknown) => void
}

/**
 * Factory function for myComponentData Alpine component
 *
 * @returns Alpine.js component object with configuration-based functionality
 *
 * @description
 * Data attributes used for configuration:
 * - `data-config-value`: Description of what this configures
 * - `data-api-url`: Base API URL for making requests
 */
export function createMyComponentFactory(this: AlpineContext) {
    // Extract config from data attributes
    const element = this.$root || this.$el;
    const configValue = element?.dataset?.configValue || '';
    const apiURL = element?.dataset?.apiUrl || '';

    return {
        configValue,
        apiURL,

        init() {
            // Component initialization using config
        },

        // Component methods...
    };
}
```

Register in `alpine-registry.ts`:

```typescript
import { createMyComponentFactory } from './my-component/factory';

// In registerAlpineComponents function:
Alpine.data('myComponentData', createMyComponentFactory);
```

Use in Astro components:

```html
<div
  x-data="myComponentData"
  data-config-value={configValue}
  data-api-url={apiURL}
>
    <!-- Component template -->
</div>
```

### Data Attributes Best Practices

1. **Naming Convention**: Use kebab-case for data attributes (`data-api-url`, not `data-apiURL`)

2. **JSON Serialization**: For complex objects, use `JSON.stringify()` in Astro and `JSON.parse()` in factory:
   ```html
   data-complex-config={JSON.stringify(complexObject)}
   ```
   ```typescript
   const config = JSON.parse(element?.dataset?.complexConfig || '{}');
   ```

3. **Default Values**: Always provide defaults for missing attributes:
   ```typescript
   const apiURL = element?.dataset?.apiUrl || '/api/';
   ```

4. **Type Safety**: Use proper TypeScript interfaces for configuration objects

### Testing Alpine Components

When testing components that use the centralized registry:

```typescript
// In test setup
import { registerAlpineComponents } from '@/lib/alpine-registry';

// Mock Alpine.js
const mockAlpine = {
    data: vi.fn()
};

// Register components
registerAlpineComponents(mockAlpine);
```

### Debugging Tips

1. **Registry Confirmation**: Check browser console for registration confirmation message
2. **Data Attributes**: Use browser dev tools to inspect `element.dataset` values
3. **Component State**: Use Alpine.js devtools browser extension for state inspection
