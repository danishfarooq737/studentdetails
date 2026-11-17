/* StudentHub – Student Directory (HTML + CSS + Vanilla JS + LocalStorage) */
'use strict';

const STORAGE_KEY = 'studentHub.students';
const MAX_FILE = 2 * 1024 * 1024;               // 2 MB
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#dbeafe"/>' +
  '<circle cx="60" cy="46" r="22" fill="#93c5fd"/><path d="M16 120c4-30 26-42 44-42s40 12 44 42z" fill="#93c5fd"/></svg>');

const $ = (id) => document.getElementById(id);
const el = {
  burger: $('burger'), menu: $('menu'), grid: $('grid'), empty: $('empty'), emptyMsg: $('emptyMsg'),
  search: $('search'), deptFilter: $('deptFilter'), sort: $('sort'), form: $('form'),
  preview: $('preview'), photo: $('photo'), formTitle: $('formTitle'), submitBtn: $('submitBtn'),
  cancelEdit: $('cancelEdit'), resetBtn: $('resetBtn'), modal: $('modal'), toasts: $('toasts'),
  deptList: $('deptList')
};
const FIELDS = ['name', 'father', 'roll', 'email', 'phone', 'gender', 'dob', 'dept', 'admission', 'address', 'intro'];

let students = [];      // in-memory copy of LocalStorage data
let editingId = null;   // id of student being edited (null = adding)
let currentPhoto = '';  // Base64 data URL of the selected picture

