/**
 * Pure Client-Side Google Drive Resource Manager
 * No server or heavy backend needed. Runs directly in any web browser.
 * Admin Login: Username: cse | Password: 2027
 */

// Supabase Direct Credentials (No server.js needed)
const SUPABASE_URL = 'https://zeqefyxwhznqiyfgjmrn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplcWVmeXh3aHpucWl5ZmdqbXJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MjYwNTcsImV4cCI6MjA2MzMwMjA1N30.ktk-5EzJBa7W2zq5ALoYMDrRHrx0wScyiu874g0czaw';

// Admin Credentials
const ADMIN_USER = 'cse';
const ADMIN_PASS = '2027';

// ==============================================================================
// 1. GOOGLE DRIVE LINK UTILITY
// ==============================================================================

const GDriveUtils = {
  parseUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return { id: null, type: 'link', cleanUrl: '', isDrive: false };
    }

    const trimmed = rawUrl.trim();
    const isDrive = /drive\.google\.com|docs\.google\.com/.test(trimmed);

    if (!isDrive) {
      return { id: null, type: 'link', cleanUrl: trimmed, isDrive: false };
    }

    const folderMatch = trimmed.match(/\/drive\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) return { id: folderMatch[1], type: 'folder', cleanUrl: trimmed, isDrive: true };

    const docMatch = trimmed.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (docMatch) return { id: docMatch[1], type: 'document', cleanUrl: trimmed, isDrive: true };

    const sheetMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (sheetMatch) return { id: sheetMatch[1], type: 'spreadsheet', cleanUrl: trimmed, isDrive: true };

    const slideMatch = trimmed.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (slideMatch) return { id: slideMatch[1], type: 'presentation', cleanUrl: trimmed, isDrive: true };

    const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) return { id: fileMatch[1], type: 'file', cleanUrl: trimmed, isDrive: true };

    const paramMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (paramMatch) return { id: paramMatch[1], type: 'file', cleanUrl: trimmed, isDrive: true };

    const generalMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (generalMatch) return { id: generalMatch[1], type: 'file', cleanUrl: trimmed, isDrive: true };

    return { id: null, type: 'file', cleanUrl: trimmed, isDrive: true };
  },

  getDownloadInfo(url, type, fileId) {
    const parsed = this.parseUrl(url);
    const id = fileId || parsed.id;
    const finalType = type || parsed.type;

    if (!parsed.isDrive && !id) {
      return { downloadUrl: url, isFolder: false, note: 'External link' };
    }

    if (finalType === 'folder') {
      return { downloadUrl: null, isFolder: true, note: 'Google Drive folder' };
    }

    if (!id) {
      return { downloadUrl: url, isFolder: false, note: 'Original link' };
    }

    if (finalType === 'document') {
      return { downloadUrl: `https://docs.google.com/document/d/${id}/export?format=docx`, isFolder: false, note: 'Direct DOCX download' };
    }

    if (finalType === 'spreadsheet') {
      return { downloadUrl: `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`, isFolder: false, note: 'Exported as Excel' };
    }

    if (finalType === 'presentation') {
      return { downloadUrl: `https://docs.google.com/presentation/d/${id}/export/pptx`, isFolder: false, note: 'Exported as PPTX' };
    }

    return { downloadUrl: `https://drive.google.com/uc?export=download&id=${id}`, isFolder: false, note: 'Direct DOCX / file download' };
  },

  getOpenUrl(url, type, fileId) {
    const parsed = this.parseUrl(url);
    const id = fileId || parsed.id;
    const finalType = type || parsed.type;

    if (!id || !parsed.isDrive) return url;
    if (finalType === 'folder') return `https://drive.google.com/drive/folders/${id}`;
    if (finalType === 'document') return `https://docs.google.com/document/d/${id}/view`;
    if (finalType === 'spreadsheet') return `https://docs.google.com/spreadsheets/d/${id}/view`;
    if (finalType === 'presentation') return `https://docs.google.com/presentation/d/${id}/view`;
    return `https://drive.google.com/file/d/${id}/view`;
  }
};

// ==============================================================================
// 2. SUPABASE DIRECT CLIENT (No Server Backend Needed)
// ==============================================================================

