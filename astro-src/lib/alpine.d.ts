// Alpine.js magic property types
export interface AlpineMagicProperties {
    $el: HTMLElement
    $watch<T>(property: string, callback: (value: T, oldValue: T) => void, options?: { deep?: boolean }): void
    $dispatch(event: string, detail?: unknown): void
}

// Extend the component type with Alpine magic properties
export type AlpineComponent<T> = T & AlpineMagicProperties;
