declare module 'react-qr-scanner' {
  import * as React from 'react';

  export interface QrScannerProps {
    delay?: number;
    onScan?: (data: string | null) => void;
    onError?: (error: any) => void;
    style?: React.CSSProperties;
    facingMode?: 'user' | 'environment';
  }

  const QrScanner: React.FC<QrScannerProps>;

  export default QrScanner;
}
