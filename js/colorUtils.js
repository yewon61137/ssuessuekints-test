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

// RGB → HSL 변환 (H: 0~360, S: 0~1, L: 0~1)
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return [h * 360, s, l];
}

// 이미지 픽셀을 분석해 실제로 구분되는 색상 그룹 수를 추정
// 반환값: min(실제 색상 그룹 수, maxColors)
export function detectOptimalColorCount(pixels, maxColors) {
    if (pixels.length === 0) return maxColors;

    // 서브샘플링 (최대 5000픽셀)
    const step = Math.max(1, Math.floor(pixels.length / 5000));
    const sampled = [];
    for (let i = 0; i < pixels.length; i += step) sampled.push(pixels[i]);

    // 무채색 판별 임계값
    const ACHROMATIC_SAT = 0.12;
    const ACHROMATIC_L_LOW = 0.15;  // 거의 검정
    const ACHROMATIC_L_HIGH = 0.85; // 거의 흰색

    let hasAchromatic = false;
    let hasDarkAchromatic = false;

    // Hue를 36개 버킷(10도 단위)으로 분류
    const hueBuckets = new Array(36).fill(0);

    for (const p of sampled) {
        const [h, s, l] = rgbToHsl(p[0], p[1], p[2]);

        if (s < ACHROMATIC_SAT) {
            if (l < ACHROMATIC_L_LOW) hasDarkAchromatic = true;
            else hasAchromatic = true;
            continue;
        }

        // 유채색: hue 버킷 증가
        const bucket = Math.floor(h / 10) % 36;
        hueBuckets[bucket]++;
    }

    // 의미 있는 hue 버킷 클러스터링 (인접 버킷 묶기)
    const total = sampled.length;
    const MIN_RATIO = 0.02; // 전체의 2% 이상이면 유의미한 색상 그룹으로 인정
    const significant = hueBuckets.map((count, i) => ({ i, count }))
        .filter(b => b.count / total >= MIN_RATIO);

    // 인접 hue 버킷 병합 (±20도 이내는 같은 그룹)
    const merged = [];
    let used = new Array(significant.length).fill(false);
    for (let a = 0; a < significant.length; a++) {
        if (used[a]) continue;
        let group = [significant[a].i];
        for (let b = a + 1; b < significant.length; b++) {
            const diff = Math.min(
                Math.abs(significant[a].i - significant[b].i),
                36 - Math.abs(significant[a].i - significant[b].i)
            );
            if (diff <= 2) { // ±20도
                group.push(significant[b].i);
                used[b] = true;
            }
        }
        merged.push(group);
        used[a] = true;
    }

    let colorGroups = merged.length;
    if (hasAchromatic) colorGroups++;
    if (hasDarkAchromatic) colorGroups++;

    // 최소 2, 사용자 설정 이하로 반환
    return Math.min(Math.max(colorGroups, 2), maxColors);
}

// Delta E (CIE76) 계산: RGB → Lab 변환 후 차이
function rgbToLab(r, g, b) {
    // sRGB → linear
    let rr = r / 255, gg = g / 255, bb = b / 255;
    rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
    gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
    bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;

    // linear → XYZ (D65)
    const x = (rr * 0.4124 + gg * 0.3576 + bb * 0.1805) / 0.95047;
    const y = (rr * 0.2126 + gg * 0.7152 + bb * 0.0722) / 1.00000;
    const z = (rr * 0.0193 + gg * 0.1192 + bb * 0.9505) / 1.08883;

    function f(t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; }
    const L = 116 * f(y) - 16;
    const A = 500 * (f(x) - f(y));
    const B = 200 * (f(y) - f(z));
    return [L, A, B];
}

function deltaE(c1, c2) {
    const [L1, a1, b1] = rgbToLab(c1[0], c1[1], c1[2]);
    const [L2, a2, b2] = rgbToLab(c2[0], c2[1], c2[2]);
    return Math.sqrt((L1-L2)**2 + (a1-a2)**2 + (b1-b2)**2);
}

// k-means 결과 팔레트에서 Delta E < threshold 인 유사 색상 병합
// seedColors: 필수 색상 (병합 대상에서 제외)
// 반환: { palette, assignments } (병합 후)
export function mergeByDeltaE(palette, assignments, seedColors = [], threshold = 15) {
    const n = palette.length;
    if (n <= 1) return { palette, assignments };

    // 어떤 인덱스가 어떤 인덱스로 병합되는지 맵 (초기: 자기 자신)
    const mapping = Array.from({ length: n }, (_, i) => i);

    // seed 색상 인덱스 집합 (고정)
    const seedSet = new Set();
    for (let s = 0; s < seedColors.length && s < n; s++) seedSet.add(s);

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            // 둘 다 seed면 스킵
            if (seedSet.has(i) && seedSet.has(j)) continue;
            if (deltaE(palette[i], palette[j]) < threshold) {
                // seed가 아닌 쪽을 seed 쪽(또는 더 작은 인덱스)으로 병합
                const keep = seedSet.has(i) ? i : (seedSet.has(j) ? j : i);
                const drop = keep === i ? j : i;
                // drop → keep 으로 재매핑 (전이적 처리)
                for (let k = 0; k < n; k++) {
                    if (mapping[k] === drop) mapping[k] = keep;
                }
            }
        }
    }

    // 실제 사용 인덱스 추출 (순서 유지)
    const usedIdxSet = new Set(mapping);
    const usedIdxArr = Array.from(usedIdxSet).sort((a, b) => a - b);
    const newPalette = usedIdxArr.map(i => palette[i]);
    const reMap = new Map(usedIdxArr.map((orig, newIdx) => [orig, newIdx]));

    const newAssignments = assignments.map(a => reMap.get(mapping[a]));

    return { palette: newPalette, assignments: newAssignments };
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

/**
 * 3x3 Median Filter to reduce noise in the generated pattern assignments.
 * For each pixel, picks the most frequent assignment in its 3x3 neighborhood.
 */
export function applyMedianFilter(assignments, width, height) {
    const newAssignments = new Array(assignments.length).fill(0);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const counts = new Map();
            let maxCount = 0;
            let currentMode = assignments[y * width + x];

            // 3x3 window
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const ny = y + dy;
                    const nx = x + dx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                        const val = assignments[ny * width + nx];
                        const c = (counts.get(val) || 0) + 1;
                        counts.set(val, c);
                        if (c > maxCount) {
                            maxCount = c;
                            currentMode = val;
                        }
                    }
                }
            }
            newAssignments[y * width + x] = currentMode;
        }
    }
    return newAssignments;
}
