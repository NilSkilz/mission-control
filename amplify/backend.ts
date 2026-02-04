import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource';

/**
 * Amplify Gen2 Backend Configuration
 * 
 * This project uses Amplify Gen2 Data with publicApiKey authorization.
 * Tables are auto-created by Amplify on deploy - no manual scripts needed.
 * 
 * The app uses cookie-based auth with hardcoded passwords (family app).
 * This is NOT using Cognito - just simple password auth.
 */

export const backend = defineBackend({
  data,
});
