import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <div
          style={{
            width: 400,
            height: 400,
            borderRadius: 80,
            background: 'linear-gradient(135deg, #0066FF 0%, #00D4FF 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 20px 60px rgba(0,102,255,0.4)',
          }}
        >
          <div
            style={{
              fontSize: 180,
              fontWeight: 'bold',
              color: 'white',
              letterSpacing: '-8px',
            }}
          >
            A3
          </div>
        </div>
      </div>
    ),
    {
      width: 512,
      height: 512,
    }
  );
}
