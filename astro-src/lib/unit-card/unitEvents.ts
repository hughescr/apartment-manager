/**
 * Event handling and custom events for unit card component communication
 */
export class UnitEventManager {
    private element: Element;

    constructor(element: Element) {
        this.element = element;
    }

    /**
     * Dispatch a custom event from the unit card
     */
    private dispatch(eventName: string, detail?: unknown): void {
        this.element.dispatchEvent(
            new CustomEvent(eventName, {
                detail,
                bubbles: true,
                cancelable: true
            })
        );
    }

    /**
     * Notify that unit data has been updated
     */
    unitUpdated(unit: unknown): void {
        this.dispatch('unit:updated', { unit });
    }

    /**
     * Notify that unit is being saved
     */
    unitSaving(unit: unknown, fieldName?: string): void {
        this.dispatch('unit:saving', { unit, fieldName });
    }

    /**
     * Notify that unit save completed successfully
     */
    unitSaved(unit: unknown): void {
        this.dispatch('unit:saved', { unit });
    }

    /**
     * Notify that unit save failed
     */
    unitSaveError(unit: unknown, error: string): void {
        this.dispatch('unit:save-error', { unit, error });
    }

    /**
     * Notify that unit is being deleted
     */
    unitDeleting(unitId: string): void {
        this.dispatch('unit:deleting', { unitId });
    }

    /**
     * Notify that unit was deleted successfully
     */
    unitDeleted(unitId: string): void {
        this.dispatch('unit:deleted', { unitId });
    }

    /**
     * Notify that unit deletion failed
     */
    unitDeleteError(unitId: string, error: string): void {
        this.dispatch('unit:delete-error', { unitId, error });
    }

    /**
     * Notify that model/unit type selection changed
     */
    modelChanged(unit: unknown, newModelId: string | null): void {
        this.dispatch('unit:model-changed', { unit, modelId: newModelId });
    }

    /**
     * Notify that a field was reset to inherited value
     */
    fieldReset(unit: unknown, fieldName: string): void {
        this.dispatch('unit:field-reset', { unit, fieldName });
    }

    /**
     * Notify that amenities were reset to inherited values
     */
    amenitiesReset(unit: unknown): void {
        this.dispatch('unit:amenities-reset', { unit });
    }

    /**
     * Notify that validation errors occurred
     */
    validationError(errors: Record<string, string>): void {
        this.dispatch('unit:validation-error', { errors });
    }

    /**
     * Notify that validation errors were cleared
     */
    validationCleared(): void {
        this.dispatch('unit:validation-cleared');
    }

    /**
     * Notify that a form section was expanded/collapsed
     */
    sectionToggled(sectionName: string, expanded: boolean): void {
        this.dispatch('unit:section-toggled', { section: sectionName, expanded });
    }

    /**
     * Show a toast notification
     */
    showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
        this.dispatch('toast:show', { message, type });
    }

    /**
     * Request confirmation dialog
     */
    requestConfirmation(message: string, onConfirm: () => void, onCancel?: () => void): void {
        this.dispatch('confirm:request', { message, onConfirm, onCancel });
    }
}

/**
 * Event type definitions for better TypeScript support
 */
export interface UnitCardEvents {
    'unit:updated': { unit: unknown }
    'unit:saving': { unit: unknown, fieldName?: string }
    'unit:saved': { unit: unknown }
    'unit:save-error': { unit: unknown, error: string }
    'unit:deleting': { unitId: string }
    'unit:deleted': { unitId: string }
    'unit:delete-error': { unitId: string, error: string }
    'unit:model-changed': { unit: unknown, modelId: string | null }
    'unit:field-reset': { unit: unknown, fieldName: string }
    'unit:amenities-reset': { unit: unknown }
    'unit:validation-error': { errors: Record<string, string> }
    'unit:validation-cleared': Record<string, never>
    'unit:section-toggled': { section: string, expanded: boolean }
    'toast:show': { message: string, type: 'success' | 'error' | 'warning' | 'info' }
    'confirm:request': { message: string, onConfirm: () => void, onCancel?: () => void }
}

/**
 * Helper to add typed event listeners
 */
export function addUnitEventListener<K extends keyof UnitCardEvents>(
    element: Element,
    eventName: K,
    handler: (event: CustomEvent<UnitCardEvents[K]>) => void
): void {
    element.addEventListener(eventName, handler as EventListener);
}

/**
 * Helper to remove typed event listeners
 */
export function removeUnitEventListener<K extends keyof UnitCardEvents>(
    element: Element,
    eventName: K,
    handler: (event: CustomEvent<UnitCardEvents[K]>) => void
): void {
    element.removeEventListener(eventName, handler as EventListener);
}
