import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

const mark = (
  <svg width="360" height="360" viewBox="0 0 64 64" fill="none">
    <path d="M47.56 16.44 A22 22 0 1 1 37.69 10.75" stroke="#12141A" strokeWidth="8" fill="none" />
    <path d="M39.76 3.02 L48.32 13.6 L35.62 18.48 Z" fill="#12141A" />
    <circle cx="32" cy="32" r="9.5" fill="#E3651F" />
  </svg>
);

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: 108 }}>
        {mark}
      </div>
    ),
    size,
  );
}
