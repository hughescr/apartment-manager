# Alpine.js TypeScript Interfaces

This directory contains comprehensive TypeScript interfaces for improved type safety across the Alpine.js application. These interfaces provide IntelliSense support, compile-time type checking, and better developer experience when working with Alpine.js components.

## 📁 File Structure

```
astro-src/lib/types/
├── alpine-state.ts      # Alpine.js state object interfaces
├── alpine-events.ts     # Custom event interfaces
├── component-props.ts   # Astro component props interfaces  
├── api-types.ts         # API request/response interfaces
├── index.ts             # Central export point
├── example-usage.ts     # Usage examples and patterns
└── README.md           # This documentation
```

## 🚀 Quick Start

Import the types you need from the central export point:

```typescript
import type {
    BuildingAlpineState,
    BuildingStateWithMagic,
    UnitCardAlpineState,
    ToastShowEvent,
    BuildingProviderProps,
    CreateBuildingRequest
} from './lib/types';
```

## 📋 Available Type Categories

### 1. Alpine.js State Types (`alpine-state.ts`)

Interfaces for all Alpine.js x-data state objects:

- **`BuildingAlpineState`** - Main building management state
- **`UnitCardAlpineState`** - Individual unit card state
- **`BuildingsComponentAlpineState`** - Buildings list component state
- **`ExtendedUnitData`** - Unit data with UI state properties
- **Various form and dialog states**

### 2. Alpine.js Event Types (`alpine-events.ts`)

Interfaces for custom events and their payloads:

- **`AlpineEventRegistry`** - Complete registry of all events
- **`BuildingUpdatedEvent`** - Building data change events
- **`ToastShowEvent`** - Toast notification events
- **`UnitsFilterEvent`** - Unit filtering events
- **Type-safe event dispatchers and listeners**

### 3. Component Props Types (`component-props.ts`)

Interfaces for Astro component props:

- **`BuildingProviderProps`** - Building provider component
- **`UnitCardProps`** - Unit card component
- **`BaseFormProps`** - Base form component props
- **Dialog, form, and utility component props**

### 4. API Types (`api-types.ts`)

Interfaces for API requests and responses:

- **`CreateBuildingRequest`** - Building creation API
- **`UpdateUnitRequest`** - Unit update API
- **`BulkUpdateResponse`** - Bulk operations API
- **Complete API client interface**

## 🔧 Usage Examples

### Typing Alpine.js State

```typescript
import type { BuildingStateWithMagic } from './lib/types';

function createBuildingState(): BuildingStateWithMagic {
    return {
        building: null,
        units: [],
        errors: {},
        saving: false,
        
        init(this: BuildingStateWithMagic) {
            // TypeScript provides IntelliSense here
            this.parseBuildingData();
            this.setupWatchers();
        },
        
        // All methods are now type-safe
        async saveBuilding(this: BuildingStateWithMagic) {
            this.saving = true;
            // Implementation...
        }
    } as BuildingStateWithMagic;
}
```

### Type-Safe Event Dispatching

```typescript
import type { TypedEventDispatcher, ToastShowEvent } from './lib/types';

function showSuccessMessage(dispatcher: TypedEventDispatcher) {
    const event: ToastShowEvent = {
        message: 'Operation completed successfully',
        type: 'success'  // TypeScript ensures this is a valid toast type
    };
    
    dispatcher('toast:show', event);
}
```

### Component Props Typing

```typescript
// In an Astro component
import type { BuildingProviderProps } from './lib/types';

export interface Props extends BuildingProviderProps {}

const { building, units, unitTypes, apiURL } = Astro.props;
// TypeScript ensures all required props are provided
```

### API Request Typing

```typescript
import type { CreateBuildingRequest, BuildingResponse } from './lib/types';

async function createBuilding(request: CreateBuildingRequest): Promise<BuildingResponse> {
    const response = await fetch('/api/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)  // TypeScript validates the request structure
    });
    
    return response.json();  // Return type is properly typed
}
```

## 🎯 Key Benefits

### 1. **IntelliSense Support**
- Auto-completion for all Alpine.js state properties
- Method signature hints
- Property documentation on hover

### 2. **Compile-Time Type Safety**
- Catch typos and errors before runtime
- Ensure proper event payload structures
- Validate API request/response shapes

### 3. **Refactoring Support**
- Safe property renaming across the codebase
- Find all usages of specific types
- Confident code restructuring

