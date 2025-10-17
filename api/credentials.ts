/**
 * API endpoints for credential management
 * Provides secure storage and retrieval of third-party site credentials
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { storeCredential, getCredential, deleteCredential, listCredentials, hasCredential, SiteCredentials } from '../data/credentials';
import { logger } from '@hughescr/logger';
import { map, keys, isError } from 'lodash';

/**
 * List all sites with stored credentials
 */
export async function list(_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
    try {
        const sites = await listCredentials();

        // Check which sites have credentials without revealing the actual values
        const siteStatuses = await Promise.all(
            map(sites, async site => ({
                site,
                hasCredentials: await hasCredential(site)
            }))
        );

        return {
            statusCode: 200,
            headers:    { 'Content-Type': 'application/json' },
            body:       JSON.stringify({
                sites: siteStatuses
            })
        };
    } catch (error) {
        logger.error('Failed to list credentials', { error: error as Record<string, unknown> });
        return {
            statusCode: 500,
            headers:    { 'Content-Type': 'application/json' },
            body:       JSON.stringify({
                error: 'Failed to list credentials'
            })
        };
    }
}

/**
 * Store credentials for a specific site
 */
export async function create(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
    try {
        const site = event.pathParameters?.site;
        if(!site) {
            return {
                statusCode: 400,
                headers:    { 'Content-Type': 'application/json' },
                body:       JSON.stringify({
                    error: 'Site parameter is required'
                })
            };
        }

        // Validate site name (alphanumeric and hyphens only)
        if(!/^[a-z0-9-]+$/.test(site)) {
            return {
                statusCode: 400,
                headers:    { 'Content-Type': 'application/json' },
                body:       JSON.stringify({
                    error: 'Invalid site name. Use lowercase letters, numbers, and hyphens only.'
                })
            };
        }

        if(!event.body) {
            return {
                statusCode: 400,
                headers:    { 'Content-Type': 'application/json' },
                body:       JSON.stringify({
                    error: 'Request body is required'
                })
            };
        }

        let credentials: SiteCredentials;
        try {
            credentials = JSON.parse(event.body) as SiteCredentials;
        } catch (parseError) {
            logger.warn('Failed to parse credentials request body', {
                error:      parseError as Record<string, unknown>,
                context:    'store credentials request parsing',
                httpMethod: event.requestContext.http.method
            });
            return {
                statusCode: 400,
                headers:    { 'Content-Type': 'application/json' },
                body:       JSON.stringify({
                    error:   'Invalid JSON in request body',
                    details: isError(parseError) ? parseError.message : 'Invalid JSON format'
                })
            };
        }

        // Validate that at least one credential field is provided
        if(!credentials.username && !credentials.apiKey && !credentials.feedUrl) {
            return {
                statusCode: 400,
                headers:    { 'Content-Type': 'application/json' },
                body:       JSON.stringify({
                    error: 'At least one credential field is required (username, apiKey, or feedUrl)'
                })
            };
        }

        await storeCredential(site, credentials);

        return {
            statusCode: 201,
            headers:    { 'Content-Type': 'application/json' },
            body:       JSON.stringify({
                message: `Credentials stored for ${site}`,
                site
            })
        };
    } catch (error) {
        logger.error('Failed to store credentials', { error: error as Record<string, unknown> });
        return {
            statusCode: 500,
            headers:    { 'Content-Type': 'application/json' },
            body:       JSON.stringify({
                error: 'Failed to store credentials'
            })
        };
    }
}

/**
 * Check if credentials exist for a site (without revealing values)
 */
export async function get(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
    try {
        const site = event.pathParameters?.site;
        if(!site) {
            return {
                statusCode: 400,
                headers:    { 'Content-Type': 'application/json' },
                body:       JSON.stringify({
                    error: 'Site parameter is required'
                })
            };
        }

        const exists = await hasCredential(site);

        if(!exists) {
            return {
                statusCode: 404,
                headers:    { 'Content-Type': 'application/json' },
                body:       JSON.stringify({
                    error: `No credentials found for ${site}`
                })
            };
        }

        // Get credential to check which fields are present (without exposing values)
        const credential = await getCredential(site);
        const fields = {
            hasUsername:  !!credential?.username,
            hasPassword:  !!credential?.password,
            hasApiKey:    !!credential?.apiKey,
            hasApiSecret: !!credential?.apiSecret,
            hasFeedUrl:   !!credential?.feedUrl,
            hasMetadata:  !!credential?.metadata && (credential.metadata ? keys(credential.metadata).length : 0) > 0
        };

        return {
            statusCode: 200,
            headers:    { 'Content-Type': 'application/json' },
            body:       JSON.stringify({
                site,
                exists: true,
                fields
            })
        };
    } catch (error) {
        logger.error('Failed to check credentials', { error: error as Record<string, unknown> });
        return {
            statusCode: 500,
            headers:    { 'Content-Type': 'application/json' },
            body:       JSON.stringify({
                error: 'Failed to check credentials'
            })
        };
    }
}

/**
 * Update credentials for a site
 */
export async function update(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
    // This is the same as create since we use Overwrite: true in Parameter Store
    return create(event);
}

/**
 * Delete credentials for a site
 */
export async function del(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
    try {
        const site = event.pathParameters?.site;
        if(!site) {
            return {
                statusCode: 400,
                headers:    { 'Content-Type': 'application/json' },
                body:       JSON.stringify({
                    error: 'Site parameter is required'
                })
            };
        }

        await deleteCredential(site);

        return {
            statusCode: 204,
            headers:    { 'Content-Type': 'application/json' },
            body:       ''
        };
    } catch (error) {
        logger.error('Failed to delete credentials', { error: error as Record<string, unknown> });
        return {
            statusCode: 500,
            headers:    { 'Content-Type': 'application/json' },
            body:       JSON.stringify({
                error: 'Failed to delete credentials'
            })
        };
    }
}
