/**
 * Base API Service
 *
 * Provides common HTTP request patterns and error handling for all API services.
 * Eliminates duplicate fetch boilerplate, response parsing, and error handling logic.
 */

export interface ApiResponse<T> {
    success:     boolean
    data?:       T
    error?:      string
    statusCode?: number
}

export interface RequestOptions extends RequestInit {
    /** Custom error message to display on failure */
    errorMessage?: string
}

/**
 * Base class for API services
 *
 * Provides type-safe HTTP methods with centralized error handling,
 * JSON parsing, and response validation.
 *
 * @example
 * ```typescript
 * class MyApiService extends BaseApiService {
 *     constructor(apiURL: string) {
 *         super(apiURL);
 *     }
 *
 *     async getItem(id: string) {
 *         return this.get<MyType>(`/items/${id}`);
 *     }
 * }
 * ```
 */
export class BaseApiService {
    protected readonly baseURL: string;

    constructor(apiURL: string) {
        // Normalize URL by removing trailing slashes
        this.baseURL = apiURL.replace(/\/$/, '');
    }

    /**
     * Performs a GET request
     */
    protected async get<T>(
        endpoint: string,
        options?: RequestOptions
    ): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'GET',
        });
    }

    /**
     * Performs a POST request with JSON body
     */
    protected async post<T>(
        endpoint: string,
        body?: unknown,
        options?: RequestOptions
    ): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            ...options,
            method:  'POST',
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    /**
     * Performs a PUT request with JSON body
     */
    protected async put<T>(
        endpoint: string,
        body?: unknown,
        options?: RequestOptions
    ): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            ...options,
            method:  'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    /**
     * Performs a DELETE request
     */
    protected async delete<T>(
        endpoint: string,
        options?: RequestOptions
    ): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'DELETE',
        });
    }

    /**
     * Core request method with error handling and response parsing
     */
    protected async request<T>(
        endpoint: string,
        options: RequestOptions = {}
    ): Promise<ApiResponse<T>> {
        const { errorMessage, ...fetchOptions } = options;
        const url = `${this.baseURL}${endpoint}`;

        try {
            const response = await fetch(url, fetchOptions);

            if(response.ok) {
                return await this.parseSuccessResponse<T>(response);
            } else {
                return await this.parseErrorResponse(response, errorMessage);
            }
        } catch (error) {
            return this.handleNetworkError(error, errorMessage);
        }
    }

    /**
     * Parses successful response with graceful handling of empty/invalid JSON
     */
    private async parseSuccessResponse<T>(response: Response): Promise<ApiResponse<T>> {
        try {
            const responseText = await response.text();

            // Handle empty response body (common for DELETE, etc.)
            if(!responseText.trim()) {
                return {
                    success:    true,
                    statusCode: response.status,
                };
            }

            // Attempt JSON parsing
            try {
                const data = JSON.parse(responseText) as T;
                return {
                    success:    true,
                    data,
                    statusCode: response.status,
                };
            } catch (parseError) {
                // Malformed JSON in a successful response is an error condition
                const errorMessage = parseError instanceof Error ? parseError.message : 'Invalid JSON in response';
                return {
                    success:    false,
                    error:      errorMessage,
                    statusCode: response.status,
                };
            }
        } catch (textError) {
            // Failed to read response body
            const errorMessage = textError instanceof Error ? textError.message : 'Failed to read response';
            return {
                success:    false,
                error:      errorMessage,
                statusCode: response.status,
            };
        }
    }

    /**
     * Parses error response and extracts error message
     */
    private async parseErrorResponse(
        response: Response,
        customErrorMessage?: string
    ): Promise<ApiResponse<never>> {
        let errorMessage = customErrorMessage ?? `Request failed with status ${response.status}`;

        try {
            const responseText = await response.text();
            if(responseText.trim()) {
                try {
                    // Try to parse as JSON first (most APIs return JSON errors)
                    const errorData = JSON.parse(responseText) as { error?: string, message?: string };
                    errorMessage = errorData.error ?? errorData.message ?? errorMessage;
                } catch{
                    // If not JSON, use the plain text as the error message
                    errorMessage = responseText;
                }
            }
        } catch{
            // Keep default error message if response.text() fails
        }

        return {
            success:    false,
            error:      errorMessage,
            statusCode: response.status,
        };
    }

    /**
     * Handles network errors (connection failures, timeouts, etc.)
     */
    private handleNetworkError(error: unknown, customErrorMessage?: string): ApiResponse<never> {
        const errorMessage = customErrorMessage ?? 'Network error occurred';
        const errorDetails = error instanceof Error ? error.message : 'Unknown error';

        return {
            success: false,
            error:   `${errorMessage}: ${errorDetails}`,
        };
    }

    /**
     * Builds a URL with query parameters
     */
    protected buildURL(endpoint: string, params?: Record<string, string | number | boolean>): string {
        if(!params) {
            return endpoint;
        }

        const queryString = Object.entries(params)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
            .join('&');

        return queryString ? `${endpoint}?${queryString}` : endpoint;
    }
}
