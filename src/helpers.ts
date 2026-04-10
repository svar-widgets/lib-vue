import { shallowRef, triggerRef, onUnmounted, type ShallowRef } from "vue";

type SvelteDirectiveResult = {
	destroy: () => void | undefined;
};

type VueDirectiveBinding<T> = {
	value: T;
};

type SvelteDirective<T> = (
	el: HTMLElement,
	binding?: T
) => SvelteDirectiveResult;
type VueDirective<T> = {
	mounted(el: HTMLElement, binding?: VueDirectiveBinding<T>): void;
	unmounted(_el: HTMLElement): void;
};

type Readable<T> = {
	subscribe(callback: (value: T) => void): () => void;
};

export function asDirective<T>(original: SvelteDirective<T>): VueDirective<T> {
	let remove: SvelteDirectiveResult;
	return {
		mounted(el: HTMLElement, binding?: VueDirectiveBinding<T>) {
			remove = original(el, binding?.value);
		},
		unmounted(_el: HTMLElement) {
			if (remove) {
				remove.destroy();
				remove = undefined;
			}
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
	let done = false;
	const value = shallowRef<T>();
	const unsub = () => realUnsub?.();
	onUnmounted(unsub);

	return () => {
		if (!done) {
			const store = storeLocator();
			if (store) {
				realUnsub = store.subscribe(v => {
					value.value = v;
					if (forceUpdate) triggerRef(value);
				});
				done = true;
			}
		}
		return value;
	};
}
