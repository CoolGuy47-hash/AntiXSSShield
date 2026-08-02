window.addEventListener('message', (event) => {
    if (event.source === window && event.data && event.data.type === 'ANTI_XSS_ALERT') {
        const host = event.data.host;
        
        // Теперь этот скрипт имеет полный доступ к chrome.storage и сохраняет угрозу
        chrome.storage.local.get(['attacks'], (result) => {
            let attacks = result.attacks || [];
            attacks.unshift({
                domain: host,
                time: new Date().toLocaleTimeString(),
                type: "Попытка чтения Cookies"
            });
            if (attacks.length > 20) attacks.pop();
            chrome.storage.local.set({ attacks: attacks });
        });
    }
});