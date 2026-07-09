Visual Story RPG Engine

Dự án engine game web-based tập trung vào kể chuyện tương tác (Visual Novel/RPG/Point & Click) sử dụng cấu trúc dữ liệu JSON.
Kiến trúc **Logic (Engine) - Bridge (API) - View (Render)**, tách nhỏ UI (Components) để dễ bảo trì. Chạy trực tiếp qua `file://` hoặc static server, không cần build step.

## 🆕 v13 — Mobile-First Restructure + Light Theme

Bản này tái cấu trúc toàn bộ UI/UX theo hướng **mobile-first**, đổi theme mặc định từ tối (đen) sang **sáng**, tham khảo UI/UX của các app point-and-click và app đọc truyện (e-reader). Tóm tắt thay đổi chính — chi tiết đầy đủ ở mục "Ghi chú kỹ thuật" bên dưới:

- **(a) Màn Home/Info**: giữ nguyên nội dung/thông tin kịch bản, chỉnh lại spacing, safe-area (notch/home-indicator), tap-target cho ngón tay, theme sáng kiểu "giấy ấm" (paper tone) thay vì nền đen.
- **(b) Màn Scene**: vẫn 2 cột (đọc truyện + hành động) như cấu trúc cũ, nhưng trên mobile mỗi cột giờ **full-view** (chiếm trọn màn hình), trượt ngang qua lại bằng tay cầm (handle) đặt **giữa rìa phải/trái màn hình**. Trên tablet/desktop (≥768px) quay lại đúng bố cục 2 cột đồng thời như bản gốc.
- **(c) Thanh công cụ scene**: chuyển xuống **bottom, full-width** trên mobile (`#scene-bottom-toolbar`), nằm ngay trên thanh nav chính, không che nội dung scene (khác với nút back nổi kiểu cũ vốn đè lên góc màn hình).
- **(d) NPC trong scene**: danh sách nhân vật đang có mặt không còn nằm cố định trong footer (chiếm chỗ dọc của action list) mà chuyển thành **icon trong thanh công cụ** (kèm badge số lượng) — bấm vào mở **bottom sheet** liệt kê NPC.

## 📂 Project Structure

htdocs/
├── app.js                          # Main entry point, khởi tạo AppController và các biến Global
├── index.html                      # File HTML chính — đã tái cấu trúc mobile-first ở v13
├── demo_script.js                  # Kịch bản mẫu (JSON data variable)
├── scenario.schema.json            # JSON Schema định nghĩa cấu trúc kịch bản (đã bổ sung `definitions` còn thiếu ở v13)
├── readme.md                       # Tài liệu hướng dẫn
│
├── api/
│   ├── index.js
│   └── state.js                    # SCHEMA_MAP — đã sửa vài path sai (xem "Audit state schema")
│
├── assets/                         # [PHỤC HỒI Ở v13 — xem mục riêng bên dưới]
│   ├── css/
│   │   ├── tailwind.js             # Loader shim → Tailwind Play CDN chính thức
│   │   ├── be-vietnam-pro.css      # @import Google Fonts "Be Vietnam Pro"
│   │   ├── material-icon.css       # @import Google Fonts "Material Icons Round"
│   │   └── main.css                # Design system light theme + theme override layer (MỚI)
│   └── images/
│       ├── thumbnail.png           # Placeholder ảnh mặc định cho action/item
│       └── thumbnail.jpg
│
├── components/                     # UI Components (trả về HTML string)
│   └── ActionCard.js               # Viết lại theme sáng ở v13 (+ sửa lỗi thẻ `</h4>` lặp)
│
├── engine/
│   └── modules/
│       ├── Loader.js               # Sửa 3 bug ở v13 (xem audit bên dưới)
│       ├── Item.js                 # Sửa bug đọc sai `maxHandOn`
│       └── ...
│
├── password/, plugin/              # Không đổi ở v13
│
└── render/
    ├── ui.js
    └── modules/
        ├── scene.js                # Thêm NPC sheet (#npc-sheet) + toggleNpcSheet(), đồng bộ 2 nút back
        ├── actions.js               # Đồng bộ 2 cặp nút grid/list (desktop header + mobile toolbar)
        ├── inventory.js             # Sửa bug hiển thị giới hạn túi đồ (maxInventory)
        └── ...

