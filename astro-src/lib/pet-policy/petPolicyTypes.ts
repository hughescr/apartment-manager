import type { PetPolicy } from '../../types';
import { PetType } from '../../types';
import type { AlpineMagics } from '../alpine-types';

/**
 * Extended pet policy with UI state for advanced settings
 */
export interface ExtendedPetPolicy extends PetPolicy {
    petTypes?: PetTypePolicy[]
}

/**
 * Individual pet type policy configuration
 */
export interface PetTypePolicy {
    type: PetType
    weightLimit?: number
    countLimit?: number
    fee?: number
    deposit?: number
    breedRestrictions?: string[]
}

/**
 * Pet type option for UI display
 */
export interface PetTypeOption {
    value: PetType
    label: string
}

/**
 * Pet policy UI state
 */
export interface PetPolicyUIState {
    showBreedRestrictions: boolean
    newBreedRestriction: string
    showAdvancedSettings: boolean
}

/**
 * Pet policy form errors
 */
export interface PetPolicyErrors {
    general?: string
    types?: string
    maxCount?: string
    weightLimit?: string
    deposit?: string
    monthlyFee?: string
    oneTimeFee?: string
    breedRestrictions?: string
    notes?: string
}

/**
 * Cost summary for pet fees
 */
export interface PetCostSummary {
    upfront: number
    monthly: number
    annual: number
}

/**
 * Pet policy state interface for Alpine.js
 */
export interface PetPolicyState extends PetPolicyUIState {
    // Data
    modelName: string
    petTypes: PetTypeOption[]
    commonBreeds: string[]

    // Computed properties
    petsAllowed: boolean
    totalPetCost: PetCostSummary
    hasAdvancedPetTypes: boolean
    advancedPetTypesSummary: string

    // Methods
    init(): void
    togglePetType(type: PetType): void
    isPetTypeSelected(type: PetType): boolean
    addBreedRestriction(breed: string): void
    removeBreedRestriction(index: number): void
    toggleCommonBreed(breed: string): void
    isBreedRestricted(breed: string): boolean
    addPetTypePolicy(): void
    removePetTypePolicy(index: number): void
    addBreedRestrictionToPetType(petTypeIndex: number, breed: string): void
    removeBreedRestrictionFromPetType(petTypeIndex: number, breedIndex: number): void
}

/**
 * Combined state with Alpine.js magic properties
 */
export type PetPolicyStateWithMagic = PetPolicyState & AlpineMagics & Record<string, ExtendedPetPolicy>;

/**
 * Props for pet policy components
 */
export interface PetPolicyComponentProps {
    name: string
    label?: string
    xModel: string
    petPolicy?: PetPolicy
    required?: boolean
    disabled?: boolean
    'class'?: string
    error?: string
    showLabel?: boolean
}

/**
 * Pet type editor component props
 */
export interface PetTypeEditorProps {
    petTypeIndex: number
    disabled?: boolean
}

/**
 * Breed restrictions component props
 */
export interface BreedRestrictionsProps {
    xModel: string
    disabled?: boolean
    showCommonBreeds?: boolean
}

/**
 * Pet fee manager component props
 */
export interface PetFeeManagerProps {
    name: string
    xModel: string
    disabled?: boolean
    showSummary?: boolean
}

/**
 * Validation result type
 */
export interface PetPolicyValidationResult {
    isValid: boolean
    errors: PetPolicyErrors
}

/**
 * Common breed restrictions list
 */
export const COMMON_BREED_RESTRICTIONS = [
    'Pit Bull',
    'Rottweiler',
    'German Shepherd',
    'Doberman',
    'Akita',
    'Chow Chow',
    'Great Dane',
    'Mastiff',
    'Husky'
] as const;

/**
 * Pet type options for UI
 */
export const PET_TYPE_OPTIONS: PetTypeOption[] = [
    { value: PetType.DOG, label: 'Dogs' },
    { value: PetType.CAT, label: 'Cats' },
    { value: PetType.BIRD, label: 'Birds' },
    { value: PetType.FISH, label: 'Fish' },
    { value: PetType.SMALL_ANIMAL, label: 'Small Animals (rabbits, hamsters, etc.)' }
];
