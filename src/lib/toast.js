let toastFn = null

export function setToastFn(fn) {
    toastFn = fn
}

export function clearToastFn() {
    toastFn = null
}

export const toast = {
    success: (msg) => toastFn?.(msg, 'success'),
    error: (msg) => toastFn?.(msg, 'error'),
    info: (msg) => toastFn?.(msg, 'info'),
}