/* ---------- Storage ---------- */
function loadStudents() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
  } catch (e) { return []; }                     // empty or corrupted storage
}
function saveStudents() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(students)); return true; }
  catch (e) { toast('Storage is full or unavailable. Could not save.', true); return false; }
}
function uid() {
  return 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------- Helpers ---------- */
function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function toast(msg, isError) {
  const t = document.createElement('div');
  t.className = 'toast' + (isError ? ' error' : '');
  t.textContent = msg;
  el.toasts.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(v + 'T00:00:00');
  return isNaN(d) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/* ---------- Statistics ---------- */
function updateStats() {
  if (!$('statTotal')) return;   // is page par stats nahi hain
  // ... baqi code wesa hi
  const depts = new Set(students.map((s) => s.dept.trim().toLowerCase()).filter(Boolean));
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  $('statTotal').textContent = students.length;
  $('statDepts').textContent = depts.size;
  $('statRecent').textContent = students.filter((s) => s.createdAt >= weekAgo).length;
}

/* ---------- Department filter + datalist ---------- */
function updateDepartments() {
  if (!el.deptFilter || !el.deptList) return;
  // ... baqi code wesa hi
  const names = [];
  const seen = new Set();
  students.forEach((s) => {
    const d = s.dept.trim(), k = d.toLowerCase();
    if (d && !seen.has(k)) { seen.add(k); names.push(d); }
  });
  names.sort((a, b) => a.localeCompare(b));
  const selected = el.deptFilter.value;
  el.deptFilter.innerHTML = '<option value="">All Departments</option>' +
    names.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
  el.deptFilter.value = names.includes(selected) ? selected : '';
  el.deptList.innerHTML = names.map((n) => `<option value="${esc(n)}"></option>`).join('');
}

/* ---------- Rendering ---------- */
function getVisible() {
  const q = el.search.value.trim().toLowerCase();
  const dept = el.deptFilter.value.toLowerCase();
  let list = students.filter((s) =>
    (!q || [s.name, s.roll, s.dept].some((v) => v.toLowerCase().includes(q))) &&
    (!dept || s.dept.trim().toLowerCase() === dept));
  const mode = el.sort.value;
  list.sort((a, b) => mode === 'new' ? b.createdAt - a.createdAt
    : mode === 'za' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name));
  return list;
}
function renderStudents() {
  const list = getVisible();
  el.grid.innerHTML = list.map((s) => `
    <article class="card" data-id="${esc(s.id)}">
      <img src="${esc(s.photo || DEFAULT_AVATAR)}" alt="Photo of ${esc(s.name)}">
      <h3>${esc(s.name)}</h3>
      <p class="roll">Roll No: ${esc(s.roll)}</p>
      <span class="tag">${esc(s.dept || 'No department')}</span>
      <p class="mail">${esc(s.email || 'No email provided')}</p>
      <div class="actions">
        <button class="btn primary" data-act="view">View Profile</button>
        <button class="btn ghost" data-act="edit">Edit</button>
        <button class="btn danger" data-act="delete">Delete</button>
      </div>
    </article>`).join('');
  const none = list.length === 0;
  el.empty.hidden = !none;
  el.grid.hidden = none;
  if (none) {
    el.emptyMsg.textContent = students.length
      ? 'No students match your search or filter. Try different keywords.'
      : 'No students registered yet. Add your first student to get started.';
  }
}
function refresh() { updateDepartments(); updateStats(); renderStudents(); }

/* ---------- Profile modal ---------- */
function openProfile(id) {
  const s = students.find((x) => x.id === id);
  if (!s) return;
  $('pImg').src = s.photo || DEFAULT_AVATAR;
  $('pImg').alt = 'Photo of ' + s.name;
  $('pName').textContent = s.name;
  $('pDept').textContent = s.dept || 'No department';
  const rows = [['Father Name', s.father], ['Roll Number', s.roll], ['Email', s.email], ['Phone', s.phone],
    ['Gender', s.gender], ['Date of Birth', fmtDate(s.dob)], ['Department', s.dept],
    ['Admission Date', fmtDate(s.admission)], ['Address', s.address], ['Introduction', s.intro]];
  $('pList').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v || '—')}</dd>`).join('');
  el.modal.hidden = false;
  document.body.style.overflow = 'hidden';
  $('pBack').focus();
}
function closeProfile() {
  el.modal.hidden = true;
  document.body.style.overflow = '';
  location.hash = '#students';
}

/* ---------- Form ---------- */
function setErr(field, msg) {
  const e = $('err-' + field), i = $(field);
  if (e) e.textContent = msg || '';
  if (i) i.classList.toggle('invalid', !!msg);
}
function clearErrors() { ['photo', 'name', 'roll', 'email', 'phone', 'dob'].forEach((f) => setErr(f, '')); }

function resetForm() {
  el.form.reset();
  editingId = null;
  currentPhoto = '';
  el.preview.src = DEFAULT_AVATAR;
  el.formTitle.textContent = 'Add New Student';
  el.submitBtn.textContent = 'Submit Student';
  el.cancelEdit.hidden = true;
  clearErrors();
}
function startEdit(id) {
  const s = students.find((x) => x.id === id);
  if (!s) return;
  resetForm();
  editingId = id;
  FIELDS.forEach((f) => { $(f).value = s[f] || ''; });
  currentPhoto = s.photo || '';
  el.preview.src = currentPhoto || DEFAULT_AVATAR;
  el.formTitle.textContent = 'Edit Student';
  el.submitBtn.textContent = 'Update Student';
  el.cancelEdit.hidden = false;
  location.hash = '#add';
}

/* Read image, validate, shrink (keeps LocalStorage small) and return Base64 */
function processImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('The file is not a valid image.'));
      img.onload = () => {
        const max = 480, scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
async function onPhotoChange() {
  const file = el.photo.files[0];
  setErr('photo', '');
  if (!file) return;
  if (!TYPES.includes(file.type)) { setErr('photo', 'Only JPG, JPEG, PNG or WebP images are allowed.'); el.photo.value = ''; return; }
  if (file.size > MAX_FILE) { setErr('photo', 'Image must be 2 MB or smaller.'); el.photo.value = ''; return; }
  try {
    currentPhoto = await processImage(file);
    el.preview.src = currentPhoto;
  } catch (err) { setErr('photo', err.message); el.photo.value = ''; }
}

function validate(data) {
  clearErrors();
  let ok = true;
  const fail = (f, m) => { setErr(f, m); ok = false; };
  if (!currentPhoto) fail('photo', 'Profile picture is required.');
  if (!data.name) fail('name', 'Full name is required.');
  if (!data.roll) fail('roll', 'Roll number is required.');
  else if (students.some((s) => s.id !== editingId && s.roll.toLowerCase() === data.roll.toLowerCase()))
    fail('roll', 'This roll number already exists.');
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) fail('email', 'Enter a valid email address.');
  if (data.phone && !/^\+?[0-9\s\-()]{7,18}$/.test(data.phone)) fail('phone', 'Enter a valid phone number.');
  if (data.dob && data.dob > todayStr()) fail('dob', 'Date of birth cannot be in the future.');
  return ok;
}

function onSubmit(e) {
  e.preventDefault();
  const data = {};
  FIELDS.forEach((f) => { data[f] = $(f).value.trim(); });
  if (!validate(data)) { toast('Please fix the highlighted errors.', true); return; }
  data.photo = currentPhoto;

  const backup = students.slice();
  if (editingId) {
    const i = students.findIndex((s) => s.id === editingId);
    students[i] = Object.assign({}, students[i], data);
  } else {
    students.push(Object.assign({ id: uid(), createdAt: Date.now() }, data));
  }
  if (!saveStudents()) { students = backup; return; }   // roll back if storage failed
  toast(editingId ? 'Student updated successfully!' : 'Student added successfully!');
  resetForm();
  refresh();
  location.hash = '#students';
}

function deleteStudent(id) {
  const s = students.find((x) => x.id === id);
  if (!s || !confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
  const backup = students.slice();
  students = students.filter((x) => x.id !== id);
  if (!saveStudents()) { students = backup; return; }
  if (editingId === id) resetForm();
  toast('Student deleted.');
  refresh();
}

/* ---------- Navigation ---------- */
function setupNav() {
  const toggle = (open) => {
    el.menu.classList.toggle('open', open);
    el.burger.classList.toggle('open', open);
    el.burger.setAttribute('aria-expanded', open);
  };
  el.burger.addEventListener('click', () => toggle(!el.menu.classList.contains('open')));
  el.menu.addEventListener('click', (e) => { if (e.target.tagName === 'A') toggle(false); });
  const links = [...el.menu.querySelectorAll('a')];
  const sections = links.map((a) => $(a.getAttribute('href').slice(1)));
  window.addEventListener('scroll', () => {
    const y = window.scrollY + 120;
    let cur = 0;
    sections.forEach((s, i) => { if (s.offsetTop <= y) cur = i; });
    links.forEach((a, i) => a.classList.toggle('active', i === cur));
  }, { passive: true });
}

/* ---------- Init ---------- */
function init() {
  students = loadStudents();
  if ($('year')) $('year').textContent = new Date().getFullYear();
  if (el.preview) el.preview.src = DEFAULT_AVATAR;
  if ($('dob')) $('dob').max = todayStr();

  el.photo?.addEventListener('change', onPhotoChange);
  el.form?.addEventListener('submit', onSubmit);
  el.resetBtn?.addEventListener('click', () => { resetForm(); toast('Form reset.'); });
  el.cancelEdit?.addEventListener('click', () => { resetForm(); location.hash = '#students'; });
  [el.search, el.deptFilter, el.sort].forEach((c) => c?.addEventListener('input', renderStudents));
  el.grid?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.closest('.card').dataset.id;
    ({ view: openProfile, edit: startEdit, delete: deleteStudent })[btn.dataset.act](id);
  });
  $('heroAdd')?.addEventListener('click', () => { if (editingId) resetForm(); });
  $('pBack')?.addEventListener('click', closeProfile);
  el.modal?.addEventListener('click', (e) => { if (e.target === el.modal) closeProfile(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && el.modal && !el.modal.hidden) closeProfile(); });

  if (el.burger && el.menu) setupNav();
  refresh();
}
document.addEventListener('DOMContentLoaded', init);
