// Export types
export type * from './types.js';

// Export implementation classes (avoid naming conflicts)
export { MapperRegistry, getMapperRegistry, resetMapperRegistry } from './registry.js';
export { InheritanceResolver, inheritanceResolver } from './inheritance-resolver.js';

// Export transformers (avoid the TransformerRegistry interface/class conflict)
export { TransformerRegistry, createTransformerRegistry } from './transformers/transformer-registry.js';
export * from './transformers/enum-transformer.js';
export * from './transformers/date-transformer.js';
export * from './transformers/price-transformer.js';
export * from './transformers/amenity-transformer.js';
export * from './transformers/fee-transformer.js';
export * from './transformers/photo-transformer.js';

export * from './sites/index.js';

// Register default mappers
import { getMapperRegistry } from './registry.js';
import { ApartmentsComMapper } from './sites/apartments-com.js';
import { ZillowMapper } from './sites/zillow.js';

// Auto-register default mappers
const registry = getMapperRegistry();
registry.register(new ApartmentsComMapper());
registry.register(new ZillowMapper());
