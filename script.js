// ===== storage.js =====
const PREFIX = 'lumen_';

const storage = {
  getItem(key, defaultValue = null) {
    const value = localStorage.getItem(PREFIX + key);
    return value !== null ? value : defaultValue;
  },

  setItem(key, value) {
    localStorage.setItem(PREFIX + key, value);
  },

  removeItem(key) {
    localStorage.removeItem(PREFIX + key);
  },

  getTheme() {
    return this.getItem('theme', 'light');
  },

  saveTheme(theme) {
    this.setItem('theme', theme);
  },

  getSidebarPinned() {
    return this.getItem('sidebar_pinned') === 'true';
  },

  saveSidebarPinned(pinned) {
    this.setItem('sidebar_pinned', pinned);
  },

  getWidth() {
    return this.getItem('width', '780');
  },

  saveWidth(width) {
    this.setItem('width', width);
  },

  getFocus() {
    return this.getItem('focus') === 'true';
  },

  saveFocus(focus) {
    this.setItem('focus', focus);
  },

  getTabs() {
    try {
      const tabs = this.getItem('tabs');
      return tabs ? JSON.parse(tabs) : [];
    } catch (e) {
      console.error('Failed to parse tabs from local storage', e);
      return [];
    }
  },

  saveTabs(tabs, activeTabId) {
    this.setItem('tabs', JSON.stringify(tabs));
    this.setItem('active_tab', activeTabId);
  },

  getActiveTabId() {
    return this.getItem('active_tab', '');
  },

  getStopwatch() {
    try {
      const state = this.getItem('stopwatch');
      return state ? JSON.parse(state) : null;
    } catch (e) {
      return null;
    }
  },

  saveStopwatch(state) {
    this.setItem('stopwatch', JSON.stringify(state));
  },

  getTimer() {
    try {
      const state = this.getItem('timer');
      return state ? JSON.parse(state) : null;
    } catch (e) {
      return null;
    }
  },

  saveTimer(state) {
    this.setItem('timer', JSON.stringify(state));
  },

  getAlarms() {
    try {
      const alarms = this.getItem('alarms');
      return alarms ? JSON.parse(alarms) : [];
    } catch (e) {
      return [];
    }
  },

  saveAlarms(alarms) {
    this.setItem('alarms', JSON.stringify(alarms));
  }
};


// ===== state.js =====

class State extends EventTarget {
  constructor() {
    super();
    this._state = {
      theme: storage.getTheme(),
      activeTabId: storage.getActiveTabId(),
      tabs: storage.getTabs(),
      isPasteActive: false,
      isSidebarPinned: storage.getSidebarPinned(),
      width: storage.getWidth(),
      focus: storage.getFocus()
    };

    // Ensure at least one tab exists
    if (!Array.isArray(this._state.tabs) || this._state.tabs.length === 0) {
      this._state.tabs = [
        {
          id: Date.now().toString(),
          name: 'Untitled',
          content: '',
          manuallyRenamed: false
        }
      ];
      this._state.activeTabId = this._state.tabs[0].id;
      storage.saveTabs(this._state.tabs, this._state.activeTabId);
    }
    
    if (!this._state.activeTabId || !this._state.tabs.find(t => t.id === this._state.activeTabId)) {
      this._state.activeTabId = this._state.tabs[0].id;
      storage.setItem('active_tab', this._state.activeTabId);
    }
  }

  get(key) {
    return this._state[key];
  }

  set(key, value) {
    if (this._state[key] !== value) {
      const oldValue = this._state[key];
      this._state[key] = value;
      this.dispatchEvent(new CustomEvent(`change:${key}`, {
        detail: { key, oldValue, newValue: value }
      }));
    }
  }

  getActiveTab() {
    return this._state.tabs.find(t => t.id === this._state.activeTabId) || this._state.tabs[0];
  }

  updateTabs(tabs, activeTabId) {
    this._state.tabs = tabs;
    if (activeTabId !== undefined) {
      this._state.activeTabId = activeTabId;
    }
    storage.saveTabs(this._state.tabs, this._state.activeTabId);
    
    this.dispatchEvent(new CustomEvent('change:tabs', {
      detail: { tabs: this._state.tabs, activeTabId: this._state.activeTabId }
    }));
  }
}

const state = new State();


// ===== tabs.js =====

