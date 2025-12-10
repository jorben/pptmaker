'use client';

import React from 'react';

interface Props {
  progress: number; // 0 to 100
  label?: string;
}

export const ProgressBar: React.FC<Props> = ({ progress, label }) => {
  return (
    <div className="w-full">
      {label && <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-indigo-700">{label}</span>
        <span className="text-sm font-medium text-indigo-700">{Math.round(progress)}%</span>
      </div>}
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};
