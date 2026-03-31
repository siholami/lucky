/**
 * Push Notification & Service Worker Scheduling
 */

let activeTimeouts = {};

export const Push = {
    async init() {
        if ('serviceWorker' in navigator) {
            try {
                // Register service worker in the root scope
                await navigator.serviceWorker.register('./sw.js');
                console.log('ServiceWorker registered successfully.');
            } catch (err) {
                console.error('ServiceWorker registration failed:', err);
            }
        }
    },

    async requestPermission() {
        if (!("Notification" in window)) {
            alert("이 브라우저는 알림을 지원하지 않습니다.");
            return false;
        }

        let permission = Notification.permission;
        
        // request if not already granted or denied
        if (permission !== 'granted' && permission !== 'denied') {
            permission = await Notification.requestPermission();
        }

        return permission === "granted";
    },

    checkPermission() {
        return "Notification" in window && Notification.permission === "granted";
    },

    sendPushViaSW(message) {
        if (!this.checkPermission()) return;
        
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'SHOW_NOTIFICATION',
                message: message
            });
        } else {
            // Fallback if SW is not controlling yet
            new Notification("✨ Lucky 운세 알림", {
                body: message,
                icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">✨</text></svg>'
            });
        }
    },

    scheduleDaily(timeStr, profileName) {
        if (!timeStr) return;
        
        // Clear previous timeout for this profile
        if (activeTimeouts[profileName]) {
            clearTimeout(activeTimeouts[profileName]);
        }

        const [targetHour, targetMin] = timeStr.split(':').map(Number);
        
        const scheduleNext = () => {
            const now = new Date();
            let target = new Date();
            target.setHours(targetHour, targetMin, 0, 0);

            let delay = target.getTime() - now.getTime();
            
            // If the time has already passed today, schedule for tomorrow
            if (delay < 0) {
                target.setDate(target.getDate() + 1);
                delay = target.getTime() - now.getTime();
            }

            console.log(`Push scheduled for ${profileName} in ${Math.round(delay/1000/60)} minutes.`);

            activeTimeouts[profileName] = setTimeout(() => {
                this.sendPushViaSW(`${profileName}님! 오늘의 운세 분석이 완료되었습니다. 지금 접속하여 확인해보세요.`);
                // Reschedule for next day after it fires
                scheduleNext();
            }, delay);
        };

        scheduleNext();

        // Immediate mock demo for UX (Optional, to show it works)
        setTimeout(() => {
            this.sendPushViaSW(`[테스트 발송] ${profileName}님 알람 설정 완료 (${timeStr} 스케줄 등록됨)`);
        }, 3000);
    }
};