const tabsManager = {
  createTab(name = 'Untitled', content = '', manuallyRenamed = false) {
    const newTab = {
      id: Date.now().toString(),
      name,
      content,
      manuallyRenamed
    };
    const tabs = [...state.get('tabs'), newTab];
    state.updateTabs(tabs, newTab.id);
    return newTab;
  },

  closeTab(tabId) {
    const tabs = state.get('tabs');
    const index = tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    const updatedTabs = [...tabs];
    updatedTabs.splice(index, 1);

    if (updatedTabs.length === 0) {
      updatedTabs.push({
        id: Date.now().toString(),
        name: 'Untitled',
        content: '',
        manuallyRenamed: false
      });
    }

    let activeTabId = state.get('activeTabId');
    if (activeTabId === tabId) {
      const newIndex = Math.min(index, updatedTabs.length - 1);
      activeTabId = updatedTabs[newIndex].id;
    }

    state.updateTabs(updatedTabs, activeTabId);
  },

  renameTab(tabId, newName) {
    const tabs = state.get('tabs').map(tab => {
      if (tab.id === tabId) {
        return { ...tab, name: newName || 'Untitled', manuallyRenamed: true };
      }
      return tab;
    });
    state.updateTabs(tabs);
  },

  autoRenameTab(tab) {
    if (tab.manuallyRenamed) return;

    const lines = tab.content.split('\n');
    let firstHeading = '';
    for (let line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(/^#+\s+(.+)$/);
      if (match) {
        firstHeading = match[1].trim();
        break;
      }
    }
    const name = firstHeading || 'Untitled';
    if (tab.name !== name) {
      const tabs = state.get('tabs').map(t => {
        if (t.id === tab.id) {
          return { ...t, name };
        }
        return t;
      });
      state.updateTabs(tabs);
    }
  },

  updateActiveTabContent(content) {
    const activeTabId = state.get('activeTabId');
    const tabs = state.get('tabs').map(t => {
      if (t.id === activeTabId) {
        const updated = { ...t, content };
        return updated;
      }
      return t;
    });
    
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab && !activeTab.manuallyRenamed) {
      const lines = content.split('\n');
      let firstHeading = '';
      for (let line of lines) {
        const trimmed = line.trim();
        const match = trimmed.match(/^#+\s+(.+)$/);
        if (match) {
          firstHeading = match[1].trim();
          break;
        }
      }
      activeTab.name = firstHeading || 'Untitled';
    }

    state.updateTabs(tabs);
  }
};


// ===== renderer.js =====

let mdInstance = null;

function getMd() {
  if (!mdInstance && window.markdownit) {
    mdInstance = window.markdownit({
      html: true,
      linkify: true,
      typographer: true,
      highlight: function (str, lang) {
        if (lang && window.hljs && window.hljs.getLanguage(lang)) {
          try {
            return window.hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
          } catch (__) {}
        }
        return '';
      }
    });
  }
  return mdInstance;
}

// Cached DOM Elements
let elements = null;

function getElements() {
  if (!elements) {
    elements = {
      readingContent: document.getElementById('reading-content'),
      emptyState: document.getElementById('empty-state'),
      errorState: document.getElementById('error-state'),
      loadingState: document.getElementById('loading-state'),
      errorMessage: document.getElementById('error-message'),
      readingMetrics: document.getElementById('reading-metrics'),
      metricsTime: document.getElementById('metrics-time'),
      metricsWords: document.getElementById('metrics-words'),
      progressBar: document.getElementById('progress-bar'),
      mainContent: document.querySelector('.main-content')
    };
  }
  return elements;
}

const renderer = {
  // Toast notifier injection (will be registered by app.js or toast feature)
  toastNotifier: null,

  registerToastNotifier(notifier) {
    this.toastNotifier = notifier;
  },

  hideAllStates() {
    const el = getElements();
    if (!el) return;
    if (el.readingContent) el.readingContent.style.display = 'none';
    if (el.emptyState) el.emptyState.style.display = 'none';
    if (el.errorState) el.errorState.style.display = 'none';
    if (el.loadingState) el.loadingState.style.display = 'none';
  },

  updateMetrics(text) {
    const el = getElements();
    if (!el || !el.readingMetrics) return;

    if (!text || text.trim() === '') {
      el.readingMetrics.style.display = 'none';
      return;
    }

    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const minutes = Math.max(1, Math.round(wordCount / 220));

    if (el.metricsTime) el.metricsTime.textContent = `${minutes} min read`;
    if (el.metricsWords) el.metricsWords.textContent = `${wordCount.toLocaleString()} words`;
    el.readingMetrics.style.display = 'flex';
  },

  setupHeadingAnchors(container) {
    const headings = container.querySelectorAll('h1, h2, h3');
    const slugCounts = {};

    headings.forEach(heading => {
      let headingText = '';
      heading.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          headingText += node.textContent;
        }
      });
      headingText = headingText.trim();
      if (!headingText) return;

      let slug = headingText
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

      if (!slug) slug = 'heading';

      if (slugCounts[slug] !== undefined) {
        slugCounts[slug]++;
        slug = `${slug}-${slugCounts[slug]}`;
      } else {
        slugCounts[slug] = 0;
      }

      heading.id = slug;

      const existingAnchor = heading.querySelector('.heading-anchor');
      if (existingAnchor) existingAnchor.remove();

      const anchor = document.createElement('a');
      anchor.className = 'heading-anchor';
      anchor.href = `#${slug}`;
      anchor.ariaLabel = `Link to section: ${headingText}`;
      anchor.title = 'Copy section link';
      anchor.textContent = '#';

      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const targetUrl = `${window.location.origin}${window.location.pathname}${window.location.search}#${slug}`;

        navigator.clipboard.writeText(targetUrl).then(() => {
          if (this.toastNotifier) {
            this.toastNotifier('Link copied to clipboard');
          }
          window.history.pushState(null, null, `#${slug}`);
          heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }).catch(() => {
          window.location.hash = slug;
        });
      });

      heading.appendChild(anchor);
    });
  },

  setupTaskLists(container) {
    const lis = container.querySelectorAll('li');
    let checkboxIndex = 0;
    lis.forEach(li => {
      let target = li;
      if (li.firstElementChild && li.firstElementChild.tagName === 'P') {
        target = li.firstElementChild;
      }

      const firstNode = target.firstChild;
      if (!firstNode || firstNode.nodeType !== Node.TEXT_NODE) return;

      const text = firstNode.textContent.trimLeft();
      const isTask = text.startsWith('[ ] ') || text.startsWith('[x] ') || text.startsWith('[X] ');
      
      if (isTask) {
        const isChecked = text.startsWith('[x] ') || text.startsWith('[X] ');
        li.classList.add('task-list-item');
        firstNode.textContent = text.substring(4);
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-list-item-checkbox';
        checkbox.checked = isChecked;
        checkbox.dataset.index = checkboxIndex;
        
        checkbox.addEventListener('change', (e) => {
          const idx = parseInt(e.target.dataset.index, 10);
          const checked = e.target.checked;
          this.toggleCheckboxInMarkdown(idx, checked);
        });
        
        target.insertBefore(checkbox, firstNode);
        target.insertBefore(document.createTextNode(' '), firstNode);
        
        checkboxIndex++;
      }
    });
  },

  toggleCheckboxInMarkdown(index, checked) {
    const activeTab = state.getActiveTab();
    if (!activeTab) return;

    let markdown = activeTab.content;
    let inCodeBlock = false;
    let currentCheckboxIndex = 0;
    const lines = markdown.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inCodeBlock) continue;
      
      const match = line.match(/^(\s*[-*+]\s+|\s*\d+\.\s+)(\[[ xX]\])/);
      if (match) {
        if (currentCheckboxIndex === index) {
          const newState = checked ? '[x]' : '[ ]';
          const prefixLen = match[1].length;
          lines[i] = line.substring(0, prefixLen) + newState + line.substring(prefixLen + 3);
          break;
        }
        currentCheckboxIndex++;
      }
    }
    const updatedMarkdown = lines.join('\n');
    tabsManager.updateActiveTabContent(updatedMarkdown);
  },

  renderDocument(markdownText) {
    this.hideAllStates();
    this.updateMetrics(markdownText);
    
    const el = getElements();
    if (!el) return;

    if (!markdownText || markdownText.trim() === '') {
      if (el.emptyState) el.emptyState.style.display = 'flex';
      return;
    }

    try {
      const parser = getMd();
      if (!parser) {
        this.showError('Markdown parser library was not found.');
        return;
      }
      
      const renderedHtml = parser.render(markdownText);
      if (el.readingContent) {
        el.readingContent.innerHTML = renderedHtml;
        this.setupHeadingAnchors(el.readingContent);
        this.setupTaskLists(el.readingContent);
        el.readingContent.style.display = 'block';
      }
      
      this.updateScrollProgress();

      if (window.location.hash) {
        setTimeout(() => {
          const targetId = decodeURIComponent(window.location.hash.substring(1));
          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      }
    } catch (err) {
      console.error(err);
      this.showError('Could not render document correctly.');
    }
  },

  showError(msg) {
    this.hideAllStates();
    const el = getElements();
    if (!el) return;
    if (el.errorMessage) {
      el.errorMessage.textContent = msg || 'An error occurred while loading the file.';
    }
    if (el.errorState) el.errorState.style.display = 'flex';
  },

  showLoading() {
    this.hideAllStates();
    const el = getElements();
    if (el && el.loadingState) {
      el.loadingState.style.display = 'flex';
    }
  },

  updateScrollProgress() {
    const el = getElements();
    if (!el || !el.mainContent || !el.progressBar) return;
    const scrollTop = el.mainContent.scrollTop;
    const docHeight = el.mainContent.scrollHeight - el.mainContent.clientHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    el.progressBar.style.width = `${progress}%`;
  }
};


// ===== audio.js =====
let globalAudioCtx = null;

function initAudioContext() {
  if (!globalAudioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      globalAudioCtx = new AudioContext();
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
}

// Click and keydown handlers on window to trigger context unlocking
window.addEventListener('click', initAudioContext);
window.addEventListener('keydown', initAudioContext);

const audio = {
  playAlertSound() {
    try {
      initAudioContext();
      if (!globalAudioCtx) return;

      let startTime = globalAudioCtx.currentTime;
      for (let i = 0; i < 3; i++) {
        const osc = globalAudioCtx.createOscillator();
        const gain = globalAudioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.5, startTime + 0.05);
        gain.gain.linearRampToValueAtTime(0, startTime + 0.25);

        osc.connect(gain);
        gain.connect(globalAudioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.3);
        startTime += 0.4;
      }
    } catch (err) {
      console.error('Audio play failed: ', err);
    }
  }
};


// ===== clock.js =====
const clock = {
  intervalId: null,
  alarmCallback: null,

  init(clockElement, alarmCallback) {
    this.alarmCallback = alarmCallback;

    const tick = () => {
      try {
        const timeParts = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }).formatToParts(new Date());

        let hour = '', minute = '', dayPeriod = '';
        timeParts.forEach(p => {
          if (p.type === 'hour') hour = p.value;
          if (p.type === 'minute') minute = p.value;
          if (p.type === 'dayPeriod') dayPeriod = p.value;
        });

        if (clockElement) {
          clockElement.textContent = `${hour}:${minute} ${dayPeriod}`;
        }
        
        if (this.alarmCallback) {
          this.alarmCallback();
        }
      } catch (err) {
        console.error(err);
      }
    };

    tick();
    this.intervalId = setInterval(tick, 1000);
  },

  destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
};


