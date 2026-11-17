# VSR Legacy Code Removal Policy

> Trạng thái: chính sách đã được triển khai trên branch `engine-only`; kết quả kiểm thử CI được ghi ở mục 10.
> Phạm vi: scenario schema, scenario normalization/validation, engine runtime, persistence liên quan đến scenario, generated schema artifacts và test/fixture.
> Mục tiêu: đưa VSR về một codebase có **một mô hình dữ liệu chuẩn duy nhất**, không mang theo nhánh xử lý dành cho định dạng cũ hoặc giả định về một hệ thống đã vận hành production.
> Nguyên tắc quyết định: VSR hiện được xem là sản phẩm đang phát triển trước production. Không duy trì backward compatibility chỉ vì một cấu trúc từng tồn tại trong repository.

## 1. Quyết định nền tảng

VSR sẽ được làm sạch như một hệ thống mới, với một contract chuẩn duy nhất cho scenario và một cách thực thi duy nhất trong engine.

Không cần bảo toàn khả năng đọc scenario cũ, save cũ hoặc cấu trúc dữ liệu cũ chỉ để tránh breaking change. Không duy trì adapter, fallback, alias, migration rỗng, nhánh parser hay đoạn cleanup chỉ nhằm phục vụ những định dạng đã bị thay thế.

**Được phép breaking change.** Khi một cấu trúc cũ không còn thuộc mô hình chuẩn, phải xóa nó khỏi schema, validator, normalizer, runtime, tài liệu, demo và test. Không chỉ xóa mô tả trong schema rồi để code cũ nằm lại trong engine.

Mục tiêu không phải giảm số dòng code bằng mọi giá. Mục tiêu là loại bỏ các đường xử lý không thuộc contract hiện tại, giảm số trạng thái mà runtime phải hiểu và làm cho schema phản ánh chính xác hành vi thực tế.

## 2. Định nghĩa mã di sản

Trong phạm vi đợt refactor này, một thành phần được xem là legacy khi nó tồn tại chủ yếu để:

- Đọc, chuyển đổi, diễn giải hoặc âm thầm chấp nhận một cấu trúc scenario đã bị thay thế.
- Duy trì tên field, kiểu dữ liệu, cú pháp hoặc cách tổ chức state cũ song song với mô hình hiện tại.
- Cung cấp fallback khi dữ liệu không theo contract chuẩn, thay vì từ chối dữ liệu sai.
- Hỗ trợ import/alias/shortcut cũ mà không còn là tính năng được thiết kế và kiểm thử chính thức.
- Xóa hoặc sửa dữ liệu cũ sau khi nạp chỉ để che giấu một định dạng không còn được hỗ trợ.
- Duy trì migration framework, compatibility shim hoặc version branch không có nhu cầu thực tế ở giai đoạn trước production.
- Giữ comment, fixture, ví dụ hoặc test khiến người phát triển hiểu nhầm rằng cấu trúc cũ vẫn được hỗ trợ.

Không được kết luận một đoạn code là legacy chỉ vì tên của nó cũ, dài, ít được dùng hoặc không đẹp. Phải xác định vai trò hiện tại và consumer trước khi xóa. Các tính năng nghiệp vụ còn giá trị không phải legacy chỉ vì implementation ban đầu đã cũ; cần viết lại theo contract chuẩn thay vì loại bỏ tùy tiện.

## 3. Contract chuẩn sau refactor

### 3.1. Scenario format

- Chỉ tồn tại một cấu trúc scenario canonical.
- Scenario được xác thực theo JSON Schema chuẩn trước khi runtime sử dụng.
- Field không được khai báo phải bị từ chối; không âm thầm bỏ qua hoặc tự diễn giải.
- Giá trị mặc định chỉ được áp dụng khi schema/contract chủ động quy định rõ.
- Không tự suy đoán phiên bản từ hình dạng dữ liệu.
- `formatVersion` của scenario và `protocolVersion` của JSON Protocol là hai khái niệm độc lập. Không thay đổi protocol version chỉ vì refactor scenario format.
- Nếu tiếp tục giữ `formatVersion`, chỉ chấp nhận phiên bản canonical hiện tại. Không giữ migration cũ hoặc fallback cho phiên bản đã loại bỏ.
- Không thêm migration framework tổng quát khi chưa có một yêu cầu nâng cấp dữ liệu thực tế. Khi cần một format mới trong tương lai, thiết kế migration cụ thể cùng với format đó.

