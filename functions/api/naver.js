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
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const profileData = await profileResponse.json();

        if (profileData.resultcode !== '00') {
            return new Response(JSON.stringify({ error: 'Failed to fetch profile' }), { status: 400 });
        }

        const naverUser = profileData.response;

        // 3. Firebase Auth에 유저 생성/업데이트 (email 포함) — Firebase console 식별자 표시용
        const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
        const clientEmail = env.FIREBASE_SERVICE_ACCOUNT_EMAIL;
        const projectId = env.FIREBASE_PROJECT_ID;

        try {
            const adminToken = await getAdminAccessToken(clientEmail, privateKey);
            await upsertFirebaseAuthUser(naverUser.id, naverUser.email, naverUser.nickname, naverUser.profile_image, projectId, adminToken);
        } catch (adminErr) {
            // Admin API 실패는 non-fatal: 커스텀 토큰 로그인은 계속 진행
            console.error('Firebase Auth upsert failed:', adminErr.message);
        }

        // 4. Firebase 커스텀 토큰 생성
        const firebaseToken = await createFirebaseCustomToken(
            naverUser.id,
            {
                email: naverUser.email,
                name: naverUser.nickname,
                picture: naverUser.profile_image,
                provider: 'naver'
            },
            privateKey,
            clientEmail
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
 * RSA-SHA256 JWT 서명 (Cloudflare Subtle Crypto)
 */
async function signRSA(payload, privateKeyPem) {
    const header = { alg: 'RS256', typ: 'JWT' };

    const toBase64Url = (obj) => {
        const bytes = new TextEncoder().encode(JSON.stringify(obj));
        let binary = '';
        bytes.forEach(b => binary += String.fromCharCode(b));
        return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    };

    const encodedHeader = toBase64Url(header);
    const encodedPayload = toBase64Url(payload);
    const tokenToSign = `${encodedHeader}.${encodedPayload}`;

    const pemContents = privateKeyPem
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/\s+/g, '');
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8', binaryKey,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false, ['sign']
    );

    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5', cryptoKey,
        new TextEncoder().encode(tokenToSign)
    );

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    return `${tokenToSign}.${encodedSignature}`;
}

/**
 * Google OAuth2 Admin 액세스 토큰 취득 (서비스 계정 JWT 교환)
 */
async function getAdminAccessToken(clientEmail, privateKey) {
    const now = Math.floor(Date.now() / 1000);
    const jwt = await signRSA({
        iss: clientEmail,
        sub: clientEmail,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        scope: 'https://www.googleapis.com/auth/identitytoolkit'
    }, privateKey);

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    });
    const data = await res.json();
    if (!data.access_token) throw new Error('Admin token error: ' + JSON.stringify(data));
    return data.access_token;
}

/**
 * Firebase Auth 유저 생성 또는 업데이트 (email 포함)
 * 신규: POST /accounts (localId 지정)
 * 기존: DUPLICATE_LOCAL_ID 에러 시 POST /accounts:update
 */
async function upsertFirebaseAuthUser(uid, email, displayName, photoURL, projectId, adminToken) {
    const base = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts`;
    const headers = {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
    };

    const body = { localId: uid };
    if (email) { body.email = email; body.emailVerified = true; }
    if (displayName) body.displayName = displayName;
    if (photoURL) body.photoUrl = photoURL;

    // 신규 유저 생성 시도
    const createRes = await fetch(base, {
        method: 'POST', headers, body: JSON.stringify(body)
    });
    const createData = await createRes.json();

    if (createData.error) {
        const msg = createData.error.message || '';
        // 이미 존재하는 유저 → 업데이트
        if (msg.includes('DUPLICATE_LOCAL_ID') || msg.includes('already exists')) {
            const updateRes = await fetch(`${base}:update`, {
                method: 'POST', headers, body: JSON.stringify(body)
            });
            const updateData = await updateRes.json();
            // EMAIL_EXISTS: 다른 계정이 같은 이메일 사용 중 → email 없이 재시도
            if (updateData.error && updateData.error.message?.includes('EMAIL_EXISTS')) {
                const bodyNoEmail = { localId: uid };
                if (displayName) bodyNoEmail.displayName = displayName;
                if (photoURL) bodyNoEmail.photoUrl = photoURL;
                await fetch(`${base}:update`, {
                    method: 'POST', headers, body: JSON.stringify(bodyNoEmail)
                });
            } else if (updateData.error) {
                throw new Error('Update failed: ' + updateData.error.message);
            }
        } else if (!msg.includes('EMAIL_EXISTS')) {
            throw new Error('Create failed: ' + msg);
        }
    }
}

/**
 * Firebase 커스텀 토큰(JWT) 생성
 */
async function createFirebaseCustomToken(uid, claims, privateKey, clientEmail) {
    const now = Math.floor(Date.now() / 1000);
    return signRSA({
        iss: clientEmail,
        sub: clientEmail,
        aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
        iat: now,
        exp: now + 3600,
        uid: uid,
        claims: claims
    }, privateKey);
}