### 4. **Documentation**
- Self-documenting interfaces
- Clear API contracts
- Consistent naming conventions

## 🔄 Migration Guide

### From Untyped Alpine.js

**Before:**
```javascript
function unitCardData() {
    return {
        unit: null,
        saving: false,
        init() {
            // No type safety
            this.unit = JSON.parse(this.$el.dataset.unit);
        }
    };
}
```

**After:**
```typescript
import type { UnitCardStateWithMagic } from './lib/types';

function unitCardData(): UnitCardStateWithMagic {
    return {
        unit: null,
        saving: false,
        init(this: UnitCardStateWithMagic) {
            // Full type safety with IntelliSense
            this.unit = JSON.parse(this.$el.dataset.unit);
        }
    } as UnitCardStateWithMagic;
}
```

### Updating Event Handlers

**Before:**
```javascript
this.$dispatch('building:updated', { building: this.building });
```

**After:**
```typescript
import type { BuildingUpdatedEvent } from './lib/types';

const event: BuildingUpdatedEvent = { building: this.building };
this.$dispatch('building:updated', event);
```

## 🛠 Advanced Usage

### Custom Type Guards

```typescript
import type { BuildingAlpineState } from './lib/types';

function isBuildingState(obj: unknown): obj is BuildingAlpineState {
    return (
        obj !== null &&
        typeof obj === 'object' &&
        'building' in obj &&
        'errors' in obj &&
        'saving' in obj
    );
}
```

### Extending Interfaces

```typescript
import type { BaseAlpineState } from './lib/types';

interface CustomFormState extends BaseAlpineState {
    customField: string;
    customMethod(): void;
}
```

### Generic Event Handlers

```typescript
import type { AlpineEventListener, ToastShowEvent } from './lib/types';

const toastHandler: AlpineEventListener<ToastShowEvent> = (event) => {
    const { message, type } = event.detail;  // Fully typed
    showToastNotification(message, type);
};
```

## 📝 Best Practices

### 1. **Always Use Type Annotations**
```typescript
// Good
const state: BuildingAlpineState = { /* ... */ };

// Avoid
const state = { /* ... */ };  // No type checking
```

### 2. **Use Discriminated Unions**
```typescript
// Events are discriminated unions for better type safety
type AlpineEvent = 
    | { type: 'building:updated'; detail: BuildingUpdatedEvent }
    | { type: 'toast:show'; detail: ToastShowEvent };
```

### 3. **Leverage Type Guards**
```typescript
// Use type guards for runtime validation
if (isAlpineEvent('toast:show', event)) {
    // TypeScript knows this is a ToastShowEvent
    showToast(event.detail.message, event.detail.type);
}
```

### 4. **Export Types from Components**
```typescript
// Export component-specific types for reuse
export type { MyComponentState, MyComponentProps } from './MyComponent.astro';
```

## 🐛 Troubleshooting

### Common Issues

1. **"Type 'unknown' is not assignable to..."**
   - Use type assertions or type guards
   - Validate data shapes at runtime

2. **"Property does not exist on type..."**
   - Check interface definitions
   - Ensure proper type imports

3. **"Cannot find module..."**
   - Verify import paths
   - Check that types are exported from index.ts

### IDE Configuration

For optimal TypeScript experience:

1. **VS Code**: Install Alpine.js snippets extension
2. **Enable strict mode** in tsconfig.json
3. **Configure path mapping** for easier imports

```json
{
    "compilerOptions": {
        "strict": true,
        "paths": {
            "@/types/*": ["./astro-src/lib/types/*"]
        }
    }
}
```

## 🔄 Contributing

When adding new Alpine.js components or modifying existing ones:

1. **Update interfaces** in the appropriate type files
2. **Add JSDoc comments** for complex types
3. **Update examples** in `example-usage.ts`
4. **Test type safety** with TypeScript compiler

### Adding New Event Types

1. Define the event payload interface
2. Add to `AlpineEventRegistry` in `alpine-events.ts`
3. Export from `index.ts`
4. Update documentation

## 📚 Related Documentation

- [Alpine.js Documentation](https://alpinejs.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Astro TypeScript Guide](https://docs.astro.build/en/guides/typescript/)

---

*This type system provides comprehensive coverage for the apartment manager application's Alpine.js components, ensuring type safety and improved developer experience across the entire codebase.*