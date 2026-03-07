import { PasswordStrategy } from './Base.js';

export class StringStrategy extends PasswordStrategy {
    constructor(system) {
        super(system);
    }

    // Mọi logic hiển thị và xử lý sự kiện đã được chuyển sang Base.js và PasswordRender (HTML)
    // Class này giữ lại để đảm bảo tính tương thích với Factory gọi nó.
}