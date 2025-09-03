// src/components/common/logo/TeamLogo.tsx
import React from 'react';

interface TeamLogoProps {
  logo?: string;
  name: string;
  size?: number; // width & height in pixels
  background?: string; // optional background for transparent logos
  className?: string; // additional classes if needed
}

export const TeamLogo: React.FC<TeamLogoProps> = ({
  logo,
  name,
  size = 48,
  background = 'white',
  className = '',
}) => {
  return (
    <div
      className={`flex items-center justify-center rounded ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: background,
      }}
    >
      {logo ? (
        <img
          src={logo}
          alt={name}
          className="max-w-full max-h-full object-contain"
        />
      ) : (
        <span className="text-xs font-semibold text-gray-500">{name[0]}</span>
      )}
    </div>
  );
};
