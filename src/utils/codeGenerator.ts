export const generateIngredientCode = (
    syntheticCategory: string,
    existingCodes: string[]
): string => {
    // 1. Extract prefix (first 3 letters, uppercase, remove wide chars/accents if needed)
    const prefix = syntheticCategory
        .substring(0, 3)
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    // 2. Filter codes with this prefix
    const regex = new RegExp(`^${prefix}-(\\d{4})$`);

    let maxSequence = 0;

    existingCodes.forEach(code => {
        const match = code.match(regex);
        if (match) {
            const seq = parseInt(match[1], 10);
            if (seq > maxSequence) {
                maxSequence = seq;
            }
        }
    });

    // 3. Generate new code
    const nextSequence = maxSequence + 1;
    return `${prefix}-${nextSequence.toString().padStart(4, '0')}`;
};
