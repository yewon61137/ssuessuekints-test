export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    const clientId = env.NAVER_CLIENT_ID;
    const clientSecret = env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 });
    }

    if (!code) {
        return new Response(JSON.stringify({ error: 'Code is required' }), { status: 400 });
    }

    try {
        // 1. 네이버 액세스 토큰 교환
        const tokenResponse = await fetch(`https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${code}&state=${state}`);
        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            return new Response(JSON.stringify({ error: tokenData.error_description }), { status: 400 });
        }

        const accessToken = tokenData.access_token;

        // 2. 네이버 사용자 프로필 가져오기
        const profileResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const profileData = await profileResponse.json();

        if (profileData.resultcode !== '00') {
            return new Response(JSON.stringify({ error: 'Failed to fetch profile' }), { status: 400 });
        }

        const naverUser = profileData.response;
        // naverUser 예시: { id: '...', email: '...', nickname: '...', profile_image: '...' }

        // 3. Firebase 커스텀 토큰 생성 (JWT)
        // Cloudflare 환경에서는 Firebase Admin SDK를 직접 쓰기 어려우므로 직접 JWT를 생성해야 합니다.
        const firebaseToken = await createFirebaseCustomToken(
            naverUser.id, 
            {
                email: naverUser.email,
                name: naverUser.nickname,
                picture: naverUser.profile_image,
                provider: 'naver'
            },
            env
        );

        return new Response(JSON.stringify({
            firebaseToken,
            naverUser: {
                nickname: naverUser.nickname || '',
                email: naverUser.email || null,
                profilePhotoURL: naverUser.profile_image || null
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

/**
 * Firebase 커스텀 토큰(JWT)을 직접 생성합니다.
 * env에 FIREBASE_SERVICE_ACCOUNT_EMAIL과 FIREBASE_PRIVATE_KEY가 설정되어 있어야 합니다.
 */
async function createFirebaseCustomToken(uid, claims, env) {
    const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const clientEmail = env.FIREBASE_SERVICE_ACCOUNT_EMAIL;

    const header = {
        alg: 'RS256',
        typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: clientEmail,
        sub: clientEmail,
        aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
        iat: now,
        exp: now + 3600,
        uid: uid,
        claims: claims
    };

    // UTF-8 safe base64url 인코딩 (한글 닉네임 등 처리)
    const toBase64Url = (obj) => {
        const bytes = new TextEncoder().encode(JSON.stringify(obj));
        let binary = '';
        bytes.forEach(b => binary += String.fromCharCode(b));
        return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    };
    const encodedHeader = toBase64Url(header);
    const encodedPayload = toBase64Url(payload);
    
    const tokenToSign = `${encodedHeader}.${encodedPayload}`;
    
    // RSA-SHA256 서명 처리 (Cloudflare Subtle Crypto 사용)
    // PEM 헤더/푸터 제거 후 base64 추출 (trailing newline 등 robust하게 처리)
    const pemContents = privateKey
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/\s+/g, '');
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryKey,
        {
            name: 'RSASSA-PKCS1-v1_5',
            hash: 'SHA-256'
        },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        new TextEncoder().encode(tokenToSign)
    );

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    return `${tokenToSign}.${encodedSignature}`;
}
