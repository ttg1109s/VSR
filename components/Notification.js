// Component Toast thông báo tạm thời
export const ToastComponent = ({ title, msg, type }) => {
    let icon = 'info'; let bgClass = 'bg-blue-600';
    if (type === 'success') { icon = 'check_circle'; bgClass = 'bg-green-600'; }
    if (type === 'danger') { icon = 'error'; bgClass = 'bg-red-600'; }
    if (type === 'warn') { icon = 'warning'; bgClass = 'bg-amber-600'; }

    return `
        <span class="material-icons-round">${icon}</span>
        <div class="flex flex-col min-w-0">
            <span class="font-bold text-sm truncate">${title}</span>
            <span class="text-xs opacity-90 truncate">${msg}</span>
        </div>
    `;
};

// Component dòng thông báo trong Notification Panel
export const NotificationRow = ({ n, timeStr, color, icon }) => {
    return `
        <div class="icon-box">
            <span class="material-icons-round text-lg ${color}">${icon}</span>
        </div>
        <div class="flex-1 min-w-0">
            <div class="flex justify-between items-baseline">
                <span class="text-xs font-bold text-slate-200">${n.title}</span>
                <button class="text-slate-600 hover:text-red-400 ml-2" onclick="ui.removeNotification(${n.id}, event)">×</button>
            </div>
            <p class="text-xs text-slate-400 leading-snug line-clamp-2">${n.msg}</p>
            <div class="notify-time">${timeStr}</div>
        </div>
    `;
};