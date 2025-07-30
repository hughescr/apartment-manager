import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Resource } from 'sst';
import { randomUUID } from 'crypto';
import { split, toLower, startsWith, isError } from 'lodash';
import { getS3Client } from '../data/clients';

const s3Client = getS3Client();

// Helper to generate a unique key for S3
const generateS3Key = (buildingId: string, unitId: string, filename: string): string => {
    const parts = split(filename, '.');
    const extension = toLower(parts.pop() || 'jpg');
    const uuid = randomUUID();
    return `buildings/${buildingId}/units/${unitId}/${uuid}.${extension}`;
};

// Helper to validate file type
const isValidImageType = (filename: string): boolean => {
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'];
    const parts = split(filename, '.');
    const extension = toLower(parts.pop() || '');
    return extension ? validExtensions.includes(extension) : false;
};

// Handle POST upload request
const handleUploadRequest = async (body: string | null) => {
    const parsedBody = JSON.parse(body || '{}');
    const { filename, buildingId, unitId, contentType } = parsedBody;

    if(!filename || !buildingId || !unitId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing required fields' })
        };
    }

    if(!isValidImageType(filename)) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid file type. Only images are allowed.' })
        };
    }

    // Generate S3 key
    const key = generateS3Key(buildingId, unitId, filename);

    // Create presigned URL for upload
    const command = new PutObjectCommand({
        Bucket: Resource.PhotosBucket.name,
        Key: key,
        ContentType: contentType || 'image/jpeg',
        // Add metadata
        Metadata: {
            buildingId,
            unitId,
            originalFilename: filename,
            uploadedAt: new Date().toISOString()
        }
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour expiry

    // Generate the public URL (assuming bucket is public or using CloudFront)
    const publicUrl = `https://${Resource.PhotosBucket.name}.s3.amazonaws.com/${key}`;

    return {
        statusCode: 200,
        body: JSON.stringify({
            uploadUrl,
            key,
            publicUrl
        })
    };
};

// Handle DELETE request
const handleDeleteRequest = async (path: string) => {
    const key = decodeURIComponent(path.substring('/api/upload/'.length));

    if(!key) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing key parameter' })
        };
    }

    // Security check: ensure the key is within expected path structure
    if(!startsWith(key, 'buildings/')) {
        return {
            statusCode: 403,
            body: JSON.stringify({ error: 'Invalid key path' })
        };
    }

    const command = new DeleteObjectCommand({
        Bucket: Resource.PhotosBucket.name,
        Key: key
    });

    await s3Client.send(command);

    return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
    };
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
    };

    // Handle CORS preflight
    if(event.requestContext.http.method === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const method = event.requestContext.http.method;
        const path = event.rawPath;

        // POST /api/upload - Generate presigned URL for upload
        if(method === 'POST' && path === '/api/upload') {
            const result = await handleUploadRequest(event.body ?? null);
            return { ...result, headers };
        }

        // DELETE /api/upload/{key} - Delete an uploaded file
        if(method === 'DELETE' && startsWith(path, '/api/upload/')) {
            const result = await handleDeleteRequest(path);
            return { ...result, headers };
        }

        // Method not allowed
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    } catch(error) {
        // Log error for debugging (removed console.error per ESLint)
        const errorMessage = isError(error) ? error.message : 'Unknown error';

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: errorMessage
            })
        };
    }
};
