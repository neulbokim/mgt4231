const STATE = {
  route: 'summary',
  departments: [], terms: [], students: [], slots: [], days: [], statuses: [],
};
const TIME_GROUPS = [
  { title: '평일 (8:00-22:00)', days: ['MON', 'TUE', 'WED', 'THU', 'FRI'] },
  { title: '토요일 (9:00-17:00)', days: ['SAT'] },
];
const statusOrder = ['PREFERRED', 'AVAILABLE', 'CLASS', 'EXAM', 'MEAL', 'ETC', 'NA'];
const statusLabel = {PREFERRED:'근무 희망', AVAILABLE:'근무 가능', CLASS:'수업', EXAM:'시험', MEAL:'식사', ETC:'기타', NA:'NA'};
const AVAILABLE_STATUSES = new Set(['PREFERRED', 'AVAILABLE']);

const $ = (sel) => document.querySelector(sel);
const view = () => $('#view');
function selectedDepartmentId(){ return Number($('#departmentSelect').value); }
function selectedTermId(){ return Number($('#termSelect').value); }
function selectedWeekNo(){ return Number($('#weekSelect').value); }
function selectedStudentId(){ return Number($('#studentSelect').value); }
function departmentStudents(){ return STATE.students.filter(s => s.departmentId === selectedDepartmentId()); }
function showMessage(text){ const el=$('#message'); el.textContent=text; el.classList.remove('hidden'); setTimeout(()=>el.classList.add('hidden'), 3000); }
function setTitle(text){ $('#pageTitle').textContent = text; }
function key(day, slotId){ return `${day}:${slotId}`; }
function cellKey(day, slotId){ return `${day}-${slotId}`; }
function escapeHtml(str){ return String(str ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function slotActiveOnDay(slot, dayKey){ return !Array.isArray(slot.activeDays) || slot.activeDays.length === 0 || slot.activeDays.includes(dayKey); }
function groupDays(dayKeys){
  const set = new Set(dayKeys);
  return STATE.days.filter(d => set.has(d.key));
}
function groupSlots(dayKeys){
  const set = new Set(dayKeys);
  return STATE.slots.filter(slot => Array.isArray(slot.activeDays) && slot.activeDays.some(day => set.has(day))).sort((a, b) => a.order - b.order);
}
function renderTableHeader(days){ return `<tr><th class="time">시간대</th>${days.map(d=>`<th>${d.label}</th>`).join('')}</tr>`; }
function renderGroupedPanels(renderRows){
  return `<div class="grouped-tables">${TIME_GROUPS.map(group => {
    const days = groupDays(group.days);
    const slots = groupSlots(group.days);
    const groupId = group.days.includes('SAT') ? 'saturday' : 'weekday';
    return `<div class="panel" data-group="${groupId}"><h2>${escapeHtml(group.title)}</h2><div class="panel-body">${renderRows(days, slots, group)}</div></div>`;
  }).join('')}</div>`;
}
function renderStatusChip(status, readonly = false){
  const label = escapeHtml(statusLabel[status] || status);
  return `<div class="status-pill${readonly ? ' static' : ''}" data-status="${status}" title="${label}" aria-label="${label}">${label}</div>`;
}
function slotDurationHours(slotId){
  return Number(STATE.slots.find(s => s.id === slotId)?.durationHours || 0);
}
function formatHours(hours){
  const value = Number(hours || 0);
  return `${Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')}h`;
}
function totalDayKeys(){
  const dayOrder = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return STATE.days.filter(d => dayOrder.includes(d.key));
}
function renderTotalsFooter(days, totals){
  return `<tfoot><tr><td class="time">합계</td>${days.map(day=>`<td>${formatHours(totals[day.key] || 0)}</td>`).join('')}</tr></tfoot>`;
}
function renderStudentHoursPanel(title, rows){
  const days = totalDayKeys();
  const body = rows.length ? rows.map(row => `<tr><td>${escapeHtml(row.name)}</td>${days.map(day=>`<td>${formatHours(row.dayTotals?.[day.key] || 0)}</td>`).join('')}<td>${formatHours(row.total || 0)}</td></tr>`).join('') : `<tr><td colspan="${days.length + 2}" class="empty">표시할 데이터가 없습니다.</td></tr>`;
  return `<div class="panel"><h2>${escapeHtml(title)}</h2><div class="panel-body"><div class="table-wrap"><table class="schedule-table"><tr><th>학생</th>${days.map(day=>`<th>${day.label}</th>`).join('')}<th>합계</th></tr>${body}</table></div></div></div>`;
}
function computeGroupAvailableTotals(days, slots, statusLookup){
  const totals = {};
  for(const day of days) totals[day.key] = 0;
  for(const slot of slots){
    const hours = slotDurationHours(slot.id);
    for(const day of days){
      if(AVAILABLE_STATUSES.has(statusLookup(day.key, slot.id))) totals[day.key] += hours;
    }
  }
  return totals;
}
function computeAvailabilityTotals(items){
  const dayTotals = {};
  let weekTotal = 0;
  for(const item of items){
    if(!AVAILABLE_STATUSES.has(item.status)) continue;
    const hours = slotDurationHours(item.slotId);
    dayTotals[item.day] = (dayTotals[item.day] || 0) + hours;
    weekTotal += hours;
  }
  return {dayTotals, weekTotal};
}
function syncAvailabilityCell(selectEl){
  const pill = selectEl.closest('.status-pill');
  if(!pill) return;
  pill.dataset.status = selectEl.value;
}
function formatSeoulDateLabel(date = new Date()){
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(date);
  const get = (type) => parts.find(p => p.type === type)?.value;
  return `${get('year')}.${get('month')}.${get('day')}(${get('weekday')})`;
}
function refreshUserBar(){
  const el = $('#userbar');
  if(!el) return;
  const student = STATE.students.find(s => s.id === selectedStudentId());
  el.textContent = `${formatSeoulDateLabel()}  ${student?.name || '-'}님 환영합니다.`;
}
function slotDisplayLabel(slot){
  return slot.label;
}
function normalizeRoute(route){
  const aliases = {status:'summary', generate:'schedule', 'student-slots':'my-schedule'};
  return aliases[route] || route;
}
function renderOverviewPanel(){
  const students = departmentStudents();
  return `<div class="panel"><h2>근무시간표 조율 현황</h2><div class="panel-body">
    <div class="stats">
      <div class="stat">선발 학생 수<strong>${students.length}</strong></div>
      <div class="stat">입력 대상 주차<strong>${selectedWeekNo()}주차</strong></div>
      <div class="stat">현재 단계<strong>작성 중</strong></div>
      <div class="stat">부서<strong>${escapeHtml(STATE.departments.find(d=>d.id===selectedDepartmentId())?.name)}</strong></div>
    </div>
    <p class="muted">학생은 근무 희망 시간을 입력하고, 관리자는 가능 시간 수합 → 필요 인원 설정 → 자동 시간표 생성 → 확정 순서로 진행합니다.</p>
  </div></div>
  <div class="panel"><h2>업무 흐름</h2><div class="panel-body list">
    1. 학생별 근무 가능/수업/식사/기타 시간 입력<br>
    2. 관리자가 학생별 가능 시간 자동 수합 확인<br>
    3. 부서별 요일·시간대 필요 인원 설정<br>
    4. 제약조건 기반 자동 시간표 생성<br>
    5. 전체 근무시간표 확인 및 확정
  </div></div>`;
}

function tableShell(inner){ return `<div class="table-wrap"><table class="schedule-table">${inner}</table></div>`; }
function statusBadge(s){ return `<span class="badge ${s}">${statusLabel[s] || s}</span>`; }
function legend(){ return `<div class="legend">${statusOrder.map(s=>statusBadge(s)).join('')} <span class="badge ASSIGNED">배정</span> <span class="badge UNFILLED">#N/A</span></div>`; }

async function init(){
  const data = await API.bootstrap();
  Object.assign(STATE, data);
  fillSelects();
  bindNavigation();
  refreshUserBar();
  window.addEventListener('hashchange', () => navigate(location.hash.replace('#','') || 'summary'));
  navigate(location.hash.replace('#','') || 'summary');
}

function fillSelects(){
  $('#departmentSelect').innerHTML = STATE.departments.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
  $('#termSelect').innerHTML = STATE.terms.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
  $('#weekSelect').innerHTML = Array.from({length:16}, (_,i)=>`<option value="${i+1}">${i+1}주차</option>`).join('');
  $('#studentSelect').innerHTML = departmentStudents().map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
  $('#departmentSelect').addEventListener('change', () => {
    $('#studentSelect').innerHTML = departmentStudents().map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
    refreshUserBar();
    render();
  });
  ['termSelect','weekSelect'].forEach(id => $(`#${id}`).addEventListener('change', render));
  $('#studentSelect').addEventListener('change', () => { refreshUserBar(); render(); });
}

function bindNavigation(){
  document.querySelectorAll('.sidebar button').forEach(btn => btn.addEventListener('click', () => { location.hash = btn.dataset.route; }));
}
function navigate(route){
  STATE.route = normalizeRoute(route);
  document.querySelectorAll('.sidebar button').forEach(b=>b.classList.toggle('active', b.dataset.route===STATE.route));
  render();
}
function render(){
  const map = {availability:renderAvailability, summary:renderSummary, requirements:renderRequirements, schedule:renderSchedule, 'my-schedule':renderMySchedule};
  (map[STATE.route] || renderSummary)();
}

async function renderAvailability(){
  setTitle('근무 희망 입력');
  const studentId = selectedStudentId();
  const data = await API.getAvailability(studentId, selectedTermId(), selectedWeekNo());
  const values = {};
  data.items.forEach(i => values[key(i.day, i.slotId)] = i.status);
  const availabilityTotals = computeAvailabilityTotals(data.items);
  const tables = renderGroupedPanels((days, slots) => {
    let body = renderTableHeader(days);
    for(const slot of slots){
      body += `<tr><td class="time">${escapeHtml(slotDisplayLabel(slot))}</td>`;
      for(const day of days){
        const current = values[key(day.key, slot.id)] || 'NA';
        body += `<td><div class="status-pill" data-status="${current}"><select data-day="${day.key}" data-slot="${slot.id}">${statusOrder.map(s=>`<option value="${s}" ${s===current?'selected':''}>${statusLabel[s]}</option>`).join('')}</select></div></td>`;
      }
      body += `</tr>`;
    }
    const totals = computeGroupAvailableTotals(days, slots, (dayKey, slotId) => values[key(dayKey, slotId)] || 'NA');
    return tableShell(body + renderTotalsFooter(days, totals));
  });
  view().innerHTML = `<div class="panel"><h2>학생별 근무 희망 시간 입력</h2><div class="panel-body">
    <div class="toolbar">${legend()}<button class="btn primary right" id="saveAvailability">저장</button></div>
    <p class="muted">주차 근무 가능 시간 합계: ${formatHours(availabilityTotals.weekTotal)}</p>
    ${tables}
  </div></div>`;
  view().querySelectorAll('select[data-day]').forEach(sel => {
    syncAvailabilityCell(sel);
    sel.addEventListener('change', e => syncAvailabilityCell(e.target));
  });
  $('#saveAvailability').addEventListener('click', async () => {
    const items = [...view().querySelectorAll('select[data-day]')].map(sel => ({day: sel.dataset.day, slotId: Number(sel.dataset.slot), status: sel.value}));
    await API.saveAvailability(studentId, selectedTermId(), selectedWeekNo(), items);
    showMessage('근무 희망 시간이 저장되었습니다.');
  });
}

async function renderSummary(){
  setTitle('근무 가능 시간 수합');
  const data = await API.getAvailabilitySummary(selectedDepartmentId(), selectedTermId(), selectedWeekNo());
  const students = departmentStudents();
  const submitted = students.filter(s=>data.submittedStudentIds.includes(s.id));
  const notSubmitted = students.filter(s=>data.notSubmittedStudentIds.includes(s.id));
  const tables = renderGroupedPanels((days, slots) => {
    let body = renderTableHeader(days);
    for(const slot of slots){
      body += `<tr><td class="time">${escapeHtml(slotDisplayLabel(slot))}</td>`;
      for(const day of days){
        const list = data.summary[key(day.key, slot.id)] || [];
        body += `<td>${list.map(x=>escapeHtml(x.name)).join('<br>') || '<span class="muted">-</span>'}</td>`;
      }
      body += `</tr>`;
    }
    return tableShell(body);
  });
  const studentTotalsPanel = renderStudentHoursPanel('학생별 근무 가능 시간 합계', data.studentDayTotals || []);
  view().innerHTML = `<div class="panel"><h2>입력 현황</h2><div class="panel-body two-col">
    <div>제출 완료 <strong>${submitted.length}</strong>명<br><span class="muted">${submitted.map(s=>s.name).join(', ') || '-'}</span></div>
    <div>미제출 <strong>${notSubmitted.length}</strong>명<br><span class="muted">${notSubmitted.map(s=>s.name).join(', ') || '-'}</span></div>
  </div></div>
  <div class="panel"><h2>시간대별 근무 가능 학생</h2><div class="panel-body">${tables}</div></div>
  ${studentTotalsPanel}
  ${renderOverviewPanel()}`;
}

async function renderRequirements(){
  setTitle('부서별 필요 인원 설정');
  const data = await API.getRequirements(selectedDepartmentId(), selectedTermId(), selectedWeekNo());
  const values = {}; data.items.forEach(i => values[key(i.day, i.slotId)] = i);
  const tables = renderGroupedPanels((days, slots) => {
    let body = renderTableHeader(days);
    for(const slot of slots){
      body += `<tr><td class="time">${escapeHtml(slotDisplayLabel(slot))}</td>`;
      for(const day of days){
        const current = values[key(day.key, slot.id)] || {requiredCount: 0, preferredCount: 0, maxCount: 0};
        body += `<td><div class="requirement-cell">
          <span class="requirement-label req-min-label">최소</span>
          <span class="requirement-label req-pref-label">권장</span>
          <span class="requirement-label req-max-label">최대</span>
          <input class="input-mini requirement-input req-min-input" type="number" min="0" max="5" value="${current.requiredCount ?? 0}" data-day="${day.key}" data-slot="${slot.id}" data-field="requiredCount">
          <input class="input-mini requirement-input req-pref-input" type="number" min="0" max="5" value="${current.preferredCount ?? 0}" data-day="${day.key}" data-slot="${slot.id}" data-field="preferredCount">
          <input class="input-mini requirement-input req-max-input" type="number" min="0" max="5" value="${current.maxCount ?? 0}" data-day="${day.key}" data-slot="${slot.id}" data-field="maxCount">
        </div></td>`;
      }
      body += `</tr>`;
    }
    return tableShell(body);
  });
  view().innerHTML = `<div class="panel"><h2>요일·시간대별 필요 인원</h2><div class="panel-body">
    <div class="toolbar"><button class="btn" id="fillDefault">기본값 0/0/0</button><button class="btn primary right" id="saveRequirements">저장</button></div>
    ${tables}
  </div></div>`;
  $('#fillDefault').addEventListener('click', () => {
    view().querySelectorAll('input[data-field="requiredCount"]').forEach(inp => inp.value = 0);
    view().querySelectorAll('input[data-field="preferredCount"]').forEach(inp => inp.value = 0);
    view().querySelectorAll('input[data-field="maxCount"]').forEach(inp => inp.value = 0);
  });
  $('#saveRequirements').addEventListener('click', async () => {
    const grouped = {};
    [...view().querySelectorAll('input[data-day]')].forEach(inp => {
      const k = key(inp.dataset.day, inp.dataset.slot);
      if(!grouped[k]) grouped[k] = {day: inp.dataset.day, slotId: Number(inp.dataset.slot), requiredCount: 0, preferredCount: 0, maxCount: 0, priority:'GENERAL'};
      grouped[k][inp.dataset.field] = Number(inp.value || 0);
    });
    const items = Object.values(grouped).map(item => {
      const requiredCount = Math.max(0, item.requiredCount || 0);
      const preferredCount = Math.max(requiredCount, item.preferredCount || 0);
      const maxCount = Math.max(preferredCount, item.maxCount || 0);
      return {...item, requiredCount, preferredCount, maxCount};
    });
    await API.saveRequirements(selectedDepartmentId(), selectedTermId(), selectedWeekNo(), items);
    showMessage('부서 필요 인원이 저장되었습니다.');
  });
}

async function renderSchedule(generationResult = null){
  setTitle('전체 근무시간표');
  let generatePanel = `<div class="panel"><h2>자동 시간표 생성</h2><div class="panel-body list">
    <label><input type="checkbox" checked disabled> 주당 최대 14시간 이하</label><br>
    <label><input type="checkbox" checked disabled> 하루 8시간 미만</label><br>
    <label><input type="checkbox" checked disabled> 수업/기타 시간 배정 금지</label><br>
    <label><input type="checkbox" checked disabled> 근무 희망 시간 우선 반영</label><br>
    <label><input type="checkbox" checked disabled> 부서 필요 인원 최소/권장/최대 반영</label><br>
    <label><input type="checkbox" checked disabled> 학생별 근무시간 균형 고려</label><br><br>
    <button class="btn primary" id="runGenerate">자동 시간표 생성</button>
  </div></div>`;
  if(generationResult){
    generatePanel += `<div class="panel"><h2>생성 결과</h2><div class="panel-body stats">
      <div class="stat">필수 충원율<strong>${generationResult.fill_rate}%</strong></div>
      <div class="stat">필수 슬롯<strong>${generationResult.required_total}</strong></div>
      <div class="stat">필수 배정<strong>${generationResult.filled_total}</strong></div>
      <div class="stat">미충원<strong>${generationResult.unfilled_count}</strong></div>
      <div class="stat">권장 충원율<strong>${generationResult.preferred_fill_rate}%</strong></div>
      <div class="stat">최대 충원율<strong>${generationResult.max_fill_rate}%</strong></div>
      <div class="stat">추가 배정<strong>${generationResult.extra_assigned_count}</strong></div>
      <div class="stat">최대 슬롯<strong>${generationResult.max_total}</strong></div>
    </div></div>`;
  }
  const data = await API.getSchedule(selectedDepartmentId(), selectedTermId(), selectedWeekNo());
  const grouped = {};
  data.items.forEach(a => { if(!grouped[key(a.day, a.slotId)]) grouped[key(a.day, a.slotId)] = []; grouped[key(a.day, a.slotId)].push(a); });
  const tables = renderGroupedPanels((days, slots) => {
    let body = renderTableHeader(days);
    for(const slot of slots){
      body += `<tr><td class="time">${escapeHtml(slotDisplayLabel(slot))}</td>`;
      for(const day of days){
        const items = grouped[key(day.key, slot.id)] || [];
        const html = items.length ? items.map(a=>`<div class="${a.status==='UNFILLED'?'UNFILLED':''}" data-assignment="${a.id}">${escapeHtml(a.studentName)}</div>`).join('') : '<span class="muted">-</span>';
        body += `<td>${html}</td>`;
      }
      body += `</tr>`;
    }
    return tableShell(body);
  });
  const finalHoursPanel = renderStudentHoursPanel('최종 근무 시간 표', data.studentDayTotals || []);
  view().innerHTML = `${generatePanel}
  <div class="panel"><h2>전체 근무시간표</h2><div class="panel-body">
    <div class="toolbar"><button class="btn" id="downloadCsv">CSV 다운로드</button><button class="btn primary" id="confirmSchedule">시간표 확정</button></div>
    ${tables}
  </div></div>`;
  view().innerHTML += finalHoursPanel;
  $('#runGenerate').addEventListener('click', async () => {
    const res = await API.generateSchedule(selectedDepartmentId(), selectedTermId(), selectedWeekNo());
    showMessage('근무시간표가 자동 생성되었습니다.');
    renderSchedule(res.result);
  });
  $('#confirmSchedule').addEventListener('click', async () => { await API.confirmSchedule(selectedDepartmentId(), selectedTermId(), selectedWeekNo()); showMessage('시간표가 확정되었습니다.'); renderSchedule(); });
  $('#downloadCsv').addEventListener('click', () => downloadCsv('schedule.csv', data.items.map(a=>({day:a.day, slot:a.slotLabel, student:a.studentName, status:a.status}))));
}

async function renderMySchedule(){
  setTitle('나의 근무시간표');
  const studentId = selectedStudentId();
  const student = STATE.students.find(s=>s.id===studentId);
  const dep = STATE.departments.find(d=>d.id===selectedDepartmentId());
  const [availabilityData, scheduleData] = await Promise.all([
    API.getAvailability(studentId, selectedTermId(), selectedWeekNo()),
    API.getSchedule(selectedDepartmentId(), selectedTermId(), selectedWeekNo()),
  ]);
  const availabilityValues = {};
  availabilityData.items.forEach(i => availabilityValues[key(i.day, i.slotId)] = i.status);
  const grouped = {};
  scheduleData.items.forEach(a => { if(!grouped[key(a.day, a.slotId)]) grouped[key(a.day, a.slotId)] = []; grouped[key(a.day, a.slotId)].push(a); });
  const mine = scheduleData.items.filter(a=>a.studentId===studentId);
  const grids = renderGroupedPanels((days, slots) => {
    let gridBody = renderTableHeader(days);
    for(const slot of slots){
      gridBody += `<tr><td class="time">${escapeHtml(slotDisplayLabel(slot))}</td>`;
      for(const day of days){
        const items = grouped[key(day.key, slot.id)] || [];
        const hit = items.some(a=>a.studentId===studentId);
        const status = availabilityValues[key(day.key, slot.id)] || 'NA';
        gridBody += `<td class="${hit ? 'highlight' : ''}">${renderStatusChip(status, true)}</td>`;
      }
      gridBody += `</tr>`;
    }
    const totals = {};
    for(const day of days) totals[day.key] = 0;
    for(const item of mine){
      if(!totals.hasOwnProperty(item.day)) continue;
      const slot = STATE.slots.find(s => s.id === item.slotId);
      if(slot) totals[item.day] += Number(slot.durationHours || 0);
    }
    return tableShell(gridBody + renderTotalsFooter(days, totals));
  });
  const total = mine.reduce((sum,a)=>sum + (STATE.slots.find(s=>s.id===a.slotId)?.durationHours || 0), 0);
  const rows = mine.map(a => {
    const dayLabel = STATE.days.find(d => d.key === a.day)?.label || a.day;
    return `<tr><td>${dayLabel}</td><td>${a.slotLabel}</td><td>${escapeHtml(dep?.location || '-')}</td><td>${escapeHtml(statusLabel[a.status] || a.status)}</td></tr>`;
  }).join('');
  view().innerHTML = `<div class="panel"><h2>${escapeHtml(student?.name)} 학생 근무 개요</h2><div class="panel-body">
    <p><strong>이름:</strong> ${escapeHtml(student?.name)} &nbsp; <strong>부서:</strong> ${escapeHtml(dep?.name)} &nbsp; <strong>이번 주 근무시간:</strong> ${total}h</p>
    <div class="toolbar"><span class="badge ASSIGNED">배정 슬롯</span><button class="btn right" id="downloadMine">개인 CSV 다운로드</button></div>
    ${grids}
  </div></div>
  <div class="panel"><h2>근무 내역</h2><div class="panel-body">
    <div class="table-wrap"><table class="schedule-table"><tr><th>요일</th><th>시간</th><th>근무 장소</th><th>상태</th></tr>${rows || '<tr><td colspan="4" class="empty">배정된 근무가 없습니다.</td></tr>'}</table></div>
    <br><button class="btn">Google Calendar에 추가</button> <button class="btn">대타 요청</button>
  </div></div>`;
  $('#downloadMine').addEventListener('click', () => downloadCsv(`${student.name}_schedule.csv`, mine.map(a=>({day:a.day, slot:a.slotLabel, student:a.studentName, status:a.status}))));
}

function downloadCsv(filename, rows){
  const cols = Object.keys(rows[0] || {empty:''});
  const csv = [cols.join(','), ...rows.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g,'""')}"`).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href);
}

init().catch(err => { console.error(err); view().innerHTML = `<div class="empty">초기화 실패: ${escapeHtml(err.message)}</div>`; });
