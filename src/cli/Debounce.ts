/**
 * Returns a debounced version of the given function that delays invoking it
 * until after `delayMs` milliseconds have elapsed since the last call.
 * Each new call resets the timer, so only the final call within the window
 * is actually executed.
 *
 * @param fn - The function to debounce.
 * @param delayMs - The number of milliseconds to delay.
 * @returns A debounced wrapper around `fn` with a `cancel` method to clear any pending invocation.
 */
export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delayMs: number,
): ((...args: TArgs) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: TArgs): void => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delayMs);
  };

  debounced.cancel = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced;
}
