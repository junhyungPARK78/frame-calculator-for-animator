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
  lang:       'ko',      // 'ko' | 'ja'
};

function newRow(input = '') {
  return { uid: G.uidNext++, input };
}


// ═══════════════════════════════════════════════
// 다국어 (i18n)
// ═══════════════════════════════════════════════

const LANG = {
  ko: {
    customFpsPlaceholder: '커스텀',
    customFpsTitle:       '자연수 1~99',
    numModeLabel:         '숫자만 입력 시',
    numModeFrame:         '프레임',
    numModeSec:           '초',
    themeTitle:           '라이트/다크 모드 전환',
    projectLabel:         '프로젝트',
    projNamePlaceholder:  '이름 입력...',
    saveProjBtn:          '저장',
    delProjTitle:         '프로젝트 삭제',
    syncWarning:          '이 프로젝트는 파일이 너무 커서 동기화할 수 없습니다. 이 기기에만 저장됩니다. 동기화를 원하면 프로젝트를 나눠서 작업하세요.',
    selAllTitle:          '전체 선택',
    selNoneTitle:         '전체 해제',
    colId:                '컷 번호',
    colInput:             'sec.frame 입력',
    leadingZero:          '앞자리 0',
    colSec:               '초 (sec)',
    cumLabel:             '누적 :',
    insRowTitle:          '아래에 행 삽입',
    delRowTitle:          '행 삭제',
    addRow:               '＋ 행 추가',
    totalSum:             '전체 합계',
    selSum:               n => `선택 ${n}행 합계`,
    creditLabel:          '제작자 :',
    importBtn:            '가져오기',
    importTitle:          'JSON 파일에서 프로젝트 가져오기',
    exportBtn:            '내보내기',
    exportTitle:          '현재 프로젝트를 JSON으로 내보내기',
    exportAllBtn:         '전체 내보내기',
    exportAllTitle:       '모든 프로젝트를 JSON으로 내보내기',
    saveFail:             '저장 실패',
    saveFailQuota:        '저장 실패: 용량 초과',
    exportNoProject:      '내보낼 프로젝트가 없습니다.',
    exportUnsaved:        '프로젝트가 저장되지 않았습니다.\n저장 버튼을 먼저 눌러주세요.',
    importConfirm:        '가져오기를 하면 같은 이름의 프로젝트는 덮어쓰여집니다.\n계속할까요?',
    importSuccess:        n => `${n}개 프로젝트를 가져왔습니다.`,
    importFail:           '가져오기 실패: 올바른 JSON 파일이 아닙니다.',
    delProjConfirm:       name => `"${name}" 프로젝트를 삭제할까요?`,
    invalidChars:         '프로젝트 이름에 다음 문자는 사용할 수 없습니다:\n/ \\ : * ? " < > |',
    manageProjBtn:        '☰',
    manageProjTitle:      '프로젝트 목록 관리',
    projManagerTitle:     '프로젝트 목록',
    projManagerClose:     '닫기',
    projManagerEmpty:     '저장된 프로젝트가 없습니다.',
    loadProjTitle:        '클릭하여 불러오기',
    renameProjTitle:      '이름 변경',
    renameConfirm:        '확인',
    renameCancel:         '취소',
    renameDuplicate:      name => `"${name}" 이름이 이미 있습니다.`,
  },
  en: {
    customFpsPlaceholder: 'Custom',
    customFpsTitle:       'Integer 1–99',
    numModeLabel:         'Number only:',
    numModeFrame:         'Frame',
    numModeSec:           'Sec',
    themeTitle:           'Toggle light/dark mode',
    projectLabel:         'Project',
    projNamePlaceholder:  'Enter name...',
    saveProjBtn:          'Save',
    delProjTitle:         'Delete project',
    syncWarning:          'This project is too large to sync. It is saved on this device only. To enable sync, split it into smaller projects.',
    selAllTitle:          'Select all',
    selNoneTitle:         'Deselect all',
    colId:                'Cut #',
    colInput:             'sec.frame input',
    leadingZero:          'Leading zero',
    colSec:               'Sec (sec)',
    cumLabel:             'Total:',
    insRowTitle:          'Insert row below',
    delRowTitle:          'Delete row',
    addRow:               '＋ Add row',
    totalSum:             'Total',
    selSum:               n => `${n} rows selected`,
    creditLabel:          'Made by:',
    importBtn:            'Import',
    importTitle:          'Import projects from JSON file',
    exportBtn:            'Export',
    exportTitle:          'Export current project to JSON',
    exportAllBtn:         'Export all',
    exportAllTitle:       'Export all projects to JSON',
    saveFail:             'Save failed',
    saveFailQuota:        'Save failed: storage quota exceeded',
    exportNoProject:      'No projects to export.',
    exportUnsaved:        'Project is not saved.\nPlease click the Save button first.',
    importConfirm:        'Importing will overwrite projects with the same name.\nContinue?',
    importSuccess:        n => `${n} project(s) imported.`,
    importFail:           'Import failed: not a valid JSON file.',
    delProjConfirm:       name => `Delete "${name}"?`,
    invalidChars:         'Project name cannot contain:\n/ \\ : * ? " < > |',
    manageProjBtn:        '☰',
    manageProjTitle:      'Manage project list',
    projManagerTitle:     'Projects',
    projManagerClose:     'Close',
    projManagerEmpty:     'No saved projects.',
    loadProjTitle:        'Click to load',
    renameProjTitle:      'Rename',
    renameConfirm:        'OK',
    renameCancel:         'Cancel',
    renameDuplicate:      name => `"${name}" already exists.`,
  },
  ja: {
    customFpsPlaceholder: 'カスタム',
    customFpsTitle:       '1〜99の整数',
    numModeLabel:         '数字のみ入力時',
    numModeFrame:         'フレーム',
    numModeSec:           '秒',
    themeTitle:           'ライト/ダークモード切替',
    projectLabel:         'プロジェクト',
    projNamePlaceholder:  '名前を入力...',
    saveProjBtn:          '保存',
    delProjTitle:         'プロジェクト削除',
    syncWarning:          'このプロジェクトはサイズが大きすぎて同期できません。このデバイスにのみ保存されます。同期を希望する場合はプロジェクトを分けて作業してください。',
    selAllTitle:          '全て選択',
    selNoneTitle:         '全て解除',
    colId:                'カット番号',
    colInput:             'sec.frame 入力',
    leadingZero:          '先頭ゼロ',
    colSec:               '秒 (sec)',
    cumLabel:             '累計 :',
    insRowTitle:          '下に行を挿入',
    delRowTitle:          '行を削除',
    addRow:               '＋ 行を追加',
    totalSum:             '合計',
    selSum:               n => `選択 ${n}行の合計`,
    creditLabel:          '制作者 :',
    importBtn:            '読み込む',
    importTitle:          'JSONファイルからプロジェクトを読み込む',
    exportBtn:            '書き出す',
    exportTitle:          '現在のプロジェクトをJSONに書き出す',
    exportAllBtn:         '全て書き出す',
    exportAllTitle:       '全プロジェクトをJSONに書き出す',
    saveFail:             '保存失敗',
    saveFailQuota:        '保存失敗: 容量超過',
    exportNoProject:      '書き出すプロジェクトがありません。',
    exportUnsaved:        'プロジェクトが保存されていません。\n先に保存ボタンを押してください。',
    importConfirm:        '読み込むと同名のプロジェクトは上書きされます。\n続けますか？',
    importSuccess:        n => `${n}件のプロジェクトを読み込みました。`,
    importFail:           '読み込み失敗: 正しいJSONファイルではありません。',
    delProjConfirm:       name => `"${name}" を削除しますか？`,
    invalidChars:         'プロジェクト名に以下の文字は使用できません:\n/ \\ : * ? " < > |',
    manageProjBtn:        '☰',
    manageProjTitle:      'プロジェクト一覧管理',
    projManagerTitle:     'プロジェクト一覧',
    projManagerClose:     '閉じる',
    projManagerEmpty:     '保存済みのプロジェクトがありません。',
    loadProjTitle:        'クリックして読み込む',
    renameProjTitle:      '名前変更',
    renameConfirm:        '確認',
    renameCancel:         'キャンセル',
    renameDuplicate:      name => `"${name}" はすでに存在します。`,
  },
};