*(Các thư mục/file không liệt kê lại ở trên giữ nguyên cấu trúc như README trước — xem lịch sử git/bản zip trước đó.)*

## 🎨 Ghi chú kỹ thuật — Theme override layer

Toàn bộ theme tối cũ được viết **cứng bằng class Tailwind** rải rác trong hàng chục file `components/*.js` và `render/modules/**/*.js` (vd `bg-black/80`, `bg-[#1a1a1a]`, `text-slate-400`, `text-white`...). Sửa từng dòng ở từng file là không khả thi trong 1 lần refactor, nên `assets/css/main.css` dùng một **lớp override** dựa trên attribute-selector `[class~="..."]` để ánh xạ các class đó sang biến CSS (`--vsr-*`) của theme sáng — **không cần sửa các file JS component/render đã có** (trừ vài file được chỉnh tay vì lý do UX, liệt kê ở trên).

Nguyên tắc override:
- Bề mặt (card/panel/modal) dùng `bg-black/NN`, `bg-[#hex]`, `bg-slate-7/8/9/950`, `border-white/NN`... → sáng.
- Chữ `text-slate-2..6`, `text-white`, `hover:/group-hover:text-white` → tối (ink), **trừ** khi nằm trên nền đậm (`bg-red-600`, `bg-blue-600`...) — các trường hợp này có luật khôi phục lại chữ trắng.

**Ngoại lệ có chủ đích (giữ tối, không override)** — vì đây là quy ước UI hợp lý bất kể theme sáng/tối:
1. Scrim/backdrop của modal trung tâm (`#alert-modal`, `#faker-overlay`, `#readmore-overlay`, `#password-overlay`, `#keyboard-overlay`, `#item-modal`).
2. Tooltip nổi (tên NPC khi hover) và lớp phủ cooldown trên thumbnail — luôn tối để chữ trắng dễ đọc trên ảnh bất kỳ.
3. Gradient scrim phủ dưới ảnh nền/thumbnail (`from-black`, `from-slate-900`...) — giữ ảnh luôn đọc được chữ.
4. Khối mini-game mật khẩu (`components/PasswordUI.js`: bàn phím số, công tắc, ghép hình) — cố tình giữ phong cách "phần cứng" tối (bàn phím vật lý), thẻ bao ngoài vẫn sáng theo theme chung.
5. `#ending-screen` ("THE END") — giữ nền đen như một khoảnh khắc điện ảnh có chủ đích, giống credit cuối phim.

Có sẵn biến cho theme tối (`[data-theme="dark"]` trên `<html>`) để dùng sau này nếu cần nút bật/tắt — **hiện chưa có UI để bật**, mặc định luôn là sáng theo đúng yêu cầu.

## 🧩 Phục hồi assets (yêu cầu #2)

Thư mục `assets/` **hoàn toàn không có** trong file zip được tải lên (nhiều khả năng đã bị loại khỏi kho lưu trữ vì là thư viện/tài nguyên bên thứ ba, không phải mã nguồn dự án). Không thể khôi phục nguyên văn nội dung nhị phân đã mất, nên các file được viết lại như sau, giữ đúng đường dẫn để `index.html` không cần đổi:

| File | Cách phục hồi | Cần Internet? |
|---|---|---|
| `assets/css/tailwind.js` | Loader shim, tự chèn `<script src="https://cdn.tailwindcss.com">` + áp `tailwind.config` tối thiểu | Lần mở đầu tiên |
| `assets/css/be-vietnam-pro.css` | `@import` Google Fonts CSS2 API (đúng font gốc, giấy phép OFL miễn phí) | Lần mở đầu tiên |
| `assets/css/material-icon.css` | `@import` Google Fonts "Material Icons Round" + class `.material-icons-round` | Lần mở đầu tiên |
| `assets/css/main.css` | Viết mới hoàn toàn — design system + theme override (xem mục trên) | Không |
| `assets/images/thumbnail.*` | Ảnh placeholder tạo mới (không phải ảnh gốc) | Không |

