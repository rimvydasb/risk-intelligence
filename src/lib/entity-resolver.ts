import { SoundEx, Metaphone } from 'natural';

export class EntityResolver {
    private static soundex = SoundEx;
    private static metaphone = new Metaphone();

    /**
     * Normalizes a Lithuanian name by removing common gendered suffixes 
     * and generating a phonetic hash (Soundex/Metaphone).
     */
    static normalizeName(fullName: string): string {
        const upper = fullName.toUpperCase().trim();
        // Simple Lithuanian suffix normalization for POC
        // (e.g., -as, -is, -us -> -o)
        const base = upper
            .replace(/(AS|IS|US|AS)\b/g, '')
            .replace(/(Ė|A|YTĖ|IENĖ)\b/g, '');
        
        const phonetic = this.metaphone.process(base);
        return phonetic || base;
    }

    /**
     * Generates a deterministic UID for an entity based on its normalized name.
     */
    static generateSyntheticUid(name: string): string {
        const normalized = this.normalizeName(name);
        // Simple hash-like string for the UID
        let hash = 0;
        for (let i = 0; i < normalized.length; i++) {
            const char = normalized.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16).padStart(16, '0');
    }
}
