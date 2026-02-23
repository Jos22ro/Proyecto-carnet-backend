import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const generateQRCode = async (data: string): Promise<string> => {
  // Simple hash-based QR code (in production, use a proper QR library like qrcode)
  const hash = crypto.createHash('md5').update(data).digest('hex');
  
  // For now, return the hash - in production generate actual QR image
  return hash;
};

export const saveQRImage = async (qrHash: string, data: string): Promise<string> => {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'qrs');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Generate simple QR code (in production use qrcode library)
  const qrPath = path.join(uploadsDir, `${qrHash}.png`);
  
  // For now, create a simple text file with the QR data
  // In production, generate actual QR image
  const qrData = `QR Code: ${qrHash}\nData: ${data}\nGenerated: ${new Date().toISOString()}`;
  fs.writeFileSync(qrPath.replace('.png', '.txt'), qrData);
  
  // Return the path relative to uploads directory
  return `/qrs/${qrHash}.txt`;
};

export const handleFileUpload = async (file: any, category: string): Promise<string> => {
  const uploadsDir = path.join(process.cwd(), 'uploads', category);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Generate unique filename
  const timestamp = Date.now();
  const filename = `${timestamp}_${file.originalname}`;
  const filepath = path.join(uploadsDir, filename);
  
  // Move file to uploads directory
  fs.renameSync(file.path, filepath);
  
  // Return relative path
  return `/${category}/${filename}`;
};

export const deleteFile = (filePath: string): boolean => {
  try {
    const fullPath = path.join(process.cwd(), 'uploads', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};