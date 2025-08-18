import type { ValidationOptions } from './schema';
import { filter, some, startsWith, trim } from 'lodash';

export class MITSValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MITSValidationError';
    }
}

// Simple XML parser for validation (without external dependencies)
class SimpleXMLParser {
    private xml: string;
    private pos = 0;
    private depth = 0;
    private maxDepth: number;

    constructor(xml: string, maxDepth = 100) {
        this.xml = trim(xml);
        this.maxDepth = maxDepth;
    }

    parse(): Record<string, unknown> {
        // Check for XML declaration
        if(!startsWith(this.xml, '<?xml')) {
            throw new MITSValidationError('XML declaration is required');
        }

        // Check for DTD or external entities (security)
        if(this.xml.includes('<!DOCTYPE')) {
            if(this.xml.includes('<!ENTITY') || this.xml.includes('SYSTEM') || this.xml.includes('PUBLIC')) {
                throw new MITSValidationError('External entities not allowed');
            }
            throw new MITSValidationError('DTD not allowed');
        }

        // Skip XML declaration
        const declEnd = this.xml.indexOf('?>');
        if(declEnd === -1) {
            throw new MITSValidationError('Invalid XML declaration');
        }
        this.pos = declEnd + 2;

        // Parse root element
        return this.parseElement();
    }

    private parseElement(): Record<string, unknown> {
        this.depth++;
        if(this.depth > this.maxDepth) {
            throw new MITSValidationError('Maximum nesting depth exceeded');
        }

        this.skipWhitespace();
        this.expectElementStart();
        const tagName = this.parseTagName();
        this.skipToEndOfStartTag();

        const element = this.parseElementContent(tagName);
        this.depth--;
        return element;
    }

    private skipWhitespace(): void {
        while(this.pos < this.xml.length && /\s/.test(this.xml[this.pos])) {
            this.pos++;
        }
    }

    private expectElementStart(): void {
        if(this.xml[this.pos] !== '<') {
            throw new MITSValidationError('Expected element start');
        }
        this.pos++; // Skip <
    }

    private parseTagName(): string {
        let tagName = '';
        while(this.pos < this.xml.length && !/[\s>]/.test(this.xml[this.pos])) {
            tagName += this.xml[this.pos];
            this.pos++;
        }
        return tagName;
    }

    private skipToEndOfStartTag(): void {
        // Skip attributes and namespace declarations
        while(this.pos < this.xml.length && this.xml[this.pos] !== '>') {
            this.pos++;
        }
        this.pos++; // Skip >
    }

    private parseElementContent(tagName: string): Record<string, unknown> {
        const element: Record<string, unknown> = { _name: tagName, _children: [] };
        let content = '';

        while(this.pos < this.xml.length) {
            if(this.xml[this.pos] === '<') {
                if(this.xml[this.pos + 1] === '/') {
                    return this.handleEndTag(element, content, tagName);
                } else {
                    content = this.handleChildElement(element, content);
                }
            } else {
                content += this.xml[this.pos];
                this.pos++;
            }
        }

        throw new MITSValidationError(`Unclosed tag: ${tagName}`);
    }

    private handleEndTag(element: Record<string, unknown>, content: string, expectedTag: string): Record<string, unknown> {
        this.pos += 2; // Skip </
        let endTag = '';
        while(this.pos < this.xml.length && this.xml[this.pos] !== '>') {
            endTag += this.xml[this.pos];
            this.pos++;
        }
        if(endTag !== expectedTag) {
            throw new MITSValidationError(`Mismatched tags: ${expectedTag} and ${endTag}`);
        }
        this.pos++; // Skip >

        if(trim(content)) {
            element._content = trim(content);
        }

        return element;
    }

    private handleChildElement(element: Record<string, unknown>, content: string): string {
        if(trim(content)) {
            element._content = trim(content);
        }
        const child = this.parseElement();
        (element._children as Record<string, unknown>[]).push(child);
        return '';
    }
}

// Find element by path
function findElement(root: Record<string, unknown>, path: string[]): Record<string, unknown> | null {
    if(path.length === 0) {
        return root;
    }

    const [first, ...rest] = path;

    for(const child of (root._children as Record<string, unknown>[]) || []) {
        if(child._name === first) {
            return findElement(child as Record<string, unknown>, rest);
        }
    }

    return null;
}