// ===== alarms.js =====

const alarmsManager = {
  alarms: [],
  listElement: null,
  showToastCallback: null,

  init(listEl, showToastCallback) {
    this.listElement = listEl;
    this.showToastCallback = showToastCallback;
    this.alarms = storage.getAlarms();
    this.render();
  },

  save() {
    storage.saveAlarms(this.alarms);
  },

  addAlarm(timeString) {
    if (!timeString) return;
    
    if (this.alarms.some(a => a.time === timeString)) {
      if (this.showToastCallback) this.showToastCallback('Alarm already exists');
      return;
    }

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    this.alarms.push({
      id: Date.now().toString(),
      time: timeString,
      active: true,
      triggeredToday: false
    });

    this.save();
    this.render();
  },

  deleteAlarm(id) {
    this.alarms = this.alarms.filter(a => a.id !== id);
    this.save();
    this.render();
  },

  toggleAlarm(id, active) {
    this.alarms = this.alarms.map(a => {
      if (a.id === id) {
        return { ...a, active, triggeredToday: active ? false : a.triggeredToday };
      }
      return a;
    });
    this.save();
  },

  checkAlarms() {
    const now = new Date();
    const timeParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: false
    }).formatToParts(now);

    let hour = '', minute = '';
    timeParts.forEach(p => {
      if (p.type === 'hour') hour = p.value;
      if (p.type === 'minute') minute = p.value;
    });

    const currentTimeString = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

    let updated = false;
    this.alarms.forEach(alarm => {
      if (alarm.active) {
        if (alarm.time === currentTimeString) {
          if (!alarm.triggeredToday) {
            alarm.triggeredToday = true;
            updated = true;
            this.triggerAlarm(alarm);
          }
        } else {
          if (alarm.triggeredToday) {
            alarm.triggeredToday = false;
            updated = true;
          }
        }
      }
    });

    if (updated) {
      this.save();
    }
  },

  triggerAlarm(alarm) {
    audio.playAlertSound();
    if (Notification.permission === 'granted') {
      new Notification('Lumen Alarm', { body: `Alarm for ${alarm.time} is ringing!` });
    }
    if (this.showToastCallback) {
      this.showToastCallback(`Alarm ringing: ${alarm.time}`);
    }
  },

  render() {
    if (!this.listElement) return;

    this.listElement.innerHTML = '';
    if (this.alarms.length === 0) {
      this.listElement.innerHTML = '<div style="font-size: 10px; color: var(--muted); text-align: center; padding: 4px;">No alarms</div>';
      return;
    }

    this.alarms.forEach(alarm => {
      const item = document.createElement('div');
      item.className = 'alarm-item';
      
      const info = document.createElement('div');
      info.className = 'alarm-info';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = alarm.active;
      checkbox.addEventListener('change', (e) => {
        this.toggleAlarm(alarm.id, e.target.checked);
      });

      const label = document.createElement('span');
      label.textContent = alarm.time;

      info.appendChild(checkbox);
      info.appendChild(label);

      const actions = document.createElement('div');
      actions.className = 'alarm-actions';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-alarm-delete';
      deleteBtn.title = 'Delete alarm';
      deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
      deleteBtn.addEventListener('click', () => {
        this.deleteAlarm(alarm.id);
      });

      actions.appendChild(deleteBtn);

      item.appendChild(info);
      item.appendChild(actions);

      this.listElement.appendChild(item);
    });
  }
};


