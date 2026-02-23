import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs"; // Para leer imágenes locales
export async function generateEmprendedorCardPdf(data: any): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 0 }); // Sin margen para control total

  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // ========================
  // 1. FONDO (PRIMERO - DETRÁS DE TODO)
  // ========================
  try {
    const backgroundPath = "./public/fondo.png";
    if (fs.existsSync(backgroundPath)) {
      doc.image(backgroundPath, 0, 0, {
        width: doc.page.width,
        height: doc.page.height,
      });
    } else {
      // Fallback: fondo con degradado verde/azul
      doc.fillColor("#4CAF50").rect(0, 0, doc.page.width, 60).fill();
      doc.fillColor("#002855").rect(0, 60, doc.page.width, 20).fill();
      doc
        .fillColor("#002855")
        .rect(0, doc.page.height - 40, doc.page.width, 40)
        .fill();
      doc
        .fillColor("#4CAF50")
        .rect(
          doc.page.width * 0.7,
          doc.page.height - 40,
          doc.page.width * 0.3,
          40,
        )
        .fill();
    }
  } catch (err) {
    console.warn("No se pudo cargar el fondo:", err);
  }

  // ========================
  // 2. CONTENIDO (ENCIMA DEL FONDO)
  // ========================
  const contentX = 40; // Margen izquierdo
  let currentY = 80; // Posición vertical inicial

  // --- LOGO DE LA ALCALDÍA (Estilo Circular como en Mascotas) ---
  try {
    const logoPath = "./public/logo.png";
    if (fs.existsSync(logoPath)) {
      // Círculo blanco detrás del logo para que resalte
      doc
        .circle(contentX - 6, currentY - 33, 20)
        .fillColor("#FFFFFF")
        .fill();
      doc.image(logoPath, contentX - 40, currentY - 60, { width: 160 });
    } else {
      doc
        .fontSize(16)
        .fillColor("#002855")
        .text("ALCALDÍA DE SAN DIEGO", contentX, currentY);
    }
  } catch (err) {
    doc
      .fontSize(16)
      .fillColor("#002855")
      .text("ALCALDÍA DE SAN DIEGO", contentX, currentY);
  }
  currentY += 70;

  // --- DATOS PRINCIPALES (GRID 3 COLUMNAS) ---
  const colWidth = (doc.page.width - contentX * 2) / 3;
  doc
    .fontSize(12)
    .fillColor("#757575")
    .text(
      "Dirección de Participación Ciudadana y Desarrollo Social",
      contentX,
      currentY - 30,
    );

  // Fila 1: Razón Social | Teléfono | ID Solicitud
  doc
    .fontSize(8)
    .fillColor("#757575")
    .text("Razón Social", contentX, currentY, {
      width: colWidth,
      align: "center",
    });
  doc
    .fontSize(10)
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .text(data.razon_social ?? "-", contentX, currentY + 12);

  doc
    .fontSize(8)
    .fillColor("#757575")
    .text("Teléfono", contentX + colWidth, currentY, {
      width: colWidth,
      align: "center",
    });
  doc
    .fontSize(10)
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .text(data.telefono_contacto ?? "-", contentX + colWidth, currentY + 12, {
      width: colWidth,
      align: "center",
    });

  doc
    .fontSize(8)
    .fillColor("#757575")
    .text("N° de Solicitud", contentX + colWidth * 2, currentY, {
      width: colWidth,
      align: "right",
    });
  doc
    .fontSize(10)
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .text(data.id_solicitud ?? "-", contentX + colWidth * 2, currentY + 12, {
      width: colWidth,
      align: "right",
    });

  currentY += 35;

  // Fila 2: Nombre Comercial | Tipo Persona | RIF (Registro Fiscal)
  doc
    .fontSize(8)
    .fillColor("#757575")
    .text("Nombre Comercial", contentX, currentY);
  doc
    .fontSize(10)
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .text(data.nombre_comercial ?? "-", contentX, currentY + 12);

  doc
    .fontSize(8)
    .fillColor("#757575")
    .text("Tipo Persona", contentX + colWidth, currentY, {
      width: colWidth,
      align: "center",
    });
  doc
    .fontSize(10)
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .text(data.tipo_persona ?? "-", contentX + colWidth, currentY + 12, {
      width: colWidth,
      align: "center",
    });

  doc
    .fontSize(8)
    .fillColor("#757575")
    .text("Registro Fiscal (RIF)", contentX + colWidth * 2, currentY, {
      width: colWidth,
      align: "right",
    });
  doc
    .fontSize(10)
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .text(data.registro_fiscal ?? "-", contentX + colWidth * 2, currentY + 12, {
      width: colWidth,
      align: "right",
    });

  currentY += 40;

  // --- RUBRO / ACTIVIDAD (BARRA VERDE) ---
  doc
    .fillColor("#4DB6AC")
    .roundedRect(contentX, currentY, doc.page.width - contentX * 2, 30, 5)
    .fill();
  doc
    .fillColor("#002855")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("RUBRO DEL NEGOCIO", contentX + 10, currentY + 5, {
      align: "center",
    });
  doc
    .fontSize(10)
    .text(data.rubro ?? "SIN ASIGNAR", contentX + 10, currentY + 15, {
      align: "center",
    });
  currentY += 50;

  // --- TÍTULO PRINCIPAL ---
  doc
    .fillColor("#002855")
    .fontSize(20)
    .font("Helvetica-Bold")
    .text("Carnet de Emprendedor", 0, currentY, {
      align: "center",
      width: doc.page.width,
    });
  currentY += 40;

  // --- CARNETS (DOS COLUMNAS) ---
  const cardWidth = (doc.page.width - contentX * 3) / 2;
  const cardHeight = 180;
  const cardY = currentY;
  const cardRightX = contentX + cardWidth + 40; // Separación igual a la de mascotas

  // ======================
  // CARNET IZQUIERDO (QR)
  // ======================

  // Fondo carnet

  doc.opacity(1);

  // Banner superior
  try {
    const bannerPath = "./public/banner.png";
    if (fs.existsSync(bannerPath)) {
      doc.image(bannerPath, contentX + 5, cardY + 3, {
        width: cardWidth - 10,
        height: 30,
      });
    }
  } catch (err) {
    doc
      .fillColor("#002855")
      .rect(contentX + 5, cardY + 5, cardWidth - 10, 30)
      .fill();
    doc
      .fillColor("#FFFFFF")
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("EMPRENDEDOR", contentX + 10, cardY + 15);
  }

  // QR + Info
  if (data.codigo_qr_hash) {
    const qrDataUrl = await QRCode.toDataURL(data.codigo_qr_hash, {
      width: 60,
    });
    const qrBase64 = qrDataUrl.split(",")[1];
    if (qrBase64) {
      const qrBuffer = Buffer.from(qrBase64, "base64");
      doc.image(qrBuffer, contentX + 10, cardY + 45, { width: 60 });
    }

    doc
      .fillColor("#4CAF50")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Emprendedor", contentX + 80, cardY + 50);
    doc
      .fillColor("#757575")
      .fontSize(9)
      .text("Válido hasta:", contentX + 80, cardY + 65);

    // Fecha de vencimiento
    const fechaVenc = data.fecha_vencimiento
      ? String(data.fecha_vencimiento).slice(0, 10)
      : "31/12/2026";

    // Recuadro fecha
    doc
      .fillColor("#FFFFFF")
      .rect(contentX + 80, cardY + 80, 100, 30)
      .fill();
    doc
      .fillColor("#002855")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text(fechaVenc, contentX + 85, cardY + 88);

    doc
      .fillColor("#757575")
      .fontSize(8)
      .text(
        data.codigo_qr_hash.substring(0, 12) + "...",
        contentX + 80,
        cardY + 120,
      );
    doc
      .fillColor("#4CAF50")
      .fontSize(8)
      .text("N° Solicitud", contentX + 10, cardY + 135);
    doc
      .fillColor("#000000")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(data.id_solicitud, contentX + 10, cardY + 150);

    doc
      .fillColor("#4CAF50")
      .fontSize(8)
      .text("RIF", contentX + 165, cardY + 135);
    doc
      .fillColor("#000000")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(data.registro_fiscal, contentX + 165, cardY + 150);
  }

  // ======================
  // CARNET DERECHO (DATOS)
  // ======================

  // Fondo carnet

  doc.opacity(1);

  // Logo pequeño
  try {
    const logoSmallPath = "./public/logo.png";
    if (fs.existsSync(logoSmallPath)) {
      doc.image(logoSmallPath, cardRightX + 5, cardY + 5, {
        width: 70,
        height: 30,
      });
    }
  } catch (err) {
    doc
      .fillColor("#002855")
      .rect(cardRightX + 5, cardY + 5, 60, 20)
      .fill();
    doc
      .fillColor("#FFFFFF")
      .fontSize(8)
      .text("ALCALDÍA", cardRightX + 10, cardY + 10);
  }

  // Título Carnet Derecho
  doc
    .fillColor("#4CAF50")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("Comprobante de", cardRightX + 35, cardY + 5, { align: "center" });
  doc.text("Emprendedor", cardRightX + 35, cardY + 20, {
    align: "center",
    continued: false,
  });

  // Datos del Emprendedor
  const datoY = cardY + 50;
  const labelSize = 8;
  const valueSize = 10;

  // Razón Social
  doc
    .fillColor("#4CAF50")
    .fontSize(labelSize)
    .text("Razón Social", cardRightX + 5, datoY);
  if (data.razon_social.length > 20) {
    doc
      .fillColor("#000000")
      .fontSize(7)
      .font("Helvetica-Bold")
      .text(data.razon_social ?? "-", cardRightX + 5, datoY + 12, {
        width: cardWidth / 2 - 10,
        align: "left",
        lineBreak: true,
      });
  } else {
    doc
      .fillColor("#000000")
      .fontSize(valueSize)
      .font("Helvetica-Bold")
      .text(data.razon_social ?? "-", cardRightX + 5, datoY + 12);
  }

  // Nombre Comercial

  // Columna 1 Interna: Rubro y RIF
  doc
    .fillColor("#4CAF50")
    .fontSize(labelSize)
    .text("Rubro", cardRightX + 5, datoY + 30);
  doc
    .fillColor("#000000")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(
      data.rubro ? data.rubro.substring(0, 20) : "-",
      cardRightX + 5,
      datoY + 42,
    );

  doc
    .fillColor("#4CAF50")
    .fontSize(labelSize)
    .text("Teléfono", cardRightX + 5, datoY + 60);
  doc
    .fillColor("#000000")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(data.telefono_contacto ?? "-", cardRightX + 5, datoY + 72);

  // Columna 2 Interna: Doc Titular y Teléfono
  const halfCardW = cardWidth / 2;

  doc
    .fillColor("#4CAF50")
    .fontSize(labelSize)
    .text("Nombre Comercial", cardRightX + halfCardW, datoY);
  if (data.nombre_comercial.length > 20) {
    doc
      .fillColor("#000000")
      .fontSize(7)
      .font("Helvetica-Bold")
      .text(data.nombre_comercial ?? "-", cardRightX + halfCardW, datoY + 12, {
        width: cardWidth / 2 - 10,
        align: "left",
        lineBreak: true,
      });
  } else {
    doc
      .fillColor("#000000")
      .fontSize(valueSize)
      .font("Helvetica-Bold")
      .text(data.nombre_comercial ?? "-", cardRightX + halfCardW, datoY + 12);
  }

  doc
    .fillColor("#4CAF50")
    .fontSize(labelSize)
    .text("Doc. Titular", cardRightX + halfCardW, datoY + 30);
  doc
    .fillColor("#000000")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(data.documento_titular ?? "-", cardRightX + halfCardW, datoY + 42);

  // Dirección (Ocupa todo el ancho abajo)
  doc
    .fillColor("#4CAF50")
    .fontSize(labelSize)
    .text("Dirección Física", cardRightX + 5, datoY + 85);
  doc
    .fillColor("#000000")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text(
      data.direccion_fisica
        ? data.direccion_fisica.substring(0, 50) + "..."
        : "-",
      cardRightX + 5,
      datoY + 97,
    );

  currentY += cardHeight + 30;

  // --- INFORMACIÓN DEL DOCUMENTO ---
  doc.fillColor("#000000").fontSize(10).font("Helvetica").lineGap(4);
  doc.text(
    "Este documento es tu Carnet de Emprendedor. Ha sido diseñado para que puedas demostrar, de manera rápida y oficial, tu condición de emprendedor ante las autoridades municipales competentes.",
    contentX,
    currentY,
    { width: doc.page.width - contentX * 2 },
  );
  currentY += 50;

  doc
    .font("Helvetica-Bold")
    .text("Ventajas de tu comprobante:", contentX, currentY);
  currentY += 15;
  doc
    .font("Helvetica")
    .text(
      "• Verificación inmediata: Incluye un código QR para validación en tiempo real.",
      contentX,
      currentY,
    );
  currentY += 12;
  doc.text(
    "• Información completa: Contiene los datos de tu emprendimiento.",
    contentX,
    currentY,
  );
  currentY += 12;
  currentY += 20;

  doc
    .font("Helvetica-Bold")
    .text("Sigue estas recomendaciones:", contentX, currentY);
  currentY += 15;
  doc
    .font("Helvetica")
    .text(
      "• Imprime este documento (preferiblemente a color).",
      contentX,
      currentY,
    );
  currentY += 12;
  doc.text(
    "• Recorta el carnet y plastifícalo para mayor durabilidad.",
    contentX,
    currentY,
  );
  currentY += 12;
  doc.text(
    "• Mantenlo siempre junto a la documentación de tu negocio.",
    contentX,
    currentY,
  );
  currentY += 30;

  // --- FOOTER ---
  doc
    .fillColor("#002855")
    .moveTo(contentX, currentY)
    .lineTo(doc.page.width - contentX, currentY)
    .stroke();
  currentY += 10;

  doc
    .fillColor("#757575")
    .fontSize(8)
    .text(
      `Fecha de aprobación: ${data.fecha_aprobacion ? new Date(data.fecha_aprobacion).toLocaleDateString("es-ES") : "-"}`,
      contentX,
      currentY,
    );

  try {
    const footerLogoPath = "./public/logo.png";
    if (fs.existsSync(footerLogoPath)) {
      doc.image(footerLogoPath, doc.page.width / 2 - 30, currentY - 5, {
        width: 60,
        height: 20,
      });
    }
  } catch (err) {
    // Sin logo en footer si falla
  }

  doc.text("Pág. 1/1", doc.page.width - contentX - 50, currentY, {
    align: "center",
  });

  // Dirección completa (ajustada para no salir de la página)
  currentY += 25;
  doc
    .fontSize(7)
    .fillColor("#555555")
    .text(
      "AV. INTERCOMUNAL DON JULIO CENTENO, CENTRO COMERCIAL SAN DIEGO. NIVEL MEZZANINA. LOCAL W-01. ENTRE LA URB. LA ESMERALDA Y EL MORRO II. TELÉFONO: (0241)-7000.700 HTTPS://ALCALDIADESANDIEGO.GOB.VE EMAIL: DESARROLLOSOCIALSD@GMAIL.COM REDES SOCIALES: @ALC_SANDIEGO / @LEONJURA",
      contentX,
      currentY,
      { width: doc.page.width - contentX * 2, align: "center" },
    );

  doc.end();
  return done;
}

