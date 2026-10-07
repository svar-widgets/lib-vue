import { shallowRef, triggerRef, onUnmounted, type ShallowRef } from "vue";

type SvelteDirectiveResult = {
	destroy?: () => void;
};

type VueDirectiveBinding<T> = {
	value: T;
};

type SvelteDirective<T> = (
	el: HTMLElement,
	binding?: T
) => SvelteDirectiveResult | void | null | undefined;
type VueDirective<T> = {
	mounted(el: HTMLElement, binding?: VueDirectiveBinding<T>): void;
	unmounted(el: HTMLElement): void;
};

type Readable<T> = {
	subscribe(callback: (value: T) => void): () => void;
};

export function asDirective<T>(original: SvelteDirective<T>): VueDirective<T> {
	const results = new WeakMap<HTMLElement, SvelteDirectiveResult>();
	return {
		mounted(el: HTMLElement, binding?: VueDirectiveBinding<T>) {
			const result = original(el, binding?.value);
			if (result) results.set(el, result);
		},
		unmounted(el: HTMLElement) {
			results.get(el)?.destroy?.();
			results.delete(el);
		},
	};
}

export function subscribe<T>(
	store: Readable<T>,
	forceUpdate?: boolean
): ShallowRef<T | undefined> {
	const value = shallowRef<T>();
	const unsub = store.subscribe(v => {
		value.value = v;
		if (forceUpdate) triggerRef(value);
	});
	onUnmounted(unsub);
	return value;
}

export function subscribeLater<T>(
	storeLocator: () => Readable<T> | undefined | null,
	forceUpdate?: boolean
): () => ShallowRef<T | undefined> {
	let realUnsub: (() => void) | undefined;
	let current: Readable<T> | undefined | null;
	const value = shallowRef<T>();
	const unsub = () => realUnsub?.();
	onUnmounted(unsub);

	return () => {
		const store = storeLocator();
		if (store !== current) {
			unsub();
			realUnsub = undefined;
			current = store;
			if (store) {
				realUnsub = store.subscribe(v => {
					value.value = v;
					if (forceUpdate) triggerRef(value);
				});
			} else {
				value.value = undefined;
			}
		}
		return value;
	};
}
