import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MapperRegistry, getMapperRegistry, resetMapperRegistry } from '../../src/mappers/registry';
import type { SiteMapper, MappedBuilding, MappedUnitType, MappedUnit } from '../../src/mappers/types';

describe('MapperRegistry', () => {
    let registry: MapperRegistry;

    // Mock mapper implementations
    const mockMappedBuilding: MappedBuilding = {
        name: 'Test Building',
        address: { street: '123 Main St', city: 'Test City', state: 'TS', zip: '12345' },
        propertyType: 'apartment'
    };

    const mockMappedUnitType: MappedUnitType = {
        modelName: 'Test Model',
        beds: 2,
        baths: 2
    };

    const mockMappedUnit: MappedUnit = {
        unitNumber: '101',
        beds: 2,
        baths: 2,
        rent: 1500
    };

    const mockApartmentsMapper: SiteMapper = {
        siteId: 'apartments_com',
        siteName: 'Apartments.com',
        mapBuilding: () => mockMappedBuilding,
        mapUnitType: () => mockMappedUnitType,
        mapUnit: () => mockMappedUnit,
        validateBuilding: () => ({ isValid: true, errors: [] }),
        validateUnitType: () => ({ isValid: true, errors: [] }),
        validateUnit: () => ({ isValid: true, errors: [] })
    };

    const mockZillowMapper: SiteMapper = {
        siteId: 'zillow',
        siteName: 'Zillow Rental Manager',
        mapBuilding: () => mockMappedBuilding,
        mapUnitType: () => mockMappedUnitType,
        mapUnit: () => mockMappedUnit,
        validateBuilding: () => ({ isValid: true, errors: [] }),
        validateUnitType: () => ({ isValid: true, errors: [] }),
        validateUnit: () => ({ isValid: true, errors: [] })
    };

    beforeEach(() => {
        registry = new MapperRegistry();
    });

    describe('register', () => {
        it('should register a new mapper', () => {
            registry.register(mockApartmentsMapper);

            expect(registry.has('apartments_com')).toBe(true);
            expect(registry.size).toBe(1);
        });

        it('should register multiple mappers', () => {
            registry.register(mockApartmentsMapper);
            registry.register(mockZillowMapper);

            expect(registry.has('apartments_com')).toBe(true);
            expect(registry.has('zillow')).toBe(true);
            expect(registry.size).toBe(2);
        });

        it('should throw error when registering duplicate mapper', () => {
            registry.register(mockApartmentsMapper);

            expect(() => {
                registry.register(mockApartmentsMapper);
            }).toThrow("Mapper for site 'apartments_com' is already registered");
        });

        it('should allow registering after clearing', () => {
            registry.register(mockApartmentsMapper);
            registry.clear();

            // Should not throw
            registry.register(mockApartmentsMapper);
            expect(registry.has('apartments_com')).toBe(true);
        });
    });

    describe('get', () => {
        it('should retrieve registered mapper', () => {
            registry.register(mockApartmentsMapper);

            const mapper = registry.get('apartments_com');

            expect(mapper).toBeDefined();
            expect(mapper?.siteId).toBe('apartments_com');
            expect(mapper?.siteName).toBe('Apartments.com');
        });

        it('should return undefined for unregistered mapper', () => {
            const mapper = registry.get('unknown_site');

            expect(mapper).toBeUndefined();
        });

        it('should retrieve correct mapper when multiple registered', () => {
            registry.register(mockApartmentsMapper);
            registry.register(mockZillowMapper);

            const apartmentsMapper = registry.get('apartments_com');
            const zillowMapper = registry.get('zillow');

            expect(apartmentsMapper?.siteId).toBe('apartments_com');
            expect(zillowMapper?.siteId).toBe('zillow');
        });
    });

    describe('list', () => {
        it('should return empty array when no mappers registered', () => {
            const siteIds = registry.list();

            expect(siteIds).toEqual([]);
        });

        it('should return all registered site IDs', () => {
            registry.register(mockApartmentsMapper);
            registry.register(mockZillowMapper);

            const siteIds = registry.list();

            expect(siteIds).toHaveLength(2);
            expect(siteIds).toContain('apartments_com');
            expect(siteIds).toContain('zillow');
        });

        it('should return new array instance', () => {
            registry.register(mockApartmentsMapper);

            const siteIds1 = registry.list();
            const siteIds2 = registry.list();

            expect(siteIds1).not.toBe(siteIds2);
            expect(siteIds1).toEqual(siteIds2);
        });
    });

    describe('has', () => {
        it('should return true for registered mapper', () => {
            registry.register(mockApartmentsMapper);

            expect(registry.has('apartments_com')).toBe(true);
        });

        it('should return false for unregistered mapper', () => {
            expect(registry.has('unknown_site')).toBe(false);
        });

        it('should work with multiple mappers', () => {
            registry.register(mockApartmentsMapper);
            registry.register(mockZillowMapper);

            expect(registry.has('apartments_com')).toBe(true);
            expect(registry.has('zillow')).toBe(true);
            expect(registry.has('unknown_site')).toBe(false);
        });
    });

    describe('size', () => {
        it('should return 0 for empty registry', () => {
            expect(registry.size).toBe(0);
        });

        it('should return correct count', () => {
            registry.register(mockApartmentsMapper);
            expect(registry.size).toBe(1);

            registry.register(mockZillowMapper);
            expect(registry.size).toBe(2);
        });

        it('should update after clear', () => {
            registry.register(mockApartmentsMapper);
            registry.register(mockZillowMapper);
            expect(registry.size).toBe(2);

            registry.clear();
            expect(registry.size).toBe(0);
        });
    });

    describe('clear', () => {
        it('should remove all mappers', () => {
            registry.register(mockApartmentsMapper);
            registry.register(mockZillowMapper);

            registry.clear();

            expect(registry.size).toBe(0);
            expect(registry.has('apartments_com')).toBe(false);
            expect(registry.has('zillow')).toBe(false);
            expect(registry.list()).toEqual([]);
        });

        it('should work on empty registry', () => {
            registry.clear();

            expect(registry.size).toBe(0);
        });

        it('should allow re-registering after clear', () => {
            registry.register(mockApartmentsMapper);
            registry.clear();
            registry.register(mockApartmentsMapper);

            expect(registry.has('apartments_com')).toBe(true);
        });
    });

    describe('Global Registry Functions', () => {
        afterEach(() => {
            // Reset global registry after each test
            resetMapperRegistry();
        });

        describe('getMapperRegistry', () => {
            it('should create registry on first call', () => {
                const registry1 = getMapperRegistry();

                expect(registry1).toBeDefined();
                expect(registry1).toBeInstanceOf(MapperRegistry);
            });

            it('should return same instance on subsequent calls', () => {
                const registry1 = getMapperRegistry();
                const registry2 = getMapperRegistry();

                expect(registry1).toBe(registry2);
            });

            it('should maintain state across calls', () => {
                const registry1 = getMapperRegistry();
                registry1.register(mockApartmentsMapper);

                const registry2 = getMapperRegistry();
                expect(registry2.has('apartments_com')).toBe(true);
            });
        });

        describe('resetMapperRegistry', () => {
            it('should reset global registry', () => {
                const registry1 = getMapperRegistry();
                registry1.register(mockApartmentsMapper);

                resetMapperRegistry();

                const registry2 = getMapperRegistry();
                expect(registry2.has('apartments_com')).toBe(false);
                expect(registry1).not.toBe(registry2);
            });

            it('should work when no registry exists', () => {
                resetMapperRegistry();
                resetMapperRegistry(); // Should not throw

                const registry = getMapperRegistry();
                expect(registry).toBeDefined();
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle mappers with special characters in siteId', () => {
            const specialMapper: SiteMapper = {
                ...mockApartmentsMapper,
                siteId: 'site-with_special.chars'
            };

            registry.register(specialMapper);

            expect(registry.has('site-with_special.chars')).toBe(true);
            expect(registry.get('site-with_special.chars')).toBeDefined();
        });

        it('should handle empty siteId', () => {
            const emptyIdMapper: SiteMapper = {
                ...mockApartmentsMapper,
                siteId: ''
            };

            registry.register(emptyIdMapper);

            expect(registry.has('')).toBe(true);
            expect(registry.get('')).toBeDefined();
        });

        it('should maintain insertion order in list', () => {
            const mapper1: SiteMapper = { ...mockApartmentsMapper, siteId: 'site1' };
            const mapper2: SiteMapper = { ...mockApartmentsMapper, siteId: 'site2' };
            const mapper3: SiteMapper = { ...mockApartmentsMapper, siteId: 'site3' };

            registry.register(mapper2);
            registry.register(mapper1);
            registry.register(mapper3);

            const list = registry.list();

            // Map maintains insertion order in modern JavaScript
            expect(list).toEqual(['site2', 'site1', 'site3']);
        });

        it('should handle many mappers', () => {
            const manyMappers = Array.from({ length: 100 }, (_, i) => ({
                ...mockApartmentsMapper,
                siteId: `site_${i}`
            }));

            for(const mapper of manyMappers) {
                registry.register(mapper);
            }

            expect(registry.size).toBe(100);
            expect(registry.list()).toHaveLength(100);
            expect(registry.has('site_50')).toBe(true);
        });
    });
});
