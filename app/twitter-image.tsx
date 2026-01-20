import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const alt = 'Space-Quiz - Game Kuis Interaktif Luar Angkasa';
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = 'image/png';

// Image generation
export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 30%, #312e81 60%, #1e1b4b 80%, #0f172a 100%)',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Stars background effect */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'radial-gradient(2px 2px at 20px 30px, white, transparent), radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent), radial-gradient(2px 2px at 50px 160px, rgba(255,255,255,0.6), transparent), radial-gradient(2px 2px at 90px 40px, white, transparent), radial-gradient(2px 2px at 130px 80px, rgba(255,255,255,0.7), transparent), radial-gradient(2px 2px at 160px 120px, white, transparent), radial-gradient(1px 1px at 200px 50px, white, transparent), radial-gradient(1px 1px at 250px 100px, rgba(255,255,255,0.8), transparent), radial-gradient(1px 1px at 300px 150px, white, transparent), radial-gradient(2px 2px at 400px 60px, rgba(255,255,255,0.9), transparent), radial-gradient(2px 2px at 500px 90px, white, transparent), radial-gradient(1px 1px at 600px 130px, rgba(255,255,255,0.7), transparent), radial-gradient(2px 2px at 700px 40px, white, transparent), radial-gradient(1px 1px at 800px 100px, rgba(255,255,255,0.8), transparent), radial-gradient(2px 2px at 900px 70px, white, transparent), radial-gradient(1px 1px at 1000px 120px, rgba(255,255,255,0.6), transparent), radial-gradient(2px 2px at 1100px 50px, white, transparent), radial-gradient(2px 2px at 150px 300px, white, transparent), radial-gradient(1px 1px at 350px 400px, rgba(255,255,255,0.8), transparent), radial-gradient(2px 2px at 550px 350px, white, transparent), radial-gradient(1px 1px at 750px 450px, rgba(255,255,255,0.7), transparent), radial-gradient(2px 2px at 950px 380px, white, transparent), radial-gradient(2px 2px at 100px 500px, rgba(255,255,255,0.6), transparent), radial-gradient(1px 1px at 300px 550px, white, transparent), radial-gradient(2px 2px at 500px 520px, rgba(255,255,255,0.8), transparent), radial-gradient(1px 1px at 700px 580px, white, transparent), radial-gradient(2px 2px at 900px 540px, rgba(255,255,255,0.7), transparent), radial-gradient(2px 2px at 1100px 500px, white, transparent)',
                        backgroundSize: '100% 100%',
                        opacity: 0.6,
                    }}
                />

                {/* Glowing orb effects */}
                <div
                    style={{
                        position: 'absolute',
                        top: '-100px',
                        left: '-100px',
                        width: '400px',
                        height: '400px',
                        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, transparent 70%)',
                        borderRadius: '50%',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        bottom: '-150px',
                        right: '-100px',
                        width: '500px',
                        height: '500px',
                        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%)',
                        borderRadius: '50%',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '800px',
                        height: '400px',
                        background: 'radial-gradient(ellipse, rgba(99, 102, 241, 0.15) 0%, transparent 60%)',
                    }}
                />

                {/* Main content */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                    }}
                >
                    {/* Rocket emoji */}
                    <div
                        style={{
                            fontSize: '80px',
                            marginBottom: '20px',
                        }}
                    >
                        🚀
                    </div>

                    {/* Logo Text - SPACE */}
                    <div
                        style={{
                            fontSize: '120px',
                            fontWeight: 900,
                            letterSpacing: '-4px',
                            background: 'linear-gradient(135deg, #60a5fa 0%, #818cf8 50%, #c084fc 100%)',
                            backgroundClip: 'text',
                            color: 'transparent',
                            lineHeight: 1,
                            textShadow: '0 0 80px rgba(129, 140, 248, 0.5)',
                        }}
                    >
                        SPACE
                    </div>

                    {/* Logo Text - QUIZ */}
                    <div
                        style={{
                            fontSize: '120px',
                            fontWeight: 900,
                            letterSpacing: '-4px',
                            background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #f472b6 100%)',
                            backgroundClip: 'text',
                            color: 'transparent',
                            lineHeight: 1,
                            marginTop: '-20px',
                            textShadow: '0 0 80px rgba(192, 132, 252, 0.5)',
                        }}
                    >
                        QUIZ
                    </div>

                    {/* Tagline */}
                    <div
                        style={{
                            fontSize: '28px',
                            fontWeight: 500,
                            color: 'rgba(255, 255, 255, 0.9)',
                            marginTop: '30px',
                            letterSpacing: '4px',
                            textTransform: 'uppercase',
                        }}
                    >
                        Game Kuis Interaktif Luar Angkasa
                    </div>

                    {/* URL */}
                    <div
                        style={{
                            fontSize: '18px',
                            fontWeight: 400,
                            color: 'rgba(255, 255, 255, 0.5)',
                            marginTop: '15px',
                            letterSpacing: '2px',
                        }}
                    >
                        space-quiz.vercel.app
                    </div>
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
