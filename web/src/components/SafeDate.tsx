import { useState, useEffect } from 'react';

interface SafeDateProps {
  date: string;
  format?: 'short' | 'long' | 'locale' | 'full';
  className?: string;
}

export default function SafeDate({ date, format = 'short', className = '' }: SafeDateProps) {
  const [formattedDate, setFormattedDate] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    try {
      const dateObj = new Date(date);
      
      if (isNaN(dateObj.getTime())) {
        setFormattedDate('Fecha inválida');
        return;
      }

      switch (format) {
        case 'short':
          setFormattedDate(dateObj.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }));
          break;
        case 'long':
          setFormattedDate(dateObj.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }));
          break;
        case 'locale':
          setFormattedDate(dateObj.toLocaleDateString('es-ES'));
          break;
        case 'full':
          setFormattedDate(dateObj.toLocaleString('es-ES'));
          break;
        default:
          setFormattedDate(dateObj.toLocaleDateString('es-ES'));
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      setFormattedDate('Error en fecha');
    }
  }, [date, format]);

  // During SSR or before hydration, show a placeholder or loading state
  if (!isClient) {
    return <span className={className}>--/--/----</span>;
  }

  return <span className={className}>{formattedDate}</span>;
}