// ===== timer.js =====

const timer = {
  state: { running: false, duration: 0, elapsed: 0, lastTick: 0 },
  intervalId: null,
  displayElement: null,
  toggleButtonElement: null,
  showToastCallback: null,

  init(displayEl, toggleBtnEl, showToastCallback) {
    this.displayElement = displayEl;
    this.toggleButtonElement = toggleBtnEl;
    this.showToastCallback = showToastCallback;

    const saved = storage.getTimer();
    if (saved) {
      this.state = saved;
      if (this.state.running) {
        const now = Date.now();
        this.state.elapsed += (now - this.state.lastTick);
        this.state.lastTick = now;
        if (this.state.elapsed >= this.state.duration) {
          this.state.elapsed = this.state.duration;
          this.state.running = false;
          setTimeout(() => this.triggerCompletion(), 1000);
        } else {
          this.start();
        }
      }
    }
    this.updateUI();
  },

  formatTime(ms) {
    const remainingMs = Math.max(0, this.state.duration - ms);
    const secs = Math.ceil(remainingMs / 1000);
    const mins = Math.floor(secs / 60);
    const seconds = secs % 60;
    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(mins)}:${pad(seconds)}`;
  },

  updateUI() {
    if (this.displayElement) {
      this.displayElement.textContent = this.formatTime(this.state.elapsed);
    }
    if (this.toggleButtonElement) {
      this.toggleButtonElement.textContent = this.state.running ? 'Pause' : 'Start';
    }
  },

  triggerCompletion() {
    audio.playAlertSound();
    if (Notification.permission === 'granted') {
      new Notification('Lumen Timer', { body: 'Your timer has finished!' });
    }
    if (this.showToastCallback) {
      this.showToastCallback('Timer completed!');
    }
  },

  tick() {
    const now = Date.now();
    this.state.elapsed += (now - this.state.lastTick);
    this.state.lastTick = now;
    if (this.state.elapsed >= this.state.duration) {
      this.state.elapsed = this.state.duration;
      this.state.running = false;
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.triggerCompletion();
    }
    this.updateUI();
    storage.saveTimer(this.state);
  },

  start() {
    if (this.state.duration <= 0) {
      if (this.showToastCallback) {
        this.showToastCallback('Please set a timer duration first');
      }
      return;
    }
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    clearInterval(this.intervalId);
    this.state.running = true;
    this.state.lastTick = Date.now();
    this.updateUI();
    storage.saveTimer(this.state);
    this.intervalId = setInterval(() => this.tick(), 200);
  },

  pause() {
    this.state.running = false;
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.updateUI();
    storage.saveTimer(this.state);
  },

  toggle() {
    if (this.state.running) {
      this.pause();
    } else {
      this.start();
    }
  },

  reset() {
    this.pause();
    this.state.elapsed = 0;
    this.updateUI();
    storage.saveTimer(this.state);
  },

  setDuration(mins) {
    this.pause();
    this.state.duration = mins * 60 * 1000;
    this.state.elapsed = 0;
    this.updateUI();
    storage.saveTimer(this.state);
  }
};


// ===== stopwatch.js =====

const stopwatch = {
  state: { running: false, elapsed: 0, lastTick: 0 },
  intervalId: null,
  displayElement: null,
  toggleButtonElement: null,

  init(displayEl, toggleBtnEl) {
    this.displayElement = displayEl;
    this.toggleButtonElement = toggleBtnEl;

    const saved = storage.getStopwatch();
    if (saved) {
      this.state = saved;
      if (this.state.running) {
        const now = Date.now();
        this.state.elapsed += (now - this.state.lastTick);
        this.state.lastTick = now;
        this.start();
      }
    }
    this.updateUI();
  },

  formatTime(ms) {
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  },

  updateUI() {
    if (this.displayElement) {
      this.displayElement.textContent = this.formatTime(this.state.elapsed);
    }
    if (this.toggleButtonElement) {
      this.toggleButtonElement.textContent = this.state.running ? 'Pause' : 'Start';
    }
  },

  tick() {
    const now = Date.now();
    this.state.elapsed += (now - this.state.lastTick);
    this.state.lastTick = now;
    this.updateUI();
    storage.saveStopwatch(this.state);
  },

  start() {
    clearInterval(this.intervalId);
    this.state.running = true;
    this.state.lastTick = Date.now();
    this.updateUI();
    storage.saveStopwatch(this.state);
    this.intervalId = setInterval(() => this.tick(), 200);
  },

  pause() {
    this.state.running = false;
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.updateUI();
    storage.saveStopwatch(this.state);
  },

  toggle() {
    if (this.state.running) {
      this.pause();
    } else {
      this.start();
    }
  },

  reset() {
    this.pause();
    this.state.elapsed = 0;
    this.updateUI();
    storage.saveStopwatch(this.state);
  }
};


// ===== export.js =====

function downloadFile(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getStyleRules() {
  let cssText = '';
  try {
    for (let sheet of document.styleSheets) {
      if (!sheet.href || sheet.href.includes(window.location.host) || sheet.href.startsWith('file://')) {
        try {
          const rules = sheet.cssRules || sheet.rules;
          for (let rule of rules) {
            cssText += rule.cssText + '\n';
          }
        } catch (e) {
          // Ignore stylesheet access warnings (e.g. CORS external fonts)
        }
      }
    }
  } catch (e) {
    console.warn('Could not read style rules from document', e);
  }
  return cssText;
}

const exporter = {
  exportToHTML(readingContentElement) {
    const activeTab = state.getActiveTab();
    const htmlContent = readingContentElement.innerHTML;
    const title = activeTab.name || 'Document';
    const compiledStyles = getStyleRules();

    const standaloneHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Lumen Standalone Export</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark.min.css">
  <style>
    ${compiledStyles}
    body {
      overflow-y: auto !important;
      height: auto !important;
    }
    .reading-container {
      padding-top: 60px !important;
      padding-bottom: 60px !important;
    }
  </style>
</head>
<body data-theme="${state.get('theme')}">
  <div style="max-width: ${state.get('width')}px; margin: 0 auto; padding: 40px 24px;">
    <article class="reading-content">
      ${htmlContent}
    </article>
  </div>
</body>
</html>`;
    downloadFile(standaloneHtml, `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`, 'text/html');
  },

  exportToMarkdown() {
    const activeTab = state.getActiveTab();
    const title = activeTab.name || 'Document';
    downloadFile(activeTab.content, `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`, 'text/markdown');
  },

  stripMarkdown(mdText) {
    if (!mdText) return '';
    return mdText
      .replace(/^#+\s+/gm, '')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/^\s*>\s+/gm, '')
      .replace(/```[a-z]*\n([\s\S]*?)\n```/g, '$1');
  },

  exportToPlainText() {
    const activeTab = state.getActiveTab();
    const title = activeTab.name || 'Document';
    const strippedText = this.stripMarkdown(activeTab.content);
    downloadFile(strippedText, `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`, 'text/plain');
  }
};


