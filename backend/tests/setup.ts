/**
 * Jest setupFiles — runs in test environment before any test module is imported.
 * Must load dotenv here so env.ts validation passes when app modules are required.
 */
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

process.env['MONGODB_URI'] = process.env['MONGODB_URI'] ?? 'mongodb://localhost:27017/test'
process.env['NODE_ENV'] = 'test'
