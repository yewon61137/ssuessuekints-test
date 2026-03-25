// projects.js — 프로젝트 기반 단수 카운터 관리
// localStorage 사용 금지: 모든 데이터는 Firestore에만 저장

import { auth, db, initAuth, openAuthModal } from './auth.js';
import { t, initLang, applyLang } from './i18n.js';
import {
    collection, doc, addDoc, updateDoc, deleteDoc,
    getDocs, onSnapshot, serverTimestamp, query, orderBy
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
    getStorage, ref as storageRef, uploadBytesResumable,
    getDownloadURL, deleteObject
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

const storage = getStorage();

// ── 상태 ──────────────────────────────────────────────────────────────────────
let currentUser = null;
let currentProjectId = null;
let currentPartId = null;
let currentLang = localStorage.getItem('ssuessue_lang') || 'ko';
let projectsUnsubscribe = null;
let projectUnsubscribe = null;
let partsUnsubscribe = null;
let photosUnsubscribe = null;

// 단수 카운터 디바운스 타이머
let counterDebounceTimer = null;

// 카운터 런타임 상태 (Firestore 반영 전 임시)
let activeCounter = {
    mode: 'normal',
    count: 0,
    currentRepeat: 1,
    currentStep: 0,
    repeatUnit: 1,
};

// 타이머 런타임 상태
let timerInterval = null;
let timerSeconds = 0; // 이번 세션 소요 시간(초)
let baseSeconds = 0;  // 이전까지의 총 누적 시간(초)

// ── 유틸 ──────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const tr = () => t[currentLang] || t.ko;

function esc(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatTime(totalSeconds) {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [hrs, mins, secs].map(v => String(v).padStart(2, '0')).join(':');
}

function showView(viewId) {
    ['view-list', 'view-detail', 'view-part'].forEach(id => {
        const el = $(id);
        if (el) el.style.display = id === viewId ? '' : 'none';
    });
}

function getProjectStatus(parts) {
    if (!parts || parts.length === 0) return 'pending';
    if (parts.every(p => p.status === 'done')) return 'done';
    if (parts.some(p => p.status === 'inProgress')) return 'inProgress';
    return 'pending';
}

function getProgressLabel(parts) {
    if (!parts || parts.length === 0) return '';
    const done = parts.filter(p => p.status === 'done').length;
    return `${done} / ${parts.length}`;
}

// ── 화면 렌더: 프로젝트 목록 ──────────────────────────────────────────────────
function renderProjectList(projects) {
    const container = $('projects-container');
    if (!container) return;
    const T = tr();

    if (projects.length === 0) {
        container.innerHTML = `<p class="proj-empty-msg">${esc(T.proj_empty)}</p>`;
        return;
    }

    // 정렬: 진행중 → 시작전 → 완성
    const order = { inProgress: 0, pending: 1, done: 2 };
    const sorted = [...projects].sort((a, b) => {
        const ao = order[a._status] ?? 1;
        const bo = order[b._status] ?? 1;
        if (ao !== bo) return ao - bo;
        // 같은 그룹 내: 최신 먼저
        return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
    });

    container.innerHTML = sorted.map(proj => {
        const statusLabel = proj._status === 'done' ? T.proj_done
            : proj._status === 'inProgress' ? T.proj_in_progress
            : T.proj_pending;
        const statusClass = proj._status === 'done' ? 'status-done'
            : proj._status === 'inProgress' ? 'status-in-progress'
            : 'status-pending';
        const progressText = getProgressLabel(proj._parts || []);
        const totalParts = (proj._parts || []).length;
        const doneParts = (proj._parts || []).filter(p => p.status === 'done').length;
        const pct = totalParts > 0 ? Math.round(doneParts / totalParts * 100) : 0;

        return `
        <div class="proj-card" data-id="${esc(proj.id)}">
          <div class="proj-card-header">
            <span class="proj-status-badge ${statusClass}">${esc(statusLabel)}</span>
            <h3 class="proj-card-title">${esc(proj.title || '제목 없음')}</h3>
          </div>
          ${proj.yarn ? `<div class="proj-card-meta">🧶 ${esc(proj.yarn)}</div>` : ''}
          ${proj.needle ? `<div class="proj-card-meta">🪡 ${esc(proj.needle)}</div>` : ''}
          ${totalParts > 0 ? `
          <div class="proj-progress-wrap">
            <div class="proj-progress-track">
              <div class="proj-progress-fill" style="width:${pct}%"></div>
            </div>
            <div class="proj-progress-label">${esc(T.proj_progress_label)}: ${progressText} (${pct}%)</div>
          </div>` : ''}
        </div>`;
    }).join('');

    // 클릭 → 상세 화면
    container.querySelectorAll('.proj-card').forEach(card => {
        card.addEventListener('click', () => {
            openProjectDetail(card.dataset.id);
        });
    });
}

// ── 화면 렌더: 프로젝트 상세 ──────────────────────────────────────────────────
function renderProjectDetail(project, parts) {
    subscribePhotos(project.id);
    const T = tr();
    const titleEl = $('detail-title');
    if (titleEl) titleEl.textContent = project.title || '';

    const infoEl = $('detail-info');
    if (infoEl) {
        infoEl.innerHTML = [
            project.yarn   ? `<span>🧶 ${esc(project.yarn)}</span>` : '',
            project.needle ? `<span>🪡 ${esc(project.needle)}</span>` : '',
            project.startDate  ? `<span>📅 ${esc(project.startDate)}</span>` : '',
            project.targetDate ? `<span>🎯 ${esc(project.targetDate)}</span>` : '',
        ].join('');
    }

    // PDF 버튼 업데이트
    const pdfSection = $('pdf-section');
    const T2 = tr();
    if (pdfSection) {
        if (project.patternPdfURL) {
            pdfSection.innerHTML = `
              <button class="part-action-btn btn-primary" id="btn-view-pdf">${esc(T2.pdf_view)}</button>
              <button class="part-action-btn btn-secondary" id="btn-replace-pdf">${esc(T2.pdf_replace)}</button>
              <button class="part-action-btn btn-danger"    id="btn-delete-pdf">${esc(T2.pdf_delete)}</button>`;
            $('btn-view-pdf')?.addEventListener('click', () => openPdfViewer(project.patternPdfURL));
            $('btn-replace-pdf')?.addEventListener('click', () => $('pdf-file-input')?.click());
            $('btn-delete-pdf')?.addEventListener('click', () => deletePdf(project));
        } else {
            pdfSection.innerHTML = `
              <button class="part-action-btn btn-secondary" id="btn-upload-pdf">${esc(T2.pdf_upload)}</button>`;
            $('btn-upload-pdf')?.addEventListener('click', () => $('pdf-file-input')?.click());
        }
    }

    const container = $('parts-container');
    if (!container) return;

    if (parts.length === 0) {
        container.innerHTML = `<p class="proj-empty-msg">${esc(T.part_empty)}</p>`;
        return;
    }

    const statusLabel = status => ({
        pending: T.part_status_pending,
        inProgress: T.part_status_in_progress,
        done: T.part_status_done,
    }[status] || T.part_status_pending);

    container.innerHTML = parts.map(part => {
        const pct = part.targetRows > 0 ? Math.min(100, Math.round(part.currentRows / part.targetRows * 100)) : 0;
        return `
        <div class="part-item ${part.status}" data-id="${esc(part.id)}">
          <div class="part-item-left">
            <span class="part-status-label">${esc(statusLabel(part.status))}</span>
            <span class="part-name">${esc(part.title || '파트')}</span>
            ${part.targetRows > 0 ? `<span class="part-rows-info">${part.currentRows || 0} / ${part.targetRows}단 (${pct}%)</span>` : ''}
          </div>
          <div class="part-item-right">
            ${part.status !== 'done' ? `<button class="part-open-btn" data-id="${esc(part.id)}" title="${esc(T.part_open_counter)}">▶</button>` : ''}
          </div>
        </div>`;
    }).join('');

    // 파트 클릭 → 파트 상세
    container.querySelectorAll('.part-open-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const partId = btn.dataset.id;
            const part = parts.find(p => p.id === partId);
            if (part) openPartDetail(part);
        });
    });

    // 파트 아이템 자체 클릭
    container.querySelectorAll('.part-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.part-open-btn')) return;
            const part = parts.find(p => p.id === item.dataset.id);
            if (part) openPartDetail(part);
        });
    });
}

