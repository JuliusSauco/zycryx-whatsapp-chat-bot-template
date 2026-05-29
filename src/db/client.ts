import {drizzle} from 'drizzle-orm/node-postgres';
import {db as pool} from '../lib/postgres.js';
import * as schema from './schema.js';

export const orm = drizzle(pool, {schema});
