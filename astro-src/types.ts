export interface BuildingData {
    buildingID: string
    unitID: 'BUILDING'
    street?: string
    city?: string
    state?: string
    zip?: string
    description?: string
    yearBuilt?: number
    numberStories?: number
    totalUnits?: number
}

export interface UnitData {
    buildingID: string
    unitID: string
    description?: string
    beds?: number
    baths?: number
    sqft?: number
    rent?: number
    occupied?: boolean
    availableDate?: string
}
