# VSR UI Engineering Principles

> Trạng thái: nguyên tắc xây dựng UI cho React presentation layer.
> Phạm vi: ứng dụng giao diện trong src/; không định nghĩa lại engine, protocol hoặc scenario runtime.
> Căn cứ: Design System và React component documentation hiện có. Các mục "Nguyên tắc đề xuất" là quy ước phát triển được chuẩn hóa từ nền tảng hiện tại, không mặc nhiên khẳng định đã được triển khai.

## 1. Mục tiêu và ranh giới kiến trúc

VSR có hai lớp cần giữ độc lập:

- **Runtime layer**: engine, scenario model, state, persistence, protocol và transport. Lớp này không phụ thuộc React hoặc DOM.
- **Presentation layer**: React SPA, page composition, design system và UI interactions. Lớp này giao tiếp với runtime qua adapter/client hoặc interface đã xác định; không truy cập trực tiếp cấu trúc nội bộ của engine để dựng giao diện.

UI chỉ chịu trách nhiệm trình bày trạng thái và chuyển tiếp ý định thao tác. Quy tắc thực thi scenario, điều kiện, hiệu ứng và thay đổi state thuộc runtime. Không sao chép business logic của engine vào component React.

**Nguyên tắc**
1. Không import engine modules, protocol internals, state store hoặc transport vào component thuộc Design System.
2. Component trình bày không tự quyết định quy tắc nghiệp vụ của scenario.
3. Không để engine phụ thuộc React, CSS, browser API hoặc component UI.
4. Logic điều phối tích hợp runtime đặt ở application/service layer; truyền dữ liệu và callback xuống component qua props.

## 2. Ngôn ngữ thiết kế chính thức

VSR lấy **Material Design 3** làm nền tảng thiết kế. Linear là tham chiếu cho phân cấp thị giác gọn, rõ và mật độ thông tin cân bằng. Fluent 2 là tham chiếu cho bố cục desktop thích ứng.

Các ưu tiên đã được xác lập:

- Mobile-first.
- Light-theme-first.
- Nền trắng và bề mặt trung tính.
- Viền trung tính nhẹ; elevation tiết chế.
- Typography Roboto.
- Icon Google Material Symbols Rounded.
- Responsive theo kích thước viewport, không giả định breakpoint tương đương loại thiết bị.

Không tự ý chuyển sản phẩm sang dark theme, phong cách gaming dashboard, glassmorphism, neon hoặc visual language khác nếu chưa có quyết định thiết kế riêng. Dark theme hiện chưa được triển khai; theme composition chỉ được tổ chức để có thể mở rộng sau này.

## 3. Design System là nguồn chuẩn duy nhất

### 3.1. Cấu trúc hiện tại

~~~text
src/design-system/
├── tokens/          # Màu, typography, spacing, shape, elevation, motion
├── theme/           # Theme composition và light theme
├── foundations/     # Reset, font/icon baseline, responsive primitives
├── components/      # React presentation components và component styles
├── index.css        # CSS custom properties và shared baseline
└── index.js         # Public JavaScript exports
~~~

Import CSS nền tảng đúng một lần tại React entry point:

~~~js
import './design-system/index.css';
~~~

Import component và token từ public entry point:

~~~jsx
import { Button, Input, Dialog, Badge, spacing, colors } from './design-system/index.js';
~~~

Không import trực tiếp file nội bộ của component khi public export đã có sẵn, trừ khi có lý do kỹ thuật rõ ràng.

### 3.2. Token hiện hành

Các giá trị dưới đây phản ánh token đang có trong repository. Khi thay đổi, cập nhật token gốc thay vì ghi đè tùy tiện ở từng page.

| Nhóm | Giá trị/scale hiện tại |
|---|---|
| Background | #FFFFFF; subtle #F8F9FA |
| Surface muted | #F1F3F4 |
| Text primary | #202124 |
| Text secondary | #5F6368 |
| Border | #DADCE0; subtle #E8EAED |
| Primary | #1967D2 |
| Primary container | #E8F0FE |
| Font | Roboto, fallback Arial/sans-serif |
| Icon font | Material Symbols Rounded |
| Spacing base | 4px |
| Spacing scale | 0, 4, 8, 12, 16, 20, 24, 32, 40, 48px |
| Shape | 4, 6, 8, 12, 16px; full pill |
| Elevation | level 0–3, ưu tiên mức thấp |
| Motion | 120ms, 200ms, 300ms |

**Quy tắc:** Không hardcode màu hoặc spacing mới trong feature UI. Nếu xuất hiện nhu cầu có tính tái sử dụng, bổ sung token có chủ đích và cập nhật tài liệu. Không tạo alias token chỉ để né việc dùng token hiện hữu.

### 3.3. Shape và surface

Quy ước trong Design System:

- Control, button, input: radius 6px.
- Card/panel: radius 8px.
- Dialog: radius 12px.
- Các mức 16px và full chỉ dùng khi phù hợp với component/ý đồ đã thống nhất.
- Không biến mọi container thành card. Dùng layout primitive không trang trí khi nội dung không cần surface riêng.
- Chỉ dùng .vsr-card khi nội dung thực sự cần phân tách thành bề mặt.

