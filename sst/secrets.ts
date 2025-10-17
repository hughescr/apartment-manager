import type {} from '../.sst/platform/config';

/**
 * SST Secrets Configuration
 * Manages encrypted secrets stored in S3 for the apartment manager application
 */

export const radarSecretKey = new sst.Secret('RADAR_SECRET_KEY');
