export interface NewUnitData {
    unitID: string
    modelID: string
}

export interface DialogService {
    // Add unit dialog
    openAddUnitDialog(): void
    closeAddUnitDialog(): void
    isAddUnitDialogOpen(): boolean

    // Add unit type dialog
    openAddUnitTypeDialog(): void
    closeAddUnitTypeDialog(): void
    isAddUnitTypeDialogOpen(): boolean

    // Bulk operation dialogs
    openBulkStatusDialog(): void
    closeBulkStatusDialog(): void
    isBulkStatusDialogOpen(): boolean
    openBulkRentDialog(): void
    closeBulkRentDialog(): void
    isBulkRentDialogOpen(): boolean

    // New unit data management
    getNewUnitData(): NewUnitData
    setNewUnitData(data: NewUnitData): void
    resetNewUnitData(): void
}

export class DefaultDialogService implements DialogService {
    private addUnitDialogOpen = false;
    private addUnitTypeDialogOpen = false;
    private bulkStatusDialogOpen = false;
    private bulkRentDialogOpen = false;
    private newUnitData: NewUnitData = { unitID: '', modelID: '' };

    // Add unit dialog methods
    openAddUnitDialog(): void {
        this.resetNewUnitData();
        this.addUnitDialogOpen = true;
    }

    closeAddUnitDialog(): void {
        this.addUnitDialogOpen = false;
    }

    isAddUnitDialogOpen(): boolean {
        return this.addUnitDialogOpen;
    }

    // Add unit type dialog methods
    openAddUnitTypeDialog(): void {
        this.addUnitTypeDialogOpen = true;
    }

    closeAddUnitTypeDialog(): void {
        this.addUnitTypeDialogOpen = false;
    }

    isAddUnitTypeDialogOpen(): boolean {
        return this.addUnitTypeDialogOpen;
    }

    // Bulk status dialog methods
    openBulkStatusDialog(): void {
        this.bulkStatusDialogOpen = true;
    }

    closeBulkStatusDialog(): void {
        this.bulkStatusDialogOpen = false;
    }

    isBulkStatusDialogOpen(): boolean {
        return this.bulkStatusDialogOpen;
    }

    // Bulk rent dialog methods
    openBulkRentDialog(): void {
        this.bulkRentDialogOpen = true;
    }

    closeBulkRentDialog(): void {
        this.bulkRentDialogOpen = false;
    }

    isBulkRentDialogOpen(): boolean {
        return this.bulkRentDialogOpen;
    }

    // New unit data management
    getNewUnitData(): NewUnitData {
        return { ...this.newUnitData };
    }

    setNewUnitData(data: NewUnitData): void {
        this.newUnitData = { ...data };
    }

    resetNewUnitData(): void {
        this.newUnitData = { unitID: '', modelID: '' };
    }
}
