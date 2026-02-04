import { defineBackend } from '@aws-amplify/backend';

/**
 * Amplify Gen2 Backend Configuration
 * 
 * This project uses a simplified DynamoDB setup without Amplify-managed auth.
 * Tables are created manually via the setup-dynamodb.js script.
 * 
 * To deploy to AWS:
 * 1. Run `npm run setup-dynamodb` to create tables
 * 2. Deploy the Next.js app to Amplify Hosting
 * 
 * The app uses cookie-based auth with hardcoded passwords (family app).
 */

export const backend = defineBackend({});
