/**
 * assets/css/tailwind.js
 * ---------------------------------------------------------------------
 * GHI CHÚ PHỤC HỒI (xem readme.md > "Phục hồi assets"):
 * File nhị phân/gộp sẵn gốc KHÔNG có trong kho lưu trữ tải lên (thư mục
 * assets/ hoàn toàn vắng mặt — nhiều khả năng đã bị .gitignore vì là
 * thư viện bên thứ ba, không phải mã nguồn của dự án). Không thể phục hồi
 * lại nguyên văn nội dung đã mất, nên file này được viết lại ở dạng
 * "loader shim": nó nạp đúng Tailwind Play CDN chính thức tại runtime rồi
 * áp cấu hình của dự án. Ưu điểm: index.html không cần đổi đường dẫn,
 * hành vi giữ nguyên như một Play CDN bundle thật.
 *
 * Yêu cầu: có kết nối Internet khi mở app lần đầu (Play CDN tải qua CDN
 * công cộng của Tailwind, sau đó trình duyệt cache lại theo HTTP cache
 * bình thường). Nếu cần chạy 100% offline (file:// không mạng), hãy tự
 * vendor lại bản tĩnh:
 *   curl -o assets/css/tailwind.js https://cdn.tailwindcss.com
 * rồi xoá đoạn "loader" bên dưới (giữ lại phần tailwind.config).
 * ---------------------------------------------------------------------
 */
(function loadTailwindPlayCDN() {
    var s = document.createElement('script');
    s.src = 'https://cdn.tailwindcss.com';
    s.onload = function () {
        if (!window.tailwind) return;
        // Cấu hình tối thiểu — VSR Engine dùng biến CSS (--vsr-*) trong
        // assets/css/main.css cho theming, không mở rộng bảng màu Tailwind
        // mặc định. `important: false` (mặc định) để main.css có thể
        // override theo thứ tự nạp file trong index.html.
        window.tailwind.config = {
            darkMode: ['selector', '[data-theme="dark"]']
        };
    };
    s.onerror = function () {
        console.error('[VSR] Không tải được Tailwind Play CDN (cần Internet ở lần chạy đầu). ' +
            'Xem ghi chú trong assets/css/tailwind.js để vendor bản offline.');
    };
    document.head.appendChild(s);
})();
