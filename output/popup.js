'use strict';

// ═══════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════

const G = {
  fps:        24,
  lz:         true,      // leading zero
  numMode:    'frame',   // 숫자만 입력 시 기본값: 'frame' | 'sec'
  theme:      'dark',    // 'dark' | 'light'
  rows:       [],        // [{ uid, input }]
  sel:        new Set(), // selected uids
  lastSelIdx: -1,        // 마지막으로 클릭한 행 인덱스 (shift 선택용)
  uidNext:    1,
  proj:       '',        // current project name ('' = auto)
  projects:   {},        // { name: snapshot }
  localProjs: new Set(), // sync 용량 초과로 local에만 저장된 프로젝트 키 집합
};

function newRow(input = '') {
  return { uid: G.uidNext++, input };
}


// ═══════════════════════════════════════════════
// 파싱 & 포맷
// ═══════════════════════════════════════════════

/**
 * 입력 문자열 → 총 프레임 수
 * 지원 형식: "1.23" | "1+23" | "1 23" | "23" (프레임만)
 * 프레임 값 >= fps 시 자동으로 초로 올림
 */
function parseFrames(str) {
  const s = String(str || '').trim();
  if (!s) return 0;

  let sec = 0, fr = 0;

  if (s.includes('+')) {
    const i = s.indexOf('+');
    sec = parseInt(s.slice(0, i))   || 0;
    fr  = parseInt(s.slice(i + 1)) || 0;
  } else if (/\s/.test(s)) {
    const parts = s.split(/\s+/);
    sec = parseInt(parts[0]) || 0;
    fr  = parseInt(parts[1]) || 0;
  } else if (s.includes('.')) {
    // "1.23" → 1초 23프레임 / "0.12" ".12" → 0초 12프레임 (항상 프레임으로)
    const i = s.indexOf('.');
    sec = parseInt(s.slice(0, i))  || 0;
    fr  = parseInt(s.slice(i + 1)) || 0;
  } else {
    // 숫자만: numMode에 따라 초 또는 프레임
    const n = parseInt(s) || 0;
    if (G.numMode === 'sec') {
      sec = n;
    } else {
      fr = n;
    }
  }

  return Math.max(0, sec * G.fps + fr);
}

/** 총 프레임 → "5+03" 형식 */
function fmtSF(tf) {
  const s  = Math.floor(tf / G.fps);
  const f  = tf % G.fps;
  const fs = G.lz ? String(f).padStart(2, '0') : String(f);
  return `${s}+${fs}`;
}

/** 총 프레임 → 소수점 초 "1.833" */
function fmtSec(tf) {
  return (tf / G.fps).toFixed(3);
}


// ═══════════════════════════════════════════════
// 렌더링
// ═══════════════════════════════════════════════

