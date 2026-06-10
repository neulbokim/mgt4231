const STATE = {
  route: 'status',
  departments: [], terms: [], students: [], slots: [], days: [], statuses: [],
};
const statusOrder = ['AVAILABLE', 'CLASS', 'MEAL', 'ETC', 'PREFERRED'];
const statusLabel = {AVAILABLE:'근무 가능', CLASS:'수업', MEAL:'식사', ETC:'기타', PREFERRED:'근무 희망'};

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
  const dayLabel = {MON:'월', TUE:'화', WED:'수', THU:'목', FRI:'금', SAT:'토', SUN:'일'};
  if(Array.isArray(slot.activeDays) && slot.activeDays.length === 1){
    return `${slot.label} (${dayLabel[slot.activeDays[0]] || slot.activeDays[0]})`;
  }
  return slot.label;
}

function tableShell(inner){ return `<div class="table-wrap"><table class="schedule-table">${inner}</table></div>`; }
function headerRow(){ return `<tr><th class="time">시간대</th>${STATE.days.map(d=>`<th>${d.label}</th>`).join('')}</tr>`; }
function statusBadge(s){ return `<span class="badge ${s}">${statusLabel[s] || s}</span>`; }
function legend(){ return `<div class="legend">${statusOrder.map(s=>statusBadge(s)).join('')} <span class="badge ASSIGNED">배정</span> <span class="badge UNFILLED">#N/A</span></div>`; }