// ===== sidebar.js =====

function initSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const btnPin = document.getElementById('btn-sidebar-pin');
  const toolsHeader = document.getElementById('btn-tools-toggle');
  const toolsContainer = document.getElementById('tools-container');
  const sectionTools = document.getElementById('section-tools');
  const btnWidthOpts = document.querySelectorAll('.btn-width-opt');
  const readingContainer = document.querySelector('.reading-container');

  if (!sidebar || !btnPin || !toolsHeader || !toolsContainer || !sectionTools || !readingContainer) {
    console.error('Sidebar UI elements missing');
    return;
  }

  // Sync state to UI on load
  updateSidebarPinnedUI(state.get('isSidebarPinned'));
  updateWidthUI(state.get('width'));

  // Pin Sidebar Action
  btnPin.addEventListener('click', () => {
    const isPinned = !state.get('isSidebarPinned');
    state.set('isSidebarPinned', isPinned);
    storage.saveSidebarPinned(isPinned);
  });

  // State listeners for UI sync
  state.addEventListener('change:isSidebarPinned', (e) => {
    updateSidebarPinnedUI(e.detail.newValue);
  });

  state.addEventListener('change:width', (e) => {
    updateWidthUI(e.detail.newValue);
  });

  function updateSidebarPinnedUI(isPinned) {
    if (isPinned) {
      sidebar.classList.add('pinned');
      btnPin.classList.add('active');
    } else {
      sidebar.classList.remove('pinned');
      btnPin.classList.remove('active');
    }
  }

  function updateWidthUI(width) {
    readingContainer.style.maxWidth = `${width}px`;
    btnWidthOpts.forEach(btn => {
      if (btn.dataset.width === width) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Width Option clicks
  btnWidthOpts.forEach(btn => {
    btn.addEventListener('click', () => {
      const width = btn.dataset.width;
      state.set('width', width);
      storage.saveWidth(width);
    });
  });

  // Tools Accordion Collapse
  let toolsCollapsed = storage.getItem('tools_collapsed') === 'true';
  setToolsCollapsed(toolsCollapsed);

  toolsHeader.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Automatically pin the sidebar if we are expanding the tools and it is not pinned
    if (toolsCollapsed && !state.get('isSidebarPinned')) {
      state.set('isSidebarPinned', true);
      storage.saveSidebarPinned(true);
    }
    
    toolsCollapsed = !toolsCollapsed;
    setToolsCollapsed(toolsCollapsed);
    storage.setItem('tools_collapsed', toolsCollapsed);
  });

  function setToolsCollapsed(collapsed) {
    if (collapsed) {
      sectionTools.classList.add('collapsed');
      toolsContainer.style.display = 'none';
    } else {
      sectionTools.classList.remove('collapsed');
      toolsContainer.style.display = 'block';
    }
  }
}


// ===== toolbar.js =====

function initToolbar() {
  const btnTheme = document.getElementById('btn-theme-sidebar');
  const btnFocus = document.getElementById('btn-focus');
  const btnReset = document.getElementById('btn-reset');
  const btnExport = document.getElementById('btn-export');
  const exportDropdown = document.getElementById('export-dropdown-menu');
  const readingContent = document.getElementById('reading-content');

  if (!btnTheme || !btnFocus || !btnReset || !btnExport || !exportDropdown) {
    console.error('Toolbar elements missing');
    return;
  }

  // Initial Sync from state
  syncTheme(state.get('theme'));
  syncFocus(state.get('focus'));

  // Focus click listener
  btnFocus.addEventListener('click', () => {
    const isFocus = !state.get('focus');
    state.set('focus', isFocus);
    storage.saveFocus(isFocus);
  });

  // Reset click listener (Clears current active document content)
  btnReset.addEventListener('click', () => {
    if (confirm('Clear the current document?')) {
      const activeTabId = state.get('activeTabId');
      const tabs = state.get('tabs').map(t => {
        if (t.id === activeTabId) {
          return { ...t, name: 'Untitled', content: '', manuallyRenamed: false };
        }
        return t;
      });
      state.updateTabs(tabs);
    }
  });

  // Export dropdown toggling
  btnExport.addEventListener('click', (e) => {
    e.stopPropagation();
    exportDropdown.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    exportDropdown.classList.remove('show');
  });

  // Export option clicks
  exportDropdown.addEventListener('click', (e) => {
    const opt = e.target.closest('.export-opt');
    if (!opt) return;

    const format = opt.dataset.format || opt.getAttribute('data-type');
    if (format === 'html') {
      exporter.exportToHTML(readingContent);
    } else if (format === 'md') {
      exporter.exportToMarkdown();
    } else if (format === 'txt') {
      exporter.exportToPlainText();
    } else if (format === 'pdf') {
      window.print();
    }
    exportDropdown.classList.remove('show');
  });

  // State Event Listeners
  state.addEventListener('change:theme', (e) => {
    syncTheme(e.detail.newValue);
  });

  state.addEventListener('change:focus', (e) => {
    syncFocus(e.detail.newValue);
  });

  function syncTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    const label = btnTheme.querySelector('.action-label');
    if (label) {
      label.textContent = 'Theme';
    }
    
    const themeIcon = btnTheme.querySelector('.theme-icon');
    if (themeIcon) {
      themeIcon.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="sidebar-icon"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12c0 2 1 3 2 4s1 2 1 3c0 1.61-.76 3-3 3H12z"></path><circle cx="7.5" cy="10.5" r="1.5"></circle><circle cx="11.5" cy="7.5" r="1.5"></circle><circle cx="16.5" cy="9.5" r="1.5"></circle><circle cx="15.5" cy="14.5" r="1.5"></circle></svg>`;
    }
  }

  function syncFocus(isFocus) {
    if (isFocus) {
      document.body.classList.add('focus-mode');
      btnFocus.textContent = 'Exit Focus';
      btnFocus.classList.add('active');
    } else {
      document.body.classList.remove('focus-mode');
      btnFocus.textContent = 'Focus';
      btnFocus.classList.remove('active');
    }
  }
}


