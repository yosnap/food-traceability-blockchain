import { useState, useEffect } from 'react';

interface SafeNumberProps {
  value: number;
  className?: string;
}

export default function SafeNumber({ value, className = '' }: SafeNumberProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span className={className}>
      {value.toLocaleString()}
    </span>
  );
}