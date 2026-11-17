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
- Với collection dạng thẻ, ưu tiên `Grid columns="responsive-cards"`: một cột ở Compact, hai cột ở Medium và ba cột ở Expanded. Breakpoint thuộc Design System; feature không tự định nghĩa media query.
- Xem xét viewport thấp, zoom và nội dung dài; không chỉ kiểm tra một kích thước desktop.
- Chỉ áp dụng overflow hidden hoặc khóa cuộn khi trải nghiệm thực sự yêu cầu; không che nội dung bị tràn.
- Với trang được định nghĩa là one-screen, kiểm tra cả chiều cao viewport thấp và mobile landscape. Không hy sinh khả năng truy cập nội dung để ép vừa màn hình.

### 4.1. Safe Area và edge-to-edge layout (bắt buộc)

Safe Area là nền tảng layout của Design System, không phải logic tùy chọn do từng page/feature tự triển khai.

**Nguồn dữ liệu duy nhất** nằm tại `src/design-system/foundations/base.css` với bốn CSS custom properties:

- `--vsr-safe-area-top`
- `--vsr-safe-area-right`
- `--vsr-safe-area-bottom`
- `--vsr-safe-area-left`

Chỉ Foundation được phép đọc trực tiếp `env(safe-area-inset-*)`. `#root` là Safe Area owner mặc định cho toàn bộ document-flow UI và nhận đủ bốn inset theo thứ tự top/right/bottom/left. Page shell, reading content, loader và breadcrumb không được cộng lại inset đã nhận từ root. Sticky UI chỉ dùng token làm vị trí neo (ví dụ `top: var(--vsr-safe-area-top)`), không thêm padding Safe Area lần nữa. Các thành phần fixed hoặc render qua Portal ngoài `#root` (Dialog, Drawer, Popover, Toast, Bottom Navigation) phải tự nhận inset đúng một lần tại lớp bao ngoài của chính chúng. Full-screen media có thể tràn edge-to-edge; các điều khiển tương tác của media phải nằm trong vùng an toàn. Các utility class chỉ được giữ khi có consumer thực tế; không tạo thêm lớp bọc chỉ để chuyển tiếp cùng một inset.

**Quy tắc ownership:**

1. Page thông thường dùng `.vsr-page-shell`, kế thừa inset ở bốn cạnh.
2. Page edge-to-edge được phép cho background/media phủ viewport; vùng nội dung và điều khiển tương tác vẫn phải nằm trong vùng an toàn.
3. `.vsr-page-shell--flush-top` chỉ bỏ padding của outer shell; child trực tiếp như breadcrumb và content region phải tự nhận inset qua primitive hoặc pattern đã được Design System định nghĩa.
4. Fixed bottom navigation và spacer phải cùng tính một chiều cao an toàn, tránh nội dung bị che hoặc tạo khoảng trống kép.
5. Dialog/Drawer/Popover/Toast render qua Portal không kế thừa padding của page cha. Shared overlay/positioning layer phải tự giới hạn trong viewport an toàn.
6. Fullscreen Drawer/player/loader phải khai báo rõ background edge-to-edge và vùng interactive safe. Không áp dụng padding toàn cục một cách máy móc nếu sẽ làm co sai media hoặc scroll region.
7. Không tạo React SafeAreaProvider/hook nếu CSS environment variables đáp ứng được yêu cầu. Chỉ bổ sung JS/native bridge khi có yêu cầu runtime đã được chứng minh.

**Kiểm tra bắt buộc:**

- `viewport-fit=cover` có mặt trong viewport meta cho web app hỗ trợ edge-to-edge.
- Không có direct `env(safe-area-inset-*)` ngoài Foundation.
- Kiểm tra root inset trên mọi page; iOS notch/Dynamic Island, Home Indicator, Android gesture navigation, landscape, viewport thấp và bàn phím ảo.
- Test page shell, reading content, loader, sticky breadcrumb, bottom navigation, fullscreen drawer, dialog, toast và popover; xác nhận không có inset bị cộng hai lần.
- Chạy `npm run audit:safe-area` trước khi merge.

