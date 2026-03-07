Visual Story RPG Engine

Dự án engine game web-based tập trung vào kể chuyện tương tác (Visual Novel/RPG/Text Adventure) sử dụng cấu trúc dữ liệu JSON.
Phiên bản này đã được Refactor theo mô hình **Logic (Engine) - Bridge (API) - View (Render)** và tách nhỏ các thành phần UI (Components) để dễ quản lý và bảo trì.

## 📂 Project Structure

htdocs/
├── app.js                          # Main entry point, khởi tạo AppController và các biến Global
├── index.html                      # File HTML chính chứa layout UI cơ bản
├── demo_script.js                  # Kịch bản mẫu (JSON data variable)
├── scenario.schema.json            # JSON Schema định nghĩa cấu trúc kịch bản
├── readme.md                       # Tài liệu hướng dẫn cấu trúc thư mục
│
├── api/                            # Cầu nối giao tiếp (Bridge Pattern)
│   ├── index.js                    # API object: Cho phép Render gọi Engine (Action) và Engine gọi Render (UI Update)
│   └── state.js                    # Quản lý State (Get/Set/Watch) và Auto-save
│
├── assets/                         # Tài nguyên media
│   ├── css/                        # Stylesheets
│   ├── fonts/                      # Fonts
│   └── images/                     # Hình ảnh background, thumbnail...
│
├── components/                     # UI Components (Pure functions trả về HTML String để tái sử dụng)
│   ├── ActionCard.js               # Thẻ hành động (Action Button/Card)
│   ├── Chat.js                     # Input bar và các nút lựa chọn hội thoại
│   ├── ChatBubble.js               # Bong bóng tin nhắn hội thoại
│   ├── Common.js                   # Các thành phần chung (StatBar, Meta info, Alerts...)
│   ├── Contact.js                  # Item trong danh sách liên hệ và hiển thị mối quan hệ
│   ├── Inventory.js                # Item trong lưới túi đồ và taskbar
│   ├── ItemModal.js                # Modal hiển thị chi tiết vật phẩm
│   ├── Layouts.js                  # Các layout lớn (Ví dụ: Layout màn hình tin nhắn)
│   ├── Modals.js                   # Các Modal popup (ReadMore, Faker, Action Info...)
│   ├── Notification.js             # Toast và dòng thông báo trong panel
│   ├── PasswordUI.js               # UI cho màn hình mật khẩu
│   └── Visuals.js                  # Các hiệu ứng visual nhỏ (Timer, Cooldown overlay, Badge...)
│
├── engine/                         # Core Logic & State Management
│   ├── GameEngine.js               # Class chính quản lý vòng đời game và khởi tạo các module
│   └── modules/
│       ├── Action.js               # Xử lý hành động người chơi (Click, Cooldown, Requirement)
│       ├── Automation.js           # Xử lý các chuỗi sự kiện tự động (Automation Plan)
│       ├── Chat.js                 # Hệ thống hội thoại logic (Start, Next, Select Choice)
│       ├── Config.js               # Quản lý cấu hình hệ thống (Config System)
│       ├── Effect.js               # Hệ thống xử lý hiệu ứng tổng quát (Process Runnables)
│       ├── Entity.js               # Logic NPC (AI di chuyển, kiểm tra trạng thái Faker)
│       ├── Item.js                 # Logic vật phẩm (Logic toggle hand, status calculation)
│       ├── Loader.js               # Nạp, parse, validate dữ liệu JSON và khởi tạo State ban đầu
│       ├── Logic.js                # Các hàm so sánh logic (Condition checking, Operator)
│       ├── Resolver.js             # Quản lý và parse các cú pháp string đặc biệt có chứa $()
│       ├── Scene.js                # Quản lý chuyển cảnh, Router, Timer logic và Flow
│       ├── chat/                   # Sub-modules cho Chat System
│       │   ├── BlockHandler.js     # Xử lý luồng Dialogue và Router Block
│       │   └── UIHelper.js         # Các hàm fallback xử lý UI cho Chat (Legacy support)
│       ├── effect/                 # Sub-modules cho Effect System
│       │   ├── Strategies.js       # Aggregator: Tập hợp các chiến lược effect
│       │   └── strategies/
│       │       ├── Character.js    # Logic nhân vật (Inherit, Relationship, Faker Swap...)
│       │       ├── Cms.js          # Logic hệ thống biến CMS (Custom Management System)
│       │       ├── Handlers.js     # Property Setters cho State/Scene/Action
│       │       ├── Item.js         # Logic thêm/bớt/sử dụng vật phẩm
│       │       ├── Logic.js        # Logic điều hướng (Goto), phân giải biến ($get, $calc)
│       │       ├── Management.js   # Quản lý Ban/Scope hiệu ứng (Locked/Unlocked)
│       │       ├── Stats.js        # Tính toán cộng trừ chỉ số (Stats Calculator)
│       │       └── UI.js           # Logic gọi UI (Notify, Alert) từ Engine
│       └── entity/                 # Sub-modules cho Entity System
│           ├── Faker.js            # Logic giả dạng (Nhập hồn/Thoát xác)
│           └── Movement.js         # Các thuật toán di chuyển NPC (Random, Follow, Avoid...)
│
├── password/                       # Logic xử lý mật khẩu
│   ├── Base.js                     # Class cơ sở (Strategy Pattern)
│   ├── FindWay.js                  # Logic tìm đường
│   ├── Number.js                   # Logic nhập số
│   ├── Puzzle.js                   # Logic xếp hình
│   ├── String.js                   # Logic nhập chuỗi(String)
│   ├── Switch.js                   # Logic công tắc/cần gạt(Switch)
│   └── index.js                    # Factory/Manager cho Password Strategies
│
├── plugin/                         # Các module tiện ích độc lập
│   ├── basefunction.js             # Các hàm tiện ích cơ bản
│   └── taskmanager.js              # Quản lý vòng lặp (Loop/Timeout/Interval) tránh memory leak
│
└── render/                         # View Controller (DOM Manipulation)
    ├── ui.js                       # Controller chính (UIController) khởi tạo các sub-modules
    ├── modules/                    # Các controller hiển thị theo chức năng
    │   ├── Mouse.js                # Xử lý sự kiện chuột custom
    │   ├── actions.js              # Render danh sách Action Grid và chi tiết Action
    │   ├── character.js            # Aggregator module quản lý hiển thị nhân vật
    │   ├── common.js               # Xử lý Toast, Modal, Animation global, Timer UI
    │   ├── inventory.js            # Quản lý hiển thị và tương tác túi đồ
    │   ├── pasword.js              # Controller hiển thị mật khẩu
    │   ├── scene.js                # Render Scene (Background, Title, Transition logic)
    │   └── character/              # Sub-modules hiển thị chi tiết nhân vật
    │       ├── chat.js             # Render lịch sử chat, bong bóng tin nhắn
    │       ├── contacts.js         # Điều phối màn hình danh bạ (List & Details)
    │       ├── player.js           # Render thẻ thông tin người chơi (Player Card)
    │       ├── utils.js            # Các hàm tiện ích (Format thời gian, Style map)
    │       └── contacts/
    │           ├── details.js      # Hiển thị chi tiết tin nhắn hoặc profile NPC
    │           └── list.js         # Render danh sách bạn bè/liên hệ
    └── vfx/                        # Hệ thống hiệu ứng hình ảnh (Visual Effects Controller)
        ├── index.js                # VFX Controller chính, inject CSS động
        └── modules/
            ├── frame.js            # Hiệu ứng khung viền (Border flash, Red alert...)
            ├── media.js            # Xử lý Audio/Video/Image overlay động
            ├── overlays.js         # Các lớp phủ màn hình (Noise, Blood, CRT, Dream...)
            └── transitions.js      # Hiệu ứng chuyển cảnh (Shake, Zoom, Slide, Glitch...)