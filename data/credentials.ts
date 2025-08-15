/**
 * Credential management using AWS Systems Manager Parameter Store
 * Provides secure storage and retrieval of third-party site credentials
 */

import { PutParameterCommand, GetParameterCommand, DeleteParameterCommand, DescribeParametersCommand } from '@aws-sdk/client-ssm';
import { logger } from '@hughescr/logger';
import { isObject } from 'lodash';
import { getSSMClient } from './clients';

// Get parameter path prefix based on stage
function getParameterPrefix(): string {
    const stage = process.env.SST_STAGE || 'development';
    return `/apartment-manager/${stage}/credentials`;
}

/**
 * Credential data structure for third-party sites
 */
export interface SiteCredentials {
    username?: string
    password?: string
    apiKey?: string
    apiSecret?: string
    feedUrl?: string
    metadata?: Record<string, string>
}

/**
 * Store credentials for a specific site
 * @param site - Site identifier (e.g., 'apartments-com', 'zillow')
 * @param credentials - Credentials to store
 * @returns Success status
 */
export async function storeCredential(site: string, credentials: SiteCredentials): Promise<boolean> {
    try {
        const parameterName = `${getParameterPrefix()}/${site}`;
        const credentialValue = JSON.stringify(credentials);

        const command = new PutParameterCommand({
            Name: parameterName,
            Value: credentialValue,
            Type: 'SecureString',
            Overwrite: true,
            Description: `Credentials for ${site}`,
            Tier: 'Standard'
        });

        await getSSMClient().send(command);
        logger.info(`Stored credentials for site: ${site}`);
        return true;
    } catch(error) {
        logger.error(`Failed to store credentials for ${site}:`, error);
        throw new Error(`Failed to store credentials: ${(error as Error).message || 'Unknown error'}`);
    }
}

/**
 * Retrieve credentials for a specific site
 * @param site - Site identifier
 * @returns Credentials or null if not found
 */
export async function getCredential(site: string): Promise<SiteCredentials | null> {
    try {
        const parameterName = `${getParameterPrefix()}/${site}`;

        const command = new GetParameterCommand({
            Name: parameterName,
            WithDecryption: true
        });

        const response = await getSSMClient().send(command);

        if(response.Parameter?.Value) {
            return JSON.parse(response.Parameter.Value) as SiteCredentials;
        }

        return null;
    } catch(error) {
        if(isObject(error) && 'name' in error && error.name === 'ParameterNotFound') {
            logger.debug(`No credentials found for site: ${site}`);
            return null;
        }
        logger.error(`Failed to retrieve credentials for ${site}:`, error);
        throw new Error(`Failed to retrieve credentials: ${(error as Error).message || 'Unknown error'}`);
    }
}

/**
 * Delete credentials for a specific site
 * @param site - Site identifier
 * @returns Success status
 */
export async function deleteCredential(site: string): Promise<boolean> {
    try {
        const parameterName = `${getParameterPrefix()}/${site}`;

        const command = new DeleteParameterCommand({
            Name: parameterName
        });

        await getSSMClient().send(command);
        logger.info(`Deleted credentials for site: ${site}`);
        return true;
    } catch(error) {
        if(isObject(error) && 'name' in error && error.name === 'ParameterNotFound') {
            logger.debug(`No credentials to delete for site: ${site}`);
            return true; // Consider it successful if already deleted
        }
        logger.error(`Failed to delete credentials for ${site}:`, error);
        throw new Error(`Failed to delete credentials: ${(error as Error).message || 'Unknown error'}`);
    }
}

/**
 * List all sites with stored credentials
 * @returns Array of site identifiers
 */
export async function listCredentials(): Promise<string[]> {
    try {
        const prefix = getParameterPrefix();
        const sites: string[] = [];
        let nextToken: string | undefined;

        do {
            const command = new DescribeParametersCommand({
                ParameterFilters: [
                    {
                        Key: 'Name',
                        Option: 'BeginsWith',
                        Values: [prefix]
                    }
                ],
                NextToken: nextToken,
                MaxResults: 50
            });

            const response = await getSSMClient().send(command);

            if(response.Parameters) {
                for(const param of response.Parameters) {
                    if(param.Name) {
                        // Extract site name from parameter path
                        const site = param.Name.substring(prefix.length + 1);
                        sites.push(site);
                    }
                }
            }

            nextToken = response.NextToken;
        } while(nextToken);

        logger.debug(`Found ${sites.length} sites with credentials`);
        return sites;
    } catch(error) {
        logger.error('Failed to list credentials:', error);
        throw new Error(`Failed to list credentials: ${(error as Error).message || 'Unknown error'}`);
    }
}

/**
 * Check if credentials exist for a site
 * @param site - Site identifier
 * @returns True if credentials exist
 */
export async function hasCredential(site: string): Promise<boolean> {
    try {
        const credential = await getCredential(site);
        return credential !== null;
    } catch{
        return false;
    }
}