/** 테이블 전체 재렌더 */
function render() {
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '';

  const rFrames = G.rows.map(r => parseFrames(r.input));
  let cumTotal = rFrames.reduce((a, b) => a + b, 0);

  G.rows.forEach((row, idx) => {
    const f     = rFrames[idx];
    const isSel = G.sel.has(row.uid);

    const tr = document.createElement('tr');
    tr.dataset.uid = row.uid;
    if (isSel) tr.classList.add('sel');

    // ─ 체크박스 ─
    const tdSel = document.createElement('td');
    tdSel.className = 'col-sel';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = isSel;
    cb.addEventListener('click', e => {
      if (e.shiftKey && G.lastSelIdx >= 0) {
        // shift 클릭: 기존 선택 초기화 후 anchor ~ 현재 범위만 선택
        const clampedLast = Math.min(G.lastSelIdx, G.rows.length - 1);
        const from = Math.min(clampedLast, idx);
        const to   = Math.max(clampedLast, idx);
        G.sel.clear();
        for (let i = from; i <= to; i++) {
          G.sel.add(G.rows[i].uid);
        }
        // 체크박스 UI 동기화 (sum-row 제외)
        document.querySelectorAll('#tbody tr:not(#sum-row)').forEach((tr_, i_) => {
          const cb_ = tr_.querySelector('input[type=checkbox]');
          if (cb_) cb_.checked = G.sel.has(G.rows[i_]?.uid);
          tr_.classList.toggle('sel', G.sel.has(G.rows[i_]?.uid));
        });
      } else {
        // 일반 클릭: 토글
        if (G.sel.has(row.uid)) G.sel.delete(row.uid);
        else                    G.sel.add(row.uid);
        tr.classList.toggle('sel', G.sel.has(row.uid));
      }
      G.lastSelIdx = idx;
      updateSummary();
    });
    tdSel.appendChild(cb);
    tr.appendChild(tdSel);

    // ─ ID ─
    const tdId = document.createElement('td');
    tdId.className = 'col-id';
    tdId.textContent = idx + 1;
    tr.appendChild(tdId);

    // ─ 입력 ─
    const tdInput = document.createElement('td');
    tdInput.className = 'col-input';
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = row.input;
    inp.placeholder = '1+12';
    if (row.input.trim() && !/^[\d\s.+]+$/.test(row.input.trim())) {
      inp.classList.add('invalid');
    }
    inp.addEventListener('input', () => {
      row.input = inp.value;
      const bad = row.input.trim() && !/^[\d\s.+]+$/.test(row.input.trim());
      inp.classList.toggle('invalid', !!bad);
      updateCalc();  // 포커스 유지를 위해 인플레이스 업데이트 (저장은 blur 시)
    });
    inp.addEventListener('blur', () => {
      saveState();   // 포커스 벗어날 때 저장 (쓰기 빈도 최소화)
    });
    inp.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const nextIdx = idx + 1;
      if (nextIdx < G.rows.length) {
        // 다음 행으로 포커스 이동
        const nextTr = document.querySelector(`tr[data-uid="${G.rows[nextIdx].uid}"]`);
        if (nextTr) nextTr.querySelector('.col-input input')?.focus();
      } else {
        // 마지막 행이면 새 행 추가 후 포커스
        G.rows.push(newRow());
        saveState();
        render();
        // render 후 새 행에 포커스
        const newRow_ = G.rows[G.rows.length - 1];
        requestAnimationFrame(() => {
          const newTr = document.querySelector(`tr[data-uid="${newRow_.uid}"]`);
          if (newTr) newTr.querySelector('.col-input input')?.focus();
        });
      }
    });
    tdInput.appendChild(inp);
    tr.appendChild(tdInput);

    // ─ ID별 sec ─
    const tdSec = document.createElement('td');
    tdSec.className = 'col-sec';
    tdSec.textContent = row.input.trim() ? fmtSec(f) : '';
    tr.appendChild(tdSec);

    // ─ 액션 버튼 ─
    const tdAct = document.createElement('td');
    tdAct.className = 'col-act';

    const btnIns = document.createElement('button');
    btnIns.className = 'btn-i';
    btnIns.title = '아래에 행 삽입';
    btnIns.textContent = '+';
    btnIns.addEventListener('click', () => {
      G.rows.splice(idx + 1, 0, newRow());
      saveState();
      render();
    });
    tdAct.appendChild(btnIns);

    if (G.rows.length > 1) {
      const btnDel = document.createElement('button');
      btnDel.className = 'btn-d';
      btnDel.title = '행 삭제';
      btnDel.textContent = '×';
      btnDel.addEventListener('click', () => {
        G.sel.delete(row.uid);
        G.rows.splice(idx, 1);
        // splice 후 lastSelIdx가 범위를 벗어나지 않도록 재조정
        G.lastSelIdx = Math.min(G.lastSelIdx, G.rows.length - 1);
        saveState();
        render();
      });
      tdAct.appendChild(btnDel);
    }

    tr.appendChild(tdAct);
    tbody.appendChild(tr);
  });

  // ─ 합계 행 (입력 불가, 입력 컬럼 하단에 누적 sec.frame 표시) ─
  const trSum = document.createElement('tr');
  trSum.id = 'sum-row';
  trSum.innerHTML = `
    <td colspan="2" class="sum-row-label">누적 :</td>
    <td class="col-input">
      <div class="cum-display" id="cum-sf-display">
        <span class="cum-label">∑</span>
        <span id="cum-sf-value">${fmtSF(cumTotal)}</span>
      </div>
    </td>
    <td class="col-sec">
      <div class="cum-display cum-display--sec" id="cum-sec-display">
        <span class="cum-label">∑</span>
        <span id="cum-sec-value">${cumTotal > 0 ? fmtSec(cumTotal) : ''}</span>
      </div>
    </td>
    <td></td>
  `;
  tbody.appendChild(trSum);

  updateSummary();
}

