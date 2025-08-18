import { describe, it, expect, beforeEach } from 'bun:test';
import { assign, constant, keys } from 'lodash';
import { InheritanceResolver } from '../../../src/mappers/inheritance-resolver';
import { AmenityCategory } from '../../../src/types';
import type { UnitData } from '../../../src/types';
import {
    buildingData,
    unitTypeData,
    createUnitWithSymbols,
    createUnitWithGetterSetter,
    createUnitWithThrowingGetter,
    createFrozenUnit,
    createSealedUnit,
    createVeryLongString
} from './shared-fixtures';

describe('InheritanceResolver - Advanced JavaScript Features', () => {
    let resolver: InheritanceResolver;

    beforeEach(() => {
        resolver = new InheritanceResolver();
    });

    describe('Symbol and Non-Enumerable Properties', () => {
        it('should handle Symbol properties', () => {
            const unitWithSymbol = createUnitWithSymbols();

            const resolved = resolver.resolveUnitValues(unitWithSymbol, unitTypeData, buildingData);

            // Symbol properties should not affect normal operation
            expect(resolved.buildingID).toBe('BLDG-001');

            // Check symbol property is preserved
            const symbolKeys = Object.getOwnPropertySymbols(unitWithSymbol);
            if(symbolKeys.length > 0) {
                const symbolKey = symbolKeys[0];
                expect((resolved as unknown as Record<symbol, unknown>)[symbolKey]).toBe('symbol value');
            }
        });

        it('should handle non-enumerable properties', () => {
            const unit: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001'
            };

            Object.defineProperty(unit, 'hiddenProperty', {
                value: 'hidden',
                enumerable: false
            });

            const resolved = resolver.resolveUnitValues(unit, unitTypeData, buildingData);

            expect((unit as unknown as Record<string, unknown>).hiddenProperty).toBe('hidden');
            expect(keys(resolved)).not.toContain('hiddenProperty');
        });
    });

    describe('Getter/Setter Properties', () => {
        it('should handle objects with getters and setters', () => {
            const unitWithGetterSetter = createUnitWithGetterSetter(1000);

            const resolved = resolver.resolveUnitValues(unitWithGetterSetter, unitTypeData, buildingData);

            expect(resolved.rent).toBe(1000);
        });

        it('should handle throwing getters gracefully', () => {
            const unitWithThrowingGetter = createUnitWithThrowingGetter();

            expect(() => {
                resolver.resolveUnitValues(unitWithThrowingGetter, unitTypeData, buildingData);
            }).toThrow('Getter error');
        });
    });

    describe('Frozen and Sealed Objects', () => {
        it('should handle frozen objects', () => {
            const frozenUnit = createFrozenUnit({ beds: 1 });

            const resolved = resolver.resolveUnitValues(frozenUnit as UnitData, unitTypeData, buildingData);

            // Should create a new object, not mutate the frozen one
            expect(resolved).not.toBe(frozenUnit);
            expect(resolved.beds).toBe(1);
            expect(resolved.baths).toBe(2); // From model
        });

        it('should handle sealed objects', () => {
            const sealedUnit = createSealedUnit({
                beds: undefined,
                baths: undefined
            });

            const resolved = resolver.resolveUnitValues(sealedUnit as UnitData, unitTypeData, buildingData);

            // Should create a new object
            expect(resolved).not.toBe(sealedUnit);
            expect(resolved.beds).toBe(2);
            expect(resolved.baths).toBe(2);
        });
    });

    describe('Deep Inheritance Chains', () => {
        it('should handle deeply nested inheritance (10+ levels)', () => {
            // Test with deeply nested amenity descriptions
            const deeplyNestedAmenities = Array.from({ length: 15 }, (_, i) => ({
                name: `Level${i}`,
                category: AmenityCategory.UNIT,
                description: createVeryLongString(1000) // Large description
            }));

            const unitWithDeep: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                unitAmenities: deeplyNestedAmenities.slice(10)
            };

            const modelWithDeep = {
                ...unitTypeData,
                modelAmenities: deeplyNestedAmenities.slice(5, 10)
            };

            const buildingWithDeep = {
                ...buildingData,
                propertyAmenities: deeplyNestedAmenities.slice(0, 5)
            };

            const resolved = resolver.resolveUnitValues(unitWithDeep, modelWithDeep, buildingWithDeep);

            expect(resolved.unitAmenities).toHaveLength(5);
            expect(resolved.unitAmenities).toEqual(deeplyNestedAmenities.slice(10));
        });
    });

    describe('Complex Object Methods and Properties', () => {
        it('should handle objects with complex prototype chains', () => {
            // Create a unit with a complex prototype chain
            class BaseUnit {
                baseProperty = 'base';
            }

            class ExtendedUnit extends BaseUnit {
                extendedProperty = 'extended';
            }

            const complexUnit = new ExtendedUnit();
            assign(complexUnit, {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                beds: 2
            });

            const resolved = resolver.resolveUnitValues(complexUnit as unknown as UnitData, unitTypeData, buildingData);

            expect(resolved.beds).toBe(2);
            expect(resolved.baths).toBe(2); // Inherited from model
            expect((resolved as unknown as Record<string, unknown>).baseProperty).toBe('base');
            expect((resolved as unknown as Record<string, unknown>).extendedProperty).toBe('extended');
        });

        it('should handle objects with custom toString methods', () => {
            const unitWithCustomToString: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                unitDescription: {
                    toString: constant('Custom string representation')
                } as unknown as string
            };

            const resolved = resolver.resolveUnitValues(unitWithCustomToString, unitTypeData, buildingData);

            expect(typeof resolved.unitDescription).toBe('object');
            expect((resolved.unitDescription as unknown as { toString: () => string }).toString()).toBe('Custom string representation');
        });

        it('should handle objects with custom valueOf methods', () => {
            const customRent = {
                valueOf: constant(1500),
                toString: constant('1500')
            };

            const unitWithCustomValueOf: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                rent: customRent as unknown as number
            };

            const resolved = resolver.resolveUnitValues(unitWithCustomValueOf, unitTypeData, buildingData);

            expect(resolved.rent as unknown).toBe(customRent);
            expect((resolved.rent as unknown as { valueOf: () => number }).valueOf()).toBe(1500);
        });
    });

    describe('Proxy Objects', () => {
        it('should handle Proxy objects', () => {
            const target = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                beds: 2
            };

            const proxy = new Proxy(target, {
                get(obj, prop) {
                    if(prop === 'rent') {
                        return 1500; // Proxy returns rent even though it's not in target
                    }
                    return obj[prop as keyof typeof obj];
                }
            });

            const resolved = resolver.resolveUnitValues(proxy as UnitData, unitTypeData, buildingData);

            expect(resolved.beds).toBe(2);
            expect(resolved.rent).toBe(1500); // From proxy
            expect(resolved.baths).toBe(2); // From model
        });

        it('should handle Proxy objects with traps', () => {
            const target = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001'
            };

            let getCallCount = 0;
            const proxy = new Proxy(target, {
                get(obj, prop) {
                    getCallCount++;
                    return obj[prop as keyof typeof obj];
                },
                has(obj, prop) {
                    return prop in obj;
                }
            });

            const resolved = resolver.resolveUnitValues(proxy as UnitData, unitTypeData, buildingData);

            expect(resolved.buildingID).toBe('BLDG-001');
            expect(resolved.beds).toBe(2); // From model
            expect(getCallCount).toBeGreaterThan(0);
        });
    });

    describe('WeakMap and WeakSet Integration', () => {
        it('should handle objects with WeakMap metadata', () => {
            const weakMap = new WeakMap();
            const unit: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                beds: 2
            };

            weakMap.set(unit, { metadata: 'test data' });

            const resolved = resolver.resolveUnitValues(unit, unitTypeData, buildingData);

            // WeakMap should still reference original object
            expect(weakMap.has(unit)).toBe(true);
            expect(weakMap.get(unit)).toEqual({ metadata: 'test data' });

            // Resolved object is different, so WeakMap won't have it
            expect(weakMap.has(resolved)).toBe(false);
        });
    });

    describe('Error Handling with Complex Objects', () => {
        it('should handle objects that throw on property access', () => {
            const throwingUnit = new Proxy({
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001'
            }, {
                get(target, prop) {
                    if(prop === 'beds') {
                        throw new Error('Property access denied');
                    }
                    return target[prop as keyof typeof target];
                }
            });

            expect(() => {
                resolver.resolveUnitValues(throwingUnit as UnitData, unitTypeData, buildingData);
            }).toThrow('Property access denied');
        });

        it('should handle circular references in objects', () => {
            const unit: UnitData & { self?: UnitData } = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                beds: 2
            };
            unit.self = unit; // Create circular reference

            // This should not throw or cause infinite loop
            expect(() => {
                resolver.resolveUnitValues(unit, unitTypeData, buildingData);
            }).not.toThrow();
        });
    });

    describe('Async Properties Handling', () => {
        it('should handle objects with Promise properties', () => {
            const promiseValue = Promise.resolve(1600);
            const unitWithPromise: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                rent: promiseValue as unknown as number
            };

            const resolved = resolver.resolveUnitValues(unitWithPromise, unitTypeData, buildingData);

            expect(resolved.rent as unknown).toBe(promiseValue);
            expect(resolved.rent).toBeInstanceOf(Promise);
        });
    });
});
