import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
  waitForConnections?: boolean;
  connectionLimit?: number;

  queueLimit?: number;
  ssl?: any;
}

const config: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'carnet_comunitario',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DB_SSL_MODE === 'REQUIRED' ? { rejectUnauthorized: false } : undefined
};

// Create connection pool
const pool = mysql.createPool(config);

// Test connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ MySQL connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MySQL connection failed:', error);
    return false;
  }
};

// Execute query with error handling
export const executeQuery = async <T = any>(
  query: string,
  params: any[] = []
): Promise<T[]> => {
  try {
    const [rows] = await pool.execute(query, params);
    return rows as T[];
  } catch (error) {
    console.error('❌ Query execution error:', error);
    console.error('Query:', query);
    console.error('Params:', params);
    throw error;
  }
};

// Execute single row query
export const executeQueryOne = async <T = any>(
  query: string,
  params: any[] = []
): Promise<T | null> => {
  const rows = await executeQuery<T>(query, params);
  return rows.length > 0 ? rows[0]! : null;
};

// Execute insert and return ID
export const executeInsert = async (
  query: string,
  params: any[] = []
): Promise<bigint> => {
  try {
    const [result] = await pool.execute(query, params);
    const insertResult = result as mysql.ResultSetHeader;
    return BigInt(insertResult.insertId);
  } catch (error) {
    console.error('❌ Insert execution error:', error);
    console.error('Query:', query);
    console.error('Params:', params);
    throw error;
  }
};

// Execute update/delete and return affected rows
export const executeUpdate = async (
  query: string,
  params: any[] = []
): Promise<number> => {
  try {
    const [result] = await pool.execute(query, params);
    const updateResult = result as mysql.ResultSetHeader;
    return updateResult.affectedRows;
  } catch (error) {
    console.error('❌ Update/Delete execution error:', error);
    console.error('Query:', query);
    console.error('Params:', params);
    throw error;
  }
};

// Transaction helper
export const executeTransaction = async <T = any>(
  queries: Array<{ query: string; params?: any[] }>
): Promise<T[]> => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const results: T[] = [];

    for (const { query, params = [] } of queries) {
      const [result] = await connection.execute(query, params);
      results.push(result as T);
    }

    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    console.error('❌ Transaction error:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Close pool
export const closeConnection = async (): Promise<void> => {
  try {
    await pool.end();
    console.log('✅ MySQL connection pool closed');
  } catch (error) {
    console.error('❌ Error closing MySQL connection:', error);
    throw error;
  }
};

export default pool;