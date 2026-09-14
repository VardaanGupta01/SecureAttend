import QRCode from 'qrcode';

export async function generateQRCodeImage(text, width = 300, height = 300) {
  const dataUrl = await QRCode.toDataURL(text, {
    width: Math.min(width, height),
    margin: 1,
    errorCorrectionLevel: 'M',
  });
  return dataUrl;
}