Không được coi việc thay chuỗi `env()` hoặc việc CSS build thành công là bằng chứng UI đã đúng trên thiết bị. Cần regression test trên browser/device tương ứng.

## 5. Component reuse và ownership của CSS

### 5.1. Ưu tiên component chung

Trước khi viết component hoặc CSS mới, kiểm tra public API hiện tại. Các component hiện có gồm:

- Core/form: Button, Input, Textarea, Select, Checkbox, Switch, RadioGroup, Label, Separator.
- Overlay/feedback: Dialog, Drawer, Menu, Popover, Tooltip, ToastProvider, useToast.
- Navigation/data: Tabs, TreeView, DataTable, Combobox, Badge, Breadcrumb, MediaFrame.

Public navigation/media APIs:
- `Breadcrumb` accepts `activeKey`, `scrollable`, and `sticky`; use `activeKey` when the current item is not guaranteed to be the last item.
- `MediaFrame` renders an image or muted looping inline video, supports the `16:9`, `1:1`, and `4:5` ratios, and accepts an overlay slot for shared components such as `Badge`.


Tái sử dụng component chung trước khi tự tạo phiên bản tương tự. Nếu component hiện có thiếu khả năng, mở rộng API theo hướng tương thích ngược và cập nhật tài liệu/component tests; không âm thầm tạo một hệ thống song song.

### 5.2. Phân chia CSS — Design System First, Audit Before Custom CSS

**Quy tắc bắt buộc:** Page chỉ được composition các public component, layout primitive và pattern đã được Design System cung cấp. Page không được tạo stylesheet riêng, CSS module, styled-components, CSS-in-JS, inline style hoặc bất kỳ cơ chế nào khác để tự định nghĩa presentation/layout.

**Quy trình bắt buộc trước khi tạo CSS riêng cho bất kỳ component/feature nào:**

1. **Kiểm kê Design System trước:** kiểm tra token, foundation, layout primitive, component, variant, size, slot, composition pattern và public API hiện có. Đọc implementation và tài liệu liên quan; không kết luận chỉ dựa trên tên component hoặc phỏng đoán.
2. **Đối chiếu nhu cầu giao diện:** mô tả rõ cấu trúc, hành vi, responsive behavior, trạng thái và yêu cầu accessibility mà feature cần. Đối chiếu từng nhu cầu với khả năng hiện có của Design System.
3. **Phân loại phần còn thiếu:** xác định đó là năng lực dùng chung, pattern có thể tái sử dụng, hay chi tiết thực sự chỉ thuộc một feature. Không tạo CSS riêng chỉ vì API hiện tại chưa được kiểm tra đầy đủ hoặc vì viết CSS nhanh hơn.
4. **Chọn đúng nơi sở hữu:** nếu năng lực có tính dùng chung hoặc có khả năng tái sử dụng hợp lý, bổ sung token/component/variant/slot/layout primitive/pattern vào Design System và public export/documentation/tests tương ứng. Nếu chỉ là composition một lần, ưu tiên ghép các API có sẵn; không nâng mọi chi tiết đơn lẻ thành component dùng chung.
5. **Chỉ giữ CSS riêng khi có lý do kỹ thuật cụ thể:** component phải là một đơn vị UI/feature độc lập với cấu trúc hoặc hành vi đặc thù mà API Design System hiện tại không thể biểu đạt hợp lý. Ghi nhận năng lực còn thiếu, lý do không phù hợp để đưa vào Design System và phạm vi ảnh hưởng. CSS riêng phải dùng token hiện có, không sao chép/định nghĩa lại design language, không phụ thuộc sâu vào DOM nội bộ của component dùng chung.
6. **Đánh giá lại khi Design System thay đổi:** CSS ngoại lệ phải được xem xét loại bỏ hoặc chuyển thành API Design System khi năng lực tương ứng được cung cấp. Không giữ CSS cũ theo quán tính.

