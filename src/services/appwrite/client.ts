import 'react-native-url-polyfill/auto';

import * as Application from 'expo-application';
import { Account, Client, Functions, Realtime, Storage, TablesDB } from 'react-native-appwrite';

import { env } from '@/lib/env';

/**
 * The only module that constructs Appwrite SDK objects. Everything else goes through the
 * thin wrappers in this folder so we can swap/upgrade the SDK in one place.
 */
export const client = new Client()
  .setEndpoint(env.appwriteEndpoint || 'https://cloud.appwrite.io/v1')
  .setProject(env.appwriteProjectId || 'unset')
  .setPlatform(Application.applicationId ?? 'com.twelvetesters');

export const account = new Account(client);
export const tables = new TablesDB(client);
export const storage = new Storage(client);
export const functions = new Functions(client);
export const realtime = new Realtime(client);