### 3.2. Router actions

Cấu trúc duy nhất được chấp nhận là mảng `router.actions`. Mảng chứa ID tham chiếu tới action toàn cục hoặc action object inline theo định nghĩa canonical.

Ví dụ:

```json
{
  "actions": [
    "action_open_door",
    {
      "id": "action_take_key",
      "meta": { "title": "Lấy chìa khóa" },
      "set": { "display": "show" }
    }
  ]
}
```

Phải loại bỏ hoàn toàn nhánh chấp nhận object map cũ:

```json
{
  "actions": {
    "action_open_door": {
      "meta": { "title": "Mở cửa" }
    }
  }
}
```

Không chuyển object map thành mảng trong normalizer. Không giữ vòng lặp riêng trong Loader hoặc Action để xử lý object map. Validator phải từ chối object map.

### 3.3. Action import

Loại bỏ `router.importAction` khỏi schema và engine.

Lý do:

- Schema hiện đánh dấu đây là legacy và chỉ mô tả mức hỗ trợ một phần.
- Runtime chưa thực hiện đầy đủ semantics import action.
- Giữ một field có vẻ hợp lệ nhưng không tạo ra hành vi tương ứng là vi phạm contract.

Không thay thế bằng một cơ chế import khác trong cùng đợt chỉ để bảo toàn tên gọi cũ. Nếu sau này có nhu cầu tái sử dụng action, thiết kế nó như một tính năng mới, có semantics rõ ràng, schema chuẩn, runtime implementation và test riêng.

### 3.4. Character target và source

Dùng field riêng cho đối tượng đích và nguồn. Không phân tích chuỗi `target` theo dấu `:`.

Ví dụ canonical:

```json
{
  "type": "characters",
  "subtype": "mng_stats",
  "exec": "swap",
  "target": "hero",
  "source": "enemy"
}
```

Phải xóa parser/fallback cho cú pháp cũ:

```json
{
  "target": "hero:enemy"
}
```

Các thao tác cần cả hai nhân vật phải khai báo và validate rõ `target` lẫn `source`. Không tự tách chuỗi, không tự suy ra source từ target, không chấp nhận chuỗi rỗng hoặc giá trị sai kiểu. Các thao tác chỉ cần một nhân vật không được yêu cầu source một cách máy móc; contract phải phản ánh chính xác từng operation.

### 3.5. Character location và runtime state

Dùng cấu trúc location canonical đã được xác lập:

```json
{
  "place": {
    "scene_id": "scene_village_square",
    "currentIndex": 0
  }
}
```

Không giữ root-level `currentScene` hoặc `currentIndex` như alias. Không copy dữ liệu từ root vào `place`, không xóa field cũ sau khi nạp để che giấu dữ liệu đầu vào không hợp lệ. Dữ liệu có field không thuộc schema phải bị từ chối tại boundary.

### 3.6. Các cấu trúc legacy khác

Phải rà soát toàn bộ schema và runtime để tìm các trường hợp tương tự, không giới hạn ở những ví dụ đã phát hiện. Bao gồm nhưng không giới hạn:

- Requirement template và cách tham chiếu requirement.
- Action/effect shorthand, subtype hoặc operation alias.
- Cấu trúc global state, item, inventory, character, chat, password, router và scene.
- Runtime state cũ, root property cũ, alias và fallback.
- Save/restore envelope và các nhánh đọc dữ liệu save cũ.
- Protocol payload alias. Chỉ loại bỏ alias nếu chúng thực sự là legacy của contract; không tự ý phá JSON Protocol v2 hoặc transport đang là contract hiện hành.
- Các comment `LEGACY`, `BACKWARD COMPATIBILITY`, `deprecated`, `old format`, `fallback`, `cleanup` và các tên tương đương.

Mỗi phát hiện phải được phân loại là: **xóa**, **viết lại theo contract canonical**, hoặc **giữ vì vẫn là tính năng hiện hành**. Không xóa chỉ dựa trên kết quả tìm kiếm từ khóa.

## 4. Phạm vi code phải rà soát và chỉnh sửa

### 4.1. Schema và nguồn sinh schema

