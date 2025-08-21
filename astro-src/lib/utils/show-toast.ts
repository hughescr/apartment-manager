import type { ToastType } from '../types/alpine-state';

window.showToast = function(message: string, type: ToastType) {
    window.dispatchEvent(new CustomEvent('show-toast', {
        detail: { message, type }
    }));
};
