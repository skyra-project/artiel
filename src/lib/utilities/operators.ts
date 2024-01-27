export function isAny<const Input, const Output extends Input>(value: Input, ...values: readonly Output[]): value is Output {
	return values.includes(value as Output);
}