- `scenario.schema.json` là nguồn chuẩn duy nhất.
- Xóa mọi nhánh `oneOf`/union chỉ tồn tại để chấp nhận legacy.
- Xóa field legacy như `importAction`.
- Xóa mô tả khuyến khích hoặc thông báo rằng engine còn hỗ trợ định dạng cũ.
- Giữ `oneOf`, `anyOf`, `allOf` nếu chúng mô tả các biến thể hợp lệ của contract hiện hành; không xóa cấu trúc kết hợp chỉ vì nhìn thấy chúng trong schema.
- Rà soát `required`, `additionalProperties`, enum, const, default và các định nghĩa dùng chung để bảo đảm contract không chấp nhận dữ liệu mà runtime không thể thực hiện.
- Sinh lại `engine/scenario/ScenarioSchema.js` bằng công cụ chính thức. Không sửa file generated độc lập.
- Chạy `npm run schema:sync` và `npm run schema:check` theo workflow hiện tại.

### 4.2. Scenario normalization, validation và loader

- Rà soát `engine/scenario/Scenario.js`, `engine/modules/Loader.js` và toàn bộ code được gọi trong luồng nạp scenario.
- Normalizer không được làm nhiệm vụ chuyển đổi các format cũ.
- Loader không được âm thầm xóa, đổi tên, ghép hoặc suy diễn field legacy.
- Validator phải từ chối cấu trúc không canonical trước khi runtime state được khởi tạo.
- Chỉ giữ normalization phục vụ canonical contract: áp dụng default đã định nghĩa, tạo runtime index cần thiết và clone dữ liệu khi có yêu cầu ownership.
- Tách rõ validation của input với khởi tạo runtime state. Không để runtime initializer trở thành nơi sửa dữ liệu đầu vào sai định dạng.

### 4.3. Engine runtime

Rà soát toàn bộ `engine/`, không chỉ các file đã được nhắc tới trong báo cáo trước.

- Xóa nhánh parser/dispatch/fallback chỉ phục vụ legacy.
- Xóa alias runtime không thuộc contract canonical.
- Xóa các đoạn cleanup dữ liệu cũ sau load.
- Xóa import path chưa triển khai hoặc không còn được hỗ trợ.
- Không duy trì hai đường thực thi cho cùng một tính năng nếu một đường chỉ phục vụ cấu trúc cũ.
- Nếu một nghiệp vụ vẫn cần thiết, giữ nghiệp vụ và viết lại implementation theo canonical input.
- Không để runtime chấp nhận input không hợp lệ chỉ vì một module có thể tự sửa input đó.

### 4.4. Persistence và save/restore

- Rà soát `engine/persistence/` và mọi đường `save.export` / `save.restore`.
- Xác định một save envelope canonical duy nhất cho giai đoạn hiện tại.
- Xóa parser và fallback chỉ nhằm đọc save format cũ nếu không có dữ liệu production cần bảo toàn.
- Không xóa chức năng save/restore hiện hành.
- Kiểm tra tính nhất quán giữa scenario format, runtime state và save envelope; không gộp các version độc lập thành một version chung.
- Nếu save format hiện tại có version field, giữ nó cho contract hiện hành nếu có ý nghĩa; không tạo migration rỗng hoặc giữ các nhánh version cũ không cần thiết.

### 4.5. Tests, fixtures, demo và tài liệu

- Xóa fixture chỉ đại diện cho format cũ.
- Thay fixture bằng canonical fixture có cấu trúc rõ ràng.
- Xóa test khẳng định legacy input được chấp nhận.
- Thêm test khẳng định legacy input bị từ chối ở boundary.
- Giữ và cập nhật test cho nghiệp vụ canonical tương ứng.
- Rà soát `demo_script.js`, các scenario mẫu, README, tài liệu trong `dev/` và ví dụ code.
- Không để demo hoặc tài liệu hướng dẫn dùng cấu trúc đã bị xóa.
- Không xóa test nghiệp vụ chỉ vì test đó đang dùng fixture cũ; chuyển test sang fixture canonical nếu nghiệp vụ vẫn còn.

## 5. Quy trình thực hiện bắt buộc

Thực hiện theo thứ tự để tránh xóa code khi chưa hiểu consumer và tránh tạo trạng thái nửa cũ nửa mới.

### Giai đoạn A — Lập inventory

