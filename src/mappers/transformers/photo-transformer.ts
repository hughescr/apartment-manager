import { endsWith, last, replace, some, split, startCase, take, toLower, trim } from 'lodash';
import type { TransformerFunction } from '../types.js';

/**
 * Transform S3 URLs to site-specific photo URLs.
 * @param photos Array of S3 URLs
 * @param siteId The target site
 * @returns Transformed photo URLs
 */
export function transformPhotoUrls(
    photos: string[] | undefined,
    _siteId: string
): string[] {
    if(!photos || photos.length === 0) {
        return [];
    }

    // For now, just return the URLs as-is
    // In the future, we might need to transform S3 URLs to CDN URLs
    // or handle site-specific requirements
    return photos;
}

/**
 * Validate photo URLs.
 * @param urls Array of URLs to validate
 * @returns Object with valid URLs and errors
 */
export function validatePhotoUrls(
    urls: string[] | undefined
): { valid: string[], errors: { url: string, error: string }[] } {
    if(!urls || urls.length === 0) {
        return { valid: [], errors: [] };
    }

    const valid: string[] = [];
    const errors: { url: string, error: string }[] = [];

    for(const url of urls) {
        if(!url) {
            continue;
        }

        try {
            const parsed = new URL(url);

            // Check for supported protocols
            if(parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                errors.push({
                    url,
                    error: 'Invalid protocol. Only HTTP and HTTPS are supported.'
                });
                continue;
            }

            // Check for common image extensions
            const pathname = toLower(parsed.pathname);
            const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
            const hasValidExtension = some(validExtensions, ext => endsWith(pathname, ext));

            if(!hasValidExtension) {
                errors.push({
                    url,
                    error: 'Invalid file extension. Supported: JPG, PNG, WebP, GIF'
                });
                continue;
            }

            valid.push(url);
        } catch{
            errors.push({
                url,
                error: 'Invalid URL format'
            });
        }
    }

    return { valid, errors };
}

/**
 * Sort photos by type (e.g., exterior first, then interior).
 * @param photos Array of photo URLs
 * @returns Sorted array of photos
 */
export function sortPhotosByType(photos: string[]): string[] {
    // Simple heuristic based on filename
    const exterior: string[] = [];
    const interior: string[] = [];
    const other: string[] = [];

    for(const photo of photos) {
        const lower = toLower(photo);
        if(lower.includes('exterior') || lower.includes('building') || lower.includes('outside')) {
            exterior.push(photo);
        } else if(lower.includes('interior') || lower.includes('room') || lower.includes('kitchen')
          || lower.includes('bathroom') || lower.includes('bedroom') || lower.includes('living')) {
            interior.push(photo);
        } else {
            other.push(photo);
        }
    }

    return [...exterior, ...interior, ...other];
}

/**
 * Create a photo caption based on the URL.
 * @param url The photo URL
 * @param unitNumber Optional unit number
 * @returns Generated caption
 */
export function generatePhotoCaption(url: string, unitNumber?: string): string {
    try {
        const parsed = new URL(url);
        const filename = last(split(parsed.pathname, '/')) ?? '';
        const nameWithoutExt = replace(filename, /\.[^/.]+$/, '');

        // Clean up common separators
        const cleaned = trim(
            replace(
                replace(nameWithoutExt, /[-_]/g, ' '),
                /\s+/g,
                ' '
            )
        );

        // Capitalize words
        const capitalized = startCase(cleaned);

        // Add unit number if provided
        if(unitNumber) {
            return `Unit ${unitNumber} - ${capitalized}`;
        }

        return capitalized;
    } catch{
        return unitNumber ? `Unit ${unitNumber}` : 'Property Photo';
    }
}

/**
 * Limit the number of photos based on site requirements.
 * @param photos Array of photo URLs
 * @param limit Maximum number of photos
 * @returns Limited array of photos
 */
export function limitPhotos(photos: string[], limit: number): string[] {
    if(photos.length <= limit) {
        return photos;
    }

    // Try to maintain a good mix of photos
    const sorted = sortPhotosByType(photos);
    return take(sorted, limit);
}

/**
 * Create a transformer for photo arrays.
 * @param siteId The target site
 * @param options Transformation options
 * @returns A transformer function
 */
export function createPhotoTransformer(
    siteId: string,
    options: {
        limit?:    number
        validate?: boolean
        sort?:     boolean
    } = {}
): TransformerFunction<string[] | undefined, string[]> {
    return (photos: string[] | undefined): string[] => {
        if(!photos || photos.length === 0) {
            return [];
        }

        let result = photos;

        // Validate if requested
        if(options.validate) {
            const validation = validatePhotoUrls(result);
            result = validation.valid;
        }

        // Sort if requested
        if(options.sort) {
            result = sortPhotosByType(result);
        }

        // Apply limit if specified
        if(options.limit && options.limit > 0) {
            result = limitPhotos(result, options.limit);
        }

        // Transform URLs for the site
        return transformPhotoUrls(result, siteId);
    };
}
