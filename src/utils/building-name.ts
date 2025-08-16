import _ from 'lodash';

/**
 * Generates a building name from a street address
 * Extracts street number and street name, removing compass directions and street types
 * Examples:
 *   "1260 NW Naito Pkwy" → "1260 Naito"
 *   "1399 California St" → "1399 California"
 *   "2811 Sand Hill Rd" → "2811 Sand Hill"
 *
 * @param {string} streetAddress - The full street address
 * @returns {string} A shortened building name
 */
export function generateBuildingName(streetAddress: string): string {
    if(!streetAddress || !_.isString(streetAddress)) {
        return '';
    }

    const trimmed = _.trim(streetAddress);
    if(!trimmed) {
        return '';
    }

    // Simple regex-based parsing since parse-address doesn't work well for our use case
    const parts = _.split(trimmed, /\s+/);
    if(parts.length < 1) {
        return trimmed; // Not enough parts to parse
    }

    // Check if first part is a street number (numeric)
    const firstPart = parts[0];
    const isFirstPartNumber = /^\d+/.test(firstPart);

    let streetNumber = '';
    let remainingParts: string[] = [];

    if(isFirstPartNumber) {
        streetNumber = firstPart;
        remainingParts = parts.slice(1);
    } else {
        // No street number, treat all parts as street name parts
        remainingParts = parts;
    }

    // Remove common compass directions (case insensitive)
    const compassDirections = /^(?:[nsew]|north|south|east|west|ne|northeast|nw|northwest|se|southeast|sw|southwest)$/i;
    const filteredParts = _.filter(remainingParts, part => !compassDirections.test(part));

    // Remove common street types (case insensitive)
    const streetTypes = /^(?:st|street|ave|avenue|rd|road|blvd|boulevard|pkwy|parkway|ln|lane|dr|drive|ct|court|pl|place|way|cir|circle|ter|terrace)$/i;
    const finalParts = _.filter(filteredParts, part => !streetTypes.test(part));

    // Build result based on what we have
    if(streetNumber && finalParts.length > 0) {
        return `${streetNumber} ${finalParts.join(' ')}`;
    } else if(finalParts.length > 0) {
        // No street number but have street name parts
        return finalParts.join(' ');
    } else if(streetNumber) {
        // Only have street number (edge case)
        return streetNumber;
    }

    // Fallback to original if we can't parse it properly
    return trimmed;
}

/**
 * Validates and normalizes a building name
 * @param {string} name - The building name to validate
 * @returns {string} The normalized building name
 */
export function normalizeBuildingName(name: string): string {
    if(!name || !_.isString(name)) {
        return '';
    }

    return _.replace(_.trim(name), /\s+/g, ' ');
}
