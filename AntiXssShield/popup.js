document.addEventListener('DOMContentLoaded', () => {
    // 1. Загружаем и выводим логи атак
    chrome.storage.local.get(['attacks'], (result) => {
        const attacks = result.attacks || [];
        
        if (attacks.length > 0) {
            const logList = document.getElementById('logList');
            if (logList) {
                logList.innerHTML = '';
                
                attacks.forEach(attack => {
                    const item = document.createElement('div');
                    item.className = 'log-item';
                    item.innerHTML = `
                        <span class="log-domain">🌐 ${attack.domain}</span>
                        <span>🚫 ${attack.type}</span>
                        <span class="log-time">🕒 ${attack.time}</span>
                    `;
                    logList.appendChild(item);
                });
            }
        }
    });

    // 2. Добавляем логику для кнопки белого списка
    const whitelistBtn = document.getElementById('whitelist-btn');
    if (whitelistBtn) {
        whitelistBtn.addEventListener('click', async () => {
            let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url) return;

            let url = new URL(tab.url);
            let domain = url.hostname;

            // Сохраняем домен в chrome.storage.sync
            chrome.storage.sync.get({ whitelist: [] }, (data) => {
                let list = data.whitelist;
                if (!list.includes(domain)) {
                    list.push(domain);
                    chrome.storage.sync.set({ whitelist: list }, () => {
                        alert(`Сайт ${domain} добавлен в белый список! Перезагружаю вкладку...`);
                        chrome.tabs.reload(tab.id);
                    });
                } else {
                    alert('Этот сайт уже находится в белом списке.');
                }
            });
        });
    }
});