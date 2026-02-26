// colorUtils.js
// 개선된 색상 양자화 (K-means++ 알고리즘 + 채도/중앙 가중치 적용)

export function getPixelArray(imageData, width, height) {
    const pixels = [];
    const data = imageData.data;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            // 투명한 픽셀은 처리에서 제외
            if (data[idx+3] > 128) {
                // R, G, B, X, Y 순서로 저장
                pixels.push([data[idx], data[idx+1], data[idx+2], x, y]);
            }
        }
    }
    return pixels;
}

// 거리 제곱 계산 (속도 향상 및 K-means++ 확률 계산용)
function colorDistanceSq(c1, c2) {
    // 인간의 시각에 맞춘 가중치 적용 (Red, Green, Blue 중요도)
    const rDiff = c1[0] - c2[0];
    const gDiff = c1[1] - c2[1];
    const bDiff = c1[2] - c2[2];
    return (rDiff * rDiff * 0.3) + (gDiff * gDiff * 0.59) + (bDiff * bDiff * 0.11);
}

// K-means++ 초기화 (방법 A+C 적용, Seed Colors 지원)
function initKMeansPlusPlus(pixels, k, width, height, seedColors = []) {
    const centers = [];
    
    // 사용자가 지정한 필수 보존 색상을 최우선으로 추가
    for (const color of seedColors) {
        if (centers.length < k) {
            centers.push([...color]);
        }
    }
    
    if (pixels.length === 0 || centers.length >= k) return centers;
    
    // 중앙점 계산
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDistToCenter = Math.sqrt(centerX * centerX + centerY * centerY);

    // Seed Color가 하나도 없을 경우에만 첫 번째 중심점을 A+C 가중치로 찾음
    if (centers.length === 0) {
        let bestFirstIdx = 0;
        let maxFirstScore = -1;
        for (let j = 0; j < pixels.length; j += Math.max(1, Math.floor(pixels.length/1000))) {
            const p = pixels[j];
            const maxRGB = Math.max(p[0], p[1], p[2]);
            const minRGB = Math.min(p[0], p[1], p[2]);
            const sat = (maxRGB - minRGB) / 255;
            
            const dx = p[3] - centerX;
            const dy = p[4] - centerY;
            const distFromCenter = Math.sqrt(dx*dx + dy*dy);
            const centerBias = 1.0 - (distFromCenter / maxDistToCenter);
            
            const score = sat * centerBias;
            if (score > maxFirstScore) {
                maxFirstScore = score;
                bestFirstIdx = j;
            }
        }
        centers.push([...pixels[bestFirstIdx]]);
    }
    
    // 2. 나머지 중심점들은 거리에 비례한 확률로 선택 (채도와 위치 가중치 적용)
    for (let i = centers.length; i < k; i++) {
        let distances = new Float64Array(pixels.length);
        let sumDistances = 0;
        
        for (let j = 0; j < pixels.length; j++) {
            let minDistSq = Infinity;
            for (let c = 0; c < centers.length; c++) {
                const distSq = colorDistanceSq(pixels[j], centers[c]);
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                }
            }
            
            // [방법 A] 채도(Saturation) 가중치: 무채색보다 쨍한 색상 선호
            const p = pixels[j];
            const maxRGB = Math.max(p[0], p[1], p[2]);
            const minRGB = Math.min(p[0], p[1], p[2]);
            const sat = (maxRGB - minRGB) / 255; // 0 ~ 1
            const satWeight = 1.0 + (sat * 5.0); // 채도가 높을수록 점수 증폭 (최대 6배)
            
            // [방법 C] 중앙(Center) 가중치: 사진 가장자리보다 가운데 있는 피사체 선호
            const dx = p[3] - centerX;
            const dy = p[4] - centerY;
            const distFromCenter = Math.sqrt(dx*dx + dy*dy);
            const centerBias = Math.max(0, 1.0 - (distFromCenter / maxDistToCenter)); // 0(가장자리) ~ 1(중앙)
            const centerWeight = 1.0 + (centerBias * 3.0); // 중앙일수록 점수 증폭 (최대 4배)
            
            // 최종 가중치가 적용된 거리
            const finalWeight = satWeight * centerWeight;
            distances[j] = minDistSq * finalWeight;
            sumDistances += distances[j];
        }
        
        if (sumDistances === 0) break;
        
        // 룰렛 휠 선택
        let target = Math.random() * sumDistances;
        for (let j = 0; j < pixels.length; j++) {
            target -= distances[j];
            if (target <= 0) {
                const isDuplicate = centers.some(c => c[0]===pixels[j][0] && c[1]===pixels[j][1] && c[2]===pixels[j][2]);
                if (!isDuplicate) {
                    centers.push([...pixels[j]]);
                } else {
                    i--; // 중복이면 다시 뽑기
                }
                break;
            }
        }
    }
    return centers;
}

