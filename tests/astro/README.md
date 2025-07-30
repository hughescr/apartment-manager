# Astro/Alpine.js Accessibility Test Suite

This directory contains comprehensive accessibility tests for the Astro/Alpine.js frontend components of the apartment manager application.

## Test Coverage

The `accessibility.test.ts` file includes tests for:

### 1. **Keyboard Navigation**
- Tab order through interactive elements
- Enter/Space key activation for buttons and controls
- Arrow key navigation where applicable
- Escape key for closing modals/dialogs

### 2. **Screen Reader Compatibility**
- Proper ARIA labels and descriptions
- Live regions for dynamic content updates
- Status announcements for loading states
- Error message announcements
- Form field associations

### 3. **Focus Management**
- Visible focus indicators
- Focus trap in modals and dialogs
- Focus restoration after modal close
- Skip navigation links
- Proper tabindex usage

### 4. **Color Contrast & Visual Indicators**
- Error state contrast ratios
- Disabled state styling
- Hover and focus states
- Loading indicators

### 5. **Component-Specific Tests**

#### PhotoUploader
- Keyboard-accessible file upload
- Progress announcements
- Error announcements
- Alternative text for uploaded images
- Accessible remove buttons

#### AmenitySelector
- Fieldset/legend grouping
- Checkbox keyboard navigation
- Selection status announcements
- Search functionality accessibility
- Category filtering

#### ModelAmenitiesManager
- Toggle button states (aria-pressed)
- Form region labeling
- Bulk edit mode announcements
- Save status notifications

### 6. **General Patterns**
- Form label associations
- Required field indicators
- Error message display
- Loading state indicators
- Touch target sizes (44x44px minimum)
- Heading hierarchy
- Landmark regions

## Running Tests

```bash
# Install dependencies
bun install

# Run all tests
bun test

# Run only accessibility tests
bun test tests/astro/accessibility.test.ts

# Run tests in watch mode
bun test --watch
```

## Test Setup

The tests use:
- **jsdom** for DOM simulation
- **Alpine.js** for component interactivity
- **jest-axe** for automated accessibility violation detection
- **Bun test runner** for fast test execution

## Adding New Tests

When adding accessibility tests for new components:

1. Create a component factory function that returns the HTML
2. Include all necessary ARIA attributes
3. Test keyboard interaction
4. Test screen reader announcements
5. Test focus management
6. Run axe accessibility checks
7. Verify touch target sizes

Example structure:
```typescript
describe('ComponentName Accessibility', () => {
    const createComponent = (props = {}) => {
        // Return component HTML with Alpine.js data
    };
    
    it('should have no accessibility violations', async () => {
        document.body.innerHTML = createComponent();
        Alpine.initTree(document.body);
        
        const results = await axe(document.body);
        expect(results).toHaveNoViolations();
    });
    
    // Add specific accessibility tests
});
```

## WCAG 2.1 Compliance

These tests help ensure WCAG 2.1 Level AA compliance by checking:
- **Perceivable**: Alternative text, color contrast, error identification
- **Operable**: Keyboard access, focus visible, no keyboard traps
- **Understandable**: Labels, instructions, error suggestions
- **Robust**: Valid markup, ARIA usage, name/role/value

## Best Practices

1. Always test with keyboard only (no mouse)
2. Test with screen reader announcements
3. Verify focus is always visible
4. Ensure all interactive elements are reachable
5. Test error states and loading states
6. Verify touch targets are at least 44x44px
7. Check heading hierarchy is logical
8. Ensure form fields have labels
9. Test color contrast ratios
10. Verify ARIA attributes are correct

## Common Issues to Check

- Missing alt text on images
- Form inputs without labels
- Buttons without accessible names
- Focus order that doesn't match visual order
- Color as the only indicator of state
- Mouse-only interactions
- Missing keyboard shortcuts
- Inaccessible error messages
- Small touch targets
- Missing skip links