// ── 화면 렌더: 파트 상세 (카운터) ─────────────────────────────────────────────
function renderPartDetail(part) {
    const T = tr();

    const titleEl = $('part-detail-title');
    if (titleEl) titleEl.textContent = part.title || '';

    // 카운터 상태 초기화
    activeCounter = {
        mode: part.mode || 'normal',
        count: part.currentRows || 0,
        currentRepeat: part.currentRepeat || 1,
        currentStep: part.currentStep || (part.mode === 'repeat' ? 1 : 0),
        repeatUnit: part.repeatUnit || 1,
        targetRows: part.targetRows || 0,
        alarmRow: part.alarmRow || 0,
    };

    updateCounterDisplay(part.id);

    // 타이머 초기화
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    timerSeconds = 0;
    baseSeconds = part.totalSeconds || 0;
    currentPartId = part.id;
    updateTimerDisplay();
    $('btn-timer-start').style.display = '';
    $('btn-timer-pause').style.display = 'none';

    // 타이머 버튼 리스너 (기존 리스너 제거 위해 클론 교체 권장되나 여기서는 단순 등록)
    // 실제로는 init 시점에 한 번만 등록하는 것이 좋음. 이벤트 버블링이나 전역 등록 고려.

    // 완료 버튼 상태
    const doneBtn = $('btn-mark-done');
    const progressBtn = $('btn-mark-in-progress');
    if (doneBtn) doneBtn.style.display = part.status === 'done' ? 'none' : '';
    if (progressBtn) progressBtn.style.display = part.status !== 'inProgress' ? '' : 'none';

    // 목표 단수, 알림 단 입력
    const targetInput = $('part-target-rows');
    const alarmInput = $('part-alarm-row');
    const memoInput = $('part-memo');
    const modeNormal = $('mode-normal');
    const modeRepeat = $('mode-repeat');
    const repeatUnitInput = $('part-repeat-unit');
    const repeatUnitRow = $('repeat-unit-row');

    if (targetInput) targetInput.value = part.targetRows || '';
    if (alarmInput)  alarmInput.value  = part.alarmRow || '';
    if (memoInput)   memoInput.value   = part.memo || '';
    if (modeNormal)  modeNormal.classList.toggle('active', activeCounter.mode === 'normal');
    if (modeRepeat)  modeRepeat.classList.toggle('active', activeCounter.mode === 'repeat');
    if (repeatUnitInput) repeatUnitInput.value = activeCounter.repeatUnit;
    if (repeatUnitRow) repeatUnitRow.style.display = activeCounter.mode === 'repeat' ? '' : 'none';

    // 카운터 화면 도안 보기 버튼 설정
    const pdfBtn = $('btn-view-pdf-part');
    if (pdfBtn) {
        pdfBtn.style.display = 'none'; // 기본 숨김
        // 프로젝트 데이터에서 PDF URL 확인
        getDocs(query(collection(db, 'users', currentUser.uid, 'projects'))).then(snap => {
            const proj = snap.docs.find(d => d.id === currentProjectId)?.data();
            if (proj && proj.patternPdfURL) {
                pdfBtn.style.display = '';
                // 기존 리스너 제거 위해 클론 후 교체 (심플한 방법)
                const newBtn = pdfBtn.cloneNode(true);
                pdfBtn.parentNode.replaceChild(newBtn, pdfBtn);
                newBtn.addEventListener('click', () => openPdfViewer(proj.patternPdfURL));
            }
        });
    }
}

