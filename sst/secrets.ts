/// <reference path="../.sst/platform/config.d.ts" />

/**
 * SST Secrets Configuration
 * Manages encrypted secrets stored in S3 for the apartment manager application
 */

export const radarSecretKey = new sst.Secret('RADAR_SECRET_KEY');
