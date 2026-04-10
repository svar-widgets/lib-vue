import { describe, it, expect, vi } from "vitest";
import { writable } from "../src/writable";

describe("writable", () => {
	it("should create a writable with initial value", () => {
		const store = writable(10);
		const callback = vi.fn();

		store.subscribe(callback);
		expect(callback).toHaveBeenCalledWith(10);
	});

	it("should notify subscribers when value is set", () => {
		const store = writable("initial");
		const callback1 = vi.fn();
		const callback2 = vi.fn();

		store.subscribe(callback1);
		store.subscribe(callback2);

		store.set("updated");

		expect(callback1).toHaveBeenCalledTimes(2);
		expect(callback1).toHaveBeenLastCalledWith("updated");
		expect(callback2).toHaveBeenCalledTimes(2);
		expect(callback2).toHaveBeenLastCalledWith("updated");
	});

	it("should update value using update function", () => {
		const store = writable(5);
		const callback = vi.fn();

		store.subscribe(callback);
		store.update(val => val * 2);

		expect(callback).toHaveBeenCalledTimes(2);
		expect(callback).toHaveBeenLastCalledWith(10);
	});

	it("should unsubscribe correctly", () => {
		const store = writable({ count: 0 });
		const callback1 = vi.fn();
		const callback2 = vi.fn();

		store.subscribe(callback1);
		store.subscribe(callback2);

		store.unsubscribe(callback1);
		store.set({ count: 1 });

		expect(callback1).toHaveBeenCalledTimes(1);
		expect(callback2).toHaveBeenCalledTimes(2);
		expect(callback2).toHaveBeenLastCalledWith({ count: 1 });
	});

	it("should handle complex objects", () => {
		const store = writable({ user: { name: "John", age: 30 } });
		const callback = vi.fn();

		store.subscribe(callback);
		store.update(state => ({
			...state,
			user: { ...state.user, age: 31 },
		}));

		expect(callback).toHaveBeenLastCalledWith({
			user: { name: "John", age: 31 },
		});
	});

	it("should handle arrays", () => {
		const store = writable([1, 2, 3]);
		const callback = vi.fn();

		store.subscribe(callback);
		store.update(arr => [...arr, 4]);

		expect(callback).toHaveBeenLastCalledWith([1, 2, 3, 4]);
	});
});
