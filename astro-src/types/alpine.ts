export type AlpineComponent<T = {}> = T & {
    $dispatch: (event: string, detail?: any) => void;
    $root: HTMLElement;
    $el: HTMLElement;
    $watch: (expression: string, callback: (value: any) => void) => void;
};
