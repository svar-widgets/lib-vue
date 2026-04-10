export type Writable<T> = {
	subscribe: (cb: (value: T) => void) => void;
	unsubscribe: (cb: (value: T) => void) => void;
	set: (value: T) => void;
	update: (cb: (value: T) => T) => void;
};

export type Subscribe<T> = (value: T) => void;
export type Update<T> = (value: T) => T;

export function writable<T>(value: T): Writable<T> {
	let _value = value;
	let listeners: Subscribe<T>[] = [];

	const subscribe = (cb: Subscribe<T>) => {
		listeners.push(cb);
		cb(_value);
	};

	const unsubscribe = (cb: Subscribe<T>) => {
		listeners = listeners.filter(l => l !== cb);
	};

	const update = (cb: Update<T>) => {
		_value = cb(_value);
		listeners.forEach(l => l(_value));
	};

	const set = (v: T) => {
		_value = v;
		listeners.forEach(l => l(_value));
	};

	return {
		subscribe,
		unsubscribe,
		set,
		update,
	};
}