function t(key, ...args) {
  const val = LANG[G.lang][key];
  return typeof val === 'function' ? val(...args) : val;
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
    btnIns.title = t('insRowTitle');
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
      btnDel.title = t('delRowTitle');
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
    <td colspan="2" class="sum-row-label">${t('cumLabel')}</td>
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
    labelEl.textContent = t('selSum', G.sel.size);
    secEl.textContent   = fmtSec(selTF) + ' sec';
    sfEl.textContent    = fmtSF(selTF);
  } else {
    labelEl.textContent = t('totalSum');
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
          showSaveError(t('saveFail'));
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

function loadProject(name) {
  if (!G.projects[name]) return;
  G.proj = name;
  document.getElementById('proj-name').value = name;
  applySnapshot(G.projects[name]);
  syncSettingsUI();
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


/** UI 전체를 현재 언어로 갱신 */
function applyLang() {
  document.documentElement.lang = G.lang;

  // ─ Top bar ─
  const cFps = document.getElementById('custom-fps');
  cFps.placeholder = t('customFpsPlaceholder');
  cFps.title       = t('customFpsTitle');
  document.querySelector('.num-mode-group .lbl').textContent = t('numModeLabel');
  document.querySelectorAll('.num-mode-btn').forEach(b => {
    b.textContent = b.dataset.mode === 'frame' ? t('numModeFrame') : t('numModeSec');
  });
  document.getElementById('btn-theme').title = t('themeTitle');

  // ─ Project bar ─
  document.querySelector('.proj-bar .lbl').textContent = t('projectLabel');
  document.getElementById('proj-name').placeholder = t('projNamePlaceholder');
  const saveBtn = document.getElementById('btn-save-proj');
  saveBtn.textContent = t('saveProjBtn');
  saveBtn.title       = t('saveProjBtn');
  const manageBtn = document.getElementById('btn-manage-proj');
  manageBtn.textContent = t('manageProjBtn');
  manageBtn.title       = t('manageProjTitle');
  document.getElementById('proj-manager-title').textContent = t('projManagerTitle');
  document.getElementById('btn-close-proj-manager').title   = t('projManagerClose');
  document.getElementById('proj-manager-empty').textContent = t('projManagerEmpty');

  // ─ Sync warning ─
  document.querySelector('.sync-warning-msg').textContent = t('syncWarning');

  // ─ Table header ─
  document.getElementById('btn-sel-all').title  = t('selAllTitle');
  document.getElementById('btn-sel-none').title = t('selNoneTitle');
  document.querySelector('th.col-id').textContent          = t('colId');
  document.querySelector('th.col-input div').textContent   = t('colInput');
  document.querySelector('.toggle-lz span').textContent    = t('leadingZero');
  document.querySelector('th.col-sec').textContent         = t('colSec');

  // ─ Bottom bar ─
  document.getElementById('btn-add-row').textContent = t('addRow');

  // ─ Footer ─
  document.querySelector('.credit-text').childNodes[0].textContent = t('creditLabel') + ' ';
  const importBtn = document.getElementById('btn-import');
  importBtn.textContent = t('importBtn');
  importBtn.title       = t('importTitle');
  const exportBtn = document.getElementById('btn-export');
  exportBtn.textContent = t('exportBtn');
  exportBtn.title       = t('exportTitle');
  const exportAllBtn = document.getElementById('btn-export-all');
  exportAllBtn.textContent = t('exportAllBtn');
  exportAllBtn.title       = t('exportAllTitle');

  // ─ 언어 버튼 active 상태 ─
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === G.lang);
  });

  // ─ 모달이 열려있으면 목록 재렌더 (버튼 title 언어 반영) ─
  if (document.getElementById('proj-manager-modal').style.display !== 'none') {
    commitCurrentRename();
    renderProjManagerList();
  }
}


