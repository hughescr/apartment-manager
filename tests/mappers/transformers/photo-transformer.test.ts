import { describe, it, expect } from 'bun:test';
import _ from 'lodash';
import {
    transformPhotoUrls,
    validatePhotoUrls,
    sortPhotosByType,
    generatePhotoCaption,
    limitPhotos,
    createPhotoTransformer
} from '../../../src/mappers/transformers/photo-transformer';

describe('Photo Transformer', () => {
    // Test photo URLs
    const testPhotos = [
        'https://example.com/photos/building-exterior.jpg',
        'https://example.com/photos/living-room.jpg',
        'https://example.com/photos/kitchen.jpg',
        'https://example.com/photos/bedroom.jpg',
        'https://example.com/photos/bathroom.jpg',
        'https://example.com/photos/exterior-pool.jpg'
    ];

    describe('transformPhotoUrls', () => {
        it('should return photos as-is for now', () => {
            const result = transformPhotoUrls(testPhotos, 'apartments_com');
            expect(result).toEqual(testPhotos);
        });

        it('should handle undefined photos', () => {
            expect(transformPhotoUrls(undefined, 'apartments_com')).toEqual([]);
        });

        it('should handle empty photos', () => {
            expect(transformPhotoUrls([], 'apartments_com')).toEqual([]);
        });

        it('should work with any site ID', () => {
            const result = transformPhotoUrls(testPhotos, 'zillow');
            expect(result).toEqual(testPhotos);
        });
    });

    describe('validatePhotoUrls', () => {
        it('should validate correct photo URLs', () => {
            const urls = [
                'https://example.com/photo.jpg',
                'http://example.com/image.png',
                'https://example.com/picture.webp',
                'https://example.com/animated.gif'
            ];

            const result = validatePhotoUrls(urls);

            expect(result.valid).toHaveLength(4);
            expect(result.errors).toHaveLength(0);
            expect(result.valid).toEqual(urls);
        });

        it('should reject invalid protocols', () => {
            const urls = [
                'ftp://example.com/photo.jpg',
                'file:///Users/photo.jpg',
                'data:image/png;base64,iVBORw0KGgoAAAA'
            ];

            const result = validatePhotoUrls(urls);

            expect(result.valid).toHaveLength(0);
            expect(result.errors).toHaveLength(3);
            expect(result.errors[0].error).toContain('Invalid protocol');
        });

        it('should reject invalid file extensions', () => {
            const urls = [
                'https://example.com/document.pdf',
                'https://example.com/video.mp4',
                'https://example.com/archive.zip'
            ];

            const result = validatePhotoUrls(urls);

            expect(result.valid).toHaveLength(0);
            expect(result.errors).toHaveLength(3);
            expect(result.errors[0].error).toContain('Invalid file extension');
        });

        it('should handle mixed valid and invalid URLs', () => {
            const urls = [
                'https://example.com/valid.jpg',
                'ftp://example.com/invalid.jpg',
                'https://example.com/invalid.pdf',
                'https://example.com/valid.png'
            ];

            const result = validatePhotoUrls(urls);

            expect(result.valid).toHaveLength(2);
            expect(result.errors).toHaveLength(2);
            expect(result.valid).toEqual([
                'https://example.com/valid.jpg',
                'https://example.com/valid.png'
            ]);
        });

        it('should handle malformed URLs', () => {
            const urls = [
                'not a url',
                'https://',
                '://example.com/photo.jpg',
                'example.com/photo.jpg'
            ];

            const result = validatePhotoUrls(urls);

            expect(result.valid).toHaveLength(0);
            expect(result.errors).toHaveLength(4);
            expect(_.every(result.errors, ['error', 'Invalid URL format'])).toBe(true);
        });

        it('should handle undefined and empty arrays', () => {
            expect(validatePhotoUrls(undefined)).toEqual({ valid: [], errors: [] });
            expect(validatePhotoUrls([])).toEqual({ valid: [], errors: [] });
        });

        it('should skip empty strings in array', () => {
            const urls = ['https://example.com/photo.jpg', '', 'https://example.com/photo2.jpg'];
            const result = validatePhotoUrls(urls);

            expect(result.valid).toHaveLength(2);
            expect(result.errors).toHaveLength(0);
        });

        it('should be case insensitive for extensions', () => {
            const urls = [
                'https://example.com/photo.JPG',
                'https://example.com/photo.PNG',
                'https://example.com/photo.WebP',
                'https://example.com/photo.GIF'
            ];

            const result = validatePhotoUrls(urls);

            expect(result.valid).toHaveLength(4);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('sortPhotosByType', () => {
        it('should sort exterior photos first', () => {
            const photos = [
                'https://example.com/bedroom.jpg',
                'https://example.com/building-exterior.jpg',
                'https://example.com/kitchen.jpg',
                'https://example.com/outside-view.jpg'
            ];

            const sorted = sortPhotosByType(photos);

            expect(sorted[0]).toContain('building-exterior');
            expect(sorted[1]).toContain('outside-view');
            expect(sorted[2]).toContain('bedroom');
            expect(sorted[3]).toContain('kitchen');
        });

        it('should sort interior photos after exterior', () => {
            const photos = [
                'https://example.com/random.jpg',
                'https://example.com/living-room.jpg',
                'https://example.com/exterior.jpg',
                'https://example.com/bathroom.jpg'
            ];

            const sorted = sortPhotosByType(photos);

            expect(sorted[0]).toContain('exterior');
            expect(sorted[1]).toContain('living-room');
            expect(sorted[2]).toContain('bathroom');
            expect(sorted[3]).toContain('random');
        });

        it('should handle photos with no clear type', () => {
            const photos = [
                'https://example.com/IMG_1234.jpg',
                'https://example.com/DSC_5678.jpg',
                'https://example.com/photo.jpg'
            ];

            const sorted = sortPhotosByType(photos);

            expect(sorted).toEqual(photos);
        });

        it('should be case insensitive', () => {
            const photos = [
                'https://example.com/EXTERIOR.jpg',
                'https://example.com/Kitchen.JPG',
                'https://example.com/BUILDING.png'
            ];

            const sorted = sortPhotosByType(photos);

            expect(sorted[0]).toContain('EXTERIOR');
            expect(sorted[1]).toContain('BUILDING');
            expect(sorted[2]).toContain('Kitchen');
        });

        it('should handle empty array', () => {
            expect(sortPhotosByType([])).toEqual([]);
        });
    });

    describe('generatePhotoCaption', () => {
        it('should generate caption from filename', () => {
            const url = 'https://example.com/photos/living-room.jpg';
            const caption = generatePhotoCaption(url);

            expect(caption).toBe('Living Room');
        });

        it('should handle underscores and hyphens', () => {
            const url = 'https://example.com/photos/master_bedroom-view.jpg';
            const caption = generatePhotoCaption(url);

            expect(caption).toBe('Master Bedroom View');
        });

        it('should add unit number if provided', () => {
            const url = 'https://example.com/photos/kitchen.jpg';
            const caption = generatePhotoCaption(url, '102');

            expect(caption).toBe('Unit 102 - Kitchen');
        });

        it('should handle multiple spaces', () => {
            const url = 'https://example.com/photos/living___room.jpg';
            const caption = generatePhotoCaption(url);

            expect(caption).toBe('Living Room');
        });

        it('should handle invalid URLs', () => {
            const caption = generatePhotoCaption('not a url');
            expect(caption).toBe('Property Photo');

            const captionWithUnit = generatePhotoCaption('not a url', '102');
            expect(captionWithUnit).toBe('Unit 102');
        });

        it('should handle URLs without filename', () => {
            const url = 'https://example.com/photos/';
            const caption = generatePhotoCaption(url);

            expect(caption).toBe('');
        });

        it('should remove file extension', () => {
            const url = 'https://example.com/beautiful-exterior.jpeg';
            const caption = generatePhotoCaption(url);

            expect(caption).toBe('Beautiful Exterior');
        });

        it('should handle complex filenames', () => {
            const url = 'https://example.com/2BR-2BA_unit-type_floor-plan.png';
            const caption = generatePhotoCaption(url);

            expect(caption).toBe('2 BR 2 BA Unit Type Floor Plan');
        });
    });

    describe('limitPhotos', () => {
        it('should return all photos when under limit', () => {
            const photos = ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'];
            const result = limitPhotos(photos, 5);

            expect(result).toEqual(photos);
        });

        it('should limit photos when over limit', () => {
            const result = limitPhotos(testPhotos, 3);

            expect(result).toHaveLength(3);
        });

        it('should prioritize exterior photos when limiting', () => {
            const photos = [
                'https://example.com/bedroom1.jpg',
                'https://example.com/bedroom2.jpg',
                'https://example.com/exterior.jpg',
                'https://example.com/kitchen.jpg',
                'https://example.com/bathroom.jpg'
            ];

            const result = limitPhotos(photos, 3);

            expect(result[0]).toContain('exterior');
            expect(result).toHaveLength(3);
        });

        it('should handle limit of 0', () => {
            const result = limitPhotos(testPhotos, 0);
            expect(result).toEqual([]);
        });

        it('should handle exact limit', () => {
            const photos = ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'];
            const result = limitPhotos(photos, 3);

            expect(result).toEqual(photos);
        });
    });

    describe('createPhotoTransformer', () => {
        it('should create transformer with no options', () => {
            const transformer = createPhotoTransformer('apartments_com');
            const result = transformer(testPhotos);

            expect(result).toEqual(testPhotos);
        });

        it('should create transformer with limit option', () => {
            const transformer = createPhotoTransformer('apartments_com', { limit: 3 });
            const result = transformer(testPhotos);

            expect(result).toHaveLength(3);
        });

        it('should create transformer with validate option', () => {
            const transformer = createPhotoTransformer('apartments_com', { validate: true });
            const photos = [
                'https://example.com/valid.jpg',
                'ftp://example.com/invalid.jpg',
                'https://example.com/valid.png'
            ];

            const result = transformer(photos);

            expect(result).toHaveLength(2);
            expect(result).toEqual([
                'https://example.com/valid.jpg',
                'https://example.com/valid.png'
            ]);
        });

        it('should create transformer with sort option', () => {
            const transformer = createPhotoTransformer('apartments_com', { sort: true });
            const photos = [
                'https://example.com/bedroom.jpg',
                'https://example.com/exterior.jpg',
                'https://example.com/kitchen.jpg'
            ];

            const result = transformer(photos);

            expect(result[0]).toContain('exterior');
        });

        it('should create transformer with all options', () => {
            const transformer = createPhotoTransformer('apartments_com', {
                validate: true,
                sort: true,
                limit: 2
            });

            const photos = [
                'https://example.com/bedroom.jpg',
                'ftp://example.com/invalid.jpg',
                'https://example.com/exterior.jpg',
                'https://example.com/kitchen.jpg',
                'https://example.com/invalid.pdf'
            ];

            const result = transformer(photos);

            expect(result).toHaveLength(2);
            expect(result[0]).toContain('exterior');
        });

        it('should handle undefined photos', () => {
            const transformer = createPhotoTransformer('apartments_com', {
                validate: true,
                sort: true,
                limit: 5
            });

            const result = transformer(undefined);
            expect(result).toEqual([]);
        });

        it('should handle empty photos', () => {
            const transformer = createPhotoTransformer('apartments_com', {
                validate: true,
                sort: true,
                limit: 5
            });

            const result = transformer([]);
            expect(result).toEqual([]);
        });
    });

    describe('Edge Cases', () => {
        it('should handle very long URLs', () => {
            const longUrl = 'https://example.com/' + _.repeat('a', 1000) + '.jpg';
            const urls = [longUrl];

            const result = validatePhotoUrls(urls);
            expect(result.valid).toHaveLength(1);
        });

        it('should handle URLs with query parameters', () => {
            const url = 'https://example.com/photo.jpg?width=800&height=600';
            const urls = [url];

            const result = validatePhotoUrls(urls);
            expect(result.valid).toHaveLength(1);
        });

        it('should handle URLs with anchors', () => {
            const url = 'https://example.com/photo.jpg#section1';
            const urls = [url];

            const result = validatePhotoUrls(urls);
            expect(result.valid).toHaveLength(1);
        });

        it('should handle special characters in filenames', () => {
            const url = 'https://example.com/photo%20with%20spaces.jpg';
            const caption = generatePhotoCaption(url);

            // The implementation doesn't decode URLs, but startCase capitalizes each part
            expect(caption).toBe('Photo 20 With 20 Spaces');
        });

        it('should handle many photos for sorting', () => {
            const manyPhotos = Array.from({ length: 100 }, (_, i) => {
                if(i % 3 === 0) {
                    return `https://example.com/exterior${i}.jpg`;
                }
                if(i % 3 === 1) {
                    return `https://example.com/kitchen${i}.jpg`;
                }
                return `https://example.com/other${i}.jpg`;
            });

            const sorted = sortPhotosByType(manyPhotos);
            expect(sorted).toHaveLength(100);
            expect(sorted[0]).toContain('exterior');
        });
    });
});