// ── 타이머 로직 ──────────────────────────────────────────────────────────────
function updateTimerDisplay() {
    const display = $('timer-display');
    const accum   = $('accumulated-time');
    if (display) display.textContent = formatTime(timerSeconds);
    if (accum)   accum.textContent   = formatTime(baseSeconds + timerSeconds);
}

function startTimer() {
    if (timerInterval) return;
    $('btn-timer-start').style.display = 'none';
    $('btn-timer-pause').style.display = '';
    
    timerInterval = setInterval(() => {
        timerSeconds++;
        updateTimerDisplay();
    }, 1000);
}

function pauseTimer() {
    if (!timerInterval) return;
    clearInterval(timerInterval);
    timerInterval = null;
    $('btn-timer-start').style.display = '';
    $('btn-timer-pause').style.display = 'none';
    
    saveTimer();
}

async function saveTimer() {
    if (!currentUser || !currentProjectId || !currentPartId) return;
    if (timerSeconds === 0) return;
    
    const total = baseSeconds + timerSeconds;
    try {
        await updateDoc(
            doc(db, 'users', currentUser.uid, 'projects', currentProjectId, 'parts', currentPartId),
            { totalSeconds: total }
        );
        baseSeconds = total;
        timerSeconds = 0;
        updateTimerDisplay();
    } catch (e) { console.error('Timer save error:', e); }
}

function updateCounterDisplay(partId) {
    const T = tr();
    const c = activeCounter;
    const mainCount = $('counter-main-count');
    const subCount  = $('counter-sub-count');
    const progressWrap = $('counter-progress-wrap');
    const progressFill = $('counter-progress-fill');
    const progressLabel = $('counter-progress-label');

    if (!mainCount) return;

    if (c.mode === 'repeat') {
        mainCount.textContent = c.currentStep;
        if (subCount) {
            subCount.textContent = `${T.label_repeat_count}: ${c.currentRepeat}`;
            subCount.style.display = '';
        }
    } else {
        mainCount.textContent = c.count;
        if (subCount) subCount.style.display = 'none';
    }

    if (progressWrap) {
        if (c.targetRows > 0) {
            const pct = Math.min(100, Math.round(c.count / c.targetRows * 100));
            progressWrap.style.display = '';
            if (progressFill) progressFill.style.width = pct + '%';
            if (progressLabel) progressLabel.textContent = `${c.count} / ${c.targetRows} (${pct}%)`;
        } else {
            progressWrap.style.display = 'none';
        }
    }

    // 목표 단수에 따른 "파트 완료" 버튼 활성화
    const doneBtn = $('btn-mark-done');
    if (doneBtn && doneBtn.style.display !== 'none') {
        if (c.targetRows > 0) {
            const reached = c.count >= c.targetRows;
            doneBtn.disabled = !reached;
            doneBtn.style.opacity = reached ? '' : '0.5';
            doneBtn.title = reached ? '' : `목표 ${c.targetRows}단에 도달하면 활성화됩니다`;
        } else {
            doneBtn.disabled = false;
            doneBtn.style.opacity = '';
            doneBtn.title = '';
        }
    }
}

