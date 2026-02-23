import { executeQuery } from './connection.js';

export const runMigrations = async () => {
    console.log('🔄 Checking database schema migrations...');

    try {
        // 1. Check if 'detalles_mascotas' table has the new columns
        // We can check information_schema or just try to add them and ignore 'duplicate column' error (or check first).
        // Checking first is cleaner.

        const dbName = process.env.DB_DATABASE || process.env.DB_NAME || 'carnet_comunitario';

        const checkColumnQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'detalles_mascotas' 
        AND COLUMN_NAME = ?
    `;

        // --- edad_mascota ---
        const edadResults: any[] = await executeQuery(checkColumnQuery, [dbName, 'edad_mascota']);
        if (edadResults.length === 0) {
            console.log('⚠️ Column edad_mascota missing in detalles_mascotas. Adding it...');
            await executeQuery(`ALTER TABLE detalles_mascotas ADD COLUMN edad_mascota INT NULL AFTER nombre_tutor`);
            console.log('✅ Column edad_mascota added.');
        }

        // --- telefono_tutor ---
        const telResults: any[] = await executeQuery(checkColumnQuery, [dbName, 'telefono_tutor']);
        if (telResults.length === 0) {
            console.log('⚠️ Column telefono_tutor missing in detalles_mascotas. Adding it...');
            await executeQuery(`ALTER TABLE detalles_mascotas ADD COLUMN telefono_tutor VARCHAR(50) NULL AFTER edad_mascota`);
            console.log('✅ Column telefono_tutor added.');
        }

        // --- zona_residente ---
        const zonaResults: any[] = await executeQuery(checkColumnQuery, [dbName, 'zona_residente']);
        if (zonaResults.length === 0) {
            console.log('⚠️ Column zona_residente missing in detalles_mascotas. Adding it...');
            await executeQuery(`ALTER TABLE detalles_mascotas ADD COLUMN zona_residente VARCHAR(255) NULL AFTER telefono_tutor`);
            console.log('✅ Column zona_residente added.');
        }

        console.log('✅ Database migrations check completed.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        // Don't crash the app, just log error.
    }
};