const SupabaseService = {
  client: null,

  getClient() {
    if (!this.client && typeof window.supabase !== 'undefined') {
      try {
        this.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      } catch (err) {
        console.error('Supabase init error:', err);
      }
    }
    return this.client;
  },

  async getResources({ program = 'all' } = {}) {
    const client = this.getClient();
    let list = [];

    if (client) {
      try {
        const { data, error } = await client
          .from('resources')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          list = data;
        } else if (error) {
          console.warn('Supabase query error:', error.message);
          list = this.getLocalFallback();
        }
      } catch (e) {
        list = this.getLocalFallback();
      }
    } else {
      list = this.getLocalFallback();
    }

    if (program && program !== 'all') {
      if (program === 'APSSDC') {
        list = list.filter(r => r.category && r.category.toUpperCase().includes('APSSDC'));
      } else if (program.includes('SMARTBRIDGE')) {
        list = list.filter(r => r.category && (r.category.toUpperCase().includes('SMARTBRIDGE') || r.category.toUpperCase().includes('SMART BRIDGE') || r.category.toUpperCase().includes('APSCHE')));
      } else if (program.includes('HEXAING')) {
        list = list.filter(r => r.category && (r.category.toUpperCase().includes('HEXAING') || r.category.toUpperCase().includes('HEXHAD')));
      } else {
        list = list.filter(r => r.category && r.category.toUpperCase().includes(program.toUpperCase()));
      }
    }

    return list;
  },

  async addResource(data) {
    const client = this.getClient();
    const parsed = GDriveUtils.parseUrl(data.url);
    const payload = {
      title: data.title.trim(),
      url: data.url.trim(),
      category: data.category ? data.category.trim() : 'APSSDC - AWS',
      file_id: parsed.id || null,
      resource_type: parsed.type || 'file'
    };

    if (client) {
      const { data: res, error } = await client.from('resources').insert([payload]).select().single();
      if (error) {
        if (error.code === '42501' || error.message.includes('row-level security')) {
          console.warn('RLS policy error. Storing in local cache and notifying.');
          this.saveLocalFallbackItem(payload);
          throw new Error('Supabase RLS is blocking insert. Run in Supabase SQL editor: ALTER TABLE resources DISABLE ROW LEVEL SECURITY;');
        }
        throw error;
      }
      return res;
    } else {
      return this.saveLocalFallbackItem(payload);
    }
  },

  async deleteResource(id) {
    const client = this.getClient();
    if (client) {
      const { error } = await client.from('resources').delete().eq('id', id);
      if (error) {
        this.removeLocalFallbackItem(id);
        throw error;
      }
    }
    this.removeLocalFallbackItem(id);
    return true;
  },

  getLocalFallback() {
    try {
      const s = localStorage.getItem('DRIVEHUB_USER_LINKS');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  },

  saveLocalFallbackItem(item) {
    const list = this.getLocalFallback();
    item.id = item.id || ('local-' + Date.now());
    item.created_at = new Date().toISOString();
    list.unshift(item);
    localStorage.setItem('DRIVEHUB_USER_LINKS', JSON.stringify(list));
    return item;
  },

  removeLocalFallbackItem(id) {
    let list = this.getLocalFallback();
    list = list.filter(i => i.id !== id);
    localStorage.setItem('DRIVEHUB_USER_LINKS', JSON.stringify(list));
  }
};

// ==============================================================================
// 3. UI STATE & SIMPLE ADMIN AUTH (cse / 2027)
// ==============================================================================

const state = {
  resources: [],
  activeProgram: 'all',
  isAdmin: sessionStorage.getItem('DRIVEHUB_ADMIN') === 'true'
};

const dom = {
  grid: document.getElementById('resourceGrid'),
  emptyState: document.getElementById('emptyState'),
  categoryChips: document.getElementById('categoryChips'),
  toastContainer: document.getElementById('toastContainer'),

  adminModal: document.getElementById('adminModal'),
  adminLoginSection: document.getElementById('adminLoginSection'),
  adminDashboardSection: document.getElementById('adminDashboardSection'),
  adminLoginAlert: document.getElementById('adminLoginAlert'),
  adminAddForm: document.getElementById('adminAddForm'),
  adminUrlInput: document.getElementById('adminUrlInput'),
  adminUrlPreview: document.getElementById('adminUrlPreview'),
  adminPrevId: document.getElementById('adminPrevId'),
  adminPrevNote: document.getElementById('adminPrevNote'),
  adminPrevOpenBtn: document.getElementById('adminPrevOpenBtn'),
  adminLinksList: document.getElementById('adminLinksList')
};

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  updateAdminUI();
  await loadResources();
});