// ── 네비게이션 ────────────────────────────────────────────────────────────────
async function openProjectDetail(projectId) {
    currentProjectId = projectId;
    showView('view-detail');

    if (projectUnsubscribe) projectUnsubscribe();
    if (partsUnsubscribe) partsUnsubscribe();

    // 프로젝트 문서 실시간 리스너
    projectUnsubscribe = onSnapshot(doc(db, 'users', currentUser.uid, 'projects', projectId), docSnap => {
        if (!docSnap.exists()) return;
        const project = { id: docSnap.id, ...docSnap.data() };
        
        // 파트 목록 실시간 리스너 (한 번만 설정)
        const partsRef = collection(db, 'users', currentUser.uid, 'projects', projectId, 'parts');
        const partsQuery = query(partsRef, orderBy('createdAt', 'asc'));
        
        if (partsUnsubscribe) partsUnsubscribe();
        partsUnsubscribe = onSnapshot(partsQuery, partsSnap => {
            const parts = partsSnap.docs.map(pd => ({ id: pd.id, ...pd.data() }));
            renderProjectDetail(project, parts);
        });
    });
}

function openPartDetail(part) {
    currentPartId = part.id;
    showView('view-part');
    renderPartDetail(part);
}

// ── Firestore CRUD ─────────────────────────────────────────────────────────────

async function saveProject(data, projectId = null) {
    const ref = collection(db, 'users', currentUser.uid, 'projects');
    if (projectId) {
        await updateDoc(doc(db, 'users', currentUser.uid, 'projects', projectId), data);
        return projectId;
    } else {
        const docRef = await addDoc(ref, { ...data, createdAt: serverTimestamp() });
        return docRef.id;
    }
}

async function deleteProject(projectId) {
    // Storage PDF 먼저 삭제 시도
    try {
        const pdfRef = storageRef(storage, `users/${currentUser.uid}/projects/${projectId}/pattern.pdf`);
        await deleteObject(pdfRef);
    } catch { /* 파일 없으면 무시 */ }
    // 파트 먼저 삭제
    const partsRef = collection(db, 'users', currentUser.uid, 'projects', projectId, 'parts');
    const partsSnap = await getDocs(partsRef);
    await Promise.all(partsSnap.docs.map(d => deleteDoc(d.ref)));
    await deleteDoc(doc(db, 'users', currentUser.uid, 'projects', projectId));
}

async function savePart(data, partId = null) {
    const partsRef = collection(db, 'users', currentUser.uid, 'projects', currentProjectId, 'parts');
    if (partId) {
        await updateDoc(doc(db, 'users', currentUser.uid, 'projects', currentProjectId, 'parts', partId), data);
    } else {
        await addDoc(partsRef, { ...data, currentRows: 0, currentRepeat: 1, currentStep: 0, mode: 'normal', status: 'pending', createdAt: serverTimestamp() });
    }
}

async function deletePart(partId) {
    await deleteDoc(doc(db, 'users', currentUser.uid, 'projects', currentProjectId, 'parts', partId));
}

// 카운터 +/- 디바운스 저장
function scheduleCounterSave(partId) {
    clearTimeout(counterDebounceTimer);
    counterDebounceTimer = setTimeout(async () => {
        if (!currentUser || !currentProjectId || !partId) return;
        try {
            await updateDoc(
                doc(db, 'users', currentUser.uid, 'projects', currentProjectId, 'parts', partId),
                {
                    currentRows: activeCounter.count,
                    currentRepeat: activeCounter.currentRepeat,
                    currentStep: activeCounter.currentStep,
                    mode: activeCounter.mode,
                    repeatUnit: activeCounter.repeatUnit,
                    status: activeCounter.count > 0 ? 'inProgress' : 'pending',
                }
            );
        } catch (e) { console.error('Counter sync error:', e); }
    }, 1000);
}

