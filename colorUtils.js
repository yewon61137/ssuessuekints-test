// colorUtils.js
// 개선된 색상 양자화 (K-means++ 알고리즘)

export function getPixelArray(imageData) {
    const pixels = [];
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        // 투명한 픽셀은 처리에서 제외하거나 배경색 처리
        if (data[i+3] > 128) {
            pixels.push([data[i], data[i+1], data[i+2]]);
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
    // R: 0.3, G: 0.59, B: 0.11 비율 (근사치)
    return (rDiff * rDiff * 0.3) + (gDiff * gDiff * 0.59) + (bDiff * bDiff * 0.11);
}

// K-means++ 초기화: 뚜렷한 색상(거리가 먼 색상)을 우선적으로 중심점으로 선택
function initKMeansPlusPlus(pixels, k) {
    const centers = [];
    if (pixels.length === 0) return centers;
    
    // 1. 첫 번째 중심점은 무작위 선택
    const firstIdx = Math.floor(Math.random() * pixels.length);
    centers.push([...pixels[firstIdx]]);
    
    // 2. 나머지 중심점들은 거리에 비례한 확률로 선택
    for (let i = 1; i < k; i++) {
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
            distances[j] = minDistSq;
            sumDistances += minDistSq;
        }
        
        if (sumDistances === 0) break;
        
        // 룰렛 휠 선택 (거리가 멀수록 뽑힐 확률이 높음)
        let target = Math.random() * sumDistances;
        for (let j = 0; j < pixels.length; j++) {
            target -= distances[j];
            if (target <= 0) {
                // 중복 방지 로직 간단히 추가
                const isDuplicate = centers.some(c => c[0]===pixels[j][0] && c[1]===pixels[j][1] && c[2]===pixels[j][2]);
                if (!isDuplicate) {
                    centers.push([...pixels[j]]);
                } else {
                    i--; // 다시 뽑기
                }
                break;
            }
        }
    }
    return centers;
}

export function kMeans(pixels, k, maxIter = 15) {
    // 서브샘플링으로 속도 향상 (너무 많은 픽셀은 샘플링)
    const maxPixels = 10000; 
    let samplePixels = pixels;
    if (pixels.length > maxPixels) {
        samplePixels = [];
        const step = Math.ceil(pixels.length / maxPixels);
        for(let i=0; i<pixels.length; i+=step) {
            samplePixels.push(pixels[i]);
        }
    }

    // K-means++로 초기 중심점 잡기 (눈에 띄는 색상 보존율 상승)
    const centers = initKMeansPlusPlus(samplePixels, k);
    
    if (centers.length === 0) return { palette: [[0,0,0]], assignments: new Array(pixels.length).fill(0) };

    let assignments = new Array(pixels.length).fill(0);
    
    for (let iter = 0; iter < maxIter; iter++) {
        let changed = false;
        
        for (let i = 0; i < pixels.length; i++) {
            let minDist = Infinity;
            let closestCenterIdx = 0;
            
            for (let c = 0; c < centers.length; c++) {
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
            if (sums[c][3] > 0) {
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