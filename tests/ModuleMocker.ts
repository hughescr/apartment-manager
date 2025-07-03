/**
 * When setting up a test that will mock a module, the block should add this:
 * const moduleMocker = new ModuleMocker();
 *
 * afterEach(() => {
 *   moduleMocker.clear();
 * });
 *
 * When a test mocks a module, it should do it this way:
 *
 * beforeEach(() => {
 *     await moduleMocker.mock('<!-- Import failed: /services/token.ts', () => ({
 *         getBucketToken: mock(() => {
 *             throw new Error('Unexpected error');
 *         }),
 *     }));
 * });
 *
 */
import { mock } from 'bun:test';

interface MockResult {
    clear: () => void
}

export class ModuleMocker {
    private mocks: MockResult[] = [];

    async mock(modulePath: string, renderMocks: () => Record<string, unknown>) {
        const original = {
            ...(await import(modulePath))
        };
        const mocks = renderMocks();
        const result = {
            ...original,
            ...mocks,
        };
        mock.module(modulePath, () => result);

        this.mocks.push({
            clear: () => {
                mock.module(modulePath, () => original);
            },
        });
    }

    clear() {
        for(const mockResult of this.mocks) {
            mockResult.clear();
        }
        this.mocks = [];
    }
}
