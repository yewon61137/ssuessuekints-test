// colorUtils.js
// 색상 양자화 (K-means 알고리즘) 및 픽셀 처리 로직

/**
 * 1. 이미지 데이터를 픽셀 배열로 변환
 */
export function getPixelArray(imageData) {
    const pixels = [];
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        // 투명도는 무시하고 RGB만 추출
        pixels.push([data[i], data[i+1], data[i+2]]);
    }
    return pixels;
}

/**
 * 2. 두 색상 간의 유클리드 거리 계산
 */
function colorDistance(c1, c2) {
    return Math.sqrt(
        Math.pow(c1[0] - c2[0], 2) +
        Math.pow(c1[1] - c2[1], 2) +
        Math.pow(c1[2] - c2[2], 2)
    );
}

/**
 * 3. K-means 클러스터링을 이용한 색상 팔레트 추출
 * @param {Array} pixels - [R, G, B] 배열의 배열
 * @param {number} k - 추출할 색상 수
 * @param {number} maxIter - 최대 반복 횟수
 */
export function kMeans(pixels, k, maxIter = 10) {
    // 1단계: 초기 중심점 랜덤 선택 (입력 픽셀 중 무작위 k개)
    const centers = [];
    const seen = new Set();
    while (centers.length < k && centers.length < pixels.length) {
        const idx = Math.floor(Math.random() * pixels.length);
        const color = pixels[idx];
        const hash = color.join(',');
        if (!seen.has(hash)) {
            seen.add(hash);
            centers.push([...color]); // 복사본 저장
        }
    }
    
    // 픽셀 수가 색상 수보다 적을 경우 예외 처리
    if (centers.length < k) return centers;

    let assignments = new Array(pixels.length).fill(0);
    
    for (let iter = 0; iter < maxIter; iter++) {
        let changed = false;
        
        // 2단계: 각 픽셀을 가장 가까운 중심점에 할당
        for (let i = 0; i < pixels.length; i++) {
            let minDist = Infinity;
            let closestCenterIdx = 0;
            
            for (let c = 0; c < centers.length; c++) {
                const dist = colorDistance(pixels[i], centers[c]);
                if (dist < minDist) {
                    minDist = dist;
                    closestCenterIdx = c;
                }
            }
            
            if (assignments[i] !== closestCenterIdx) {
                assignments[i] = closestCenterIdx;
                changed = true;
            }
        }
        
        // 수렴했으면 조기 종료
        if (!changed) break;
        
        // 3단계: 새로운 중심점 계산 (각 클러스터의 평균값)
        const sums = Array.from({length: k}, () => [0, 0, 0, 0]); // R, G, B, Count
        
        for (let i = 0; i < pixels.length; i++) {
            const clusterIdx = assignments[i];
            sums[clusterIdx][0] += pixels[i][0];
            sums[clusterIdx][1] += pixels[i][1];
            sums[clusterIdx][2] += pixels[i][2];
            sums[clusterIdx][3] += 1;
        }
        
        for (let c = 0; c < k; c++) {
            if (sums[c][3] > 0) {
                centers[c][0] = Math.round(sums[c][0] / sums[c][3]);
                centers[c][1] = Math.round(sums[c][1] / sums[c][3]);
                centers[c][2] = Math.round(sums[c][2] / sums[c][3]);
            }
        }
    }
    
    return { palette: centers, assignments };
}

/**
 * 4. RGB 배열을 헥스 코드 문자열로 변환
 */
export function rgbToHex([r, g, b]) {
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();
}