## 4. Responsive và layout

Breakpoint được định nghĩa trong VSR Design System:

| Tên | Viewport |
|---|---:|
| Compact | 0–599px |
| Medium | 600–839px |
| Expanded | từ 840px |

Padding ngang của page tương ứng là 16px, 20px và 24px. Đây là breakpoint theo chiều rộng viewport, không phải nhãn cứng cho mobile/tablet/desktop.

- Ưu tiên .vsr-page cho vùng nội dung cần giới hạn chiều rộng và padding thích ứng.
- Dùng CSS Grid/Flexbox; tránh fixed width gây tràn ở viewport hẹp.
- Xem xét viewport thấp, zoom và nội dung dài; không chỉ kiểm tra một kích thước desktop.
- Chỉ áp dụng overflow hidden hoặc khóa cuộn khi trải nghiệm thực sự yêu cầu; không che nội dung bị tràn.
- Với trang được định nghĩa là one-screen, kiểm tra cả chiều cao viewport thấp và mobile landscape. Không hy sinh khả năng truy cập nội dung để ép vừa màn hình.

## 5. Component reuse và ownership của CSS

### 5.1. Ưu tiên component chung

Trước khi viết component hoặc CSS mới, kiểm tra public API hiện tại. Các component hiện có gồm:

- Core/form: Button, Input, Textarea, Select, Checkbox, Switch, RadioGroup, Label, Separator.
- Overlay/feedback: Dialog, Drawer, Menu, Popover, Tooltip, ToastProvider, useToast.
- Navigation/data: Tabs, TreeView, DataTable, Combobox, Badge, Breadcrumb.

Tái sử dụng component chung trước khi tự tạo phiên bản tương tự. Nếu component hiện có thiếu khả năng, mở rộng API theo hướng tương thích ngược và cập nhật tài liệu/component tests; không âm thầm tạo một hệ thống song song.

### 5.2. Phân chia CSS

- **Design System CSS**: token, reset, typography, responsive primitives và visual styling dùng chung của component.
- **Page CSS**: bố cục đặc thù của page như grid, alignment, max-width, page-level spacing và composition.
- **Component-specific CSS**: chỉ dành cho component mới có tính tái sử dụng hoặc cấu trúc nội bộ thật sự riêng; ưu tiên đặt cạnh component.
- Không khai báo lại màu, font, radius, elevation, spacing scale trong CSS của page nếu đã có token tương ứng.
- Không dùng selector toàn cục từ page stylesheet để sửa component dùng chung.
- Hạn chế !important, selector phụ thuộc sâu vào DOM nội bộ và override class của Design System. Nếu cần override thường xuyên, API component hoặc token đang thiếu và cần được xử lý ở đúng lớp.

### 5.3. Khi nào tạo component mới?

Tạo component dùng chung khi có ít nhất một điều kiện: được dùng ở nhiều page/feature; biểu đạt pattern UI ổn định; cần hành vi/accessibility độc lập; hoặc cần API có thể kiểm thử riêng.

Không tách component chỉ vì một đoạn JSX ngắn. Không tạo abstraction quá sớm cho chi tiết chỉ xuất hiện một lần và chưa có pattern ổn định.

## 6. Cấu trúc thư mục React

Cấu trúc đề xuất cho quá trình phát triển tiếp theo:

~~~text
src/
├── app/                    # App shell, providers, route composition (khi cần)
├── pages/
│   ├── home/
│   │   ├── HomePage.jsx
│   │   └── HomePage.css
│   └── <feature>/
│       ├── <Feature>Page.jsx
│       └── <Feature>Page.css
├── components/
│   └── <feature>/          # Component chỉ thuộc feature hoặc page
├── services/               # Điều phối application/use-case, tích hợp runtime
├── hooks/                  # React hooks dùng chung ở presentation layer
├── design-system/          # Nguồn chuẩn UI dùng chung
├── App.jsx
├── App.css
└── main.jsx
~~~

Đây là cấu trúc định hướng, không yêu cầu tạo trước các thư mục rỗng. Chỉ thêm tầng khi có nhu cầu thực tế. App.jsx nên làm nhiệm vụ composition/route entry, không chứa toàn bộ page và feature implementation.

## 7. Accessibility và interaction

Các nguyên tắc nền đã được quy định trong Design System:

- Không dùng hover làm cách duy nhất để khám phá hoặc vận hành hành động.
- Duy trì keyboard focus hiển thị rõ ràng.
- Mục tiêu tương tác tối thiểu 48×48px khi thực tế cho phép; nếu component hiện tại nhỏ hơn, đánh giá hit area và bối cảnh sử dụng.
- Dùng semantic HTML phù hợp: button cho hành động, anchor cho điều hướng, label liên kết với form control, heading theo cấu trúc nội dung.
- Giữ native form semantics và thông báo validation có thể được công nghệ hỗ trợ đọc.
- Overlay cần quản lý focus, Escape và đóng bằng backdrop phù hợp với loại overlay.
- Không biểu đạt trạng thái chỉ bằng màu; kết hợp text, icon hoặc semantic state.
- Tôn trọng prefers-reduced-motion; tránh animation không cần thiết.
- Đảm bảo nội dung và thao tác chính dùng được bằng bàn phím.

