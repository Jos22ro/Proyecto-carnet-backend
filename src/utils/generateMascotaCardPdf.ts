import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs"; // Para leer imágenes locales

export async function generateMascotaCardPdf(data: any): Promise<Buffer> {
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
    // Ajusta esta ruta según tu estructura de proyecto
    const backgroundPath = "./public/fondo_mascota.png";
    if (fs.existsSync(backgroundPath)) {
      doc.image(backgroundPath, 0, 0, {
        width: doc.page.width,
        height: doc.page.height,
      });
    } else {
      // Fallback: fondo con degradado verde/azul si no existe la imagen
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

  // --- LOGO DE LA ALCALDÍA ---
  try {
    const logoPath = "./public/logo.png";
    if (fs.existsSync(logoPath)) {
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

  // --- DATOS DEL TUTOR (GRID 3 COLUMNAS) ---
  const colWidth = (doc.page.width - contentX * 2) / 3;
  // --direccion de de participacion--
  doc
    .fontSize(12)
    .fillColor("#757575")
    .text(
      "Dirección de Participación Ciudadana y Desarrollo Social",
      contentX,
      currentY - 30,
    );
  // Fila 1
  doc
    .fontSize(8)
    .fillColor("#757575")
    .text("Nombre del Responsable", contentX, currentY);
  doc
    .fontSize(10)
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .text(data.nombre_tutor, contentX, currentY + 12);

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
    .text(data.telefono_tutor ?? "-", contentX + colWidth, currentY + 12, {
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
    .text(data.id_solicitud, contentX + colWidth * 2, currentY + 12, {
      width: colWidth,
      align: "right",
    });

  currentY += 35;

  // Fila 2
  doc.fontSize(8).fillColor("#757575").text("Especie", contentX, currentY);
  doc
    .fontSize(10)
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .text(data.especie, contentX, currentY + 12);

  doc
    .fontSize(8)
    .fillColor("#757575")
    .text("Raza", contentX + colWidth, currentY, {
      width: colWidth,
      align: "center",
    });
  doc
    .fontSize(10)
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .text(data.raza ?? "-", contentX + colWidth, currentY + 12, {
      width: colWidth,
      align: "center",
    });

  doc
    .fontSize(8)
    .fillColor("#757575")
    .text("Edad", contentX + colWidth * 2, currentY, {
      width: colWidth,
      align: "right",
    });
  doc
    .fontSize(10)
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .text(data.edad_mascota ?? "-", contentX + colWidth * 2, currentY + 12, {
      width: colWidth,
      align: "right",
    });

  currentY += 40;

  // --- ZONA DE RESIDENCIA (BARRA VERDE) ---
  doc
    .fillColor("#4DB6AC")
    .roundedRect(contentX, currentY, doc.page.width - contentX * 2, 30, 5)
    .fill();
  doc
    .fillColor("#002855")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("ZONA DE DOMICILIO", contentX + 10, currentY + 5, {
      align: "center",
    });
  doc
    .fontSize(10)
    .text(data.zona_residente ?? "-", contentX + 10, currentY + 15, {
      align: "center",
    });
  currentY += 50;

  // --- TÍTULO PRINCIPAL ---
  doc
    .fillColor("#002855")
    .fontSize(20)
    .font("Helvetica-Bold")
    .text("Comprobante de Registro de Mascota", 0, currentY, {
      align: "center",
      width: doc.page.width,
    });
  currentY += 40;

  // --- CARNETS (DOS COLUMNAS) ---
  const cardWidth = (doc.page.width - contentX * 3) / 2;
  const cardHeight = 180;
  const cardY = currentY;
  const cardRightX = contentX + cardWidth + 40; // Mayor separación

  // Carnet Izquierdo (con QR)

  // Banner superior
  try {
    const bannerPath = "./public/banner.png";
    if (fs.existsSync(bannerPath)) {
      doc.image(bannerPath, contentX + 5, cardY + 5, {
        width: cardWidth,
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
      .text("REGISTRO DE MASCOTA", contentX + 10, cardY + 15);
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
      .text("Registro de Mascota", contentX + 80, cardY + 50);
    doc
      .fillColor("#757575")
      .fontSize(9)
      .text("Válido hasta:", contentX + 80, cardY + 65);

    // Fecha destacada
    doc
      .fillColor("#FFFFFF")
      .rect(contentX + 80, cardY + 80, 100, 30)
      .fill();
    doc
      .fillColor("#002855")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("31/12/2026", contentX + 85, cardY + 88);

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
      .text("Nombre de Mascota", contentX + 10, cardY + 135);
    doc
      .fillColor("#000000")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(data.nombre_mascota, contentX + 10, cardY + 150);

    doc
      .fillColor("#4CAF50")
      .fontSize(8)
      .text("N° Solicitud", contentX + 165, cardY + 135);
    doc
      .fillColor("#000000")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(data.id_solicitud, contentX + 165, cardY + 150);
  }

  // Carnet Derecho (con datos)

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

  doc
    .fillColor("#4CAF50")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("Comprobante de", cardRightX + 35, cardY + 5, { align: "center" });
  doc.text("Registro de Mascota", cardRightX + 35, cardY + 20, {
    align: "center",
    continued: false,
  });

  // Datos de la mascota
  const datoY = cardY + 50;
  const labelSize = 8;
  const valueSize = 10;

  doc
    .fillColor("#4CAF50")
    .fontSize(labelSize)
    .text("Nombre de Mascota", cardRightX + 5, datoY);
  doc
    .fillColor("#000000")
    .fontSize(valueSize)
    .font("Helvetica-Bold")
    .text(data.nombre_mascota, cardRightX + 5, datoY + 12);

  doc
    .fillColor("#4CAF50")
    .fontSize(labelSize)
    .text("Especie", cardRightX + 5, datoY + 30);
  doc
    .fillColor("#000000")
    .fontSize(valueSize)
    .font("Helvetica-Bold")
    .text(data.especie, cardRightX + 5, datoY + 42);

  doc
    .fillColor("#4CAF50")
    .fontSize(labelSize)
    .text("Raza", cardRightX + cardWidth / 2, datoY);
  doc
    .fillColor("#000000")
    .fontSize(valueSize)
    .font("Helvetica-Bold")
    .text(data.raza ?? "-", cardRightX + cardWidth / 2, datoY + 12);

  doc
    .fillColor("#4CAF50")
    .fontSize(labelSize)
    .text("Edad", cardRightX + cardWidth / 2, datoY + 30);
  doc
    .fillColor("#000000")
    .fontSize(valueSize)
    .font("Helvetica-Bold")
    .text(data.edad_mascota ?? "-", cardRightX + cardWidth / 2, datoY + 42);

  doc
    .fillColor("#4CAF50")
    .fontSize(labelSize)
    .text("Responsable", cardRightX + 5, datoY + 60);
  doc
    .fillColor("#000000")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(data.nombre_tutor, cardRightX + 5, datoY + 72);

  doc
    .fillColor("#4CAF50")
    .fontSize(labelSize)
    .text("Teléfono Responsable", cardRightX + cardWidth / 2, datoY + 60);
  doc
    .fillColor("#000000")
    .fontSize(valueSize)
    .font("Helvetica-Bold")
    .text(data.telefono_tutor ?? "-", cardRightX + cardWidth / 2, datoY + 72);

  doc
    .fillColor("#4CAF50")
    .fontSize(labelSize)
    .text("Domicilio", cardRightX + 5, datoY + 85);
  doc
    .fillColor("#000000")
    .fontSize(valueSize)
    .font("Helvetica-Bold")
    .text(data.zona_residente, cardRightX + 5, datoY + 97);

  currentY += cardHeight + 30;

  // --- INFORMACIÓN DEL DOCUMENTO ---
  doc.fillColor("#000000").fontSize(10).font("Helvetica").lineGap(14);
  doc.text(
    "Este documento es tu Comprobante de Registro de Mascota. Ha sido diseñado para que puedas demostrar, de manera rápida y oficial, que tu mascota está registrada ante las autoridades municipales competentes.",
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
    "• Información completa: Contiene los datos de identificación de tu mascota.",
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
    "• Mantenlo siempre junto a la documentación de tu mascota.",
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