// ═══════════════════════════════════════════════
// 프로젝트 목록 관리 모달
// ═══════════════════════════════════════════════

function openProjManager() {
  renderProjManagerList();
  document.getElementById('proj-manager-modal').style.display = 'flex';
}

function closeProjManager() {
  document.getElementById('proj-manager-modal').style.display = 'none';
}

function renderProjManagerList() {
  const ul    = document.getElementById('proj-manager-list');
  const empty = document.getElementById('proj-manager-empty');
  ul.innerHTML = '';

  const names = Object.keys(G.projects).filter(k => k !== '__auto__').sort();

  if (names.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  names.forEach(name => {
    const li = document.createElement('li');
    li.className = 'proj-manager-item';

    const isCurrent = name === G.proj;
    const span = document.createElement('span');
    span.className = 'proj-item-name' + (isCurrent ? ' proj-item-current' : '');
    span.textContent = name;
    span.title = t('loadProjTitle');
    span.addEventListener('click', () => {
      loadProject(name);
      closeProjManager();
    });

    li.dataset.projName = name;

    const btnRename = document.createElement('button');
    btnRename.className = 'btn-proj-action btn-proj-rename';
    btnRename.title = t('renameProjTitle');
    btnRename.textContent = '✏';
    btnRename.addEventListener('click', () => startRename(name));

    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn-proj-action btn-proj-delete';
    btnDelete.title = t('delProjTitle');
    btnDelete.textContent = '✕';
    btnDelete.addEventListener('click', () => deleteProjectFromList(name));

    li.appendChild(span);
    li.appendChild(btnRename);
    li.appendChild(btnDelete);
    ul.appendChild(li);
  });
}

function findProjManagerLi(name) {
  for (const li of document.querySelectorAll('#proj-manager-list .proj-manager-item')) {
    if (li.dataset.projName === name) return li;
  }
  return null;
}

function commitCurrentRename() {
  const inp = document.querySelector('#proj-manager-list .proj-item-rename-input');
  if (!inp) return;
  const prevOldName = inp.dataset.oldName;
  const prevNewName = inp.value.trim();
  if (prevNewName && prevNewName !== prevOldName &&
      !/[/\\:*?"<>|]/.test(prevNewName) && G.projects[prevNewName] === undefined) {
    renameProject(prevOldName, prevNewName);  // 내부에서 renderProjManagerList() 호출
  } else {
    renderProjManagerList();  // 유효하지 않으면 revert
  }
}

function startRename(oldName) {
  const existingInp = document.querySelector('#proj-manager-list .proj-item-rename-input');
  if (existingInp && existingInp.dataset.oldName !== oldName) {
    commitCurrentRename();  // 다른 프로젝트 편집 중이면 먼저 커밋 (리렌더 포함)
  }
  const li = findProjManagerLi(oldName);
  if (!li) return;
  enterRenameMode(li, oldName);
}

function enterRenameMode(li, oldName) {
  li.innerHTML = '';

  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'proj-item-rename-input';
  inp.value = oldName;
  inp.dataset.oldName = oldName;

  const btnOk = document.createElement('button');
  btnOk.className = 'btn-proj-action btn-proj-confirm';
  btnOk.title = t('renameConfirm');
  btnOk.textContent = '✓';

  const btnCancel = document.createElement('button');
  btnCancel.className = 'btn-proj-action btn-proj-cancel';
  btnCancel.title = t('renameCancel');
  btnCancel.textContent = '✕';

  function doRename() {
    const newName = inp.value.trim();
    if (!newName || newName === oldName) { renderProjManagerList(); return; }
    if (/[/\\:*?"<>|]/.test(newName)) { alert(t('invalidChars')); inp.focus(); return; }
    if (G.projects[newName] !== undefined) { alert(t('renameDuplicate', newName)); inp.focus(); return; }
    renameProject(oldName, newName);
  }

  btnOk.addEventListener('click', doRename);
  btnCancel.addEventListener('click', () => renderProjManagerList());
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); doRename(); }
    if (e.key === 'Escape') renderProjManagerList();
  });

  li.appendChild(inp);
  li.appendChild(btnOk);
  li.appendChild(btnCancel);
  inp.focus();
  inp.select();
}

