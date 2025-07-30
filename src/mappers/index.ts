export * from './types.js';
export * from './registry.js';
export * from './inheritance-resolver.js';
export * from './transformers/index.js';
export * from './sites/index.js';

// Register default mappers
import { getMapperRegistry } from './registry.js';
import { ApartmentsComMapper } from './sites/apartments-com.js';
import { ZillowMapper } from './sites/zillow.js';

// Auto-register default mappers
const registry = getMapperRegistry();
registry.register(new ApartmentsComMapper());
registry.register(new ZillowMapper());
