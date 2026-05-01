"use client";

import React from 'react';

export default function SuccessCheckmark({ size = 80 }) {
  return (
    <div style={{ width: size, height: size, display: 'block', margin: '0 auto' }}>
      <svg 
        className="ui-checkmark-fill" 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 52 52" 
        style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'block', strokeWidth: 2, stroke: '#fff', strokeMiterlimit: 10 }}
      >
        <circle className="ui-checkmark-circle" cx="26" cy="26" r="25" />
        <path className="ui-checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
      </svg>
    </div>
  );
    </div>
  );
}