// ===== modals.js =====

function initModals() {
  const pasteOverlay = document.getElementById('paste-overlay');
  const markdownInput = document.getElementById('markdown-input');
  const btnRenderPaste = document.getElementById('btn-render-paste');
  const btnClosePaste = document.getElementById('btn-close-paste');
  const btnCancelPaste = document.getElementById('btn-cancel-paste');
  const btnUndo = document.getElementById('btn-undo');

  if (!pasteOverlay || !markdownInput || !btnRenderPaste || !btnClosePaste || !btnCancelPaste || !btnUndo) {
    console.error('Modal or Undo elements missing');
    return;
  }

  let undoStack = [];
  let isUndoAction = false;

  markdownInput.addEventListener('input', () => {
    if (isUndoAction) {
      isUndoAction = false;
      return;
    }
    undoStack.push(markdownInput.value);
    if (undoStack.length > 50) undoStack.shift();
  });

  window.openPasteModal = function() {
    state.set('isPasteActive', true);
  };

  window.closePasteModal = function() {
    state.set('isPasteActive', false);
  };

  state.addEventListener('change:isPasteActive', (e) => {
    if (e.detail.newValue) {
      pasteOverlay.classList.add('active');
      pasteOverlay.setAttribute('aria-hidden', 'false');
      
      const activeTab = state.getActiveTab();
      markdownInput.value = activeTab.content || '';
      undoStack = [markdownInput.value];
      isUndoAction = false;
      
      setTimeout(() => markdownInput.focus(), 50);
    } else {
      pasteOverlay.classList.remove('active');
      pasteOverlay.setAttribute('aria-hidden', 'true');
      markdownInput.blur();
    }
  });

  function submitPaste() {
    const rawVal = markdownInput.value;
    tabsManager.updateActiveTabContent(rawVal);
    state.set('isPasteActive', false);
  }

  btnRenderPaste.addEventListener('click', submitPaste);
  btnClosePaste.addEventListener('click', () => state.set('isPasteActive', false));
  btnCancelPaste.addEventListener('click', () => state.set('isPasteActive', false));

  pasteOverlay.addEventListener('click', (e) => {
    if (e.target === pasteOverlay) {
      state.set('isPasteActive', false);
    }
  });

  btnUndo.addEventListener('click', () => {
    if (state.get('isPasteActive')) {
      markdownInput.focus();
      if (undoStack.length > 1) {
        undoStack.pop();
        isUndoAction = true;
        markdownInput.value = undoStack[undoStack.length - 1];
      } else if (undoStack.length === 1) {
        isUndoAction = true;
        markdownInput.value = undoStack[0];
      }
    } else {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Open editor to undo changes.' } }));
    }
  });

  markdownInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = markdownInput.selectionStart;
      const end = markdownInput.selectionEnd;
      const value = markdownInput.value;
      markdownInput.value = value.substring(0, start) + '  ' + value.substring(end);
      markdownInput.selectionStart = markdownInput.selectionEnd = start + 2;
    }
    
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submitPaste();
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      state.set('isPasteActive', false);
    }
  });
}


// ===== theme-picker.js =====

const THEMES = [
  { id: 'light', name: 'Light Theme', accent: '#cc785c', bg: '#faf9f5' },
  { id: 'dark', name: 'Dark Theme', accent: '#cc785c', bg: '#181715' },
  { id: 'moss-alabaster', name: 'Moss & Alabaster', accent: '#465940', bg: '#FDFBF0' },
  { id: 'wine-ether', name: 'Wine & Ether', accent: '#3E000C', bg: '#C9FBFF' },
  { id: 'oceanic-minimalist', name: 'Oceanic Minimalist', accent: '#212842', bg: '#F0E7D5' },
  { id: 'botanical-heritage', name: 'Botanical Heritage', accent: '#046307', bg: '#F7F5EE' }
];

