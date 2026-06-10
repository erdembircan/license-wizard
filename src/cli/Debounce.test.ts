/*
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-FileCopyrightText: 2026 Erdem Bircan
 * license-wizard managed-header v1 Apache-2.0 short 74d1a0534fa2
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { debounce } from "@cli/Debounce.js";

describe("debounce", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not call the wrapped function immediately", () => {
    vi.useFakeTimers();

    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced("arg");

    expect(fn).not.toHaveBeenCalled();
  });

  it("calls the wrapped function after the delay elapses", async () => {
    vi.useFakeTimers();

    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced("arg");
    await vi.runAllTimersAsync();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("arg");
  });

  it("resets the timer when called again before the delay elapses", async () => {
    vi.useFakeTimers();

    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced("first");
    debounced("second");

    await vi.runAllTimersAsync();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("second");
  });

  it("calls the wrapped function once even when invoked many times in rapid succession", async () => {
    vi.useFakeTimers();

    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    for (let i = 0; i < 5; i++) {
      debounced(i);
    }

    await vi.runAllTimersAsync();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(4);
  });

  it("forwards all arguments to the wrapped function", async () => {
    vi.useFakeTimers();

    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced("a", "b", "c");
    await vi.runAllTimersAsync();

    expect(fn).toHaveBeenCalledWith("a", "b", "c");
  });

  it("cancel prevents the pending invocation from firing", async () => {
    vi.useFakeTimers();

    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced("arg");
    debounced.cancel();

    await vi.runAllTimersAsync();

    expect(fn).not.toHaveBeenCalled();
  });

  it("cancel is safe to call when no timer is pending", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    expect(() => debounced.cancel()).not.toThrow();
  });

  it("can be called again after cancel", async () => {
    vi.useFakeTimers();

    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced("first");
    debounced.cancel();

    debounced("second");
    await vi.runAllTimersAsync();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("second");
  });
});
