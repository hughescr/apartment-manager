// Debug test to check validation flow
import { validatePath } from './api/security-validation.ts';
import { split, toLower } from 'lodash';

const testFilename = '../../../etc/passwd';
// eslint-disable-next-line no-console -- Debug script requires console output
console.log('Testing filename:', testFilename);
// eslint-disable-next-line no-console -- Debug script requires console output
console.log('validatePath result:', validatePath(testFilename));

// Test the actual logic flow from upload.ts
const mockBody = JSON.stringify({
    filename: testFilename,
    buildingId: 'building-1',
    unitId: 'unit-1'
});

// eslint-disable-next-line no-console -- Debug script requires console output
console.log('Mock body:', mockBody);

const parsedBody = JSON.parse(mockBody);
const { filename, buildingId: _buildingId, unitId: _unitId } = parsedBody;

// eslint-disable-next-line no-console -- Debug script requires console output
console.log('Parsed filename:', filename);
// eslint-disable-next-line no-console -- Debug script requires console output
console.log('validatePath(filename):', validatePath(filename));

// Check file type validation
const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'];
const parts = split(filename, '.');
const extension = toLower(parts.pop() || '');
const isValidImageType = extension ? validExtensions.includes(extension) : false;

// eslint-disable-next-line no-console -- Debug script requires console output
console.log('File extension:', extension);
// eslint-disable-next-line no-console -- Debug script requires console output
console.log('Is valid image type:', isValidImageType);
