import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
        <svg width="130" height="130" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="34" r="8" fill="#fff" />
          <path d="M 46 20 A 18 18 0 1 1 18 20" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M 46 20 L 36 16 L 38 26 Z" fill="#fff" />
        </svg>
      </div>
    ),
    size,
  );
}
