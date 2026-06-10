function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

const API = {
  async request(url, options = {}) {
    const headers = {'Content-Type': 'application/json', ...(options.headers || {})};
    const method = options.method || 'GET';
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) headers['X-CSRFToken'] = getCookie('csrftoken');
    const res = await fetch(url, {...options, headers});
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || '요청 처리 중 오류가 발생했습니다.');
    return data;
  },
  bootstrap(){ return this.request('/api/bootstrap/'); },
  getAvailability(studentId, termId, weekNo){ return this.request(`/api/availability/${studentId}/${termId}/${weekNo}/`); },
  saveAvailability(studentId, termId, weekNo, items){ return this.request(`/api/availability/${studentId}/${termId}/${weekNo}/`, {method:'PUT', body:JSON.stringify({items})}); },
  getAvailabilitySummary(departmentId, termId, weekNo){ return this.request(`/api/availability-summary/${departmentId}/${termId}/${weekNo}/`); },
  getRequirements(departmentId, termId, weekNo){ return this.request(`/api/requirements/${departmentId}/${termId}/${weekNo}/`); },
  saveRequirements(departmentId, termId, weekNo, items){ return this.request(`/api/requirements/${departmentId}/${termId}/${weekNo}/`, {method:'PUT', body:JSON.stringify({items})}); },
  generateSchedule(departmentId, termId, weekNo){ return this.request('/api/generate/', {method:'POST', body:JSON.stringify({departmentId, termId, weekNo})}); },
  getSchedule(departmentId, termId, weekNo){ return this.request(`/api/schedule/${departmentId}/${termId}/${weekNo}/`); },
  updateAssignment(assignmentId, studentId){ return this.request(`/api/assignments/${assignmentId}/`, {method:'PATCH', body:JSON.stringify({studentId})}); },
  confirmSchedule(departmentId, termId, weekNo){ return this.request(`/api/confirm/${departmentId}/${termId}/${weekNo}/`, {method:'POST', body:JSON.stringify({})}); },
};