1. Tìm toàn repository các từ khóa và dấu hiệu legacy: `legacy`, `backward`, `compatib`, `deprecated`, `old format`, `fallback`, `migration`, `alias`, `cleanup`, `importAction`, `currentScene`, `currentIndex`, cú pháp target/source.
2. Rà soát toàn bộ schema definitions, không chỉ những vị trí có từ khóa.
3. Rà soát các entry point nạp scenario, validate, normalize, load save và restore save.
4. Với từng phát hiện, ghi file, symbol, input cũ, hành vi hiện tại, consumer và quyết định xử lý.
5. Tìm cả các nhánh legacy không có comment. Không coi việc không có từ khóa là bằng chứng code không có compatibility logic.

### Giai đoạn B — Chốt contract canonical

1. Chốt cấu trúc duy nhất cho từng domain.
2. Xác định field bắt buộc, optional, default, enum và invariant.
3. Xác định operation nào cần source, operation nào không.
4. Xác định chính xác boundary nào chịu trách nhiệm reject dữ liệu sai.
5. Cập nhật schema trước hoặc đồng bộ cùng implementation; không để schema và runtime lệch nhau qua một commit hoàn tất.

### Giai đoạn C — Xóa và viết lại

1. Xóa legacy branches trong schema.
2. Xóa parser/normalizer/fallback trong engine.
3. Viết lại consumer để chỉ đọc canonical model.
4. Xóa migration framework hoặc migration entries không còn cần thiết; không xóa versioning hiện hành nếu nó vẫn là một phần có chủ đích của contract.
5. Cập nhật generated artifacts bằng generator.
6. Cập nhật demo, fixture, test và tài liệu.

### Giai đoạn D — Xác minh

1. Chạy toàn bộ test suite.
2. Chạy schema generation và parity check.
3. Chạy lint, type check, build và các audit script mà repository cung cấp.
4. Kiểm tra các luồng engine quan trọng bằng canonical scenario: init, scene/router, action, requirement, effect, character, item, chat, password, automation, notification và save/restore.
5. Kiểm tra protocol và transport hiện hành không bị thay đổi ngoài chủ đích.
6. Kiểm tra không còn legacy branch bị bỏ quên bằng tìm kiếm toàn repository và review thủ công các kết quả.
7. Nếu test hiện tại không bao phủ một invariant quan trọng, bổ sung test trước khi kết luận hoàn tất.

## 6. Yêu cầu kiểm thử và tiêu chí nghiệm thu

### 6.1. Kiểm thử dương tính

Mọi canonical scenario hợp lệ phải:

- Pass schema validation.
- Normalize/load mà không cần chuyển đổi từ format cũ.
- Tạo runtime state có cấu trúc nhất quán.
- Chạy đúng các nghiệp vụ mà scenario khai báo.
- Export và restore theo save contract hiện hành.
- Cho kết quả ổn định qua các entry point được hỗ trợ (local engine, worker/server nếu thuộc phạm vi test hiện tại).

### 6.2. Kiểm thử âm tính

Phải có test xác nhận các input sau bị từ chối tại boundary phù hợp:

- `router.actions` dạng object map.
- `router.importAction`.
- `target` chứa cú pháp ghép `destination:source` trong các operation đã chuyển sang field riêng.
- Character khai báo `currentScene` hoặc root-level `currentIndex`.
- Requirement alias hoặc cấu trúc template cũ đã bị loại bỏ.
- Các field không khai báo, operation không thuộc enum, kiểu dữ liệu sai và reference không tồn tại.
- Save envelope cũ nếu định dạng đó đã bị loại bỏ.

Test âm tính phải kiểm tra lỗi có thể hiểu được và xác định đúng boundary từ chối. Không được chỉ kiểm tra rằng engine không crash.

### 6.3. Tiêu chí hoàn tất

Đợt refactor chỉ được xem là hoàn tất khi tất cả điều kiện sau đúng:

- Schema chỉ mô tả canonical contract.
- Runtime không còn nhánh đọc/diễn giải legacy input.
- Normalizer không còn làm migration ngầm.
- Không còn field legacy được chấp nhận rồi xóa sau load.
- Không còn tính năng legacy giả dạng được hỗ trợ nhưng runtime không thực thi.
- Generated schema đồng bộ với schema nguồn.
- Demo, fixture, test và tài liệu đều dùng canonical model.
- Test dương tính và âm tính đều pass.
- Toàn bộ test suite, build và các kiểm tra repository hiện có đều pass.
- Danh sách ngoại lệ còn lại (nếu có) được ghi rõ lý do và không phải compatibility code bị bỏ sót.