export function kMeans(pixels, k, width, height, maxIter = 15, seedColors = []) {
    if (pixels.length === 0) return { palette: [[0,0,0]], assignments: [] };

    // Unique pixels check for small images or limited colors
    const uniquePixelsMap = new Map();
    for(const p of pixels) {
        const key = `${p[0]},${p[1]},${p[2]}`;
        if(!uniquePixelsMap.has(key)) uniquePixelsMap.set(key, p);
    }
    const uniquePixels = Array.from(uniquePixelsMap.values());
    
    // If k is greater than number of unique pixels, adjust k
    const finalK = Math.min(k, uniquePixels.length);

    // 서브샘플링으로 속도 향상
    const maxPixels = 10000; 
    let samplePixels = pixels;
    if (pixels.length > maxPixels) {
        samplePixels = [];
        const step = Math.ceil(pixels.length / maxPixels);
        for(let i=0; i<pixels.length; i+=step) {
            samplePixels.push(pixels[i]);
        }
    }

    // A(채도) + C(중앙) 가중치가 적용된 초기 중심점 추출 (+Seed Colors 지원)
    const centers = initKMeansPlusPlus(samplePixels, finalK, width, height, seedColors);
    const numSeeds = Math.min(seedColors.length, finalK);
    
    if (centers.length === 0) return { palette: [[0,0,0]], assignments: new Array(pixels.length).fill(0) };

    let assignments = new Array(pixels.length).fill(0);
    
    // 일반 K-means 클러스터링 최적화 루프
    for (let iter = 0; iter < maxIter; iter++) {
        let changed = false;
        
        for (let i = 0; i < pixels.length; i++) {
            let minDist = Infinity;
            let closestCenterIdx = 0;
            
            for (let c = 0; c < centers.length; c++) {
                // 클러스터링 할 때는 가중치 없이 순수 색상 거리만 사용
                const dist = colorDistanceSq(pixels[i], centers[c]);
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
        
        if (!changed) break;
        
        const sums = Array.from({length: centers.length}, () => [0, 0, 0, 0]); 
        
        for (let i = 0; i < pixels.length; i++) {
            const clusterIdx = assignments[i];
            sums[clusterIdx][0] += pixels[i][0];
            sums[clusterIdx][1] += pixels[i][1];
            sums[clusterIdx][2] += pixels[i][2];
            sums[clusterIdx][3] += 1;
        }
        
        for (let c = 0; c < centers.length; c++) {
            if (c < numSeeds) {
                // 사용자가 지정한 Seed Color는 절대 변하지 않도록 강제 고정 (Lock)
                centers[c][0] = seedColors[c][0];
                centers[c][1] = seedColors[c][1];
                centers[c][2] = seedColors[c][2];
            } else if (sums[c][3] > 0) {
                centers[c][0] = Math.round(sums[c][0] / sums[c][3]);
                centers[c][1] = Math.round(sums[c][1] / sums[c][3]);
                centers[c][2] = Math.round(sums[c][2] / sums[c][3]);
            }
        }
    }
    
    return { palette: centers, assignments };
}

export function rgbToHex([r, g, b]) {
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();
}

export function hexToRgb(hex) {
    const bigint = parseInt(hex.replace('#', ''), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
}
