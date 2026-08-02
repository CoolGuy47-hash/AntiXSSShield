// Глобальная переменная для белого списка в текущей вкладке
let isWhitelisted = false;
const currentHost = window.location.hostname;

// Безопасно запрашиваем статус белого списка у фонового скрипта (background.js)
try {
    chrome.runtime.sendMessage({ type: "CHECK_WHITELIST", host: currentHost }, (response) => {
        if (response && response.whitelisted) {
            isWhitelisted = true;
        }
    });
} catch (e) {
    // На случай проблем с контекстом расширения
}

const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
                    Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');

if (descriptor) {
    Object.defineProperty(document, 'cookie', {
        get: function() {
            // Если сайт в белом списке — не мешаем ему работать и сразу отдаем настоящие куки
            if (isWhitelisted) {
                return descriptor.get.call(this);
            }

            const stack = new Error().stack || "";
            const host = window.location.hostname;

            if (!stack.includes(host)) {
                console.warn("[Anti-Xss Shield] ВНИМАНИЕ: Заблокирована попытка чтения твоих Cookies!");
                window.postMessage({ type: 'ANTI_XSS_ALERT', host: host }, '*');
                return "";
            }
            return descriptor.get.call(this);
        },
        set: function(val) {
            // Запись (сеттер) оставляем работать штатно
            descriptor.set.call(this, val);
        }
    });
}

// Функция аудита подключенных на странице скриптов
function auditDependencies() {
  const scripts = document.querySelectorAll('script[src]');
  scripts.forEach(script => {
    const src = script.src;
    
    // Сверяем пути/версии с базой уязвимых паттернов
    if (src.includes("jquery-1.") || src.includes("angular-1.4")) {
      console.warn(`[Anti-XSS Shield Audit] Обнаружена устаревшая/потенциально уязвимая зависимость: ${src}`);
      
      // Визуально подсвечиваем подозрительный скрипт рамкой
      script.style.border = "2px solid red";
    }
  });
}

// Запускаем аудит после полной загрузки DOM (если сайт не заблокирован и доступен)
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', auditDependencies);
} else {
    auditDependencies();
}