Component README ghi nhận đây là implementation ban đầu, chưa thay thế browser-level regression tests. Khu vực cần kiểm thử đặc biệt gồm nested overlays, menu keyboard navigation, screen-reader announcements, mobile viewport behavior, focus edge cases, TreeView sâu/lớn, Combobox và DataTable semantics.

## 8. State, data và side effects

- State hiển thị cục bộ thuộc React component/hook khi chỉ ảnh hưởng UI cục bộ.
- State scenario/runtime phải có một nguồn sự thật ở runtime hoặc adapter tương ứng; không tạo bản sao có thể lệch đồng bộ trong nhiều component.
- Component nhận dữ liệu qua props và phát ý định qua callback; không tự gọi module engine bên trong presentation primitive.
- Side effects (đọc file, gọi transport, khởi tạo runtime, save/restore) đặt ở application/service layer hoặc hook chuyên trách, không nhúng vào Design System component.
- Loading, empty, error, disabled và success là các trạng thái UI cần được thiết kế tường minh khi feature có các trạng thái đó.
- Không hiển thị dữ liệu demo như dữ liệu thật; không tạo recent sessions, catalog, account, cloud sync hoặc tính năng chưa có nguồn dữ liệu/contract.

## 9. Quy trình thêm một page/feature

1. Xác định page phục vụ use case nào và dữ liệu/hành động nào thực sự có trong application/runtime.
2. Kiểm tra Design System tokens và component có thể tái sử dụng.
3. Phác thảo hierarchy và responsive behavior trước khi viết CSS.
4. Tạo page trong thư mục riêng; component feature đặt riêng nếu có lý do tái sử dụng hoặc cần cô lập hành vi.
5. Dùng token và public component API; chỉ viết CSS cho composition đặc thù.
6. Tách orchestration/side effects khỏi component trình bày.
7. Kiểm tra keyboard, focus, semantic structure, contrast, reduced motion và viewport.
8. Chạy lint/test/build nếu scripts tương ứng đã được cấu hình; không tuyên bố kiểm thử thành công nếu chưa thực thi.
9. Cập nhật tài liệu khi thay đổi public component API, token, breakpoint hoặc nguyên tắc nền tảng.

## 10. Kiểm tra trước khi merge

### Visual consistency
- [ ] Dùng light theme và token hiện có.
- [ ] Không hardcode màu/spacing/radius/elevation mới nếu token phù hợp đã tồn tại.
- [ ] Không tự tạo component thay thế component chung.
- [ ] Typography và icon dùng font hệ thống.
- [ ] Surface và shadow được dùng tiết chế.

### Architecture
- [ ] Page không chứa business logic của engine.
- [ ] Design System không import engine/protocol/state/transport.
- [ ] Side effects nằm ở application/service layer hoặc hook phù hợp.
- [ ] Không tạo state trùng lặp cho runtime state.
- [ ] File được chia theo page/component với ownership rõ ràng.

### Accessibility and responsive
- [ ] Có keyboard operation và focus-visible.
- [ ] Không phụ thuộc hover hoặc màu sắc đơn thuần.
- [ ] Form controls có label/validation semantics.
- [ ] Kiểm tra compact, medium và expanded breakpoints.
- [ ] Kiểm tra viewport thấp, nội dung dài và reduced motion.
- [ ] Overlay/menu được kiểm tra focus và keyboard behavior.

### Verification
- [ ] Chạy npm run build.
- [ ] Chạy test phù hợp với phần thay đổi.
- [ ] Kiểm tra đường dẫn base của GitHub Pages (/VSR/) khi deploy.
- [ ] Phân biệt rõ commit, build thành công và deploy đã publish.

## 11. Nguồn nội bộ đã đối chiếu

Các nguyên tắc nền trong tài liệu này được đối chiếu trực tiếp với:

- README-DESIGN-SYSTEM.md: design direction, token/foundation structure, breakpoints, usage và scope.
- README-REACT-COMPONENTS.md: public component API, accessibility semantics và giới hạn kiểm thử.
- README-REACT-NAVIGATION.md: navigation/data components và các khu vực cần browser-level accessibility tests.
- src/design-system/index.css, foundations/base.css, foundations/responsive.css: CSS variables, reset, typography/icon baseline và responsive rules.
- src/design-system/tokens/*.js và theme/lightTheme.js: token values và theme composition.
- src/design-system/components/index.jsx cùng components/index.css: component API và shared styling.
- src/main.jsx: điểm import CSS nền tảng một lần.
- README-REACT.md, package.json, vite.config.js: React scaffold, build scripts và GitHub Pages base path.

Nếu tài liệu này khác với implementation hiện hành, không tự suy đoán: kiểm tra source code và cập nhật tài liệu hoặc implementation trong cùng thay đổi.