function renameProject(oldName, newName) {
  G.projects[newName] = G.projects[oldName];
  delete G.projects[oldName];

  if (G.localProjs.has(oldName)) {
    G.localProjs.delete(oldName);
    G.localProjs.add(newName);
  }

  saveProjToStorage(newName, G.projects[newName]);
  chrome.storage.sync.remove('proj__' + oldName);
  chrome.storage.local.remove('proj__' + oldName);

  if (G.proj === oldName) {
    G.proj = newName;
    document.getElementById('proj-name').value = newName;
    chrome.storage.sync.set({ currentProject: newName });
  }

  renderProjManagerList();
}

function deleteProjectFromList(name) {
  if (!confirm(t('delProjConfirm', name))) return;

  delete G.projects[name];
  G.localProjs.delete(name);
  chrome.storage.sync.remove('proj__' + name);
  chrome.storage.local.remove('proj__' + name);

  if (G.proj === name) {
    G.proj = '';
    document.getElementById('proj-name').value = '';
    chrome.storage.sync.set({ currentProject: '' });
    updateSyncWarningUI();
    saveState();
  }

  renderProjManagerList();
}


// ═══════════════════════════════════════════════
// Import / Export
// ═══════════════════════════════════════════════

function exportProjects(all = false) {
  let data, filename;
  if (all) {
    // B-2: 내보낼 프로젝트가 없을 때
    if (Object.keys(G.projects).length === 0) {
      alert(t('exportNoProject'));
      return;
    }
    data     = { version: 1, projects: G.projects };
    filename = 'frame-calc-export-all.json';
  } else {
    // A-3: 이름을 입력했지만 저장 버튼을 누르지 않은 상태
    const nameInput = document.getElementById('proj-name').value.trim();
    if (!G.proj && nameInput) {
      alert(t('exportUnsaved'));
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
  if (!confirm(t('importConfirm'))) return;
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
      renderProjManagerList();
      // C-5: 현재 열린 프로젝트가 덮어씌워진 경우 화면 갱신
      const currentKey = G.proj || '__auto__';
      if (importedKeys.includes(currentKey) && G.projects[currentKey]) {
        applySnapshot(G.projects[currentKey]);
        syncSettingsUI();
        render();
      }
      alert(t('importSuccess', count));
    } catch {
      alert(t('importFail'));
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

  // ── 언어 토글 ──
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.lang === G.lang) return;
      G.lang = btn.dataset.lang;
      chrome.storage.sync.set({ lang: G.lang });
      applyLang();
      render();
    });
  });

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
      alert(t('invalidChars'));
      return;
    }
    G.proj = name;
    saveState();
    renderProjManagerList();
  }

  document.getElementById('btn-save-proj').addEventListener('click', saveProjectFromInput);

  document.getElementById('proj-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); saveProjectFromInput(); }
  });

  // ── 프로젝트 목록 관리 모달 ──
  document.getElementById('btn-manage-proj').addEventListener('click', openProjManager);
  document.getElementById('btn-close-proj-manager').addEventListener('click', closeProjManager);
  document.getElementById('proj-manager-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeProjManager();
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
    G.lang = syncData.lang || 'ko';
    applyLang();

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
