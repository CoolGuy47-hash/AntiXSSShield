chrome.runtime.onInstalled.addListener(() => {
    console.log("🛡️ Anti-XSS Shield запущен!");
});

// Функция для динамической блокировки домена через declarativeNetRequest
function blockMaliciousDomain(domain) {
    const ruleId = Math.floor(Math.random() * 100000); // Генерируем ID правила
    
    chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [{
            "id": ruleId,
            "priority": 1,
            "action": { "type": "block" },
            "condition": { 
                "urlFilter": `*://${domain}/*`, 
                "resourceTypes": ["xmlhttprequest", "fetch", "ping"] 
            }
        }],
        removeRuleIds: []
    }, () => {
        console.log(`[Anti-Xss Shield] Домен ${domain} заблокирован на уровне сети!`);
    });
}

// Слушаем изменение или создание кук и защищаем их от XSS (принудительно ставим флаги)
chrome.cookies.onChanged.addListener((changeInfo) => {
    if (changeInfo.removed) return;

    const cookie = changeInfo.cookie;
  
    // Проверяем, отсутствуют ли критически важные флаги
    if (!cookie.httpOnly || !cookie.secure) {
        // Формируем параметры для обновления куки с принудительными флагами
        const protocol = cookie.secure ? "https:" : "http:";
        // Убираем ведущую точку из домена, если она есть, для корректного формирования URL
        const cleanDomain = cookie.domain.startsWith('.') ? cookie.domain.substring(1) : cookie.domain;
        const url = `${protocol}://${cleanDomain}${cookie.path}`;

        chrome.cookies.set({
            url: url,
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: true,       // Принудительно ставим Secure
            httpOnly: true,     // Принудительно ставим HTTPOnly (защита от XSS-кражи)
            expirationDate: cookie.expirationDate,
            storeId: cookie.storeId
        }, (updatedCookie) => {
            if (chrome.runtime.lastError) {
                console.warn("Не удалось защитить куку:", chrome.runtime.lastError.message);
            } else {
                console.log(`[Anti-XSS Shield] Кука ${cookie.name} успешно защищена флагами HTTPOnly и Secure!`);
            }
        });
    }
});

// Единый слушатель всех входящих сообщений
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    
    // 1. Проверка сайта по белому списку от content.js
    if (message.type === "CHECK_WHITELIST") {
        chrome.storage.sync.get({ whitelist: [] }, (data) => {
            const isAllowed = data.whitelist.includes(message.host);
            sendResponse({ whitelisted: isAllowed });
        });
        return true; // Обязательно для асинхронного sendResponse
    }

    // 2. Логирование заблокированных атак и сетевая блокировка
    if (message.type === 'XSS_ATTACK_BLOCKED') {
        const host = message.host || "Неизвестный сайт";
        
        // Автоматически блокируем этот домен на уровне сети
        blockMaliciousDomain(host);
        
        const attackInfo = {
            domain: host,
            time: new Date().toLocaleTimeString(),
            type: "Попытка чтения Cookies"
        };
        
        chrome.storage.local.get(['attacks'], (result) => {
            let attacks = result.attacks || [];
            attacks.unshift(attackInfo);
            if (attacks.length > 20) attacks.pop();
            chrome.storage.local.set({ attacks: attacks });
        });

        if (sender.tab && sender.tab.id) {
            chrome.action.getBadgeText({ tabId: sender.tab.id }, (text) => {
                let count = parseInt(text || "0") + 1;
                chrome.action.setBadgeText({ text: count.toString(), tabId: sender.tab.id });
                chrome.action.setBadgeBackgroundColor({ color: "#FF0000", tabId: sender.tab.id });
            });
        }
    }
});