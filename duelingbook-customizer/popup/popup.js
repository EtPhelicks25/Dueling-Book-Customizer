/**
 * popup.js — Manages the popup UI for DuelingBook Customizer.
 */

document.addEventListener('DOMContentLoaded', () => {
  const profilePicIdInput = document.getElementById('profilePicId');
  const detectBtn = document.getElementById('detectBtn');

  const fields = [
    {
      key: 'avatar',
      toggle: document.getElementById('avatarEnabled'),
      uploadArea: document.getElementById('avatarUploadArea'),
      fileInput: document.getElementById('avatarFile'),
      preview: document.getElementById('avatarPreview'),
      placeholder: document.getElementById('avatarPlaceholder'),
      clearBtn: document.getElementById('avatarClear'),
    },
    {
      key: 'mySleeves',
      toggle: document.getElementById('mySleevesEnabled'),
      uploadArea: document.getElementById('mySleevesUploadArea'),
      fileInput: document.getElementById('mySleevesFile'),
      preview: document.getElementById('mySleevesPreview'),
      placeholder: document.getElementById('mySleevesPlaceholder'),
      clearBtn: document.getElementById('mySleevesClear'),
    },
    {
      key: 'oppSleeves',
      toggle: document.getElementById('oppSleevesEnabled'),
      uploadArea: document.getElementById('oppSleevesUploadArea'),
      fileInput: document.getElementById('oppSleevesFile'),
      preview: document.getElementById('oppSleevesPreview'),
      placeholder: document.getElementById('oppSleevesPlaceholder'),
      clearBtn: document.getElementById('oppSleevesClear'),
    },
  ];

  // Load saved state
  const storageKeys = ['profilePicId'];
  fields.forEach(f => {
    storageKeys.push(`${f.key}Enabled`, `${f.key}DataUrl`);
  });

  chrome.storage.local.get(storageKeys, (data) => {
    if (data.profilePicId) {
      profilePicIdInput.value = data.profilePicId;
    }

    fields.forEach(f => {
      f.toggle.checked = !!data[`${f.key}Enabled`];
      const dataUrl = data[`${f.key}DataUrl`];
      if (dataUrl) {
        showPreview(f, dataUrl);
      }
    });
  });

  // Profile Pic ID manual input
  profilePicIdInput.addEventListener('input', () => {
    let value = profilePicIdInput.value.trim();
    const match = value.match(/(\d+)/);
    if (match) {
      value = match[1];
      profilePicIdInput.value = value;
    }
    chrome.storage.local.set({ profilePicId: value });
    notifyContentScript();
  });

  // Auto-detect button
  detectBtn.addEventListener('click', () => {
    detectBtn.textContent = '⏳';
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || !tabs[0].url || !tabs[0].url.includes('duelingbook.com')) {
        detectBtn.textContent = '❌';
        setTimeout(() => { detectBtn.textContent = '🔍'; }, 1500);
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, { type: 'DB_CUSTOMIZER_DETECT_PROFILE' }, (response) => {
        if (chrome.runtime.lastError || !response || !response.profilePicIds || response.profilePicIds.length === 0) {
          detectBtn.textContent = '⚠️';
          setTimeout(() => { detectBtn.textContent = '🔍'; }, 1500);
          return;
        }

        const detectedId = response.profilePicIds[0];
        profilePicIdInput.value = detectedId;
        chrome.storage.local.set({ profilePicId: detectedId });
        notifyContentScript();

        detectBtn.textContent = '✅';
        setTimeout(() => { detectBtn.textContent = '🔍'; }, 1500);
      });
    });
  });

  // Wire up file inputs and drag-and-drop
  fields.forEach(f => {
    f.toggle.addEventListener('change', () => {
      chrome.storage.local.set({ [`${f.key}Enabled`]: f.toggle.checked });
      notifyContentScript();
    });

    f.uploadArea.addEventListener('click', () => f.fileInput.click());

    f.fileInput.addEventListener('change', () => {
      if (f.fileInput.files.length > 0) {
        readAndStore(f, f.fileInput.files[0]);
      }
    });

    f.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      f.uploadArea.classList.add('dragover');
    });

    f.uploadArea.addEventListener('dragleave', () => {
      f.uploadArea.classList.remove('dragover');
    });

    f.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      f.uploadArea.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        readAndStore(f, e.dataTransfer.files[0]);
      }
    });

    f.clearBtn.addEventListener('click', () => {
      chrome.storage.local.remove([`${f.key}DataUrl`, `${f.key}Enabled`]);
      f.toggle.checked = false;
      f.preview.src = '';
      f.preview.classList.add('hidden');
      f.placeholder.classList.remove('hidden');
      notifyContentScript();
    });
  });

  function readAndStore(field, file) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      chrome.storage.local.set({
        [`${field.key}DataUrl`]: dataUrl,
        [`${field.key}Enabled`]: true,
      }, () => {
        showPreview(field, dataUrl);
        field.toggle.checked = true;
        notifyContentScript();
      });
    };
    reader.readAsDataURL(file);
  }

  function showPreview(field, dataUrl) {
    field.preview.src = dataUrl;
    field.preview.classList.remove('hidden');
    field.placeholder.classList.add('hidden');
  }

  function notifyContentScript() {
    chrome.tabs.query({ url: '*://*.duelingbook.com/*' }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: 'DB_CUSTOMIZER_UPDATE' }).catch(() => {});
      });
    });
  }
});
