export function escapeInlineCode(text: string): string {
	return text.replaceAll('`', '῾');
}
