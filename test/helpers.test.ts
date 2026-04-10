import { describe, it, expect, vi } from "vitest";

vi.mock("vue", async importOriginal => {
	const actual = await importOriginal<typeof import("vue")>();
	return {
		...actual,
		onUnmounted: vi.fn(),
	};
});

import { onUnmounted } from "vue";
import { asDirective, subscribe, subscribeLater } from "../src/helpers";

describe("asDirective", () => {
	it("should call original directive on mounted with el and binding value", () => {
		const destroy = vi.fn();
		const original = vi.fn(() => ({ destroy }));
		const directive = asDirective(original);

		const el = document.createElement("div");
		directive.mounted(el, { value: "test-value" });

		expect(original).toHaveBeenCalledWith(el, "test-value");
	});

	it("should call original directive with undefined when no binding", () => {
		const destroy = vi.fn();
		const original = vi.fn(() => ({ destroy }));
		const directive = asDirective(original);

		const el = document.createElement("div");
		directive.mounted(el);

		expect(original).toHaveBeenCalledWith(el, undefined);
	});

	it("should call destroy on unmounted", () => {
		const destroy = vi.fn();
		const original = vi.fn(() => ({ destroy }));
		const directive = asDirective(original);

		const el = document.createElement("div");
		directive.mounted(el, { value: "test" });
		directive.unmounted(el);

		expect(destroy).toHaveBeenCalledOnce();
	});

	it("should not throw on unmounted if not mounted", () => {
		const original = vi.fn(() => ({ destroy: vi.fn() }));
		const directive = asDirective(original);

		expect(() =>
			directive.unmounted(document.createElement("div"))
		).not.toThrow();
	});
});

describe("subscribe", () => {
	it("should return a ref that updates when store emits", () => {
		let callback: (v: number) => void;
		const unsub = vi.fn();
		const store = {
			subscribe: vi.fn(cb => {
				callback = cb;
				return unsub;
			}),
		};

		const ref = subscribe(store);
		expect(ref.value).toBeUndefined();

		callback!(42);
		expect(ref.value).toBe(42);
	});

	it("should register unsub with onUnmounted", () => {
		const unsub = vi.fn();
		const store = {
			subscribe: vi.fn(() => unsub),
		};

		subscribe(store);

		expect(onUnmounted).toHaveBeenCalledWith(unsub);
	});
});

describe("subscribeLater", () => {
	it("should return a function that returns a ref", () => {
		const getter = subscribeLater(() => null);
		const ref = getter();
		expect(ref.value).toBeUndefined();
	});

	it("should not subscribe until the returned function is called", () => {
		const unsub = vi.fn();
		const store = {
			subscribe: vi.fn(() => unsub),
		};

		subscribeLater(() => store);

		expect(store.subscribe).not.toHaveBeenCalled();
	});

	it("should subscribe and update ref when getter is called and store is available", () => {
		let callback: (v: number) => void;
		const unsub = vi.fn();
		const store = {
			subscribe: vi.fn(cb => {
				callback = cb;
				return unsub;
			}),
		};

		const getter = subscribeLater(() => store);
		const ref = getter();

		expect(store.subscribe).toHaveBeenCalledOnce();
		expect(ref.value).toBeUndefined();

		callback!(42);
		expect(ref.value).toBe(42);
	});

	it("should not subscribe if storeLocator returns null", () => {
		const getter = subscribeLater(() => null);
		const ref = getter();

		expect(ref.value).toBeUndefined();
	});

	it("should retry on subsequent calls until store is available", () => {
		let callback: (v: string) => void;
		const unsub = vi.fn();
		const store = {
			subscribe: vi.fn(cb => {
				callback = cb;
				return unsub;
			}),
		};

		let available = false;
		const getter = subscribeLater(() => (available ? store : null));

		// first call — store not ready
		getter();
		expect(store.subscribe).not.toHaveBeenCalled();

		// second call — store now ready
		available = true;
		const ref = getter();
		expect(store.subscribe).toHaveBeenCalledOnce();

		callback!("hello");
		expect(ref.value).toBe("hello");
	});

	it("should subscribe only once even if getter is called multiple times", () => {
		const unsub = vi.fn();
		const store = {
			subscribe: vi.fn(() => unsub),
		};

		const getter = subscribeLater(() => store);
		getter();
		getter();
		getter();

		expect(store.subscribe).toHaveBeenCalledOnce();
	});

	it("should register cleanup with onUnmounted that calls unsub", () => {
		const unsub = vi.fn();
		const store = {
			subscribe: vi.fn(() => unsub),
		};

		const mockUnmounted = vi.mocked(onUnmounted);
		mockUnmounted.mockClear();

		subscribeLater(() => store);

		expect(mockUnmounted).toHaveBeenCalledOnce();
		const cleanup = mockUnmounted.mock.calls[0][0] as () => void;

		// before subscription, unsub should not be called
		cleanup();
		expect(unsub).not.toHaveBeenCalled();
	});

	it("should unsubscribe on cleanup after subscription is active", () => {
		const unsub = vi.fn();
		const store = {
			subscribe: vi.fn(() => unsub),
		};

		const mockUnmounted = vi.mocked(onUnmounted);
		mockUnmounted.mockClear();

		const getter = subscribeLater(() => store);
		const cleanup = mockUnmounted.mock.calls[0][0] as () => void;

		// trigger subscription
		getter();
		expect(store.subscribe).toHaveBeenCalledOnce();

		// cleanup should call unsub
		cleanup();
		expect(unsub).toHaveBeenCalledOnce();
	});
});