function initThemePicker() {
  const btnTheme = document.getElementById('btn-theme-sidebar');
  if (!btnTheme) return;

  // Create floating picker panel
  const picker = document.createElement('div');
  picker.className = 'theme-picker';
  document.body.appendChild(picker);

  // Populate picker rows
  function renderThemeRows() {
    picker.innerHTML = '';
    const activeTheme = state.get('theme') || 'light';

    THEMES.forEach(t => {
      const row = document.createElement('button');
      row.className = `theme-row${t.id === activeTheme ? ' active' : ''}`;
      row.dataset.id = t.id;

      // Theme info container
      const info = document.createElement('div');
      info.className = 'theme-info';

      // Swatches
      const swatches = document.createElement('div');
      swatches.className = 'theme-swatches';

      const accentSwatch = document.createElement('span');
      accentSwatch.className = 'swatch';
      accentSwatch.style.backgroundColor = t.accent;
      accentSwatch.title = `Accent: ${t.accent}`;

      const bgSwatch = document.createElement('span');
      bgSwatch.className = 'swatch';
      bgSwatch.style.backgroundColor = t.bg;
      bgSwatch.title = `Background: ${t.bg}`;

      swatches.appendChild(accentSwatch);
      swatches.appendChild(bgSwatch);

      // Label name
      const name = document.createElement('span');
      name.className = 'theme-name';
      name.textContent = t.name;

      info.appendChild(swatches);
      info.appendChild(name);

      // Indicator checkmark
      const indicator = document.createElement('div');
      indicator.className = 'theme-indicator';
      indicator.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

      row.appendChild(info);
      row.appendChild(indicator);

      // Click event
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        state.set('theme', t.id);
        storage.saveTheme(t.id);
        renderThemeRows();
        hidePicker();
      });

      picker.appendChild(row);
    });
  }

  function positionPicker() {
    const rect = btnTheme.getBoundingClientRect();
    const pickerWidth = picker.offsetWidth || 220;
    const pickerHeight = picker.offsetHeight || 240;

    let left = rect.right + 12;
    let top = rect.top + (rect.height / 2) - (pickerHeight / 2);

    const margin = 16;
    if (top < margin) top = margin;
    if (top + pickerHeight > window.innerHeight - margin) {
      top = window.innerHeight - pickerHeight - margin;
    }
    if (left + pickerWidth > window.innerWidth - margin) {
      // Position to the left of the sidebar button instead of right
      left = rect.left - pickerWidth - 12;
      if (left < margin) {
        // Center of the screen on very small displays/mobile
        left = (window.innerWidth - pickerWidth) / 2;
        top = (window.innerHeight - pickerHeight) / 2;
      }
    }

    picker.style.left = `${left}px`;
    picker.style.top = `${top}px`;
  }

  function showPicker() {
    renderThemeRows();
    picker.classList.add('show');
    positionPicker();

    // Trigger position again after rendering updates dimensions
    setTimeout(positionPicker, 0);

    // Bind outside clicks and escape key
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleEscapeKey);
  }

  function hidePicker() {
    picker.classList.remove('show');
    document.removeEventListener('click', handleOutsideClick);
    document.removeEventListener('keydown', handleEscapeKey);
  }

  function handleOutsideClick(e) {
    if (!picker.contains(e.target) && !btnTheme.contains(e.target)) {
      hidePicker();
    }
  }

  function handleEscapeKey(e) {
    if (e.key === 'Escape') {
      hidePicker();
    }
  }

  // Toggle button click listener
  btnTheme.addEventListener('click', (e) => {
    e.stopPropagation();
    if (picker.classList.contains('show')) {
      hidePicker();
    } else {
      showPicker();
    }
  });

  // Reposition on window resize
  window.addEventListener('resize', () => {
    if (picker.classList.contains('show')) {
      positionPicker();
    }
  });
}


// ===== app.js =====

// Cached DOM references
const tabsList = document.getElementById('tabs-list');
const toastElement = document.getElementById('toast-notification');
const mainContent = document.querySelector('.main-content');

// Toast logic
let toastTimeout = null;
function showToast(message) {
  if (toastTimeout) clearTimeout(toastTimeout);
  if (toastElement) {
    toastElement.textContent = message;
    toastElement.classList.add('show');
    toastTimeout = setTimeout(() => {
      toastElement.classList.remove('show');
    }, 3000);
  }
}

// Register toast with renderer
renderer.registerToastNotifier(showToast);

// Listen to custom show-toast events (dispatched from modals.js)
window.addEventListener('show-toast', (e) => {
  showToast(e.detail.message);
});