Muốn chạy 100% offline (không mạng): tải sẵn 3 file CDN ở trên về máy (`curl`/`wget`) và thay khối `@import`/loader bằng nội dung tĩnh — mỗi file đều có ghi chú hướng dẫn ngay trong file.

## 🔍 Audit state schema vs scenario.schema.json (yêu cầu #3)

Đối chiếu `api/state.js` (SCHEMA_MAP), `engine/modules/Loader.js` (khởi tạo state từ script), và toàn bộ engine đọc dữ liệu, với `scenario.schema.json`. Đã viết một validator tối giản (không có `jsonschema` do môi trường không có mạng để cài) để chạy thử `demo_script.js` qua schema sau khi sửa — **0 lỗi còn lại** (trước khi sửa: hàng chục lỗi type/enum + toàn bộ `scenes/routers/actions/passwords` không validate được gì do `$ref` treo).

**Phát hiện & đã sửa:**

1. **[NGHIÊM TRỌNG] `scenario.schema.json` thiếu hẳn khối `definitions`** — 13 `$ref` (`#/definitions/scene`, `router`, `action`, `password_*`, `requirement_*`, `effect_details`, `runnable_wrapper`) trỏ tới một object không tồn tại trong file. Toàn bộ phần quan trọng nhất của schema (scenes/routers/actions/passwords/effects) **không validate được gì từ trước tới giờ**. Đã dựng lại `definitions` dựa trên dữ liệu thật (`demo_script.js`) và cách engine thực sự đọc field (`engine/modules/Action.js`, `Effect.js`, `Scene.js`, `password/*.js`).
2. **`config.maxHandOn` / `brokenDisable` / `minCharacterMoving`** bị khai sai vị trí trong schema — lồng bên trong `config.maxInventory` (một **mảng** `[limit, char_id]`, không có "thuộc tính tên" theo JSON), trong khi `engine/modules/Config.js` và dữ liệu thật (`demo_script.js`) coi chúng là **sibling** của `config`. Đã sửa cả schema và `SCHEMA_MAP`.
3. **`engine/modules/Item.js` (equip)** đọc `state.config.maxInventory.maxHandOn` (đường dẫn sai ở mục #2) thay vì gọi `getConfig('maxHandOn')` — giới hạn "số món cầm trên tay" do người viết kịch bản cấu hình **luôn bị bỏ qua âm thầm**, luôn dùng mặc định 10. Đã sửa dùng `getConfig()` cho nhất quán với `effect/strategies/Item.js`.
4. **`render/modules/inventory.js`** coi `maxInventory` (mảng `[limit, char_id]`) như một số đơn để hiển thị "x/y items" — `[] || 0` ra `[]` (mảng rỗng vẫn truthy trong JS) nên bộ đếm hiển thị sai. Đã sửa để tìm đúng giới hạn theo nhân vật hiện tại; đồng thời bổ sung luôn phần **enforce giới hạn khi nhặt đồ** (`Item.js: addItem`) — trước đây cấu hình này chưa từng có tác dụng thật khi chơi.
5. **`engine/modules/Loader.js`: `chat.blocks`** (số nhiều) — dữ liệu thật và `engine/modules/Chat.js` đều dùng khoá **`block`** (số ít). Vòng lặp khởi tạo `state.map.blocks`/`choice.set` vì vậy **chưa từng chạy** với bất kỳ kịch bản hợp lệ nào. Đã sửa tên khoá.
6. **`engine/modules/Loader.js`: `defPlayer.effect`** dùng `{ meeting: [], leave: [] }` (mảng) trong khi toàn bộ engine (`Entity.js`) và chuẩn hoá cho nhân vật khác trong cùng file đều dùng **object** (`{ meeting: {}, leave: {} }`, key theo `char_id`). Nếu kịch bản không tự định nghĩa nhân vật `"player"`, hiệu ứng gặp mặt/rời đi của player sẽ luôn không tìm thấy gì. Đã sửa cho đồng nhất.
7. **`engine/modules/Loader.js`: khởi tạo `state.actions` từ router** dùng mô hình cũ (object map `{actionId: {...}}`) trong khi engine hiện tại (`Action.js: getEffectiveActions`) dùng mô hình **mảng tham chiếu ID toàn cục** (`router.actions: string[]`, định nghĩa đầy đủ nằm ở `script.actions[id]`). Vòng lặp cũ duyệt `for...in` trên mảng ra **index** ("0","1"...) chứ không phải ID hành động thật, tạo ra các entry state với key sai (`scene1_router1_0`...) mà không nơi nào khác trong engine từng đọc tới — dữ liệu rác vô hại nhưng gây nhầm lẫn khi debug. Đã viết lại để hỗ trợ đúng cả 2 mô hình (mới ưu tiên, cũ tương thích ngược) với key chính xác.
8. **`demo_script.js`: 5 chỗ hoán đổi `type`/`subtype`** — dùng `{"type":"stats","subtype":"characters",...}` trong khi `engine/modules/effect/Strategies.js` chỉ dispatch theo `type: "characters"` (rồi mới tới `subtype: "edit_stats"`); `EffectHandlers` **không có** key `"stats"` nên các effect này **luôn no-op im lặng** — bao gồm cả 2 template lõi `damage_player`/`damage_killer` (cơ chế sát thương chính của kịch bản demo!) và 2 vật phẩm hồi/gây sát thương. Đã sửa cả 5 chỗ thành `type: "characters", subtype: "edit_stats"`.
9. **`demo_script.js`: cơ chế `{"type":"req",...}` bị dùng sai** — `type: "req"` luôn bị `Effect.js` no-op có chủ đích (`if (wrapper.type === 'req') return;`); cách đúng để "gate" một effect là gắn field `req` (object requirement) làm **sibling** của `type` ngay trên effect muốn kiểm tra điều kiện. Trước đây điều kiện "đã gọi cảnh sát" trước khi thắng game (sửa cầu dao) **không có tác dụng gì** — `win_game` luôn chạy. Đã sửa lại đúng cơ chế.
10. **`index.html`: `onchange="app.handleUpload(event)"`** — `AppController` chỉ có hàm `importScript(e)`, không có `handleUpload`; bấm "LOAD JSON" chọn file sẽ ném lỗi thay vì nạp kịch bản. Đã sửa gọi đúng tên hàm.
11. **Nút back nổi (`#back-node-btn`): `onclick="engine.goBack()"`** — hàm `goBack()` **không tồn tại** ở bất kỳ đâu trong engine (chỉ có `goBackParent`/`goBackTimerEnd`). May mắn là `render/modules/scene.js` luôn gán đè `.onclick` đúng ngay trong `renderScene()` trước khi nút kịp hiển thị, nên bug này vô hại trong thực tế — nhưng để rõ ràng, đã bỏ hẳn attribute gây hiểu nhầm này khỏi HTML.

**Chưa (và không) làm:** không mô hình hoá lại 100% mọi biến thể `subtype` của từng effect trong schema (`effect_details` dùng `additionalProperties: true` cho phần payload) — số lượng tổ hợp `type`/`subtype` trên các file `engine/modules/effect/strategies/*.js` khá lớn, việc liệt kê tuyệt đối chính xác từng field cho từng tổ hợp nằm ngoài phạm vi hợp lý của một lần audit. Đây là lựa chọn có chủ đích, không phải sai sót bỏ sót.

## 📝 Changelog rút gọn (v13)

- UI: Home/Info/Scene/Inventory/Character/mọi modal chuyển sang light theme mobile-first.
- Scene: 2 panel full-view + tay cầm trượt cạnh (mobile) / 2 cột cố định (desktop, giữ nguyên).
- Scene: thanh công cụ mới ở đáy màn hình (mobile) gồm back, grid/list toggle, icon NPC (+ badge).
- Scene: danh sách NPC chuyển từ footer cố định sang bottom sheet mở từ icon toolbar.
- `components/ActionCard.js`: viết lại theme sáng + sửa lỗi thẻ `</h4>` lặp.
- Khôi phục `assets/css/*.css`, `assets/css/tailwind.js`, `assets/images/thumbnail.*`.
- Sửa 11 lỗi/logic-mismatch xác thực được trong quá trình audit schema (danh sách ở trên).
- `scenario.schema.json`: bổ sung `definitions` còn thiếu, sửa vị trí sai của `config.maxHandOn`/`brokenDisable`/`minCharacterMoving`, bổ sung `fakerMode`.