async function init(){
  const data = await API.bootstrap();
  Object.assign(STATE, data);
  fillSelects();
  bindNavigation();
  refreshUserBar();
  window.addEventListener('hashchange', () => navigate(location.hash.replace('#','') || 'status'));
  navigate(location.hash.replace('#','') || 'status');
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
function navigate(route){ STATE.route = route; document.querySelectorAll('.sidebar button').forEach(b=>b.classList.toggle('active', b.dataset.route===route)); render(); }
function render(){
  const map = {status:renderStatus, availability:renderAvailability, summary:renderSummary, requirements:renderRequirements, generate:renderGenerate, schedule:renderSchedule, 'student-slots':renderStudentSlots, 'my-schedule':renderMySchedule};
  (map[STATE.route] || renderStatus)();
}

function renderStatus(){
  setTitle('신청 현황');
  const students = departmentStudents();
  view().innerHTML = `<div class="panel"><h2>근무시간표 조율 현황</h2><div class="panel-body">
    <div class="stats">
      <div class="stat">선발 학생 수<strong>${students.length}</strong></div>
      <div class="stat">입력 대상 주차<strong>${selectedWeekNo()}주차</strong></div>
      <div class="stat">현재 단계<strong>작성 중</strong></div>
      <div class="stat">부서<strong>${escapeHtml(STATE.departments.find(d=>d.id===selectedDepartmentId())?.name)}</strong></div>
    </div>
    <p class="muted">학생은 근무 희망 시간을 입력하고, 직원은 가능 시간 수합 → 필요 인원 설정 → 자동 시간표 생성 → 확정 순서로 진행합니다.</p>
  </div></div>
  <div class="panel"><h2>업무 흐름</h2><div class="panel-body list">
    1. 학생별 근무 가능/수업/식사/기타 시간 입력<br>
    2. 직원이 학생별 가능 시간 자동 수합 확인<br>
    3. 부서별 요일·시간대 필요 인원 설정<br>
    4. 제약조건 기반 자동 시간표 생성<br>
    5. 학생별 배정 슬롯 하이라이트 확인 및 시간표 확정
  </div></div>`;
}

async function renderAvailability(){
  setTitle('근무 희망 입력');
  const studentId = selectedStudentId();
  const data = await API.getAvailability(studentId, selectedTermId(), selectedWeekNo());
  const values = {};
  data.items.forEach(i => values[key(i.day, i.slotId)] = i.status);
  let body = headerRow();
  for(const slot of STATE.slots){
    body += `<tr><td class="time">${escapeHtml(slotDisplayLabel(slot))}</td>`;
    for(const day of STATE.days){
      if(!slotActiveOnDay(slot, day.key)){
        body += `<td class="dim inactive">-</td>`;
        continue;
      }
      const current = values[key(day.key, slot.id)] || 'ETC';
      body += `<td class="${current}"><select data-day="${day.key}" data-slot="${slot.id}">${statusOrder.map(s=>`<option value="${s}" ${s===current?'selected':''}>${statusLabel[s]}</option>`).join('')}</select></td>`;
    }
    body += `</tr>`;
  }
  view().innerHTML = `<div class="panel"><h2>학생별 근무 희망 시간 입력</h2><div class="panel-body">
    <div class="toolbar">${legend()}<button class="btn primary right" id="saveAvailability">저장</button></div>
    ${tableShell(body)}
  </div></div>`;
  view().querySelectorAll('select[data-day]').forEach(sel => sel.addEventListener('change', e => { e.target.parentElement.className = e.target.value; }));
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
  let body = headerRow();
  for(const slot of STATE.slots){
    body += `<tr><td class="time">${escapeHtml(slotDisplayLabel(slot))}</td>`;
    for(const day of STATE.days){
      if(!slotActiveOnDay(slot, day.key)){
        body += `<td class="dim inactive">-</td>`;
        continue;
      }
      const list = data.summary[key(day.key, slot.id)] || [];
      body += `<td>${list.map(x=>escapeHtml(x.name)).join('<br>') || '<span class="muted">-</span>'}</td>`;
    }
    body += `</tr>`;
  }
  view().innerHTML = `<div class="panel"><h2>입력 현황</h2><div class="panel-body two-col">
    <div>제출 완료 <strong>${submitted.length}</strong>명<br><span class="muted">${submitted.map(s=>s.name).join(', ') || '-'}</span></div>
    <div>미제출 <strong>${notSubmitted.length}</strong>명<br><span class="muted">${notSubmitted.map(s=>s.name).join(', ') || '-'}</span></div>
  </div></div>
  <div class="panel"><h2>시간대별 근무 가능 학생</h2><div class="panel-body">${tableShell(body)}</div></div>`;
}

async function renderRequirements(){
  setTitle('부서 필요 인원 설정');
  const data = await API.getRequirements(selectedDepartmentId(), selectedTermId(), selectedWeekNo());
  const values = {}; data.items.forEach(i => values[key(i.day, i.slotId)] = i);
  let body = headerRow();
  for(const slot of STATE.slots){
    body += `<tr><td class="time">${escapeHtml(slotDisplayLabel(slot))}</td>`;
    for(const day of STATE.days){
      if(!slotActiveOnDay(slot, day.key)){
        body += `<td class="dim inactive">-</td>`;
        continue;
      }
      const current = values[key(day.key, slot.id)] || {requiredCount: 1, preferredCount: 2};
      body += `<td><div class="requirement-cell">
        <label><span class="muted">최소</span><input class="input-mini" type="number" min="0" max="5" value="${current.requiredCount ?? 0}" data-day="${day.key}" data-slot="${slot.id}" data-field="requiredCount"></label>
        <label><span class="muted">권장</span><input class="input-mini" type="number" min="0" max="5" value="${current.preferredCount ?? 0}" data-day="${day.key}" data-slot="${slot.id}" data-field="preferredCount"></label>
      </div></td>`;
    }
    body += `</tr>`;
  }
  view().innerHTML = `<div class="panel"><h2>요일·시간대별 필요 인원</h2><div class="panel-body">
    <div class="toolbar"><button class="btn" id="fillDefault">기본값 1/2</button><button class="btn primary right" id="saveRequirements">저장</button></div>
    ${tableShell(body)}
  </div></div>`;
  $('#fillDefault').addEventListener('click', () => {
    view().querySelectorAll('input[data-field="requiredCount"]').forEach(inp => inp.value = 1);
    view().querySelectorAll('input[data-field="preferredCount"]').forEach(inp => inp.value = 2);
  });
  $('#saveRequirements').addEventListener('click', async () => {
    const grouped = {};
    [...view().querySelectorAll('input[data-day]')].forEach(inp => {
      const k = key(inp.dataset.day, inp.dataset.slot);
      if(!grouped[k]) grouped[k] = {day: inp.dataset.day, slotId: Number(inp.dataset.slot), requiredCount: 0, preferredCount: 0, priority:'GENERAL'};
      grouped[k][inp.dataset.field] = Number(inp.value || 0);
    });
    const items = Object.values(grouped).map(item => ({...item, preferredCount: Math.max(item.preferredCount || 0, item.requiredCount || 0)}));
    await API.saveRequirements(selectedDepartmentId(), selectedTermId(), selectedWeekNo(), items);
    showMessage('부서 필요 인원이 저장되었습니다.');
  });
}

function renderGenerate(){
  setTitle('근무시간표 자동 생성');
  view().innerHTML = `<div class="panel"><h2>자동 생성 조건</h2><div class="panel-body list">
    <label><input type="checkbox" checked disabled> 주당 최대 14시간 이하</label><br>
    <label><input type="checkbox" checked disabled> 하루 8시간 미만</label><br>
    <label><input type="checkbox" checked disabled> 수업/기타 시간 배정 금지</label><br>
    <label><input type="checkbox" checked disabled> 근무 희망 시간 우선 반영</label><br>
    <label><input type="checkbox" checked disabled> 부서 필요 인원 최소 1명, 권장 2명 반영</label><br>
    <label><input type="checkbox" checked disabled> 학생별 근무시간 균형 고려</label><br><br>
    <button class="btn primary" id="runGenerate">자동 시간표 생성</button>
  </div></div><div id="generateResult"></div>`;
  $('#runGenerate').addEventListener('click', async () => {
    const res = await API.generateSchedule(selectedDepartmentId(), selectedTermId(), selectedWeekNo());
    const r = res.result;
    $('#generateResult').innerHTML = `<div class="panel"><h2>생성 결과</h2><div class="panel-body stats">
      <div class="stat">필수 충원율<strong>${r.fill_rate}%</strong></div>
      <div class="stat">필수 슬롯<strong>${r.required_total}</strong></div>
      <div class="stat">필수 배정<strong>${r.filled_total}</strong></div>
      <div class="stat">미충원<strong>${r.unfilled_count}</strong></div>
      <div class="stat">권장 충원율<strong>${r.preferred_fill_rate}%</strong></div>
      <div class="stat">추가 배정<strong>${r.extra_assigned_count}</strong></div>
    </div></div>`;
    showMessage('근무시간표가 자동 생성되었습니다.');
  });
}

async function renderSchedule(){
  setTitle('전체 근무시간표');
  const data = await API.getSchedule(selectedDepartmentId(), selectedTermId(), selectedWeekNo());
  const grouped = {};
  data.items.forEach(a => { if(!grouped[key(a.day, a.slotId)]) grouped[key(a.day, a.slotId)] = []; grouped[key(a.day, a.slotId)].push(a); });
  let body = headerRow();
  for(const slot of STATE.slots){
    body += `<tr><td class="time">${escapeHtml(slotDisplayLabel(slot))}</td>`;
    for(const day of STATE.days){
      if(!slotActiveOnDay(slot, day.key)){
        body += `<td class="dim inactive">-</td>`;
        continue;
      }
      const items = grouped[key(day.key, slot.id)] || [];
      const html = items.length ? items.map(a=>`<div class="${a.status==='UNFILLED'?'UNFILLED':''}" data-assignment="${a.id}">${escapeHtml(a.studentName)}</div>`).join('') : '<span class="muted">-</span>';
      body += `<td>${html}</td>`;
    }
    body += `</tr>`;
  }
  const hours = data.summary.studentHours || {};
  const hoursHtml = Object.entries(hours).map(([name,h])=>`${escapeHtml(name)} ${h}h`).join(' / ') || '-';
  view().innerHTML = `<div class="panel"><h2>전체 근무시간표</h2><div class="panel-body">
    <div class="toolbar"><button class="btn" id="downloadCsv">CSV 다운로드</button><button class="btn primary" id="confirmSchedule">시간표 확정</button></div>
    ${tableShell(body)}
    <p><strong>학생별 근무시간 합계</strong><br>${hoursHtml}</p>
  </div></div>`;
  $('#confirmSchedule').addEventListener('click', async () => { await API.confirmSchedule(selectedDepartmentId(), selectedTermId(), selectedWeekNo()); showMessage('시간표가 확정되었습니다.'); renderSchedule(); });
  $('#downloadCsv').addEventListener('click', () => downloadCsv('schedule.csv', data.items.map(a=>({day:a.day, slot:a.slotLabel, student:a.studentName, status:a.status}))));
}

async function renderStudentSlots(){
  setTitle('학생별 근무 슬롯 확인');
  const studentId = selectedStudentId();
  const student = STATE.students.find(s=>s.id===studentId);
  const data = await API.getSchedule(selectedDepartmentId(), selectedTermId(), selectedWeekNo());
  const grouped = {}; data.items.forEach(a => { if(!grouped[key(a.day, a.slotId)]) grouped[key(a.day, a.slotId)] = []; grouped[key(a.day, a.slotId)].push(a); });
  const mine = data.items.filter(a=>a.studentId===studentId);
  let body = headerRow();
  for(const slot of STATE.slots){
    body += `<tr><td class="time">${escapeHtml(slotDisplayLabel(slot))}</td>`;
    for(const day of STATE.days){
      if(!slotActiveOnDay(slot, day.key)){
        body += `<td class="dim inactive">-</td>`;
        continue;
      }
      const items = grouped[key(day.key, slot.id)] || [];
      const hit = items.some(a=>a.studentId===studentId);
      body += `<td class="${hit?'highlight':'dim'}">${hit ? '근무' : ''}</td>`;
    }
    body += `</tr>`;
  }
  const total = mine.reduce((sum,a)=>sum + (STATE.slots.find(s=>s.id===a.slotId)?.durationHours || 0), 0);
  view().innerHTML = `<div class="panel"><h2>${escapeHtml(student?.name)} 학생 배정 슬롯</h2><div class="panel-body">
    <div class="toolbar"><span class="badge ASSIGNED">배정 슬롯</span><strong>주간 총 근무시간: ${total}h</strong><button class="btn right" id="downloadMine">개인 CSV 다운로드</button></div>
    ${tableShell(body)}
  </div></div>`;
  $('#downloadMine').addEventListener('click', () => downloadCsv(`${student.name}_schedule.csv`, mine.map(a=>({day:a.day, slot:a.slotLabel, student:a.studentName, status:a.status}))));
}

async function renderMySchedule(){
  setTitle('나의 근무시간표');
  const studentId = selectedStudentId();
  const student = STATE.students.find(s=>s.id===studentId);
  const dep = STATE.departments.find(d=>d.id===selectedDepartmentId());
  const data = await API.getSchedule(selectedDepartmentId(), selectedTermId(), selectedWeekNo());
  const mine = data.items.filter(a=>a.studentId===studentId);
  const rows = mine.map(a=>`<tr><td>${a.day}</td><td>${a.slotLabel}</td><td>${escapeHtml(dep?.location || '-')}</td><td>${a.status}</td></tr>`).join('');
  const total = mine.reduce((sum,a)=>sum + (STATE.slots.find(s=>s.id===a.slotId)?.durationHours || 0), 0);
  view().innerHTML = `<div class="panel"><h2>나의 근무시간표</h2><div class="panel-body">
    <p><strong>이름:</strong> ${escapeHtml(student?.name)} &nbsp; <strong>부서:</strong> ${escapeHtml(dep?.name)} &nbsp; <strong>이번 주 근무시간:</strong> ${total}h</p>
    <div class="table-wrap"><table class="schedule-table"><tr><th>요일</th><th>시간</th><th>근무 장소</th><th>상태</th></tr>${rows || '<tr><td colspan="4" class="empty">배정된 근무가 없습니다.</td></tr>'}</table></div>
    <br><button class="btn">Google Calendar에 추가</button> <button class="btn">대타 요청</button>
  </div></div>`;
}

function downloadCsv(filename, rows){
  const cols = Object.keys(rows[0] || {empty:''});
  const csv = [cols.join(','), ...rows.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g,'""')}"`).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href);
}

init().catch(err => { console.error(err); view().innerHTML = `<div class="empty">초기화 실패: ${escapeHtml(err.message)}</div>`; });