// Render Document History (Tabs List)
function renderTabs() {
  if (!tabsList) return;
  tabsList.innerHTML = '';

  const tabs = state.get('tabs');
  const activeTabId = state.get('activeTabId');

  tabs.forEach(tab => {
    const item = document.createElement('div');
    item.className = `tab-item${tab.id === activeTabId ? ' active' : ''}`;
    item.dataset.id = tab.id;

    // Single Click to Activate
    item.addEventListener('click', (e) => {
      if (e.target.closest('.btn-tab-close') || e.target.closest('.tab-rename-input')) {
        return;
      }
      if (state.get('activeTabId') !== tab.id) {
        state.set('activeTabId', tab.id);
        const currentTabs = state.get('tabs');
        state.updateTabs(currentTabs, tab.id);
      }
    });

    // Double Click to Rename
    item.addEventListener('dblclick', () => {
      if (item.querySelector('.tab-rename-input')) return;

      const nameSpan = item.querySelector('.tab-name');
      const oldName = tab.name;

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'tab-rename-input';
      input.value = oldName;

      item.insertBefore(input, nameSpan);
      nameSpan.style.display = 'none';
      input.focus();
      input.select();

      const finishRename = () => {
        const val = input.value.trim();
        if (val && val !== oldName) {
          tabsManager.renameTab(tab.id, val);
        } else {
          input.remove();
          nameSpan.style.display = '';
        }
      };

      input.addEventListener('blur', finishRename);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          finishRename();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          input.remove();
          nameSpan.style.display = '';
        }
      });
    });

    // Tab Label
    const nameSpan = document.createElement('span');
    nameSpan.className = 'tab-name';
    nameSpan.textContent = tab.name || 'Untitled';
    item.appendChild(nameSpan);

    // Close Button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-tab-close';
    closeBtn.title = 'Close tab';
    closeBtn.innerHTML = `<svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      tabsManager.closeTab(tab.id);
    });
    item.appendChild(closeBtn);

    tabsList.appendChild(item);
  });
}

// Synchronize Active Document rendering
function syncActiveDocument() {
  const activeTab = state.getActiveTab();
  if (activeTab) {
    renderer.renderDocument(activeTab.content);
  }
}

// Subscribe to state updates
state.addEventListener('change:tabs', () => {
  renderTabs();
  syncActiveDocument();
});

state.addEventListener('change:activeTabId', () => {
  renderTabs();
  syncActiveDocument();
});

// Setup Timing and Alarms Event Listeners
function initTimingTools() {
  // Clock
  const clockTime = document.getElementById('clock-time');
  clock.init(clockTime, () => {
    alarmsManager.checkAlarms();
  });

  // Stopwatch
  const swTime = document.getElementById('stopwatch-display');
  const swToggle = document.getElementById('btn-stopwatch-toggle');
  const swReset = document.getElementById('btn-stopwatch-reset');
  if (swTime && swToggle && swReset) {
    stopwatch.init(swTime, swToggle);
    swToggle.addEventListener('click', () => stopwatch.toggle());
    swReset.addEventListener('click', () => stopwatch.reset());
  }

  // Timer
  const timerTime = document.getElementById('timer-display');
  const timerToggle = document.getElementById('btn-timer-toggle');
  const timerReset = document.getElementById('btn-timer-reset');
  const timerPresetBtns = document.querySelectorAll('.btn-preset');
  const timerCustomMinInput = document.getElementById('timer-custom-min');
  const btnTimerCustomSet = document.getElementById('btn-timer-custom-set');

  if (timerTime && timerToggle && timerReset) {
    timer.init(timerTime, timerToggle, showToast);
    timerToggle.addEventListener('click', () => timer.toggle());
    timerReset.addEventListener('click', () => timer.reset());
  }

  timerPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      timerPresetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const mins = parseInt(btn.dataset.mins, 10);
      timer.setDuration(mins);
      timer.start();
    });
  });

  state.addEventListener('change:timer', () => {
    const timerState = timer.state;
    if (timerState.duration <= 0 || (timerState.elapsed === 0 && !timerState.running)) {
      timerPresetBtns.forEach(b => b.classList.remove('active'));
    }
  });

  const handleCustomTimer = () => {
    if (!timerCustomMinInput) return;
    const val = parseInt(timerCustomMinInput.value, 10);
    if (!isNaN(val) && val > 0) {
      timerPresetBtns.forEach(b => b.classList.remove('active'));
      timer.setDuration(val);
      timer.start();
      timerCustomMinInput.value = '';
    } else {
      showToast('Please enter a valid minutes number');
    }
  };

  if (btnTimerCustomSet) btnTimerCustomSet.addEventListener('click', handleCustomTimer);
  if (timerCustomMinInput) {
    timerCustomMinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCustomTimer();
      }
    });
  }

  // Alarms
  const alarmsList = document.getElementById('alarms-list');
  const alarmTimeInput = document.getElementById('alarm-time-input');
  const btnAlarmAdd = document.getElementById('btn-alarm-add');

  if (alarmsList) {
    alarmsManager.init(alarmsList, showToast);
  }

  const handleAddAlarm = () => {
    if (!alarmTimeInput) return;
    const val = alarmTimeInput.value;
    if (val) {
      alarmsManager.addAlarm(val);
      alarmTimeInput.value = '';
    } else {
      showToast('Please select an alarm time first');
    }
  };

  if (btnAlarmAdd) btnAlarmAdd.addEventListener('click', handleAddAlarm);
  if (alarmTimeInput) {
    alarmTimeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddAlarm();
      }
    });
  }
}

// Global Keyboard Shortcuts
function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    const isPasteActive = state.get('isPasteActive');
    
    // Open paste modal: Ctrl/Cmd + I
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      if (!isPasteActive && window.openPasteModal) window.openPasteModal();
    }
    
    // Toggle Focus Mode: Ctrl/Cmd + Shift + F
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      const currentFocus = state.get('focus');
      state.set('focus', !currentFocus);
    }
    
    // Reset Application: Ctrl/Cmd + Alt + R
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      const btnReset = document.getElementById('btn-reset');
      if (btnReset) btnReset.click();
    }
  });
}

// Sidebar Buttons bindings (Paste, Print, Upload) and URL loading
function initSidebarActions() {
  const btnPasteSidebar = document.getElementById('btn-paste-sidebar');
  const btnPrintSidebar = document.getElementById('btn-print-sidebar');
  const btnUploadSidebar = document.getElementById('btn-upload-sidebar');
  const fileInput = document.getElementById('file-input');
  const btnNewTab = document.getElementById('btn-new-tab');
  const btnEmptyPaste = document.getElementById('btn-empty-paste');
  const btnErrorRetry = document.getElementById('btn-error-retry');

  if (btnPasteSidebar) btnPasteSidebar.addEventListener('click', () => window.openPasteModal());
  if (btnEmptyPaste) btnEmptyPaste.addEventListener('click', () => window.openPasteModal());
  if (btnErrorRetry) btnErrorRetry.addEventListener('click', () => window.openPasteModal());
  
  if (btnPrintSidebar) {
    btnPrintSidebar.addEventListener('click', () => {
      window.print();
    });
  }

  if (btnNewTab) {
    btnNewTab.addEventListener('click', () => {
      tabsManager.createTab('Untitled', '');
    });
  }

  if (btnUploadSidebar && fileInput) {
    btnUploadSidebar.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target.result;
        const activeTab = state.getActiveTab();

        if (activeTab && activeTab.content.trim() === '') {
          activeTab.content = text;
          activeTab.name = file.name;
          activeTab.manuallyRenamed = true;
          state.updateTabs(state.get('tabs'), activeTab.id);
        } else {
          tabsManager.createTab(file.name, text, true);
        }

        showToast(`Loaded ${file.name}`);
        fileInput.value = '';
      };
      reader.readAsText(file);
    });
  }
}

// Load URL parameters on start
function initUrlLoader() {
  const urlParams = new URLSearchParams(window.location.search);
  const fileParam = urlParams.get('file');

  if (fileParam) {
    renderer.showLoading();
    fetch(fileParam)
      .then(response => {
        if (!response.ok) throw new Error();
        return response.text();
      })
      .then(text => {
        const name = fileParam.split('/').pop() || 'Loaded File';
        const newTab = tabsManager.createTab(name, text, true);
        window.history.replaceState(null, null, window.location.pathname);
      })
      .catch(() => {
        renderer.showError('The requested file could not be loaded.');
      });
  }
}

// Scroll updates progress bar
if (mainContent) {
  mainContent.addEventListener('scroll', () => {
    renderer.updateScrollProgress();
  });
}

// Global App Bootstrapper
function boot() {
  initSidebar();
  initToolbar();
  initModals();
  initThemePicker();
  initTimingTools();
  initSidebarActions();
  
  renderTabs();
  
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('file')) {
    initUrlLoader();
  } else {
    syncActiveDocument();
  }
  
  initShortcuts();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