function updateAdminUI() {
  const adminBtn = document.getElementById('adminBtn');
  if (state.isAdmin) {
    if (adminBtn) {
      adminBtn.innerHTML = `
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background-color:#10b981;margin-right:2px;"></span>
        <span>Admin</span>
      `;
    }
  } else {
    if (adminBtn) {
      adminBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span>Admin</span>
      `;
    }
  }
}

function setupEventListeners() {
  if (dom.categoryChips) {
    const chips = dom.categoryChips.querySelectorAll('.category-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const prog = chip.dataset.program;
        state.activeProgram = prog;
        chips.forEach(c => c.classList.toggle('active', c === chip));
        loadResources();
      });
    });
  }

  if (dom.adminUrlInput) {
    dom.adminUrlInput.addEventListener('input', (e) => {
      updateAdminUrlPreview(e.target.value);
    });
  }
}

function updateAdminUrlPreview(url) {
  if (!url || url.trim().length < 8) {
    dom.adminUrlPreview.style.display = 'none';
    return;
  }
  const parsed = GDriveUtils.parseUrl(url);
  const dlInfo = GDriveUtils.getDownloadInfo(url, parsed.type, parsed.id);
  const openUrl = GDriveUtils.getOpenUrl(url, parsed.type, parsed.id);

  dom.adminUrlPreview.style.display = 'block';
  dom.adminPrevId.textContent = parsed.id || 'External / Non-Drive';
  dom.adminPrevNote.textContent = dlInfo.note;

  dom.adminPrevOpenBtn.onclick = () => {
    window.open(openUrl, '_blank', 'noopener,noreferrer');
  };
}

async function loadResources() {
  try {
    const data = await SupabaseService.getResources({ program: state.activeProgram });
    state.resources = data;
    renderCards(data);
  } catch (err) {
    console.error('Error fetching resources:', err);
    renderCards([]);
  }
}

function renderCards(resources) {
  dom.grid.innerHTML = '';

  if (!resources || resources.length === 0) {
    if (dom.emptyState) dom.emptyState.style.display = 'block';
    return;
  }

  if (dom.emptyState) dom.emptyState.style.display = 'none';

  const frag = document.createDocumentFragment();

  resources.forEach(item => {
    const card = document.createElement('article');
    card.className = 'resource-card';
    card.id = `card-${item.id}`;

    const catParts = (item.category || '').split(' - ');
    const programName = catParts.length > 1 ? catParts[0] : '';
    const courseName = catParts.length > 1 ? catParts.slice(1).join(' - ') : item.category;

    const openUrl = GDriveUtils.getOpenUrl(item.url, item.resource_type, item.file_id);

    card.innerHTML = `
      <div>
        <div class="card-top">
          <div style="display:flex;align-items:center;gap:0.35rem;overflow:hidden;">
            ${programName ? `<span class="program-tag">${escapeHtml(programName)}</span>` : ''}
            ${courseName ? `<span class="category-tag">${escapeHtml(courseName)}</span>` : ''}
          </div>

          <div style="display:flex;align-items:center;gap:0.25rem;">
            ${state.isAdmin ? `
              <button class="btn btn-ghost btn-sm btn-icon-only btn-danger-ghost" title="Delete resource (Admin)" onclick="handleDeleteResource('${item.id}')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                </svg>
              </button>
            ` : ''}
            <button class="btn btn-ghost btn-sm btn-icon-only" title="Copy Link" onclick="copyLink('${escapeHtml(item.url)}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
            </button>
          </div>
        </div>

        <h2 class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h2>
      </div>

      <div class="card-actions">
        <a 
          href="${escapeHtml(openUrl)}" 
          target="_blank" 
          rel="noopener noreferrer" 
          class="btn btn-secondary btn-sm"
          title="Open in Google Drive"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          <span>Open</span>
        </a>

        <button 
          type="button" 
          class="btn btn-primary btn-sm"
          onclick="triggerDownload('${escapeHtml(item.url)}', '${item.resource_type || 'file'}', '${item.file_id || ''}', '${escapeHtml(item.title)}')"
          title="Direct download file"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Download</span>
        </button>
      </div>
    `;

    frag.appendChild(card);
  });

  dom.grid.appendChild(frag);
}

function triggerDownload(url, type, fileId, title) {
  const info = GDriveUtils.getDownloadInfo(url, type, fileId);

  if (info.isFolder) {
    showToast('Folder detected. Opening Google Drive to download...', 'info');
    setTimeout(() => {
      window.open(url, '_blank', 'noopener,noreferrer');
    }, 1000);
    return;
  }

  if (info.downloadUrl) {
    showToast(`Starting .docx download for "${title}"...`, 'success');
    window.open(info.downloadUrl, '_blank', 'noopener,noreferrer');
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

// ==============================================================================
// 4. ADMIN POPUP MODAL (Login: cse / 2027)
// ==============================================================================

function openAdminModal() {
  const modal = document.getElementById('adminModal');
  const loginSec = document.getElementById('adminLoginSection');
  const dashSec = document.getElementById('adminDashboardSection');
  if (state.isAdmin) {
    if (loginSec) loginSec.style.display = 'none';
    if (dashSec) dashSec.style.display = 'block';
    renderAdminLinksList();
  } else {
    if (loginSec) loginSec.style.display = 'block';
    if (dashSec) dashSec.style.display = 'none';
  }
  if (modal) modal.classList.add('active');
}

function closeAdminModal() {
  const modal = document.getElementById('adminModal');
  if (modal) modal.classList.remove('active');
}

// Simple direct authentication: username cse, password 2027
function handleAdminLoginSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;
  const alertBox = dom.adminLoginAlert;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    state.isAdmin = true;
    sessionStorage.setItem('DRIVEHUB_ADMIN', 'true');
    updateAdminUI();

    alertBox.style.display = 'none';
    showToast('Admin authenticated!', 'success');

    dom.adminLoginSection.style.display = 'none';
    dom.adminDashboardSection.style.display = 'block';
    renderAdminLinksList();
    renderCards(state.resources);
  } else {
    alertBox.style.display = 'block';
    alertBox.textContent = 'Invalid credentials. Please enter username cse and password 2027.';
  }
}

function handleAdminLogout() {
  state.isAdmin = false;
  sessionStorage.removeItem('DRIVEHUB_ADMIN');
  updateAdminUI();
  dom.adminLoginSection.style.display = 'block';
  dom.adminDashboardSection.style.display = 'none';
  showToast('Logged out.', 'info');
  renderCards(state.resources);
}

async function handleAddResourceSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('adminTitle').value.trim();
  const category = document.getElementById('adminCategory').value;
  const url = document.getElementById('adminUrlInput').value.trim();
  const submitBtn = document.getElementById('adminSubmitBtn');

  if (!title || !url) {
    showToast('Please enter both title and Google Drive URL.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Publishing...';

  try {
    await SupabaseService.addResource({ title, url, category });
    showToast('Link added successfully!', 'success');

    dom.adminAddForm.reset();
    dom.adminUrlPreview.style.display = 'none';

    await loadResources();
    renderAdminLinksList();

  } catch (err) {
    console.error('Add link error:', err);
    showToast(err.message || 'Failed to add link.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Publish Link';
  }
}

async function handleDeleteResource(id) {
  if (!confirm('Are you sure you want to delete this resource?')) return;

  try {
    await SupabaseService.deleteResource(id);
    showToast('Resource deleted.', 'success');
    await loadResources();
    if (dom.adminDashboardSection.style.display === 'block') {
      renderAdminLinksList();
    }
  } catch (err) {
    console.error('Delete error:', err);
    showToast('Failed to delete resource.', 'error');
  }
}

function renderAdminLinksList() {
  if (!dom.adminLinksList) return;
  dom.adminLinksList.innerHTML = '';

  if (state.resources.length === 0) {
    dom.adminLinksList.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem;text-align:center;padding:0.75rem;">No links stored yet.</div>';
    return;
  }

  state.resources.forEach(item => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:0.45rem 0;border-bottom:1px solid var(--border-color);font-size:0.8rem;';
    row.innerHTML = `
      <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:320px;">
        <strong>${escapeHtml(item.title)}</strong>
        <span style="color:var(--text-muted);margin-left:4px;font-size:0.725rem;">(${escapeHtml(item.category || '')})</span>
      </div>
      <div>
        <button class="btn btn-ghost btn-sm btn-icon-only btn-danger-ghost" title="Delete" onclick="handleDeleteResource('${item.id}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
          </svg>
        </button>
      </div>
    `;
    dom.adminLinksList.appendChild(row);
  });
}

// Helpers
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function copyLink(link) {
  try {
    await navigator.clipboard.writeText(link);
    showToast('Link copied to clipboard!', 'success');
  } catch {
    showToast('Link copied!', 'success');
  }
}

function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  dom.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 200);
  }, 3000);
}

function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  if (menu) {
    menu.classList.toggle('open');
  }
}

function selectProgramFromMobile(prog) {
  state.activeProgram = prog;
  const chips = dom.categoryChips ? dom.categoryChips.querySelectorAll('.category-chip') : [];
  chips.forEach(c => c.classList.toggle('active', c.dataset.program === prog));

  const mobileLinks = document.querySelectorAll('.mobile-menu-link');
  mobileLinks.forEach(link => {
    if (link.getAttribute('onclick')?.includes(`'${prog}'`)) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  toggleMobileMenu();
  loadResources();
}

function openAdminFromMobile() {
  toggleMobileMenu();
  openAdminModal();
}

// Global functions
window.openAdminModal = openAdminModal;
window.closeAdminModal = closeAdminModal;
window.handleAdminLoginSubmit = handleAdminLoginSubmit;
window.handleAdminLogout = handleAdminLogout;
window.handleAddResourceSubmit = handleAddResourceSubmit;
window.handleDeleteResource = handleDeleteResource;
window.triggerDownload = triggerDownload;
window.copyLink = copyLink;
window.toggleMobileMenu = toggleMobileMenu;
window.selectProgramFromMobile = selectProgramFromMobile;
window.openAdminFromMobile = openAdminFromMobile;