// ── PDF 업로드 / 삭제 ─────────────────────────────────────────────────────────
async function uploadPdf(file, project) {
    const T = tr();
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        alert(T.pdf_error_type); return;
    }
    if (file.size > 20 * 1024 * 1024) {
        alert(T.pdf_error_size); return;
    }
    const path = `users/${currentUser.uid}/projects/${currentProjectId}/pattern.pdf`;
    const fileRef = storageRef(storage, path);
    const pdfSection = $('pdf-section');
    if (pdfSection) pdfSection.innerHTML = `<span style="font-size:0.82rem;color:#888;">${esc(T.pdf_uploading)} 0%</span>`;

    const task = uploadBytesResumable(fileRef, file, { contentType: 'application/pdf' });
    task.on('state_changed',
        snapshot => {
            const pct = Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100);
            if (pdfSection) pdfSection.innerHTML = `<span style="font-size:0.82rem;color:#888;">${esc(T.pdf_uploading)} ${pct}%</span>`;
        },
        err => alert('업로드 오류: ' + err.message),
        async () => {
            const url = await getDownloadURL(fileRef);
            await updateDoc(
                doc(db, 'users', currentUser.uid, 'projects', currentProjectId),
                { patternPdfURL: url, patternPdfPath: path }
            );
            project.patternPdfURL = url;
            project.patternPdfPath = path;
            const partsSnap = await getDocs(
                query(collection(db, 'users', currentUser.uid, 'projects', currentProjectId, 'parts'), orderBy('createdAt', 'asc'))
            );
            renderProjectDetail(project, partsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
    );
}

async function deletePdf(project) {
    if (!confirm(tr().pdf_delete_confirm)) return;
    try {
        const path = project.patternPdfPath || `users/${currentUser.uid}/projects/${currentProjectId}/pattern.pdf`;
        await deleteObject(storageRef(storage, path));
        await updateDoc(
            doc(db, 'users', currentUser.uid, 'projects', currentProjectId),
            { patternPdfURL: null, patternPdfPath: null }
        );
        project.patternPdfURL = null;
        project.patternPdfPath = null;
        const partsSnap = await getDocs(
            query(collection(db, 'users', currentUser.uid, 'projects', currentProjectId, 'parts'), orderBy('createdAt', 'asc'))
        );
        renderProjectDetail(project, partsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { alert('삭제 실패: ' + e.message); }
}

function openPdfViewer(url) {
    const modal = $('pdf-viewer-modal');
    const iframe = $('pdf-iframe');
    if (modal && iframe) {
        iframe.src = url;
        modal.style.display = 'flex';
        // Open floating row counter and navigate to this project
        if (currentProjectId) {
            window.dispatchEvent(new CustomEvent('rc-open-project', {
                detail: { projectId: currentProjectId }
            }));
        }
    }
}

// ── 진행 사진 로드 ────────────────────────────────────────────────────────────
function subscribePhotos(projectId) {
    if (photosUnsubscribe) { photosUnsubscribe(); photosUnsubscribe = null; }
    const ref = query(
        collection(db, 'users', currentUser.uid, 'projects', projectId, 'photos'),
        orderBy('timestamp', 'desc')
    );
    photosUnsubscribe = onSnapshot(ref, snap => {
        const photos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderProgressPhotos(photos);
    });
}

function renderProgressPhotos(photos) {
    const grid = $('photos-grid');
    if (!grid) return;
    const T = tr();

    grid.innerHTML = photos.map(photo => `
        <div class="photo-item" data-id="${esc(photo.id)}">
            <img src="${photo.url}" alt="Progress Photo" loading="lazy">
            <button class="photo-delete-btn" data-id="${esc(photo.id)}" data-path="${esc(photo.path)}">✕</button>
        </div>
    `).join('');

    grid.querySelectorAll('.photo-delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm(T.photo_delete_confirm)) return;
            await deleteProgressPhoto(btn.dataset.id, btn.dataset.path);
        });
    });
}

async function uploadProgressPhoto(file) {
    const T = tr();
    if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.'); return;
    }
    const filename = `${Date.now()}_${file.name}`;
    const path = `users/${currentUser.uid}/projects/${currentProjectId}/photos/${filename}`;
    const fileRef = storageRef(storage, path);
    const grid = $('photos-grid');
    
    // 임시 업로드 중 표시
    const loader = document.createElement('div');
    loader.className = 'photo-item photo-upload-label';
    loader.innerHTML = `<span>${esc(T.photo_uploading)}</span>`;
    grid?.prepend(loader);

    try {
        const snap = await uploadBytesResumable(fileRef, file);
        const url = await getDownloadURL(snap.ref);
        await addDoc(collection(db, 'users', currentUser.uid, 'projects', currentProjectId, 'photos'), {
            url, path, timestamp: serverTimestamp()
        });
    } catch (e) {
        alert('사진 업로드 실패: ' + e.message);
    }
}

async function deleteProgressPhoto(id, path) {
    try {
        await deleteObject(storageRef(storage, path));
        await deleteDoc(doc(db, 'users', currentUser.uid, 'projects', currentProjectId, 'photos', id));
    } catch (e) {
        alert('사진 삭제 실패: ' + e.message);
    }
}

// ── 모달 헬퍼 ─────────────────────────────────────────────────────────────────
function openModal(modalId) { const m = $(modalId); if (m) m.style.display = 'flex'; }
function closeModal(modalId) { const m = $(modalId); if (m) m.style.display = 'none'; }