/**
 * 입력 변경 시 포커스를 잃지 않고 계산 셀만 갱신
 * (テーブル 재생성 없이 querySelector로 셀 직접 업데이트)
 */
function updateCalc() {
  const rFrames = G.rows.map(r => parseFrames(r.input));
  let cumTotal = 0;

  G.rows.forEach((row, idx) => {
    const f      = rFrames[idx];
    cumTotal    += f;
    const tr     = document.querySelector(`tr[data-uid="${row.uid}"]`);
    if (!tr) return;

    // ID별 sec 업데이트
    const tdSec = tr.querySelector('.col-sec');
    if (tdSec) tdSec.textContent = row.input.trim() ? fmtSec(f) : '';

    // 유효하지 않은 입력 표시
    const inpEl = tr.querySelector('.col-input input');
    if (inpEl) {
      const bad = row.input.trim() && !/^[\d\s.+]+$/.test(row.input.trim());
      inpEl.classList.toggle('invalid', !!bad);
    }
  });

  // 합계 행 업데이트
  const cumSfVal  = document.getElementById('cum-sf-value');
  const cumSecVal = document.getElementById('cum-sec-value');
  if (cumSfVal)  cumSfVal.textContent  = fmtSF(cumTotal);
  if (cumSecVal) cumSecVal.textContent = cumTotal > 0 ? fmtSec(cumTotal) : '';

  updateSummary();
  // 저장은 blur 이벤트에서 처리 (input마다 저장하지 않음)
}

/** 하단 요약 갱신 */
function updateSummary() {
  const rFrames  = G.rows.map(r => parseFrames(r.input));
  const totalTF  = rFrames.reduce((a, b) => a + b, 0);
  const labelEl  = document.getElementById('sum-label');
  const secEl    = document.getElementById('sum-sec');
  const sfEl     = document.getElementById('sum-sf');

  if (G.sel.size > 0) {
    const selTF = G.rows
      .filter(r => G.sel.has(r.uid))
      .reduce((acc, r) => acc + parseFrames(r.input), 0);
    labelEl.textContent = `선택 ${G.sel.size}행 합계`;
    secEl.textContent   = fmtSec(selTF) + ' sec';
    sfEl.textContent    = fmtSF(selTF);
  } else {
    labelEl.textContent = '전체 합계';
    secEl.textContent   = totalTF > 0 ? fmtSec(totalTF) + ' sec' : '';
    sfEl.textContent    = fmtSF(totalTF);
  }
}


// ═══════════════════════════════════════════════
// FPS
// ═══════════════════════════════════════════════

function setFps(n) {
  G.fps = n;
  document.querySelectorAll('.fps-btn').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.fps) === n);
  });
  const ci = document.getElementById('custom-fps');
  ci.value = [24, 30, 60].includes(n) ? '' : n;
  saveState();
  render();
}


// ═══════════════════════════════════════════════
// 프로젝트 / 저장
// ═══════════════════════════════════════════════

function applyTheme(theme) {
  G.theme = theme;
  document.documentElement.dataset.theme = theme === 'light' ? 'light' : '';
  const btn = document.getElementById('btn-theme');
  if (btn) btn.textContent = theme === 'light' ? '🌙' : '☀️';
}

