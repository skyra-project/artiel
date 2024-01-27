export function arrayWith<const T>(length: number, cb: (index: number) => T): T[] {
	const array = [];
	for (let i = 0; i < length; ++i) array.push(cb(i));
	return array;
}