// ── 이벤트 연결 ───────────────────────────────────────────────────────────────
function attachEvents() {
    const T = tr();

    // ── PDF 뷰어 닫기 ──
    $('pdf-close-btn')?.addEventListener('click', () => {
        const modal  = $('pdf-viewer-modal');
        const iframe = $('pdf-iframe');
        if (modal)  modal.style.display = 'none';
        if (iframe) iframe.src = '';
    });

    // ── 목록 화면 ──
    $('btn-new-project')?.addEventListener('click', () => {
        $('project-form')?.reset();
        $('project-form-id').value = '';
        openModal('project-modal');
    });

    // ── 프로젝트 모달 저장 ──
    $('project-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        const data = {
            title:      $('input-proj-title')?.value.trim() || '',
            yarn:       $('input-proj-yarn')?.value.trim() || '',
            needle:     $('input-proj-needle')?.value.trim() || '',
            startDate:  $('input-start-date')?.value || '',
            targetDate: $('input-target-date')?.value || '',
        };
        const editId = $('project-form-id')?.value || null;
        const pdfFile = $('input-proj-pdf')?.files?.[0];

        try {
            const savedId = await saveProject(data, editId || null);
            
            // PDF 파일이 있으면 업로드
            if (pdfFile) {
                currentProjectId = savedId; // 업로드용 상태 동기화
                const project = { id: savedId, ...data };
                await uploadPdf(pdfFile, project);
            }
            
            closeModal('project-modal');
            $('input-proj-pdf').value = ''; // 초기화
        } catch (e) { alert('저장 실패: ' + e.message); }
    });
    $('btn-proj-modal-cancel')?.addEventListener('click', () => closeModal('project-modal'));

    // ── 타이머 컨트롤 ──
    $('btn-timer-start')?.addEventListener('click', startTimer);
    $('btn-timer-pause')?.addEventListener('click', pauseTimer);

    // ── 상세 화면 ──
    $('btn-back-to-list')?.addEventListener('click', () => {
        pauseTimer();
        if (photosUnsubscribe) { photosUnsubscribe(); photosUnsubscribe = null; }
        if (projectUnsubscribe) { projectUnsubscribe(); projectUnsubscribe = null; }
        if (partsUnsubscribe) { partsUnsubscribe(); partsUnsubscribe = null; }
        currentProjectId = null;
        showView('view-list');
    });

    $('btn-edit-project')?.addEventListener('click', async () => {
        if (!currentProjectId) return;
        const snap = await getDocs(collection(db, 'users', currentUser.uid, 'projects'));
        const proj = snap.docs.find(d => d.id === currentProjectId)?.data();
        if (!proj) return;
        $('input-proj-title').value = proj.title || '';
        $('input-proj-yarn').value = proj.yarn || '';
        $('input-proj-needle').value = proj.needle || '';
        $('input-start-date').value = proj.startDate || '';
        $('input-target-date').value = proj.targetDate || '';
        $('project-form-id').value = currentProjectId;
        openModal('project-modal');
    });

    $('btn-delete-project')?.addEventListener('click', async () => {
        if (!currentProjectId) return;
        if (!confirm(tr().proj_delete_confirm)) return;
        try {
            await deleteProject(currentProjectId);
            if (partsUnsubscribe) { partsUnsubscribe(); partsUnsubscribe = null; }
            currentProjectId = null;
            showView('view-list');
        } catch (e) { alert('삭제 실패: ' + e.message); }
    });

    $('btn-new-part')?.addEventListener('click', () => {
        $('part-form')?.reset();
        $('part-form-id').value = '';
        openModal('part-modal');
    });

    // ── 파트 모달 저장 ──
    $('part-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        const data = {
            title:      $('input-part-title')?.value.trim() || '',
            targetRows: parseInt($('input-part-target-rows')?.value) || 0,
            alarmRow:   parseInt($('input-part-alarm-row')?.value) || 0,
            memo:       $('input-part-memo')?.value.trim() || '',
        };
        const editId = $('part-form-id')?.value || null;
        try {
            await savePart(data, editId || null);
            closeModal('part-modal');
        } catch (e) { alert('저장 실패: ' + e.message); }
    });
    $('btn-part-modal-cancel')?.addEventListener('click', () => closeModal('part-modal'));

    // ── 파트 상세 화면 ──
    $('btn-back-to-detail')?.addEventListener('click', () => {
        pauseTimer();
        currentPartId = null;
        showView('view-detail');
    });

    // 카운터 +/-
    $('btn-count-plus')?.addEventListener('click', () => {
        if (!currentPartId) return;
        const c = activeCounter;
        if (c.mode === 'repeat') {
            if (c.currentStep < c.repeatUnit) {
                c.currentStep++;
            } else {
                c.currentStep = 1;
                c.currentRepeat++;
            }
            c.count = (c.currentRepeat - 1) * c.repeatUnit + c.currentStep;
        } else {
            c.count++;
        }
        // 알림 체크
        if (c.alarmRow > 0 && c.count === c.alarmRow) flashAlert('alert-row');
        if (c.targetRows > 0 && c.count === c.targetRows) flashAlert('alert-goal');
        updateCounterDisplay(currentPartId);
        scheduleCounterSave(currentPartId);
    });

    $('btn-count-minus')?.addEventListener('click', () => {
        if (!currentPartId) return;
        const c = activeCounter;
        if (c.mode === 'repeat') {
            if (c.currentStep > 1) c.currentStep--;
            else if (c.currentRepeat > 1) { c.currentRepeat--; c.currentStep = c.repeatUnit; }
            c.count = (c.currentRepeat - 1) * c.repeatUnit + c.currentStep;
        } else {
            c.count = Math.max(0, c.count - 1);
        }
        updateCounterDisplay(currentPartId);
        scheduleCounterSave(currentPartId);
    });

    $('btn-count-reset')?.addEventListener('click', () => {
        if (!currentPartId) return;
        if (!confirm('단수를 0으로 초기화하시겠습니까?')) return;
        activeCounter.count = 0;
        activeCounter.currentRepeat = 1;
        activeCounter.currentStep = activeCounter.mode === 'repeat' ? 1 : 0;
        updateCounterDisplay(currentPartId);
        scheduleCounterSave(currentPartId);
    });

    // 모드 토글
    $('mode-normal')?.addEventListener('click', () => {
        activeCounter.mode = 'normal';
        $('mode-normal')?.classList.add('active');
        $('mode-repeat')?.classList.remove('active');
        const rrow = $('repeat-unit-row');
        if (rrow) rrow.style.display = 'none';
        scheduleCounterSave(currentPartId);
    });

    $('mode-repeat')?.addEventListener('click', () => {
        activeCounter.mode = 'repeat';
        if (activeCounter.currentStep === 0) activeCounter.currentStep = 1;
        $('mode-repeat')?.classList.add('active');
        $('mode-normal')?.classList.remove('active');
        const rrow = $('repeat-unit-row');
        if (rrow) rrow.style.display = '';
        scheduleCounterSave(currentPartId);
    });

    $('part-repeat-unit')?.addEventListener('change', e => {
        activeCounter.repeatUnit = Math.max(1, parseInt(e.target.value) || 1);
        if (activeCounter.currentStep > activeCounter.repeatUnit) activeCounter.currentStep = activeCounter.repeatUnit;
        scheduleCounterSave(currentPartId);
    });

    // 파트 설정 변경 (목표단, 알림단, 메모)
    const savePartSettings = async () => {
        if (!currentPartId || !currentProjectId || !currentUser) return;
        try {
            await updateDoc(
                doc(db, 'users', currentUser.uid, 'projects', currentProjectId, 'parts', currentPartId),
                {
                    targetRows: parseInt($('part-target-rows')?.value) || 0,
                    alarmRow:   parseInt($('part-alarm-row')?.value) || 0,
                    memo:       $('part-memo')?.value || '',
                }
            );
            activeCounter.targetRows = parseInt($('part-target-rows')?.value) || 0;
            activeCounter.alarmRow   = parseInt($('part-alarm-row')?.value) || 0;
            updateCounterDisplay(currentPartId);
        } catch (e) { console.error('Part settings save error:', e); }
    };
    $('part-target-rows')?.addEventListener('change', savePartSettings);
    $('part-alarm-row')?.addEventListener('change', savePartSettings);
    $('part-memo')?.addEventListener('change', async e => {
        if (!currentPartId || !currentProjectId || !currentUser) return;
        try {
            await updateDoc(
                doc(db, 'users', currentUser.uid, 'projects', currentProjectId, 'parts', currentPartId),
                { memo: e.target.value }
            );
        } catch (err) { console.error('Memo save error:', err); }
    });

    // 파트 완료 / 진행중 변경
    $('btn-mark-done')?.addEventListener('click', async () => {
        if (!currentPartId) return;
        try {
            await updateDoc(
                doc(db, 'users', currentUser.uid, 'projects', currentProjectId, 'parts', currentPartId),
                { status: 'done' }
            );
            $('btn-mark-done').style.display = 'none';
            $('btn-mark-in-progress').style.display = '';
        } catch (e) { alert('업데이트 실패: ' + e.message); }
    });

    $('btn-mark-in-progress')?.addEventListener('click', async () => {
        if (!currentPartId) return;
        try {
            await updateDoc(
                doc(db, 'users', currentUser.uid, 'projects', currentProjectId, 'parts', currentPartId),
                { status: 'inProgress' }
            );
            $('btn-mark-in-progress').style.display = 'none';
            $('btn-mark-done').style.display = '';
        } catch (e) { alert('업데이트 실패: ' + e.message); }
    });

    $('btn-delete-part')?.addEventListener('click', async () => {
        if (!currentPartId) return;
        if (!confirm(tr().part_delete_confirm)) return;
        try {
            await deletePart(currentPartId);
            currentPartId = null;
            showView('view-detail');
        } catch (e) { alert('삭제 실패: ' + e.message); }
    });

    $('btn-edit-part')?.addEventListener('click', async () => {
        if (!currentPartId || !currentProjectId) return;
        const snap = await getDocs(collection(db, 'users', currentUser.uid, 'projects', currentProjectId, 'parts'));
        const part = snap.docs.find(d => d.id === currentPartId)?.data();
        if (!part) return;
        $('input-part-title').value = part.title || '';
        $('input-part-target-rows').value = part.targetRows || '';
        $('input-part-alarm-row').value = part.alarmRow || '';
        $('input-part-memo').value = part.memo || '';
        $('part-form-id').value = currentPartId;
        openModal('part-modal');
    });

    // 모달 바깥 클릭 닫기
    ['project-modal', 'part-modal'].forEach(id => {
        $(id)?.addEventListener('click', e => {
            if (e.target === $(id)) closeModal(id);
        });
    });

    // ── PDF 파일 input (숨김) ──
    $('pdf-file-input')?.addEventListener('change', async e => {
        const file = e.target.files?.[0];
        if (!file || !currentProjectId || !currentUser) return;
        // 현재 프로젝트 데이터 가져오기
        const projSnap = await getDocs(collection(db, 'users', currentUser.uid, 'projects'));
        const projDoc  = projSnap.docs.find(d => d.id === currentProjectId);
        const project  = projDoc ? { id: projDoc.id, ...projDoc.data() } : {};
        await uploadPdf(file, project);
        e.target.value = ''; // 같은 파일 재선택 허용
    });

    // ── 진행 사진 파일 input ──
    $('photo-upload-input')?.addEventListener('change', async e => {
        const file = e.target.files?.[0];
        if (!file || !currentProjectId || !currentUser) return;
        await uploadProgressPhoto(file);
        e.target.value = '';
    });
}

