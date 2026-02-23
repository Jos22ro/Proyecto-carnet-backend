import fs from 'fs';
import { generateMascotaCardPdf } from './utils/generateMascotaCardPdf.js';
import { generateEmprendedorCardPdf } from './utils/generateEmprendedorCardPdf.js';

// Mock Data for Mascota
const mockMascota = {
    id_solicitud: 12345,
    nombre_mascota: "Firulais",
    especie: "Perro",
    raza: "Golden Retriever",
    nombre_tutor: "Juan Pérez",
    telefono_tutor: "0412-1234567",
    edad_mascota: 3,
    zona_residente: "Urb. La Esmeralda",
    codigo_qr_hash: "hash-de-prueba-mascota-123",
    fecha_aprobacion: new Date(),
    email_contacto: "juan@example.com"
};

// Mock Data for Emprendedor
const mockEmprendedor = {
    id_solicitud: 67890,
    razon_social: "Inveriones Pérez calvo && antonio C.A.",
    nombre_comercial: "Bodega de Juan & antonio",
    rubro: "Alimentos",
    tipo_persona: "juridica",
    documento_titular: "V-12.345.678",
    registro_fiscal: "J-12345678-9",
    telefono_contacto: "0241-8765432",
    direccion_fisica: "Av. Principal calle 1",
    codigo_qr_hash: "hash-de-prueba-emprendedor-456",
    fecha_vencimiento: "2026-12-31",
    fecha_aprobacion: new Date(),
    email_contacto: "juan@bodega.com"
};

async function runTest() {
    console.log("🚀 Generando PDFs de prueba...");

    try {
        // 1. Mascota
        console.log("📄 Generando carnet de Mascota...");
        const pdfMascota = await generateMascotaCardPdf(mockMascota);
        fs.writeFileSync('test_carnet_mascota.pdf', pdfMascota);
        console.log("✅ 'test_carnet_mascota.pdf' creado exitosamente.");

        // 2. Emprendedor
        console.log("📄 Generando carnet de Emprendedor...");
        const pdfEmprendedor = await generateEmprendedorCardPdf(mockEmprendedor);
        fs.writeFileSync('test_carnet_emprendedor.pdf', pdfEmprendedor);
        console.log("✅ 'test_carnet_emprendedor.pdf' creado exitosamente.");

    } catch (error) {
        console.error("❌ Error generando PDFs:", error);
    }
}

runTest();
