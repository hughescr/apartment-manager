import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { forEach } from 'lodash';
import { MapperRegistry, getMapperRegistry, resetMapperRegistry } from '../../src/mappers/registry';
import type { SiteMapper, MappedBuilding, MappedUnitType, MappedUnit } from '../../src/mappers/types';
import type { BuildingData } from '../../src/types/index.js';

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

    describe('Concurrent Registration Edge Cases', () => {
        it('should handle concurrent registration attempts', async () => {
            const promises = Array.from({ length: 100 }, async (_, i) => {
                const mapper: SiteMapper = {
                    ...mockApartmentsMapper,
                    siteId: `concurrent_${i}`
                };
                return Promise.resolve().then(() => registry.register(mapper));
            });

            await Promise.all(promises);

            expect(registry.size).toBe(100);
            for(let i = 0; i < 100; i++) {
                expect(registry.has(`concurrent_${i}`)).toBe(true);
            }
        });

        it('should detect race conditions with duplicate registrations', async () => {
            const mapper: SiteMapper = {
                ...mockApartmentsMapper,
                siteId: 'race_condition_test'
            };

            let errorCount = 0;
            const promises = Array.from({ length: 10 }, () =>
                Promise.resolve().then(() => {
                    try {
                        registry.register(mapper);
                    } catch{
                        errorCount++;
                    }
                    return null;
                })
            );

            await Promise.all(promises);

            // Exactly one should succeed, the rest should fail
            expect(errorCount).toBe(9);
            expect(registry.has('race_condition_test')).toBe(true);
        });

        it('should handle concurrent reads while registering', async () => {
            const writePromises = Array.from({ length: 50 }, async (_, i) => {
                const mapper: SiteMapper = {
                    ...mockApartmentsMapper,
                    siteId: `write_${i}`
                };
                return Promise.resolve().then(() => registry.register(mapper));
            });

            const readPromises = Array.from({ length: 100 }, () =>
                Promise.resolve().then(() => {
                    registry.list();
                    const size = registry.size;
                    registry.has('write_25');
                    return size;
                })
            );

            await Promise.all([...writePromises, ...readPromises]);

            expect(registry.size).toBe(50);
        });
    });

    describe('Memory and Performance Edge Cases', () => {
        it('should handle thousands of mapper registrations without memory issues', () => {
            const startMemory = process.memoryUsage().heapUsed;
            const count = 10000;

            for(let i = 0; i < count; i++) {
                const mapper: SiteMapper = {
                    ...mockApartmentsMapper,
                    siteId: `perf_test_${i}`,
                    siteName: `Performance Test Site ${i}`
                };
                registry.register(mapper);
            }

            expect(registry.size).toBe(count);
            expect(registry.has('perf_test_5000')).toBe(true);

            // Memory usage should be reasonable (less than 50MB for 10k mappers)
            const endMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = (endMemory - startMemory) / 1024 / 1024;
            expect(memoryIncrease).toBeLessThan(50);
        });

        it('should maintain performance with large registry', () => {
            // Pre-populate with many mappers
            for(let i = 0; i < 5000; i++) {
                registry.register({
                    ...mockApartmentsMapper,
                    siteId: `bulk_${i}`
                });
            }

            // Operations should still be fast
            const startTime = performance.now();

            registry.has('bulk_2500');
            registry.get('bulk_4999');
            registry.list();
            // const _registrySize = registry.size; // Reserved for future size validation

            const endTime = performance.now();
            const duration = endTime - startTime;

            // All operations combined should take less than 10ms
            expect(duration).toBeLessThan(10);
        });

        it('should not leak memory when clearing large registries', () => {
            // Fill registry
            for(let i = 0; i < 1000; i++) {
                registry.register({
                    ...mockApartmentsMapper,
                    siteId: `leak_test_${i}`
                });
            }

            const beforeClear = process.memoryUsage().heapUsed;
            registry.clear();

            // Force garbage collection if available
            if(global.gc) {
                global.gc();
            }

            const afterClear = process.memoryUsage().heapUsed;

            // Memory should be released (allowing for some variance)
            expect(afterClear).toBeLessThanOrEqual(beforeClear);
            expect(registry.size).toBe(0);
        });
    });

    describe('Invalid Mapper Object Edge Cases', () => {
        it('should handle mapper with missing methods gracefully', () => {
            const invalidMapper = {
                siteId: 'invalid',
                siteName: 'Invalid Mapper',
                mapBuilding: mockApartmentsMapper.mapBuilding,
                // Missing other required methods
            } as unknown as SiteMapper;

            // TypeScript would normally catch this, but testing runtime behavior
            registry.register(invalidMapper);

            const retrieved = registry.get('invalid');
            expect(retrieved).toBeDefined();
            expect(retrieved?.siteId).toBe('invalid');
        });

        it('should handle null/undefined values in mapper properties', () => {
            const mapperWithNulls: SiteMapper = {
                siteId: 'null_test',
                siteName: null as unknown as string,
                mapBuilding: () => null as unknown as MappedBuilding,
                mapUnitType: () => null as unknown as MappedUnitType,
                mapUnit: () => null as unknown as MappedUnit,
                validateBuilding: () => ({ isValid: true, errors: [] }),
                validateUnitType: () => ({ isValid: true, errors: [] }),
                validateUnit: () => ({ isValid: true, errors: [] })
            };

            registry.register(mapperWithNulls);

            const retrieved = registry.get('null_test');
            expect(retrieved).toBeDefined();
            expect(retrieved?.siteName).toBeNull();
        });

        it('should handle mappers that throw errors', () => {
            const throwingMapper: SiteMapper = {
                siteId: 'throwing',
                siteName: 'Throwing Mapper',
                mapBuilding: () => { throw new Error('Building mapping error'); },
                mapUnitType: () => { throw new Error('Unit type mapping error'); },
                mapUnit: () => { throw new Error('Unit mapping error'); },
                validateBuilding: () => { throw new Error('Building validation error'); },
                validateUnitType: () => { throw new Error('Unit type validation error'); },
                validateUnit: () => { throw new Error('Unit validation error'); }
            };

            // Registration should succeed
            registry.register(throwingMapper);
            expect(registry.has('throwing')).toBe(true);

            // Getting the mapper should work
            const retrieved = registry.get('throwing');
            expect(retrieved).toBeDefined();

            // But calling its methods should throw
            expect(() => retrieved?.mapBuilding({} as BuildingData)).toThrow('Building mapping error');
        });
    });

    describe('Registry State Corruption Edge Cases', () => {
        it('should handle direct manipulation attempts', () => {
            registry.register(mockApartmentsMapper);

            // Attempt to modify the returned list
            const list1 = registry.list();
            list1.push('fake_site');

            const list2 = registry.list();
            expect(list2).not.toContain('fake_site');
            expect(list2).toHaveLength(1);
        });

        it('should handle mapper object mutations after registration', () => {
            const mutableMapper: SiteMapper = { ...mockApartmentsMapper };
            registry.register(mutableMapper);

            // Mutate the original mapper
            // Type assertion to bypass readonly properties for testing mutation scenarios
            (mutableMapper as { -readonly [K in keyof SiteMapper]: SiteMapper[K] }).siteName = 'Mutated Name';
            (mutableMapper as { -readonly [K in keyof SiteMapper]: SiteMapper[K] }).siteId = 'mutated_id';

            // Registry should still have the original siteId
            expect(registry.has('apartments_com')).toBe(true);
            expect(registry.has('mutated_id')).toBe(false);

            // Retrieved mapper should reflect mutations (since objects are by reference)
            const retrieved = registry.get('apartments_com');
            expect(retrieved?.siteName).toBe('Mutated Name');
        });

        it('should maintain consistency during exception scenarios', () => {
            // Pre-populate
            registry.register(mockApartmentsMapper);
            const initialSize = registry.size;

            // Try to register duplicate (should throw)
            try {
                registry.register(mockApartmentsMapper);
            } catch{
                // Expected
            }

            // Registry should remain unchanged
            expect(registry.size).toBe(initialSize);
            expect(registry.has('apartments_com')).toBe(true);
        });
    });

    describe('Global Registry Thread Safety', () => {
        afterEach(() => {
            resetMapperRegistry();
        });

        it('should handle concurrent global registry access', async () => {
            const promises = Array.from({ length: 100 }, (_, i) =>
                Promise.resolve().then(() => {
                    const reg = getMapperRegistry();
                    reg.register({
                        ...mockApartmentsMapper,
                        siteId: `global_${i}`
                    });
                    return null;
                })
            );

            await Promise.all(promises);

            const finalRegistry = getMapperRegistry();
            expect(finalRegistry.size).toBe(100);
        });

        it('should handle reset during active usage', async () => {
            const registry1 = getMapperRegistry();
            registry1.register(mockApartmentsMapper);

            // Concurrent operations
            const promises = [
                Promise.resolve().then(() => {
                    const reg = getMapperRegistry();
                    return reg.has('apartments_com');
                }),
                Promise.resolve().then(() => {
                    resetMapperRegistry();
                    return null;
                }),
                Promise.resolve().then(() => {
                    const reg = getMapperRegistry();
                    return reg.size;
                })
            ];

            await Promise.all(promises);

            // Final state should be reset
            const finalRegistry = getMapperRegistry();
            expect(finalRegistry.size).toBe(0);
        });
    });

    describe('Edge Cases with Extreme Values', () => {
        it('should handle very long siteIds', () => {
            const longId = new Array(10001).join('x');
            const longMapper: SiteMapper = {
                ...mockApartmentsMapper,
                siteId: longId
            };

            registry.register(longMapper);

            expect(registry.has(longId)).toBe(true);
            expect(registry.get(longId)).toBeDefined();
        });

        it('should handle unicode and special characters in siteIds', () => {
            const unicodeIds = [
                '测试站点',
                '🏠🏢🏘️',
                'site\nwith\nnewlines',
                'site\twith\ttabs',
                'site\x00with\x00nulls',
                'Ω≈ç√∫˜µ≤≥÷',
                '🇺🇸🇬🇧🇨🇦'
            ];

            forEach(unicodeIds, (id, index) => {
                const mapper: SiteMapper = {
                    ...mockApartmentsMapper,
                    siteId: id,
                    siteName: `Unicode Test ${index}`
                };
                registry.register(mapper);
            });

            forEach(unicodeIds, (id) => {
                expect(registry.has(id)).toBe(true);
                expect(registry.get(id)).toBeDefined();
            });

            expect(registry.size).toBe(unicodeIds.length);
        });

        it('should handle registry operations with no mappers', () => {
            expect(registry.size).toBe(0);
            expect(registry.list()).toEqual([]);
            expect(registry.has('anything')).toBe(false);
            expect(registry.get('anything')).toBeUndefined();

            // Clear on empty registry should not throw
            expect(() => registry.clear()).not.toThrow();
        });
    });

    describe('Circular Reference Edge Cases', () => {
        it('should handle mappers with circular references', () => {
            const circularMapper: Record<string, unknown> = {
                siteId: 'circular',
                siteName: 'Circular Mapper'
            };

            // Create circular reference
            circularMapper.self = circularMapper;
            circularMapper.mapBuilding = () => ({ building: circularMapper });
            circularMapper.mapUnitType = () => ({ unitType: circularMapper });
            circularMapper.mapUnit = () => ({ unit: circularMapper });
            circularMapper.validateBuilding = () => ({ isValid: true, errors: [] });
            circularMapper.validateUnitType = () => ({ isValid: true, errors: [] });
            circularMapper.validateUnit = () => ({ isValid: true, errors: [] });

            // Should not throw during registration
            expect(() => registry.register(circularMapper as unknown as SiteMapper)).not.toThrow();

            // Should be retrievable
            const retrieved = registry.get('circular');
            expect(retrieved).toBeDefined();
            expect(retrieved?.siteId).toBe('circular');
        });

        it('should handle deep object graphs in mappers', () => {
            const deepMapper: SiteMapper = {
                siteId: 'deep',
                siteName: 'Deep Mapper',
                mapBuilding: () => ({
                    name: 'Deep Building',
                    address: {
                        street: '123 Deep St',
                        city: 'Deep City',
                        state: 'DC',
                        zip: '12345'
                    },
                    propertyType: 'apartment'
                }),
                mapUnitType: () => mockMappedUnitType,
                mapUnit: () => mockMappedUnit,
                validateBuilding: () => ({ isValid: true, errors: [] }),
                validateUnitType: () => ({ isValid: true, errors: [] }),
                validateUnit: () => ({ isValid: true, errors: [] })
            };

            registry.register(deepMapper);
            expect(registry.has('deep')).toBe(true);
        });
    });
});