Không được đánh dấu hoàn tất chỉ vì từ khóa `legacy` không còn xuất hiện. Mục tiêu là loại bỏ hành vi tương thích cũ, không phải xóa comment để làm sạch kết quả tìm kiếm.

## 7. Những điều không được làm

- Không giữ legacy branch với lý do “có thể sau này cần”.
- Không duy trì song song old format và canonical format.
- Không tự động convert dữ liệu cũ trong normalizer.
- Không chấp nhận input sai rồi âm thầm sửa.
- Không giữ schema field chỉ vì runtime có thể bỏ qua nó.
- Không giữ runtime branch chỉ vì schema từng cho phép nó.
- Không viết migration tổng quát khi chưa có format migration cụ thể.
- Không xóa nghiệp vụ hiện hành chỉ vì implementation của nó có dấu vết legacy.
- Không sửa generated file bằng tay.
- Không thay đổi JSON Protocol v2, transport contract hoặc public API không liên quan nếu không có lý do kỹ thuật và phạm vi riêng.
- Không tuyên bố hoàn tất nếu chỉ chạy một vài test chọn lọc.

## 8. Các phát hiện đã xác định cần xử lý

Các mục dưới đây là điểm bắt đầu của inventory, không phải danh sách đầy đủ:

| Vị trí | Phát hiện | Quyết định |
|---|---|---|
| `scenario.schema.json` — `definitions.router.properties.actions` | Schema chấp nhận cả array canonical và object map legacy | Chỉ giữ array |
| `engine/modules/Loader.js` | Có nhánh khởi tạo action state từ object map | Xóa nhánh object map |
| `engine/modules/Action.js` | Có nhánh xử lý router actions dạng object map | Xóa nhánh object map |
| `scenario.schema.json` — `definitions.router.properties.importAction` | Field legacy, mô tả hỗ trợ một phần | Xóa field |
| `engine/modules/Action.js` | Import action chưa có semantics thực thi hoàn chỉnh | Xóa đường xử lý dang dở |
| `engine/scenario/Scenario.js` | Kiểm tra tham chiếu cho importAction | Xóa validation riêng cho field đã loại bỏ |
| `scenario.schema.json` — `definitions.runnable_wrapper.properties.source` | Mô tả source mới thay cú pháp target ghép | Giữ source canonical, xóa mô tả hỗ trợ cú pháp cũ |
| `engine/modules/effect/strategies/Character.js` | `resolveCharacterPair()` phân tích `target` theo dấu `:` | Xóa parser; dùng target/source riêng |
| `engine/modules/Loader.js` | Xóa `character.currentScene` và `character.currentIndex` sau load | Xóa cleanup; để schema reject input không canonical |
| `engine/scenario/Scenario.js` | Migration map rỗng và `migrateScenario()` không có migration thực tế | Đã xóa migration framework; chỉ xác thực `formatVersion` canonical bắt buộc |
| `tests/engine-core-hardening.test.js` | Test contract scenario và router | Đã bổ sung test âm tính cho format version thiếu/sai, router object map, `importAction`, cú pháp target ghép và save version cũ |

Các đường dẫn và phát hiện trong bảng phải được xác minh lại trên HEAD tại thời điểm triển khai. Có thể có thêm consumer hoặc legacy branch ngoài các vị trí đã biết.

## 9. Nguyên tắc thiết kế sau khi làm sạch

Sau refactor, VSR phải tuân theo các nguyên tắc sau:

1. **Một input model:** mỗi domain chỉ có một cấu trúc dữ liệu được hỗ trợ.
2. **Fail fast:** input không đúng contract bị từ chối ở boundary, với thông báo lỗi rõ ràng.
3. **No silent repair:** không âm thầm sửa dữ liệu đầu vào sai.
4. **No speculative compatibility:** không giữ code chỉ vì một giả định về nhu cầu tương lai.
5. **Schema-runtime parity:** schema, validator, normalizer và runtime phải mô tả cùng một hệ thống.
6. **Generated source discipline:** file sinh tự động luôn được tạo từ nguồn chuẩn.
7. **Tests prove behavior:** test phải chứng minh cả canonical behavior và việc legacy input bị từ chối.
8. **Breaking changes are acceptable pre-production:** ưu tiên mô hình sạch, nhất quán và dễ phát triển hơn việc bảo toàn cấu trúc chưa từng có nghĩa vụ tương thích production.