function snapshot() {
  return {
    fps:     G.fps,
    lz:      G.lz,
    numMode: G.numMode,
    rows:    G.rows.map(r => [r.uid, r.input]),  // [uid, val] 최소화
    uid:     G.uidNext,
  };
}

function applySnapshot(s) {
  G.fps     = typeof s.fps === 'number' ? s.fps : 24;
  G.lz      = s.lz !== undefined ? s.lz : true;
  G.numMode = s.numMode || 'frame';
  const rawRows = Array.isArray(s.rows) && s.rows.length > 0 ? s.rows : null;
  G.rows = rawRows
    ? rawRows.map(r =>
        Array.isArray(r)
          ? { uid: r[0], input: r[1] }          // 신규: [uid, val]
          : { uid: r.uid, input: r.input }       // 구형: {uid, input} 호환
      )
    : [newRow()];
  G.uidNext    = s.uid || (Math.max(0, ...G.rows.map(r => r.uid)) + 1);
  G.sel        = new Set();
  G.lastSelIdx = -1;
}

/** sync 우선 저장, 용량 초과 시 local로 폴백 */
function saveProjToStorage(key, snap) {
  const storageKey = 'proj__' + key;
  const compressed = LZString.compressToUTF16(JSON.stringify(snap));
  chrome.storage.sync.set({ [storageKey]: compressed }, () => {
    if (chrome.runtime.lastError) {
      // sync 실패 → local 저장
      chrome.storage.local.set({ [storageKey]: compressed }, () => {
        if (chrome.runtime.lastError) {
          showSaveError('저장 실패');
        } else {
          G.localProjs.add(key);
          chrome.storage.sync.remove(storageKey);  // sync 쪽 잔여 데이터 정리
          updateSyncWarningUI();
        }
      });
    } else {
      // sync 성공 → 이전에 local에 있었다면 정리
      if (G.localProjs.has(key)) {
        G.localProjs.delete(key);
        chrome.storage.local.remove(storageKey);
        updateSyncWarningUI();
      }
    }
  });
}

/** 현재 프로젝트의 sync 불가 경고 배너 갱신 */
function updateSyncWarningUI() {
  const el = document.getElementById('sync-warning');
  if (!el) return;
  const key = G.proj || '__auto__';
  el.style.display = G.localProjs.has(key) ? 'flex' : 'none';
}

/** 저장 - 프로젝트별 독립 키에 압축 저장 */
function saveState() {
  const key  = G.proj || '__auto__';
  const snap = snapshot();
  G.projects[key] = snap;
  chrome.storage.sync.set({ currentProject: key });
  saveProjToStorage(key, snap);
}

/** 저장 실패 알림 표시 (3초 후 자동 소멸) */
function showSaveError(msg) {
  const el = document.getElementById('save-error');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'inline';
  clearTimeout(showSaveError._t);
  showSaveError._t = setTimeout(() => { el.style.display = 'none'; }, 3000);
}

function updateProjList() {
  const sel   = document.getElementById('proj-list');
  const saved = sel.value;
  sel.innerHTML = '<option value="">불러오기 ▾</option>';
  Object.keys(G.projects)
    .filter(k => k !== '__auto__')
    .sort()
    .forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      sel.appendChild(opt);
    });
  if (saved && saved !== '__auto__') sel.value = saved;
}

function loadProject(name) {
  if (!G.projects[name]) return;
  G.proj = name;
  document.getElementById('proj-name').value = name;
  applySnapshot(G.projects[name]);
  syncSettingsUI();
  updateProjList();
  updateSyncWarningUI();
  chrome.storage.sync.set({ currentProject: name });
  render();
}

/** 설정 UI를 현재 state에 맞게 동기화 */
function syncSettingsUI() {
  document.querySelectorAll('.fps-btn').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.fps) === G.fps);
  });
  document.getElementById('custom-fps').value =
    [24, 30, 60].includes(G.fps) ? '' : G.fps;
  document.getElementById('leading-zero').checked = G.lz;
  document.querySelectorAll('.num-mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === G.numMode);
  });
}


// ═══════════════════════════════════════════════
// Import / Export
// ═══════════════════════════════════════════════