// Check if element exists
function hasElement(root: Record<string, unknown>, path: string[]): boolean {
    return findElement(root, path) !== null;
}

// Get element content
function getElementContent(root: Record<string, unknown>, path: string[]): string | null {
    const element = findElement(root, path);
    return element ? (element._content as string) || null : null;
}

// Validate date format (ISO 8601)
function isValidISODate(dateStr: string): boolean {
    if(!dateStr) {
        return false;
    }

    // Basic ISO 8601 date/datetime pattern
    const patterns = [
        /^\d{4}-\d{2}-\d{2}$/,  // Date only
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z?$/, // DateTime
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z?$/ // DateTime with milliseconds
    ];

    return some(patterns, pattern => pattern.test(dateStr));
}

function validateRequiredElements(doc: Record<string, unknown>): void {
    // Check required elements
    if(!hasElement(doc, ['Property_ID'])) {
        throw new MITSValidationError('Property_ID is required');
    }

    if(!hasElement(doc, ['Property_ID', 'Identification'])) {
        throw new MITSValidationError('Property_ID/Identification is required');
    }

    if(!hasElement(doc, ['Property_ID', 'Identification', 'PropertyID'])) {
        throw new MITSValidationError('PropertyID is required');
    }

    if(!hasElement(doc, ['LastUpdate'])) {
        throw new MITSValidationError('LastUpdate is required');
    }
}

// Helper function to validate date formats
function validateDateFormats(doc: Record<string, unknown>): void {
    const lastUpdate = getElementContent(doc, ['LastUpdate']);
    if(lastUpdate && !isValidISODate(lastUpdate)) {
        throw new MITSValidationError('Invalid date format for LastUpdate');
    }
}

// Helper function to validate numeric fields
function validateNumericFields(doc: Record<string, unknown>): void {
    const yearBuilt = getElementContent(doc, ['Information', 'YearBuilt']);
    if(yearBuilt && !/^\d+$/.test(yearBuilt)) {
        throw new MITSValidationError('YearBuilt must be numeric');
    }
}

// Helper function to validate floorplan structure
function validateFloorplans(doc: Record<string, unknown>): void {
    const floorplans = filter(doc._children as Record<string, unknown>[], { _name: 'Floorplan' });
    for(const floorplan of floorplans) {
        if(!hasElement(floorplan, ['Identification', 'FloorplanID'])) {
            throw new MITSValidationError('FloorplanID is required for each Floorplan');
        }
    }
}

// Helper function to validate units structure
function validateUnits(doc: Record<string, unknown>): void {
    const ilsUnit = findElement(doc, ['ILSUnit']);
    if(ilsUnit) {
        const units = findElement(ilsUnit, ['Units']);
        if(units) {
            const unitList = filter(units._children as Record<string, unknown>[], { _name: 'Unit' });
            for(const unit of unitList) {
                if(!hasElement(unit, ['Identification', 'UnitID'])) {
                    throw new MITSValidationError('UnitID is required for each Unit');
                }
            }
        }
    }
}

// Main validation function
export function validateMITSXML(xml: string, options: ValidationOptions = {}): boolean {
    const {
        strict: _strict = false,
        maxDepth = 100,
        checkDates = true,
        checkNumericTypes = true
    } = options;

    try {
        // Parse XML
        const parser = new SimpleXMLParser(xml, maxDepth);
        const doc = parser.parse();

        // Check root element
        if(doc._name !== 'PhysicalProperty') {
            throw new MITSValidationError('Root element must be PhysicalProperty');
        }

        // Validate required elements
        validateRequiredElements(doc);

        // Validate date formats
        if(checkDates) {
            validateDateFormats(doc);
        }

        // Validate numeric fields
        if(checkNumericTypes) {
            validateNumericFields(doc);
        }

        // Validate floorplans and units structure
        validateFloorplans(doc);
        validateUnits(doc);

        return true;
    } catch(error) {
        if(error instanceof MITSValidationError) {
            throw error;
        }
        throw new MITSValidationError(`XML parsing error: ${error}`);
    }
}