Đây là một đợt refactor có chủ đích để đưa VSR về trạng thái nền tảng sạch trước production, không phải một dự án duy trì tương thích với lịch sử phát triển của chính repository.


## 10. Kết quả triển khai trên branch `engine-only`

Đợt refactor đã được thực hiện trực tiếp trên branch `engine-only`. Các thay đổi chính:

### 10.1. Scenario schema và engine

- `formatVersion` là field bắt buộc, chỉ chấp nhận version hiện hành; bỏ default ngầm và bỏ `SCENARIO_MIGRATIONS` / `migrateScenario()`.
- `router.actions` chỉ chấp nhận array. Đã xóa object-map compatibility branch trong Loader và Action.
- Đã xóa `router.importAction` khỏi schema, semantic validation và Action runtime.
- `target` và `source` được xử lý độc lập. Đã xóa parser `destination:source`; semantic validation yêu cầu source riêng khi operation cần.
- Đã xóa cleanup root-level `currentScene` / `currentIndex`; input không thuộc schema bị từ chối ở boundary.
- Quan hệ nhân vật chỉ đọc/ghi tại `character.relationship`; CMS, Logic và JSON projection không còn fallback sang `character.set.relationship`.
- Chat yêu cầu khai báo `meta.to`; bỏ nhánh coi sender là recipient khi thiếu `to`. Bookmark runtime chỉ là array; lịch sử không có bookmark bị từ chối thay vì tự phục hồi.
- Notification level thống nhất thành `info`, `success`, `warning`, `danger`, `special`. Đã bỏ severity alias, field `severity` và các level synonym cũ; schema, demo và callsite đã được đồng bộ.
- Đã bỏ fallback chèn item qua global inventory, fallback khi thiếu ItemSystem mixin và fallback khi thiếu EntitySystem mixin.
- StateAccess loại bỏ hai selector trùng, không được sử dụng (`item.color`, `item.label`). Các named selector còn lại là API truy cập state hiện hành, không phải alternate scenario format.
- JSON Protocol v2 và transport contract hiện hành không bị đổi version.

### 10.2. Persistence

- Save envelope chỉ chấp nhận `protocol: "vsr-save"` và `saveVersion: 2`; không còn nâng cấp ngầm save version 1.
- `countVisited` phải tồn tại và là số nguyên không âm an toàn; không còn tự điền 0 khi restore.
- Restore yêu cầu các trường identity đã lưu tường minh; không suy diễn `originalEntryCharacter` hoặc `entryCharacter` từ scenario/default.

### 10.3. Kiểm thử

Đã bổ sung hoặc cập nhật test cho các trường hợp legacy bị từ chối, gồm scenario version, router object map, `importAction`, target/source ghép, save version cũ, visit counter thiếu, relationship root field và notification alias.

<badge>CI PASS</badge>

Xác minh trên commit `1aa82ed2f99668b7256430b5af9b0c9ffcd3e6d3`:

- `npm run schema:check`
- `npm run check:server`
- `npm run audit:ui`
- `npm run audit:safe-area`
- `npm run audit:deadcode`
- `npm run test:browser`
- `npm test`
- `npm run audit:state:strict`
- React build / GitHub Pages workflow

Tất cả các bước trên đều thành công. Kết quả workflow:
- [Engine quality](https://github.com/ttg1109s/VSR/actions/runs/44165755146)
- [VSR headless quality](https://github.com/ttg1109s/VSR/actions/runs/44165755117)
- [React build and GitHub Pages deployment](https://github.com/ttg1109s/VSR/actions/runs/44165755179)

### 10.4. Những contract được giữ có chủ đích

- JSON Protocol v2 vẫn giữ contract công khai hiện hành; refactor scenario không tự ý tạo breaking change cho transport.
- StateAccess named selectors còn được sử dụng bởi engine được giữ làm API truy cập state; chúng không cho phép một scenario format cũ.
- Choice ID vẫn có positional selector `String(index)` vì schema hiện tại định nghĩa ID là optional và ChatSystem sử dụng index làm selector ổn định. Đây là hành vi của contract hiện hành, không phải parser cho scenario format cũ.

Các thay đổi trên đã được commit trên `engine-only`; chưa merge sang branch khác.