Không được suy luận rằng mọi CSS cạnh feature component đều hợp lệ chỉ vì nó không nằm trong page. Vị trí file không quyết định tính chính đáng; quyết định phải dựa trên audit năng lực, ownership và khả năng tái sử dụng.

Page được phép chứa:
- JSX/TSX composition và semantic HTML phù hợp.
- Binding dữ liệu, state trình bày cục bộ, callback và điều phối ở mức page theo ranh giới kiến trúc.
- Chọn variant/size/props đã được public API của component hỗ trợ.
- ClassName chỉ khi API component cho phép hook vào một class đã được Design System định nghĩa/document; không được dùng className để tự thêm style tại page.

Page không được tự định nghĩa:
- Grid/Flex, width/max-width, alignment, padding/margin/gap, positioning, overflow hoặc responsive breakpoint.
- Font, cỡ chữ, line-height, màu, border, radius, shadow, surface, animation hay trạng thái tương tác.
- CSS selector nhắm vào DOM nội bộ của component dùng chung; inline style hoặc style prop để né quy tắc.

**Nếu thiếu khả năng:** Không viết workaround tại page. Bổ sung hoặc mở rộng token, layout primitive, pattern hoặc component trong `src/design-system/`, cập nhật public export/tài liệu/tests, sau đó page chỉ sử dụng API mới. Ví dụ layout primitives cần được cung cấp tập trung gồm PageShell/PageContainer, Stack, Cluster, Grid, Center, Surface và các pattern như PageHeader, EmptyState, LoadingState, ErrorState. Đây là danh mục năng lực cần triển khai theo nhu cầu, không mặc nhiên khẳng định tất cả đã tồn tại.

**Ngoại lệ hẹp:** CSS chỉ được đặt cạnh một feature component độc lập sau khi đã hoàn thành quy trình audit ở trên và chứng minh component có cấu trúc/hành vi riêng, được dùng như một đơn vị UI, đồng thời không thể biểu đạt hợp lý bằng API Design System hiện có. CSS đó thuộc component, không thuộc page; phải dùng token, không tạo hệ thống style song song. Third-party widget styles phải được cô lập và ghi rõ lý do.

Không dùng selector toàn cục từ feature/page để sửa component dùng chung. Hạn chế !important, selector phụ thuộc sâu vào DOM nội bộ và override class của Design System. Nếu cần override thường xuyên, API component hoặc token đang thiếu và cần được xử lý ở đúng lớp.

### 5.3. Khi nào tạo component mới?

Tạo component dùng chung khi có ít nhất một điều kiện: được dùng ở nhiều page/feature; biểu đạt pattern UI ổn định; cần hành vi/accessibility độc lập; hoặc cần API có thể kiểm thử riêng.

Không tách component chỉ vì một đoạn JSX ngắn. Không tạo abstraction quá sớm cho chi tiết chỉ xuất hiện một lần và chưa có pattern ổn định.

## 6. Cấu trúc thư mục React

**Nguyên tắc:** Tổ chức thư mục theo độ phức tạp và trách nhiệm thực tế, không theo một bộ khung cố định. Không tạo trước thư mục rỗng hoặc các tầng `components/`, `hooks/`, `services/`, `utils/` cho mọi feature.

Cấu trúc nền tối thiểu:

~~~text
src/
├── design-system/          # UI primitives, components, patterns và tokens dùng chung
├── pages/                  # Page composition và route-level entry
│   └── <page>/
│       └── <Page>.jsx
├── components/             # Component đặc thù, chỉ dùng trong một page/feature
│   └── <feature>/
│       └── <Component>.jsx
├── App.jsx
└── main.jsx
~~~

Các thư mục `app/`, `services/`, `hooks/`, `utils/`, `assets/` hoặc `features/` chỉ được thêm khi có trách nhiệm và nội dung thực tế cần đặt ở đó. Không tạo chúng chỉ để cấu trúc trông đầy đủ.

**Quy tắc tổ chức feature/page:**

