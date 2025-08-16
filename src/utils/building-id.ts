import shortUUID from 'short-uuid';
import _ from 'lodash';

const translator = shortUUID();

/**
 * Generates a new building ID using short-uuid
 * Returns a short URL-safe string (typically 22 characters)
 * @returns {string} A new building ID
 */
export function generateBuildingId(): string {
    return translator.new();
}

/**
 * Validates that a building ID follows the expected short-uuid format
 * @param {string} id - The building ID to validate
 * @returns {boolean} True if the ID is valid
 */
export function isValidBuildingId(id: string): boolean {
    if(!id || !_.isString(id)) {
        return false;
    }

    try {
        // Try to convert back to UUID to validate format
        translator.toUUID(id);
        return true;
    } catch{
        return false;
    }
}
