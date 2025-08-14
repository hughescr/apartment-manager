export type AlpineComponent<T = Record<string, unknown>> = T & {
    $dispatch: (event: string, detail?: unknown) => void
    $root: HTMLElement
    $el: HTMLElement
    $watch: (expression: string, callback: (value: unknown) => void) => void
};
