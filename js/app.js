import { Store } from './store.js';
import { Engine } from './engine.js';
import { UI } from './ui.js';
import { Push } from './push.js';

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Navigation Setup
    document.getElementById('nav-home').addEventListener('click', () => {
        document.getElementById('profile-form').reset();
        UI.switchView('view-onboarding');
    });

    document.getElementById('nav-list').addEventListener('click', () => {
        loadProfileList();
    });

    document.getElementById('nav-profile').addEventListener('click', () => {
        if (!Store.hasProfile()) {
            alert('먼저 프로필을 생성해주세요.');
            return;
        }
        UI.populateEditForm(Store.getProfile(), Store.getSettings());
        UI.switchView('view-profile');
    });

    // Date Auto Focus Logic
    function setupDateAutofocus(prefix) {
        const y = document.getElementById(prefix + 'year');
        const m = document.getElementById(prefix + 'month');
        const d = document.getElementById(prefix + 'day');
        if(!y || !m || !d) return;

        y.addEventListener('input', () => {
            if (y.value.length === 4) m.focus();
        });
        m.addEventListener('input', () => {
            if (m.value.length === 2) d.focus();
        });
    }

    setupDateAutofocus('birth-');
    setupDateAutofocus('edit-birth-');

    function getBirthDate(prefix) {
        const y = document.getElementById(prefix + 'year').value.trim();
        const m = document.getElementById(prefix + 'month').value.trim().padStart(2, '0');
        const d = document.getElementById(prefix + 'day').value.trim().padStart(2, '0');
        if (!y || !m || !d) return '';
        return `${y}-${m}-${d}`;
    }

    function showToast() {
        const t = document.getElementById('toast-message');
        t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 2000);
    }

    function getNewProfileData() {
        const mbtiVal = document.getElementById('mbti').value;
        const bDate = getBirthDate('birth-');
        if (!mbtiVal || !bDate) {
            alert('생년월일이나 MBTI 등을 정확히 입력해주세요.');
            return null;
        }

        const profileData = {
            name: document.getElementById('name').value.trim(),
            birthType: document.getElementById('birth-type').value,
            birthDate: bDate,
            birthTime: document.getElementById('birth-time').value,
            bloodType: document.getElementById('blood-type').value,
            mbti: mbtiVal
        };

        if(!profileData.name) {
            alert("이름을 입력해주세요.");
            return null;
        }
        return profileData;
    }

    document.getElementById('btn-save-only').addEventListener('click', () => {
        const data = getNewProfileData();
        if(data) {
            Store.saveProfile(data, false);
            showToast();
        }
    });

    // 2. Form Submission (New Profile / Onboarding)
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = getNewProfileData();
        if (data) {
            Store.saveProfile(data, false);
            document.getElementById('profile-form').reset();
            await loadDashboard();
        }
    });

    // 3. EDIT Form Submission (Update Profile)
    document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const mbtiVal = document.getElementById('edit-mbti').value;
        const bDate = getBirthDate('edit-birth-');
        
        if (!mbtiVal || !bDate) {
            alert('생년월일과 MBTI를 정확히 입력해주세요.');
            return;
        }

        const profileData = {
            name: document.getElementById('edit-name').value.trim(),
            birthType: document.getElementById('edit-birth-type').value,
            birthDate: bDate,
            birthTime: document.getElementById('edit-birth-time').value,
            bloodType: document.getElementById('edit-blood-type').value,
            mbti: mbtiVal
        };

        if(!profileData.name) {
            alert("이름을 입력해주세요.");
            return;
        }

        const originalName = document.getElementById('edit-original-name').value;
        const newName = Store.saveProfile(profileData, true, originalName);
        
        // Save push settings
        const settings = Store.getSettings(newName);
        settings.pushTime = document.getElementById('push-time').value;
        Store.saveSettings(settings, newName);

        if (settings.pushEnabled) {
            Push.scheduleDaily(settings.pushTime, Store.getProfile(newName).name);
        }

        alert('정보가 수정되었습니다.');
        await loadDashboard();
    });

    document.getElementById('btn-delete-profile').addEventListener('click', () => {
        const originalName = document.getElementById('edit-original-name').value;
        if(confirm(`'${originalName}'님의 프로필과 모든 운세 기록을 삭제하시겠습니까?`)) {
            Store.deleteProfile(originalName);
            if (Store.hasProfile()) {
                loadProfileList();
            } else {
                UI.switchView('view-onboarding');
            }
        }
    });

    // 4. MBTI Test Modal (For both forms)
    document.getElementById('btn-mbti-test').addEventListener('click', () => {
        UI.showMbtiModal((resultMbti) => {
            document.getElementById('mbti').value = resultMbti;
        });
    });

    document.getElementById('btn-edit-mbti-test').addEventListener('click', () => {
        UI.showMbtiModal((resultMbti) => {
            document.getElementById('edit-mbti').value = resultMbti;
        });
    });

    // Formal Test Binding handled in HTML via anchor tags
    // 5. Push Notification Request
    document.getElementById('btn-enable-push').addEventListener('click', async () => {
        const granted = await Push.requestPermission();
        if (granted) {
            const activeName = Store.getActiveProfileName();
            const settings = Store.getSettings(activeName);
            settings.pushEnabled = true;
            Store.saveSettings(settings, activeName);
            document.getElementById('push-promo').style.display = 'none';
            alert('알림이 설정되었습니다! 서비스워커를 통해 알람이 등록됩니다.');
            Push.scheduleDaily(settings.pushTime, activeName);
        }
    });

    // 6. Dashboard & List Actions
    document.getElementById('btn-go-onboarding').addEventListener('click', () => {
        // Here, rather than strictly first screen, we might direct to list or new
        UI.switchView('view-onboarding');
    });

    document.getElementById('btn-add-new-profile').addEventListener('click', () => {
        document.getElementById('profile-form').reset();
        UI.switchView('view-onboarding');
    });

    document.getElementById('btn-view-history').addEventListener('click', () => {
        const history = Store.getAllHistoryWithNames();
        UI.renderHistory(history);
        UI.switchView('view-history');
    });

    document.getElementById('btn-history-back').addEventListener('click', () => {
        UI.switchView('view-dashboard');
    });

    // Sub-routines
    function loadProfileList() {
        const profiles = Store.getAllProfiles();
        const activeName = Store.getActiveProfileName();
        UI.renderProfileList(profiles, activeName, {
            onSelect: (selectedName) => {
                Store.setActiveProfileName(selectedName);
                loadDashboard();
            },
            onEdit: (name) => {
                Store.setActiveProfileName(name);
                UI.populateEditForm(Store.getProfile(name), Store.getSettings(name));
                UI.switchView('view-profile');
            },
            onDelete: (name) => {
                if(confirm(`'${name}'님의 프로필을 삭제하시겠습니까?`)) {
                    Store.deleteProfile(name);
                    if(Store.hasProfile()) loadProfileList();
                    else UI.switchView('view-onboarding');
                }
            }
        });
        UI.switchView('view-profile-list');
    }

    async function loadDashboard() {
        const btn = document.querySelector('button[type="submit"]');
        if(btn) {
            const ogText = btn.textContent;
            btn.textContent = '분석 중...';
            btn.disabled = true;
        }

        try {
            const profile = Store.getProfile();
            if (!profile) return loadProfileList();

            UI.updateDate();
            
            // Generate analysis
            const analysisData = await Engine.analyze(profile);
            
            // Save history
            const d = new Date();
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            Store.saveHistory(dateStr, analysisData);
            
            UI.renderDashboard(analysisData, profile.name);
            
            // Render specific additions
            const careerTitleEl = document.getElementById('career-title');
            if (careerTitleEl) {
                careerTitleEl.innerHTML = analysisData.careerTitle || "💼 직장/사업운";
            }

            UI.switchView('view-dashboard');

            // Handle Push promo visibility
            const pushCard = document.getElementById('push-promo');
            if (pushCard) {
                const settings = Store.getSettings();
                if (settings.pushEnabled || Push.checkPermission()) {
                    pushCard.style.display = 'none';
                } else {
                    pushCard.style.display = 'block';
                }
            }

        } catch (error) {
            console.error(error);
            alert("운세 분석 중 오류가 발생했습니다.");
        } finally {
            if(btn) {
                btn.textContent = '완료';
                setTimeout(() => {
                    btn.textContent = '나만의 운세 분석하기';
                    btn.disabled = false;
                }, 500);
            }
        }
    }

    // App Initialization Logic
    // Register Push SW early if available
    Push.init();

    if (Store.hasProfile()) {
        const profiles = Store.getAllProfiles();
        if (profiles.length > 1) {
            // If multiple users exist, naturally bring them to the list screen to let them choose
            loadProfileList();
        } else {
            // Only 1 user, directly open Dashboard
            loadDashboard();
        }
    } else {
        UI.switchView('view-onboarding');
    }

});