function exportProjects(all = false) {
  let data, filename;
  if (all) {
    // B-2: 내보낼 프로젝트가 없을 때
    if (Object.keys(G.projects).length === 0) {
      alert('내보낼 프로젝트가 없습니다.');
      return;
    }
    data     = { version: 1, projects: G.projects };
    filename = 'frame-calc-export-all.json';
  } else {
    // A-3: 이름을 입력했지만 저장 버튼을 누르지 않은 상태
    const nameInput = document.getElementById('proj-name').value.trim();
    if (!G.proj && nameInput) {
      alert('프로젝트가 저장되지 않았습니다.\n저장 버튼을 먼저 눌러주세요.');
      return;
    }
    const key  = G.proj || '__auto__';
    const snap = G.projects[key] || snapshot();
    data       = { version: 1, projects: { [key]: snap } };
    // E-1/E-2: 파일명 특수문자 제거
    const safe = (key === '__auto__') ? 'auto' : key.replace(/[/\\:*?"<>|]/g, '_');
    filename   = `frame-calc-export-${safe}.json`;
  }
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function importProjects(file) {
  if (!confirm('가져오기를 하면 같은 이름의 프로젝트는 덮어쓰여집니다.\n계속할까요?')) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data         = JSON.parse(e.target.result);
      const imported     = data.projects || data;
      const importedKeys = Object.keys(imported);
      let count = 0;
      importedKeys.forEach(name => {
        const snap = imported[name];
        if (!snap || typeof snap !== 'object') return;
        G.projects[name] = snap;
        saveProjToStorage(name, snap);
        count++;
      });
      updateProjList();
      // C-5: 현재 열린 프로젝트가 덮어씌워진 경우 화면 갱신
      const currentKey = G.proj || '__auto__';
      if (importedKeys.includes(currentKey) && G.projects[currentKey]) {
        applySnapshot(G.projects[currentKey]);
        syncSettingsUI();
        render();
      }
      alert(`${count}개 프로젝트를 가져왔습니다.`);
    } catch {
      alert('가져오기 실패: 올바른 JSON 파일이 아닙니다.');
    }
  };
  reader.readAsText(file);
}


// ═══════════════════════════════════════════════
// 초기화
// ═══════════════════════════════════════════════

function init() {
  // 기본 행 3개
  G.rows = [newRow(), newRow(), newRow()];

  // ── 테마 토글 ──
  document.getElementById('btn-theme').addEventListener('click', () => {
    const next = G.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    chrome.storage.sync.set({ theme: next });
  });

  // ── 숫자 기본값 모드 버튼 ──
  document.querySelectorAll('.num-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      G.numMode = btn.dataset.mode;
      document.querySelectorAll('.num-mode-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.mode === G.numMode);
      });
      saveState();
      render();
    });
  });

  // ── 전체 선택 / 전체 해제 ──
  document.getElementById('btn-sel-all').addEventListener('click', () => {
    G.rows.forEach(r => G.sel.add(r.uid));
    G.lastSelIdx = G.rows.length - 1;
    render();
  });
  document.getElementById('btn-sel-none').addEventListener('click', () => {
    G.sel.clear();
    G.lastSelIdx = -1;
    render();
  });

  // ── FPS 버튼 ──
  document.querySelectorAll('.fps-btn').forEach(btn => {
    btn.addEventListener('click', () => setFps(Number(btn.dataset.fps)));
  });

  // ── 커스텀 FPS ──
  document.getElementById('custom-fps').addEventListener('change', e => {
    let v = parseInt(e.target.value);
    if (isNaN(v) || v < 1) v = 1;
    if (v > 99) v = 99;
    e.target.value = v;
    setFps(v);
  });

  // ── 앞자리 0 토글 ──
  document.getElementById('leading-zero').addEventListener('change', e => {
    G.lz = e.target.checked;
    saveState();
    render();
  });

  // ── 프로젝트 저장 (버튼 or 엔터) ──
  function saveProjectFromInput() {
    const name = document.getElementById('proj-name').value.trim();
    if (!name) return;
    // E-1/E-2: 파일명에 쓸 수 없는 특수문자 차단
    if (/[/\\:*?"<>|]/.test(name)) {
      alert('프로젝트 이름에 다음 문자는 사용할 수 없습니다:\n/ \\ : * ? " < > |');
      return;
    }
    G.proj = name;
    saveState();
    updateProjList();
  }

  document.getElementById('btn-save-proj').addEventListener('click', saveProjectFromInput);

  document.getElementById('proj-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); saveProjectFromInput(); }
  });

  // ── 프로젝트 불러오기 ──
  document.getElementById('proj-list').addEventListener('change', e => {
    if (e.target.value) loadProject(e.target.value);
    e.target.value = '';  // 선택 초기화
  });

  // ── 프로젝트 삭제 ──
  document.getElementById('btn-del-proj').addEventListener('click', () => {
    const name = G.proj;
    if (!name || name === '__auto__') return;
    if (!confirm(`"${name}" 프로젝트를 삭제할까요?`)) return;
    delete G.projects[name];
    G.localProjs.delete(name);
    G.proj = '';
    document.getElementById('proj-name').value = '';
    chrome.storage.sync.remove('proj__' + name);
    chrome.storage.local.remove('proj__' + name);
    chrome.storage.sync.set({ currentProject: '' });
    updateProjList();
    saveState();  // 현재 rows를 __auto__에 보존
  });

  // ── 행 추가 ──
  document.getElementById('btn-add-row').addEventListener('click', () => {
    G.rows.push(newRow());
    saveState();
    render();
  });

  // ── 저장된 데이터 불러오기 ──
  chrome.storage.sync.get(null, syncData => {
    applyTheme(syncData.theme || 'dark');

    // sync 프로젝트 로드
    Object.entries(syncData).forEach(([key, val]) => {
      if (!key.startsWith('proj__')) return;
      const name = key.slice(6);
      try {
        G.projects[name] = JSON.parse(LZString.decompressFromUTF16(val));
      } catch (e) {
        if (val && typeof val === 'object') G.projects[name] = val;
      }
    });

    // 구형 호환: projects 단일 키 형식 → 마이그레이션 후 삭제
    if (syncData.projects && typeof syncData.projects === 'object') {
      Object.entries(syncData.projects).forEach(([name, snap]) => {
        if (!G.projects[name]) G.projects[name] = snap;
      });
      chrome.storage.sync.remove('projects');
    }

    // local 프로젝트 로드 (sync 초과분 — 같은 키면 local이 우선)
    chrome.storage.local.get(null, localData => {
      Object.entries(localData).forEach(([key, val]) => {
        if (!key.startsWith('proj__')) return;
        const name = key.slice(6);
        try {
          G.projects[name] = JSON.parse(LZString.decompressFromUTF16(val));
          G.localProjs.add(name);
        } catch (e) {
          if (val && typeof val === 'object') {
            G.projects[name] = val;
            G.localProjs.add(name);
          }
        }
      });

      const last = syncData.currentProject;
      if (last && G.projects[last]) {
        G.proj = last;
        applySnapshot(G.projects[last]);
        document.getElementById('proj-name').value = (last === '__auto__') ? '' : last;
        syncSettingsUI();
      }
      updateProjList();
      updateSyncWarningUI();
      render();
    });
  });

  // ── Export / Import ──
  document.getElementById('btn-export').addEventListener('click', () => exportProjects(false));
  document.getElementById('btn-export-all').addEventListener('click', () => exportProjects(true));

  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });

  document.getElementById('import-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) importProjects(file);
    e.target.value = '';  // 같은 파일 재선택 허용
  });

  // ── 제작자 링크 ──
  document.getElementById('credit-link').addEventListener('click', e => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://jidae.com/' });
  });

  // ── sidePanel 닫기 시 저장 보완 (blur 미발생 대비) ──
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveState();
  });
}

document.addEventListener('DOMContentLoaded', init);
