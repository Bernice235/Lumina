import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeCanvasProps {
  value: string;
  size?: number;
  color?: string;
  alt?: string;
  className?: string;
}

export const QrCodeCanvas: React.FC<QrCodeCanvasProps> = ({
  value,
  size = 240,
  color = '#db2777',
  alt = 'Lumina QR Code',
  className = 'w-full h-full object-contain block',
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    if (!value) {
      setDataUrl('');
      return;
    }
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: color,
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (active) {
          setDataUrl(url);
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [value, size, color]);

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full text-xs text-rose-700 bg-rose-50 rounded-xl p-3 text-center">
        Unable to render QR code
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        className="w-full h-full rounded-xl bg-pink-50/60 animate-pulse flex items-center justify-center text-[11px] font-semibold text-pink-700"
        aria-label="Generating QR code"
      >
        Generating QR...
      </div>
    );
  }

  return <img src={dataUrl} alt={alt} width={size} height={size} className={className} />;
};

export default QrCodeCanvas;