function flashAlert(cls) {
    const el = $('counter-card');
    if (!el) return;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 1600);
}

// ── 로그인/비로그인 전환 ──────────────────────────────────────────────────────
function showLoggedIn() {
    $('guest-view')?.style && ($('guest-view').style.display = 'none');
    $('logged-in-view')?.style && ($('logged-in-view').style.display = '');
}

function showGuest() {
    $('guest-view')?.style && ($('guest-view').style.display = '');
    $('logged-in-view')?.style && ($('logged-in-view').style.display = 'none');
    if (projectsUnsubscribe) { projectsUnsubscribe(); projectsUnsubscribe = null; }
}

function loadProjects(uid) {
    if (projectsUnsubscribe) projectsUnsubscribe();
    const ref = collection(db, 'users', uid, 'projects');
    const q = query(ref, orderBy('createdAt', 'desc'));
    projectsUnsubscribe = onSnapshot(q, async snap => {
        // 각 프로젝트의 파트도 가져와서 상태 계산
        const projects = await Promise.all(snap.docs.map(async d => {
            const proj = { id: d.id, ...d.data() };
            try {
                const partsSnap = await getDocs(
                    collection(db, 'users', uid, 'projects', d.id, 'parts')
                );
                proj._parts = partsSnap.docs.map(pd => pd.data());
                proj._status = getProjectStatus(proj._parts);
            } catch { proj._parts = []; proj._status = 'pending'; }
            return proj;
        }));
        renderProjectList(projects);
    });
}

// ── 초기화 ────────────────────────────────────────────────────────────────────
export function init() {
    currentLang = localStorage.getItem('ssuessue_lang') || localStorage.getItem('lang') || 'ko';

    initLang({
        pageTitles: { ko: '내 프로젝트', en: 'My Projects', ja: 'マイプロジェクト' },
    });

    window.addEventListener('langChange', e => {
        currentLang = e.detail.lang;
    });

    const guestLoginBtn = $('guest-login-btn');
    if (guestLoginBtn) {
        guestLoginBtn.addEventListener('click', () => openAuthModal());
    }

    attachEvents();
    initAuth();

    // 탭/창을 닫을 때 타이머 자동 저장
    window.addEventListener('beforeunload', () => {
        saveTimer();
    });

    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            showLoggedIn();
            // URL ?id=projId → 해당 프로젝트 상세 바로 열기
            const urlProjectId = new URLSearchParams(location.search).get('id');
            if (urlProjectId) {
                openProjectDetail(urlProjectId);
            } else {
                showView('view-list');
                loadProjects(user.uid);
            }
        } else {
            currentUser = null;
            showGuest();
        }
    });
}