1. Bắt đầu bằng cấu trúc phẳng. Một feature nhỏ có thể chỉ gồm page và một vài component liên quan; không cần thêm thư mục con.
2. Chỉ tạo `components/`, `hooks/`, `services/`, `utils/` bên trong feature khi đã có nhiều module cùng loại và việc nhóm chúng giúp định vị, ownership hoặc bảo trì rõ ràng hơn.
3. Không tạo file barrel `index.js` chỉ để re-export nếu chưa có nhu cầu public API hoặc ranh giới module cụ thể.
4. Không tạo abstraction, thư mục hoặc file chỉ để dự phòng một khả năng mở rộng chưa có yêu cầu thực tế.
5. Khi feature lớn lên, tái cấu trúc dựa trên cohesion, dependency và ownership thực tế; không cần di chuyển chỉ để tuân theo một sơ đồ lý thuyết.
6. Page chỉ chứa composition và điều phối ở cấp page. Theo mục 5.2, page không có stylesheet riêng; layout/presentation phải đến từ Design System.
7. Component đặc thù đặt gần phạm vi sử dụng của nó. Chỉ chuyển thành component/pattern dùng chung khi có nhu cầu tái sử dụng ổn định hoặc một API/hành vi độc lập có giá trị dùng chung.

Không bắt buộc áp dụng đồng loạt Feature-based Architecture cho toàn bộ repository. Có thể giữ `pages/` và `components/` ở cấp `src/` khi quy mô hiện tại phù hợp; chỉ chuyển sang `features/` khi việc gom page, component và logic theo domain thực sự làm ranh giới rõ hơn. Không duy trì đồng thời hai cách tổ chức cho cùng một feature nếu không có lý do kiến trúc cụ thể.

**Tiêu chí quyết định:** Mỗi thư mục phải có trách nhiệm rõ ràng và chứa đủ nội dung để việc phân nhóm có ích. Nếu một thư mục chỉ có một file và không tạo ra ranh giới ownership cần thiết, ưu tiên đặt file ở cấp gần nhất hợp lý. Kiến trúc tốt tối thiểu hóa độ sâu và sự phân mảnh mà vẫn giữ được ranh giới phụ thuộc rõ ràng.

## 7. Accessibility và interaction

Các nguyên tắc nền đã được quy định trong Design System:

- Không dùng hover làm cách duy nhất để khám phá hoặc vận hành hành động.
- **Phân tách tương tác theo năng lực thiết bị:** hiệu ứng thị giác dành riêng cho rê chuột (hover) chỉ được áp dụng trong `@media (hover: hover) and (pointer: fine)`. Không để selector `:hover` trực tiếp trong CSS nền tảng/component nếu nó làm thay đổi nền, màu, viền, shadow, transform hoặc hiển thị nội dung trên thiết bị cảm ứng.
- **Touch không được phụ thuộc vào hover:** thao tác chạm phải có phản hồi qua trạng thái `:active` ngắn hạn hoặc trạng thái tương tác có chủ đích. Không dùng `:hover` để biểu diễn trạng thái đã chọn, đã mở, đã kích hoạt hoặc trạng thái nghiệp vụ.
- **Giữ riêng trạng thái keyboard:** `:focus-visible` và `:focus-within` phải được khai báo độc lập với quy tắc hover; không đặt chúng bên trong media query chỉ dành cho chuột. Tooltip/popover phải có cách truy cập phù hợp bằng bàn phím và cảm ứng, không phụ thuộc hover.
- **Không xóa trạng thái chọn để chữa lỗi hover:** `.is-selected`, `[aria-selected="true"]`, `[aria-pressed="true"]` và state mở/đóng do ứng dụng quản lý phải tiếp tục phản ánh đúng trạng thái thực. Hover chỉ là affordance tạm thời, không phải nguồn state.
- Với thiết bị lai (màn hình cảm ứng có thể kết nối chuột), dùng media feature `hover` và `pointer` để xác định năng lực con trỏ chính; không suy luận loại thiết bị chỉ từ viewport width hoặc breakpoint.
- Khi thêm selector hover mới, phải kiểm tra cả trạng thái touch sau khi nhả tay, trạng thái keyboard focus và trạng thái selected/active. Ưu tiên quy tắc dùng chung trong Design System; không tạo workaround riêng tại page/feature.
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
2. Kiểm kê Design System tokens, foundations, components, variants, slots, layout primitives và patterns; đọc public API/implementation liên quan.
3. Đối chiếu từng yêu cầu UI với năng lực hiện có; phân loại phần thiếu thành năng lực dùng chung, pattern tái sử dụng hoặc chi tiết đặc thù.
4. Chọn ownership trước khi code: mở rộng Design System nếu có tính dùng chung; chỉ đề xuất CSS riêng khi có lý do kỹ thuật cụ thể và ghi nhận lý do đó.
5. Phác thảo hierarchy và responsive behavior theo ngôn ngữ thiết kế hiện hành trước khi triển khai.
6. Tạo page trong thư mục riêng; component feature đặt riêng nếu có lý do tái sử dụng hoặc cần cô lập hành vi.
7. Dùng token và public component API; không tạo CSS riêng trước khi hoàn tất audit và quyết định ownership.
8. Tách orchestration/side effects khỏi component trình bày.
9. Kiểm tra keyboard, focus, semantic structure, contrast, reduced motion và viewport.
10. Chạy lint/test/build nếu scripts tương ứng đã được cấu hình; không tuyên bố kiểm thử thành công nếu chưa thực thi.
11. Cập nhật tài liệu khi thay đổi public component API, token, breakpoint hoặc nguyên tắc nền tảng.

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
- [ ] Page không có stylesheet, inline style, CSS module hoặc CSS-in-JS.\n- [ ] Page chỉ dùng public Design System components/layout primitives/patterns.\n- [ ] Đã kiểm kê Design System trước khi quyết định tạo CSS riêng.
- [ ] Mỗi CSS ngoại lệ có lý do kỹ thuật, ownership và phạm vi rõ ràng; không thể biểu đạt hợp lý bằng API hiện có.
- [ ] Năng lực có tính dùng chung đã được bổ sung vào Design System thay vì nhân bản ở feature.
- [ ] CSS đặc thù (nếu có) thuộc component độc lập, không thuộc page; dùng token và không phụ thuộc sâu vào DOM nội bộ.
- [ ] CSS ngoại lệ được đánh giá lại khi Design System bổ sung năng lực tương ứng.

### Accessibility and responsive
- [ ] Có keyboard operation và focus-visible.
- [ ] Mọi hiệu ứng hover thị giác được giới hạn trong `@media (hover: hover) and (pointer: fine)`; không có hover giả lập bị giữ sau thao tác chạm.
- [ ] `:focus-visible`/`:focus-within` hoạt động độc lập với media query hover; touch feedback dùng `:active` hoặc state tường minh.
- [ ] Selected/pressed/open state không bị nhầm lẫn hoặc ghi đè bởi hover.
- [ ] Kiểm tra touch: chạm, nhả tay, chạm phần tử khác và cuộn; không còn trạng thái hover dính. Kiểm tra thêm keyboard và thiết bị lai nếu được hỗ trợ.
- [ ] Không phụ thuộc hover hoặc màu sắc đơn thuần.
- [ ] Form controls có label/validation semantics.
- [ ] Kiểm tra compact, medium và expanded breakpoints.
- [ ] Kiểm tra Safe Area trên page, flush-top, fixed navigation và portal overlays.
- [ ] Chạy `npm run audit:safe-area`; không có direct `env()` ngoài Foundation.
- [ ] Kiểm tra viewport thấp, nội dung dài và reduced motion.
- [ ] Overlay/menu được kiểm tra focus và keyboard behavior.

### Verification
- [ ] Chạy npm run audit:ui và npm run audit:deadcode; review mọi unreachable candidate trước khi xóa.
- [ ] Chạy npm run test:browser để kiểm tra overlay, focus và menu trên Chromium.
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
