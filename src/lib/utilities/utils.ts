export const random = (max: number) => Math.floor(Math.random() * max);

export function randomEnum<T extends object>(anEnum: T): T[keyof T] {
	const enumValues = Object.values(anEnum) as unknown as T[keyof T][];
	const randomIndex = Math.floor(Math.random() * enumValues.length);
	return enumValues[randomIndex];
}
