import { describe, it, expect } from 'bun:test';
import { validateMITSXML, MITSValidationError } from '../../src/mits/validator';
import { readFile } from 'fs/promises';
import { join } from 'path';

describe('MITS XML Validator', () => {
    describe('Valid XML', () => {
        it('should validate correct MITS 4.1 structure', async () => {
            const validXML = await readFile(
                join(__dirname, 'fixtures', 'sample-mits-minimal.xml'),
                'utf-8'
            );

            expect(validateMITSXML(validXML)).toBe(true);
        });

        it('should validate XML with proper namespace', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <PhysicalProperty xmlns="http://www.mitsproject.org/namespace">
                    <Property_ID>
                        <Identification>
                            <PropertyID>test-1</PropertyID>
                        </Identification>
                    </Property_ID>
                    <LastUpdate>2025-01-06T12:00:00Z</LastUpdate>
                </PhysicalProperty>`;

            expect(validateMITSXML(xml)).toBe(true);
        });

        it('should validate minimal required fields', () => {
            const minimalXML = `<?xml version="1.0" encoding="UTF-8"?>
                <PhysicalProperty xmlns="http://www.mitsproject.org/namespace">
                    <Property_ID>
                        <Identification>
                            <PropertyID>min-prop</PropertyID>
                        </Identification>
                    </Property_ID>
                    <LastUpdate>2025-01-06T12:00:00Z</LastUpdate>
                </PhysicalProperty>`;

            expect(validateMITSXML(minimalXML)).toBe(true);
        });
    });

    describe('Invalid XML', () => {
        it('should reject XML without declaration', () => {
            const xml = `<PhysicalProperty>
                <Property_ID></Property_ID>
            </PhysicalProperty>`;

            expect(() => validateMITSXML(xml)).toThrow(MITSValidationError);
        });

        it('should reject XML without PhysicalProperty root', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <Property>
                    <Property_ID></Property_ID>
                </Property>`;

            expect(() => validateMITSXML(xml)).toThrow('Root element must be PhysicalProperty');
        });

        it('should reject XML without Property_ID', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <PhysicalProperty xmlns="http://www.mitsproject.org/namespace">
                    <Information></Information>
                </PhysicalProperty>`;

            expect(() => validateMITSXML(xml)).toThrow('Property_ID is required');
        });

        it('should reject XML without PropertyID identification', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <PhysicalProperty xmlns="http://www.mitsproject.org/namespace">
                    <Property_ID>
                        <Identification>
                            <MarketingName>Test</MarketingName>
                        </Identification>
                    </Property_ID>
                </PhysicalProperty>`;

            expect(() => validateMITSXML(xml)).toThrow('PropertyID is required');
        });

        it('should reject XML without LastUpdate', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <PhysicalProperty xmlns="http://www.mitsproject.org/namespace">
                    <Property_ID>
                        <Identification>
                            <PropertyID>test</PropertyID>
                        </Identification>
                    </Property_ID>
                </PhysicalProperty>`;

            expect(() => validateMITSXML(xml)).toThrow('LastUpdate is required');
        });

        it('should reject malformed XML', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <PhysicalProperty>
                    <Property_ID>
                        <Identification>
                            <PropertyID>test</PropertyID>
                        </Unclosed>
                    </Property_ID>
                </PhysicalProperty>`;

            expect(() => validateMITSXML(xml)).toThrow();
        });
    });

    describe('Structure Validation', () => {
        it('should validate floorplan structure', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <PhysicalProperty xmlns="http://www.mitsproject.org/namespace">
                    <Property_ID>
                        <Identification>
                            <PropertyID>test</PropertyID>
                        </Identification>
                    </Property_ID>
                    <Floorplan>
                        <Identification>
                            <FloorplanID>fp-1</FloorplanID>
                            <Name>Studio</Name>
                        </Identification>
                    </Floorplan>
                    <LastUpdate>2025-01-06T12:00:00Z</LastUpdate>
                </PhysicalProperty>`;

            expect(validateMITSXML(xml)).toBe(true);
        });

        it('should validate unit structure', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <PhysicalProperty xmlns="http://www.mitsproject.org/namespace">
                    <Property_ID>
                        <Identification>
                            <PropertyID>test</PropertyID>
                        </Identification>
                    </Property_ID>
                    <ILSUnit>
                        <Units>
                            <Unit>
                                <Identification>
                                    <UnitID>unit-1</UnitID>
                                </Identification>
                            </Unit>
                        </Units>
                    </ILSUnit>
                    <LastUpdate>2025-01-06T12:00:00Z</LastUpdate>
                </PhysicalProperty>`;

            expect(validateMITSXML(xml)).toBe(true);
        });

        it('should reject floorplan without ID', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <PhysicalProperty xmlns="http://www.mitsproject.org/namespace">
                    <Property_ID>
                        <Identification>
                            <PropertyID>test</PropertyID>
                        </Identification>
                    </Property_ID>
                    <Floorplan>
                        <Identification>
                            <Name>Studio</Name>
                        </Identification>
                    </Floorplan>
                    <LastUpdate>2025-01-06T12:00:00Z</LastUpdate>
                </PhysicalProperty>`;

            expect(() => validateMITSXML(xml)).toThrow('FloorplanID is required');
        });

        it('should reject unit without ID', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <PhysicalProperty xmlns="http://www.mitsproject.org/namespace">
                    <Property_ID>
                        <Identification>
                            <PropertyID>test</PropertyID>
                        </Identification>
                    </Property_ID>
                    <ILSUnit>
                        <Units>
                            <Unit>
                                <Identification>
                                    <UnitNumber>101</UnitNumber>
                                </Identification>
                            </Unit>
                        </Units>
                    </ILSUnit>
                    <LastUpdate>2025-01-06T12:00:00Z</LastUpdate>
                </PhysicalProperty>`;

            expect(() => validateMITSXML(xml)).toThrow('UnitID is required');
        });
    });

    describe('Data Type Validation', () => {
        it('should validate date formats', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <PhysicalProperty xmlns="http://www.mitsproject.org/namespace">
                    <Property_ID>
                        <Identification>
                            <PropertyID>test</PropertyID>
                        </Identification>
                    </Property_ID>
                    <LastUpdate>2025-01-06T12:00:00Z</LastUpdate>
                </PhysicalProperty>`;

            expect(validateMITSXML(xml)).toBe(true);
        });

        it('should reject invalid date format', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <PhysicalProperty xmlns="http://www.mitsproject.org/namespace">
                    <Property_ID>
                        <Identification>
                            <PropertyID>test</PropertyID>
                        </Identification>
                    </Property_ID>
                    <LastUpdate>01/06/2025</LastUpdate>
                </PhysicalProperty>`;

            expect(() => validateMITSXML(xml)).toThrow('Invalid date format');
        });

        it('should validate numeric fields', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <PhysicalProperty xmlns="http://www.mitsproject.org/namespace">
                    <Property_ID>
                        <Identification>
                            <PropertyID>test</PropertyID>
                        </Identification>
                    </Property_ID>
                    <Information>
                        <YearBuilt>2020</YearBuilt>
                    </Information>
                    <LastUpdate>2025-01-06T12:00:00Z</LastUpdate>
                </PhysicalProperty>`;

            expect(validateMITSXML(xml)).toBe(true);
        });

        it('should reject non-numeric values in numeric fields', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <PhysicalProperty xmlns="http://www.mitsproject.org/namespace">
                    <Property_ID>
                        <Identification>
                            <PropertyID>test</PropertyID>
                        </Identification>
                    </Property_ID>
                    <Information>
                        <YearBuilt>Twenty Twenty</YearBuilt>
                    </Information>
                    <LastUpdate>2025-01-06T12:00:00Z</LastUpdate>
                </PhysicalProperty>`;

            expect(() => validateMITSXML(xml)).toThrow('YearBuilt must be numeric');
        });
    });

    describe('Security Validation', () => {
        it('should reject XML with external entity references', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
                <PhysicalProperty xmlns="http://www.mitsproject.org/namespace">
                    <Property_ID>
                        <Identification>
                            <PropertyID>&xxe;</PropertyID>
                        </Identification>
                    </Property_ID>
                </PhysicalProperty>`;

            expect(() => validateMITSXML(xml)).toThrow('External entities not allowed');
        });

        it('should reject XML with DTD', () => {
            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <!DOCTYPE PhysicalProperty SYSTEM "http://evil.com/dtd">
                <PhysicalProperty xmlns="http://www.mitsproject.org/namespace">
                    <Property_ID>
                        <Identification>
                            <PropertyID>test</PropertyID>
                        </Identification>
                    </Property_ID>
                </PhysicalProperty>`;

            expect(() => validateMITSXML(xml)).toThrow('External entities not allowed');
        });

        it('should handle deeply nested structures gracefully', () => {
            let deepNest = '';
            for(let i = 0; i < 100; i++) {
                deepNest += '<Nested>';
            }
            for(let i = 0; i < 100; i++) {
                deepNest += '</Nested>';
            }

            const xml = `<?xml version="1.0" encoding="UTF-8"?>
                <PhysicalProperty xmlns="http://www.mitsproject.org/namespace">
                    <Property_ID>
                        <Identification>
                            <PropertyID>test</PropertyID>
                        </Identification>
                    </Property_ID>
                    ${deepNest}
                    <LastUpdate>2025-01-06T12:00:00Z</LastUpdate>
                </PhysicalProperty>`;

            // Should not crash or hang
            expect(() => validateMITSXML(xml, { maxDepth: 50 })).toThrow('Maximum nesting depth exceeded');
        });
    });
});
