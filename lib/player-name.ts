export const getDisplayName = (p: { nickname?: string; name?: string } | null | undefined): string => {
	if (!p) return 'Anonymous';
	return p.nickname ?? p.name ?? 'Anonymous';
};





