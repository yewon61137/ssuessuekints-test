// row-counter.js — 단수 카운터 Web Component (Side Drawer)

import { t } from './i18n.js';
import { db, auth } from './auth.js';
import {
    doc, setDoc, getDoc, updateDoc, collection, getDocs, query, orderBy
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const STORAGE_KEY  = 'ssuessue_row_counters';
const DRAWER_KEY   = 'ssuessue_rc_open';
const TAB_KEY      = 'ssuessue_rc_tab';
const UID_KEY      = 'ssuessue_rc_uid';
const SYNC_DELAY   = 2000;

class RowCounter extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.counters        = this._loadCounters();
        this.isOpen          = localStorage.getItem(DRAWER_KEY) === 'true';
        this.lang            = localStorage.getItem('lang') || 'ko';
        this._syncTimer      = null;

        // Tab state
        this.activeTab       = localStorage.getItem(TAB_KEY) || 'general';
        this.currentUser     = null;
        this.projects        = null;   // null=not loaded, []=empty, [...]= list
        this.projectsLoading = false;
        this.selectedProject = null;   // { id, name }
        this.projCounters    = [];
        this._projSyncTimer  = null;
    }

    connectedCallback() {
        this._applyBodyPush();
        this.render();

        window.addEventListener('langChange', (e) => {
            this.lang = e.detail.lang;
            this.render();
        });

        // Delegated click handler — opens drawer from any trigger element
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.gnb-counter-btn, .mobile-counter-btn, #toolCounterCard, .home-panel-counter-btn');
            if (!btn) return;
            e.preventDefault();
            this.toggleDrawer();
        });

        // Open drawer on project PDF view and auto-select the project
        window.addEventListener('rc-open-project', (e) => {
            const { projectId } = e.detail || {};
            if (!projectId) return;
            if (!this.isOpen) {
                this.isOpen = true;
                localStorage.setItem(DRAWER_KEY, 'true');
            }
            this._switchTab('project');
            if (this.projects) {
                const proj = this.projects.find(p => p.id === projectId);
                if (proj) this._selectProject(proj);
            } else if (this.currentUser) {
                this._pendingProjectId = projectId;
                this._loadProjects();
            }
            this._applyBodyPush();
            this.render();
        });

        try {
            auth.onAuthStateChanged(user => {
                this.currentUser = user;
                if (user) {
                    this._loadFromFirestore(user.uid);
                    if (this.activeTab === 'project' && this.projects === null) {
                        this._loadProjects();
                    }
                } else {
                    localStorage.removeItem(STORAGE_KEY);
                    localStorage.removeItem(UID_KEY);
                    this.counters        = [this._newCounter()];
                    this.projects        = null;
                    this.selectedProject = null;
                    this.projCounters    = [];
                    this.render();
                }
            });
        } catch(e) {}
    }

    disconnectedCallback() {
        document.body.style.marginRight = '';
        document.body.style.transition  = '';
    }

    // ── Active counter accessors ──────────────────────────────────────────────

    get _activeCounters() {
        return (this.activeTab === 'project' && this.selectedProject)
            ? this.projCounters : this.counters;
    }

    _setActiveCounters(arr) {
        if (this.activeTab === 'project' && this.selectedProject) {
            this.projCounters = arr;
        } else {
            this.counters = arr;
        }
    }

    _saveCurrentState() {
        if (this.activeTab === 'project' && this.selectedProject) {
            this._saveProjectCounters();
        } else {
            this._saveState();
        }
    }

    // ── General counter storage ───────────────────────────────────────────────

    _loadCounters() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            const arr   = saved ? JSON.parse(saved) : [this._newCounter()];
            return arr.map(c => ({ ...this._newCounter(), ...c }));
        } catch(e) { return [this._newCounter()]; }
    }

    _newCounter() {
        return {
            id: String(Date.now()), name: '', count: 0,
            mode: 'normal', repeatRows: 1, currentRepeat: 1, currentStep: 0,
            goalRows: 0, alertRow: 0, memo: '', yarn: '', needle: '', showMemo: false,
        };
    }

    _saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.counters));
        this._scheduleFirestoreSync();
    }

    _scheduleFirestoreSync() {
        clearTimeout(this._syncTimer);
        this._syncTimer = setTimeout(() => this._syncToFirestore(), SYNC_DELAY);
    }

    async _syncToFirestore() {
        try {
            const user = auth.currentUser;
            if (!user) return;
            await setDoc(doc(db, 'users', user.uid, 'rowCounters', 'main'),
                { counters: this.counters, updatedAt: Date.now() });
        } catch(e) {}
    }

    async _loadFromFirestore(uid) {
        try {
            const storedUid = localStorage.getItem(UID_KEY);
            if (storedUid && storedUid !== uid) {
                localStorage.removeItem(STORAGE_KEY);
                this.counters = [this._newCounter()];
            }
            localStorage.setItem(UID_KEY, uid);

            const snap = await getDoc(doc(db, 'users', uid, 'rowCounters', 'main'));
            let fsCounters = [];
            if (snap.exists() && Array.isArray(snap.data().counters)) {
                fsCounters = snap.data().counters;
            }

            const local = this.counters || [];
            const trivial = local.length === 1 && local[0].count === 0 &&
                            local[0].name === '' && local[0].goalRows === 0;
            if (fsCounters.length === 0 && trivial) return;

            const map = new Map();
            fsCounters.forEach(c => map.set(c.id, { ...this._newCounter(), ...c }));
            local.forEach(c => {
                const empty = (c.count === 0 && !c.name && c.goalRows === 0);
                if (!empty && !map.has(c.id)) map.set(c.id, c);
            });

            const merged = Array.from(map.values());
            if (merged.length > 0) {
                this.counters = merged;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.counters));
                this.render();
                this._scheduleFirestoreSync();
            }
        } catch(e) { console.error('RowCounter sync error:', e); }
    }

    // ── Project counter storage (reads/writes parts subcollection) ───────────

    _saveProjectCounters() {
        if (!this.selectedProject) return;
        this._scheduleProjectSync();
    }

    _scheduleProjectSync() {
        clearTimeout(this._projSyncTimer);
        this._projSyncTimer = setTimeout(() => this._syncProjectToFirestore(), SYNC_DELAY);
    }

    async _syncProjectToFirestore() {
        if (!this.currentUser || !this.selectedProject) return;
        const uid = this.currentUser.uid;
        const pid = this.selectedProject.id;
        try {
            await Promise.all(this.projCounters.map(c =>
                updateDoc(
                    doc(db, 'users', uid, 'projects', pid, 'parts', c.id),
                    {
                        currentRows:   c.count,
                        currentRepeat: c.currentRepeat,
                        currentStep:   c.currentStep,
                        mode:          c.mode,
                        repeatUnit:    c.repeatRows,
                        targetRows:    c.goalRows,
                        alarmRow:      c.alertRow,
                        memo:          c.memo,
                        status: c.count > 0 ? 'inProgress' : 'pending',
                    }
                )
            ));
        } catch(e) { console.error('_syncProjectToFirestore error:', e); }
    }

    async _loadProjectParts(projectId) {
        if (!this.currentUser) return;
        this.projectsLoading = true;
        this.render();
        try {
            const snap = await getDocs(
                query(
                    collection(db, 'users', this.currentUser.uid, 'projects', projectId, 'parts'),
                    orderBy('createdAt', 'asc')
                )
            );
            this.projCounters = snap.docs
                .filter(d => d.data().status !== 'done')
                .map(d => {
                    const p = d.data();
                    const mode = p.mode || 'normal';
                    return {
                        ...this._newCounter(),
                        id:            d.id,
                        name:          p.title || '',
                        count:         p.currentRows || 0,
                        currentRepeat: p.currentRepeat || 1,
                        currentStep:   p.currentStep || (mode === 'repeat' ? 1 : 0),
                        mode,
                        repeatRows:    p.repeatUnit || 1,
                        goalRows:      p.targetRows || 0,
                        alertRow:      p.alarmRow || 0,
                        memo:          p.memo || '',
                    };
                });
        } catch(e) {
            console.error('_loadProjectParts error:', e);
            this.projCounters = [];
        }
        this.projectsLoading = false;
        this.render();
    }

    // ── Project list ──────────────────────────────────────────────────────────

    async _loadProjects() {
        if (!this.currentUser || this.projectsLoading) return;
        this.projectsLoading = true;
        this.render();
        try {
            const snap = await getDocs(
                query(collection(db, 'users', this.currentUser.uid, 'projects'),
                      orderBy('createdAt', 'desc')));
            this.projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch(e) { this.projects = []; }
        this.projectsLoading = false;
        // Auto-select project if requested via rc-open-project event
        if (this._pendingProjectId) {
            const proj = this.projects.find(p => p.id === this._pendingProjectId);
            this._pendingProjectId = null;
            if (proj) this._selectProject(proj);
        }
        this.render();
    }

    _selectProject(proj) {
        this.selectedProject = proj;
        this.projCounters    = [];
        this._loadProjectParts(proj.id);
    }

    // ── Drawer ────────────────────────────────────────────────────────────────

    _applyBodyPush() {
        const isWide = window.matchMedia('(min-width: 640px)').matches;
        if (isWide) {
            document.body.style.transition = 'margin-right 0.3s cubic-bezier(0.4,0,0.2,1)';
            document.body.style.marginRight = this.isOpen ? '340px' : '';
        } else {
            document.body.style.marginRight = '';
        }
    }

    toggleDrawer() {
        this.isOpen = !this.isOpen;
        localStorage.setItem(DRAWER_KEY, String(this.isOpen));
        if (this.isOpen && this.activeTab === 'project' &&
            this.currentUser && this.projects === null && !this.projectsLoading) {
            this._loadProjects();
        }
        this._applyBodyPush();
        this.render();
    }

    _switchTab(tab) {
        this.activeTab = tab;
        localStorage.setItem(TAB_KEY, tab);
        if (tab === 'project' && this.currentUser &&
            this.projects === null && !this.projectsLoading) {
            this._loadProjects();
        }
        this.render();
    }

    // ── Counter CRUD ──────────────────────────────────────────────────────────

    addCounter() {
        const list = this._activeCounters;
        const c = this._newCounter();
        c.id = String(Date.now() + list.length);
        this._setActiveCounters([...list, c]);
        this._saveCurrentState();
        this.render();
    }

    removeCounter(id) {
        const list = this._activeCounters;
        let updated;
        if (list.length <= 1) {
            updated = [this._newCounter()];
        } else {
            if (!confirm(t[this.lang].delete_confirm)) return;
            updated = list.filter(c => c.id !== id);
        }
        this._setActiveCounters(updated);
        this._saveCurrentState();
        this.render();
    }

    updateCount(id, delta) {
        const list = this._activeCounters;
        const c = list.find(x => x.id === id);
        if (!c) return;

        let alertType = null;
        if (c.mode === 'repeat') {
            if (delta > 0) {
                if (c.currentStep < c.repeatRows) {
                    c.currentStep++;
                } else {
                    c.currentStep = 1; c.currentRepeat++; alertType = 'repeat';
                }
            } else {
                if (c.currentStep > 1) c.currentStep--;
                else if (c.currentRepeat > 1) { c.currentRepeat--; c.currentStep = c.repeatRows; }
            }
            c.count = (c.currentRepeat - 1) * c.repeatRows + c.currentStep;
        } else {
            c.count = Math.max(0, c.count + delta);
        }

        if (c.alertRow > 0 && c.count === c.alertRow) alertType = 'row';
        if (c.goalRows > 0 && c.count === c.goalRows) alertType = 'goal';

        this._saveCurrentState();
        this.render();
        if (alertType) this._triggerAlert(id, alertType);
    }

    resetCount(id) {
        const c = this._activeCounters.find(x => x.id === id);
        if (c) {
            c.count = 0; c.currentRepeat = 1;
            c.currentStep = c.mode === 'repeat' ? 1 : 0;
            this._saveCurrentState();
            this.render();
        }
    }

    toggleMode(id) {
        const c = this._activeCounters.find(x => x.id === id);
        if (c) {
            c.mode = c.mode === 'normal' ? 'repeat' : 'normal';
            if (c.mode === 'repeat' && c.currentStep === 0) c.currentStep = 1;
            this._saveCurrentState();
            this.render();
        }
    }

    toggleMemo(id) {
        const c = this._activeCounters.find(x => x.id === id);
        if (c) { c.showMemo = !c.showMemo; this.render(); }
    }

    _update(id, key, val) {
        const c = this._activeCounters.find(x => x.id === id);
        if (c) { c[key] = val; this._saveCurrentState(); }
    }

    // ── Alerts ────────────────────────────────────────────────────────────────

    _triggerAlert(id, type) {
        const el = this.shadowRoot.querySelector(`.counter-item[data-id="${id}"]`);
        if (!el) return;
        const cls = type === 'repeat' ? 'alert-repeat' : type === 'goal' ? 'alert-goal' : 'alert-row';
        el.classList.add(cls);
        setTimeout(() => el.classList.remove(cls), 1600);
    }

    // ── Render ────────────────────────────────────────────────────────────────

    render() {
        const tr   = t[this.lang] || t.ko;
        const open = this.isOpen;

        this.shadowRoot.innerHTML = `
      <style>
        :host {
          --primary: #000; --bg: #fff; --panel: #f5f5f5;
          --border: rgba(0,0,0,0.1); --text: #111; --shadow: rgba(0,0,0,0.12);
          font-family: 'GmarketSans', sans-serif;
        }
        @media (prefers-color-scheme: dark) {
          :host {
            --primary: #eee; --bg: #1c1c1c; --panel: #2a2a2a;
            --border: rgba(255,255,255,0.1); --text: #ddd; --shadow: rgba(0,0,0,0.5);
          }
        }
        @keyframes alertFlash {
          0%,100% { transform:scale(1); opacity:1; }
          25%,75%  { transform:scale(1.02); opacity:0.65; }
          50%      { transform:scale(1); opacity:1; }
        }
        * { box-sizing: border-box; }

        .fab {
          position:fixed; bottom:24px; right:24px;
          width:54px; height:54px; border-radius:50%;
          background:var(--primary); color:var(--bg);
          border:none; cursor:pointer;
          box-shadow:0 4px 14px var(--shadow);
          display:flex; align-items:center; justify-content:center;
          z-index:9998; transition:transform 0.25s, opacity 0.25s;
        }
        .fab:hover { transform:scale(1.1); }
        .fab.hidden { opacity:0; pointer-events:none; transform:scale(0.8); }
        .fab svg { width:22px; height:22px; }

        .drawer-overlay {
          position:fixed; inset:0;
          background:rgba(0,0,0,0.35); backdrop-filter:blur(2px);
          opacity:${open ? 1 : 0}; visibility:${open ? 'visible' : 'hidden'};
          transition:opacity 0.3s, visibility 0.3s; z-index:10000;
        }
        @media (min-width:640px) { .drawer-overlay { display:none; } }

        .drawer {
          position:fixed; top:0; right:0; width:340px; height:100%;
          background:var(--bg); box-shadow:-6px 0 24px var(--shadow);
          transform:translateX(${open ? '0' : '100%'});
          transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);
          z-index:10001; display:flex; flex-direction:column;
          overscroll-behavior:contain;
        }
        @media (max-width:639px) {
          .drawer {
            width:100%; height:85dvh; top:auto; bottom:0; right:0;
            border-radius:20px 20px 0 0;
            box-shadow:0 -6px 24px var(--shadow);
            transform:translateY(${open ? '0' : '100%'});
          }
        }

        .drawer-header {
          padding:18px 20px; border-bottom:1px solid var(--border);
          display:flex; align-items:center; justify-content:space-between; flex-shrink:0;
        }
        .drawer-header h2 { margin:0; font-size:1.15rem; font-weight:800; color:var(--text); }
        .close-btn {
          background:none; border:none; cursor:pointer; color:var(--text);
          display:flex; padding:6px; border-radius:8px; transition:background 0.2s;
        }
        .close-btn:hover { background:var(--panel); }

        /* Tabs */
        .tabs-nav {
          display:flex; border-bottom:2px solid var(--primary); flex-shrink:0;
        }
        .tab-btn {
          flex:1; padding:10px 0; border:none; background:none; cursor:pointer;
          font-size:0.8rem; font-weight:700; color:var(--text); opacity:0.45;
          font-family:inherit; border-bottom:2px solid transparent; margin-bottom:-2px;
          transition:opacity 0.15s, border-color 0.15s;
        }
        .tab-btn.active { opacity:1; border-bottom-color:var(--primary); }

        .drawer-content {
          flex:1; overflow-y:auto; padding:14px;
          display:flex; flex-direction:column; gap:12px;
        }

        /* Project tab */
        .proj-header {
          display:flex; align-items:center; gap:10px;
          padding:10px 16px; border-bottom:1px solid var(--border); flex-shrink:0;
          background:var(--panel);
        }
        .back-btn {
          background:none; border:none; cursor:pointer; color:var(--primary);
          font-size:0.78rem; font-weight:700; font-family:inherit; padding:4px 0;
          flex-shrink:0;
        }
        .proj-name-label {
          font-size:0.82rem; font-weight:800; color:var(--text);
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .proj-list { gap:8px; }
        .proj-card {
          width:100%; display:flex; align-items:center; justify-content:space-between;
          padding:14px 16px; border-radius:12px; border:1.5px solid var(--border);
          background:var(--panel); cursor:pointer; font-family:inherit;
          transition:border-color 0.15s, background 0.15s;
        }
        .proj-card:hover { border-color:var(--primary); background:var(--bg); }
        .proj-card-name {
          font-size:0.88rem; font-weight:700; color:var(--text);
          text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .proj-card-arrow { font-size:0.85rem; color:var(--primary); flex-shrink:0; }
        .status-msg {
          text-align:center; padding:2rem 1rem; font-size:0.85rem;
          color:var(--text); opacity:0.5; font-weight:600;
          display:flex; flex-direction:column; align-items:center; gap:10px;
        }
        .proj-create-link {
          display:inline-block; font-size:0.8rem; font-weight:700;
          color:var(--primary); opacity:1;
          border:1.5px solid var(--primary); border-radius:8px;
          padding:6px 14px; text-decoration:none;
          transition:background 0.15s, color 0.15s;
        }
        .proj-create-link:hover { background:var(--primary); color:var(--bg); }

        /* Counter items */
        .counter-item {
          background:var(--panel); padding:14px; border-radius:16px;
          display:flex; flex-direction:column; gap:10px;
          box-shadow:0 2px 6px var(--shadow); position:relative; transition:background 0.4s;
        }
        .counter-item.alert-repeat { animation:alertFlash 1.5s ease; background:#fff8e1; }
        .counter-item.alert-row    { animation:alertFlash 1.5s ease; background:#e1f5fe; }
        .counter-item.alert-goal   { animation:alertFlash 1.5s ease; background:#e8f5e9; }
        @media (prefers-color-scheme: dark) {
          .counter-item.alert-repeat { background:#4a3500; }
          .counter-item.alert-row    { background:#003850; }
          .counter-item.alert-goal   { background:#0a3a10; }
        }

        .counter-top { display:flex; align-items:center; gap:8px; }
        .mode-toggle {
          display:flex; background:var(--bg); border-radius:8px; padding:2px;
          border:1.5px solid var(--primary); flex-shrink:0;
        }
        .mode-btn {
          font-size:0.65rem; padding:3px 7px; border-radius:6px;
          border:none; background:none; color:var(--primary);
          cursor:pointer; font-weight:800; font-family:inherit;
        }
        .mode-btn.active { background:var(--primary); color:var(--bg); }
        .counter-name {
          background:transparent; border:none; border-bottom:1.5px solid transparent;
          color:var(--text); font-family:inherit; font-size:0.9rem; font-weight:700;
          flex:1; padding:3px 0; min-width:0; transition:border-color 0.2s;
        }
        .counter-name:focus { outline:none; border-bottom-color:var(--primary); }
        .counter-name.proj-part-name { cursor:default; opacity:0.75; }
        .delete-btn {
          background:none; border:none; color:#e05555; cursor:pointer;
          padding:4px; opacity:0.3; transition:opacity 0.2s; flex-shrink:0;
        }
        .delete-btn:hover { opacity:1; }

        .counter-controls {
          display:flex; align-items:center; justify-content:space-between; gap:6px;
        }
        .count-display-group {
          flex:1; display:flex; flex-direction:column; align-items:center;
        }
        .main-count {
          font-size:3rem; font-weight:900; color:var(--primary);
          line-height:1; letter-spacing:-0.02em;
        }
        .sub-count {
          font-size:0.75rem; font-weight:700; color:var(--primary); opacity:0.6; margin-top:4px;
        }
        .control-btn {
          width:54px; height:54px; border-radius:14px;
          border:2.5px solid var(--primary); background:var(--bg); color:var(--primary);
          cursor:pointer; display:flex; align-items:center; justify-content:center;
          font-size:1.7rem; font-weight:900;
          transition:all 0.15s; user-select:none; -webkit-user-select:none;
        }
        .control-btn:hover  { background:var(--primary); color:var(--bg); }
        .control-btn:active { transform:scale(0.9); }

        .progress-wrap { margin-top:-2px; }
        .progress-track {
          height:6px; background:var(--border); border-radius:3px; overflow:hidden;
        }
        .progress-fill {
          height:100%; border-radius:3px; background:var(--primary); transition:width 0.35s ease;
        }
        .progress-label {
          font-size:0.7rem; color:var(--text); opacity:0.55;
          margin-top:3px; text-align:right; font-weight:700;
        }

        .settings-row {
          padding-top:8px; border-top:1px dashed var(--border);
          display:flex; align-items:center; gap:8px;
          font-size:0.78rem; color:var(--text); flex-wrap:wrap;
        }
        .mini-input {
          width:50px; background:var(--bg); border:1.5px solid var(--primary);
          border-radius:5px; padding:3px 6px; color:var(--text); text-align:center;
          font-family:inherit; font-weight:700; font-size:0.82rem;
        }
        .mini-input:focus { outline:none; }

        .counter-actions { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
        .action-btn {
          font-size:0.7rem; padding:4px 11px; border-radius:7px;
          background:transparent; border:1.5px solid var(--primary);
          color:var(--primary); cursor:pointer; font-weight:700;
          transition:all 0.15s; font-family:inherit;
        }
        .action-btn:hover { background:var(--primary); color:var(--bg); }

        .memo-section {
          padding-top:8px; border-top:1px dashed var(--border);
          display:flex; flex-direction:column; gap:7px;
        }
        .memo-row { display:flex; align-items:center; gap:8px; font-size:0.78rem; }
        .memo-row label { font-weight:700; min-width:3rem; flex-shrink:0; color:var(--text); }
        .memo-field, .memo-textarea {
          flex:1; background:var(--bg); border:1.5px solid var(--border);
          border-radius:7px; padding:5px 8px; color:var(--text);
          font-family:inherit; font-size:0.78rem;
        }
        .memo-field:focus, .memo-textarea:focus { outline:none; border-color:var(--primary); }
        .memo-textarea { resize:vertical; min-height:48px; }

        .drawer-footer {
          padding:16px; border-top:1px solid var(--border); flex-shrink:0;
        }
        .add-btn {
          width:100%; padding:13px; border-radius:14px;
          background:var(--primary); color:var(--bg); border:none;
          cursor:pointer; font-weight:800; font-family:inherit; font-size:0.95rem;
          transition:transform 0.2s, box-shadow 0.2s;
        }
        .add-btn:hover { transform:translateY(-2px); box-shadow:0 4px 12px var(--shadow); }
      </style>

      <button class="fab ${open ? 'hidden' : ''}" id="fabBtn" aria-label="${tr.row_counter_title}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18M3 12h18M3 18h18"/>
          <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
        </svg>
      </button>

      <div class="drawer-overlay" id="overlay"></div>

      <div class="drawer">
        <div class="drawer-header">
          <h2>${tr.row_counter_title}</h2>
          <button class="close-btn" id="closeBtn" aria-label="닫기">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="tabs-nav">
          <button class="tab-btn ${this.activeTab === 'general' ? 'active' : ''}"
                  data-tab="general">${tr.tab_general}</button>
          <button class="tab-btn ${this.activeTab === 'project' ? 'active' : ''}"
                  data-tab="project">${tr.tab_project}</button>
        </div>

        ${this.activeTab === 'general'
            ? this._renderGeneralTab(tr)
            : this._renderProjectTab(tr)}
      </div>
    `;
        this._attachEvents();
    }

    _renderGeneralTab(tr) {
        return `
      <div class="drawer-content">
        ${this.counters.map(c => this._renderCounter(c, tr)).join('')}
      </div>
      <div class="drawer-footer">
        <button class="add-btn" id="addBtn">${tr.add_counter}</button>
      </div>`;
    }

    _renderProjectTab(tr) {
        if (!this.currentUser) {
            return `<div class="drawer-content">
              <div class="status-msg">${tr.rc_login_required}</div>
            </div>`;
        }

        if (this.selectedProject) {
            const partHtml = this.projectsLoading
                ? `<div class="status-msg"><div>${tr.rc_proj_loading}</div></div>`
                : this.projCounters.length === 0
                    ? `<div class="status-msg"><div>${tr.rc_parts_empty}</div></div>`
                    : this.projCounters.map(c => this._renderCounter(c, tr, true)).join('');
            return `
          <div class="proj-header">
            <button class="back-btn" id="backToProjects">← ${tr.rc_proj_back}</button>
            <span class="proj-name-label">${this._esc(this.selectedProject.title || '')}</span>
          </div>
          <div class="drawer-content">
            ${partHtml}
          </div>`;
        }

        if (this.projectsLoading || this.projects === null) {
            return `<div class="drawer-content">
              <div class="status-msg">${tr.rc_proj_loading}</div>
            </div>`;
        }

        if (this.projects.length === 0) {
            return `<div class="drawer-content">
              <div class="status-msg">
                <div>${tr.rc_proj_empty}</div>
                <a href="/projects.html" class="proj-create-link">${tr.rc_proj_create}</a>
              </div>
            </div>`;
        }

        return `
      <div class="drawer-content proj-list">
        ${this.projects.map(p => `
          <button class="proj-card"
                  data-proj-id="${this._esc(p.id)}"
                  data-proj-title="${this._esc(p.title || '')}">
            <span class="proj-card-name">${this._esc(p.title || '—')}</span>
            <span class="proj-card-arrow">→</span>
          </button>
        `).join('')}
      </div>`;
    }

    _renderCounter(c, tr, isProjectPart = false) {
        const totalRows = c.count;
        const goalPct   = c.goalRows > 0 ? Math.min(100, totalRows / c.goalRows * 100) : 0;
        const lang      = this.lang;

        const memoLbl  = lang === 'ko' ? '메모'   : lang === 'ja' ? 'メモ'    : 'Memo';
        const yarnLbl  = lang === 'ko' ? '실'     : lang === 'ja' ? '糸'     : 'Yarn';
        const ndlLbl   = lang === 'ko' ? '바늘'   : lang === 'ja' ? '針'     : 'Needle';
        const goalLbl  = lang === 'ko' ? '목표단'  : lang === 'ja' ? '目標段' : 'Goal';
        const alertLbl = lang === 'ko' ? '알림단'  : lang === 'ja' ? 'アラート': 'Alert';
        const doneLbl  = lang === 'ko' ? '완료!'   : lang === 'ja' ? '完了！' : 'Done!';

        const id = this._esc(c.id);

        return `
      <div class="counter-item" data-id="${id}">
        <div class="counter-top">
          <div class="mode-toggle">
            <button class="mode-btn ${c.mode === 'normal' ? 'active' : ''}"
                    data-id="${id}" data-mode="normal">${tr.btn_mode_normal}</button>
            <button class="mode-btn ${c.mode === 'repeat' ? 'active' : ''}"
                    data-id="${id}" data-mode="repeat">${tr.btn_mode_repeat}</button>
          </div>
          <input type="text" class="counter-name${isProjectPart ? ' proj-part-name' : ''}"
                 placeholder="${tr.placeholder_project_name}"
                 value="${this._esc(c.name)}" data-id="${id}"${isProjectPart ? ' readonly' : ''}>
          ${isProjectPart ? '' : `
          <button class="delete-btn" data-id="${id}" title="delete">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>`}
        </div>

        <div class="counter-controls">
          <button class="control-btn minus" data-id="${id}">−</button>
          <div class="count-display-group">
            ${c.mode === 'repeat'
                ? `<div class="main-count">${c.currentStep}</div>
                   <div class="sub-count">${tr.label_repeat_count}: ${c.currentRepeat}</div>`
                : `<div class="main-count">${c.count}</div>`}
          </div>
          <button class="control-btn plus" data-id="${id}">+</button>
        </div>

        ${c.goalRows > 0 ? `
          <div class="progress-wrap">
            <div class="progress-track">
              <div class="progress-fill" style="width:${goalPct.toFixed(1)}%"></div>
            </div>
            <div class="progress-label">
              ${goalPct >= 100 ? doneLbl : `${totalRows} / ${c.goalRows} (${goalPct.toFixed(0)}%)`}
            </div>
          </div>
        ` : ''}

        ${c.mode === 'repeat' ? `
          <div class="settings-row">
            <span>${tr.label_repeat_unit}:</span>
            <input type="number" class="repeat-input mini-input"
                   value="${c.repeatRows}" min="1" data-id="${id}">
            <span>${tr.label_step_count}</span>
          </div>
        ` : ''}

        <div class="settings-row">
          <span>${goalLbl}:</span>
          <input type="number" class="goal-input mini-input"
                 value="${c.goalRows || ''}" placeholder="—" min="0" data-id="${id}">
          <span>${alertLbl}:</span>
          <input type="number" class="alert-input mini-input"
                 value="${c.alertRow || ''}" placeholder="—" min="0" data-id="${id}">
        </div>

        <div class="counter-actions">
          <button class="action-btn reset-btn" data-id="${id}">${tr.btn_reset}</button>
          <button class="action-btn memo-btn" data-id="${id}">
            ${memoLbl} ${c.showMemo ? '▲' : '▼'}
          </button>
        </div>

        ${c.showMemo ? `
          <div class="memo-section">
            <div class="memo-row">
              <label>${yarnLbl}</label>
              <input type="text" class="memo-field"
                     data-id="${id}" data-field="yarn" value="${this._esc(c.yarn)}">
            </div>
            <div class="memo-row">
              <label>${ndlLbl}</label>
              <input type="text" class="memo-field"
                     data-id="${id}" data-field="needle" value="${this._esc(c.needle)}">
            </div>
            <div class="memo-row" style="align-items:flex-start">
              <label style="margin-top:5px">${memoLbl}</label>
              <textarea class="memo-textarea"
                        data-id="${id}" data-field="memo">${this._esc(c.memo)}</textarea>
            </div>
          </div>
        ` : ''}
      </div>`;
    }

    _esc(str) {
        return String(str || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    _attachEvents() {
        const r = this.shadowRoot;

        r.getElementById('fabBtn')?.addEventListener('click',   () => this.toggleDrawer());
        r.getElementById('closeBtn')?.addEventListener('click',  () => this.toggleDrawer());
        r.getElementById('overlay')?.addEventListener('click',   () => this.toggleDrawer());
        r.getElementById('addBtn')?.addEventListener('click',    () => this.addCounter());
        r.getElementById('backToProjects')?.addEventListener('click', () => {
            this.selectedProject = null;
            this.projCounters    = [];
            this.render();
        });

        // Tab switching
        r.querySelectorAll('.tab-btn').forEach(btn =>
            btn.addEventListener('click', () => this._switchTab(btn.dataset.tab)));

        // Project card selection
        r.querySelectorAll('.proj-card').forEach(card =>
            card.addEventListener('click', () => this._selectProject({
                id:    card.dataset.projId,
                title: card.dataset.projTitle,
            })));

        // Counter controls
        r.querySelectorAll('.plus').forEach(btn =>
            btn.addEventListener('click', () => this.updateCount(btn.dataset.id, 1)));
        r.querySelectorAll('.minus').forEach(btn =>
            btn.addEventListener('click', () => this.updateCount(btn.dataset.id, -1)));
        r.querySelectorAll('.reset-btn').forEach(btn =>
            btn.addEventListener('click', () => this.resetCount(btn.dataset.id)));
        r.querySelectorAll('.delete-btn').forEach(btn =>
            btn.addEventListener('click', () => this.removeCounter(btn.dataset.id)));
        r.querySelectorAll('.memo-btn').forEach(btn =>
            btn.addEventListener('click', () => this.toggleMemo(btn.dataset.id)));

        r.querySelectorAll('.counter-name').forEach(inp =>
            inp.addEventListener('change', e =>
                this._update(inp.dataset.id, 'name', e.target.value)));

        r.querySelectorAll('.mode-btn').forEach(btn =>
            btn.addEventListener('click', () => {
                const c = this._activeCounters.find(x => x.id === btn.dataset.id);
                if (c && c.mode !== btn.dataset.mode) this.toggleMode(btn.dataset.id);
            }));

        r.querySelectorAll('.repeat-input').forEach(inp =>
            inp.addEventListener('change', e => {
                const c = this._activeCounters.find(x => x.id === inp.dataset.id);
                if (!c) return;
                c.repeatRows = Math.max(1, parseInt(e.target.value) || 1);
                if (c.currentStep > c.repeatRows) c.currentStep = c.repeatRows;
                this._saveCurrentState();
                this.render();
            }));

        r.querySelectorAll('.goal-input').forEach(inp =>
            inp.addEventListener('change', e => {
                this._update(inp.dataset.id, 'goalRows', Math.max(0, parseInt(e.target.value) || 0));
                this.render();
            }));

        r.querySelectorAll('.alert-input').forEach(inp =>
            inp.addEventListener('change', e =>
                this._update(inp.dataset.id, 'alertRow', Math.max(0, parseInt(e.target.value) || 0))));

        r.querySelectorAll('.memo-field').forEach(inp =>
            inp.addEventListener('change', e =>
                this._update(inp.dataset.id, inp.dataset.field, e.target.value)));
        r.querySelectorAll('.memo-textarea').forEach(ta =>
            ta.addEventListener('change', e =>
                this._update(ta.dataset.id, ta.dataset.field, e.target.value)));
    }
}

customElements.define('knitting-row-counter', RowCounter);
