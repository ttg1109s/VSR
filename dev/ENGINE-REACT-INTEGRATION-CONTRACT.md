# VSR Engine ↔ React UI Integration Contract

> Trạng thái: tài liệu kiến trúc và hợp đồng tích hợp.
> Phạm vi: ranh giới trách nhiệm, luồng dữ liệu, JSON Protocol v2, Client Adapter và cách React presentation layer tiêu thụ runtime.
> Cách đọc: **Đang triển khai** mô tả hành vi được xác nhận trong source hiện tại. **Quy ước tích hợp** là hướng dẫn cho code React/application được xây dựng tiếp theo, không khẳng định đã có sẵn.
> Nguồn chuẩn khi có khác biệt: implementation trong `engine/`, `protocol/`, `client/`, schema giao thức và test tương ứng.

## 1. Mục tiêu kiến trúc

VSR tách runtime khỏi công nghệ trình bày. Engine không phải React component, không quản lý DOM và không phụ thuộc vào vòng đời component. React UI không được trở thành nơi thực thi luật scenario hoặc tự sửa runtime state.

Mô hình phụ thuộc mong muốn:

```text
React UI
  │  user intent / renderable state
  ▼
Application integration layer (React hooks, services)
  │  JsonClient public methods / subscribe
  ▼
JsonClient
  │  JSON command / acknowledgement / snapshot / event
  ▼
Transport adapter
  ├── WorkerJsonTransport ── Dedicated Worker ── GameEngine
  ├── HttpJsonTransport ──── HTTP + SSE server ─ GameEngine
  └── Local host transport ─ LocalEngineHost ─── GameEngine
```

Các adapter có thể thay đổi cách vận chuyển mà không buộc React UI phải biết Engine đang chạy trong Worker, process server hay host cục bộ. Đây là mục tiêu của hợp đồng JSON, không phải lời khẳng định rằng mọi transport đã được kiểm thử với mọi deployment.

## 2. Ranh giới trách nhiệm

### 2.1. Engine — nguồn sự thật của gameplay

Engine chịu trách nhiệm:

- Nạp, chuẩn hóa và xác thực scenario.
- Quản lý scene, router, action, chat, inventory, entity, automation, timer, notification và các module runtime.
- Đánh giá điều kiện, thực thi effect và áp dụng quy tắc chuyển trạng thái.
- Quản lý các tác vụ runtime, pause/resume, save/restore theo khả năng hiện có.
- Xử lý command được protocol cho phép; kiểm tra revision, idempotency và authorization hook nếu được cấu hình.
- Tạo snapshot và phát event để client đồng bộ.

Engine không chịu trách nhiệm:

- Render React, HTML, CSS hoặc DOM.
- Quyết định component, layout, responsive breakpoint hay theme.
- Giữ state trình bày riêng như trạng thái mở/đóng modal, focus, hover hoặc tab UI.
- Tin vào kết quả nghiệp vụ do client tự khai báo. Ví dụ: client không được tự gửi cờ “mật khẩu đúng”, số lần thử còn lại hoặc quyền quyết định câu trả lời.

### 2.2. Protocol và Client Adapter — hợp đồng giao tiếp

Protocol/adapter chịu trách nhiệm:

- Định dạng message JSON và version.
- Chuyển command từ client đến Engine.
- Chuyển acknowledgement, snapshot và event về client.
- Theo dõi snapshot phía client và cung cấp subscription.
- Tách React khỏi chi tiết transport.

Adapter không chịu trách nhiệm:

- Dựng giao diện hoặc chứa CSS.
- Thay thế nghiệp vụ của Engine.
- Tự suy diễn state gameplay từ animation hoặc thao tác UI.
- Biến transport thành cơ chế xác thực người dùng.

### 2.3. React UI — presentation và ý định người dùng

React chịu trách nhiệm:

- Hiển thị snapshot và các trạng thái presentation/session mà protocol cung cấp.
- Chuyển thao tác người dùng thành command qua application integration layer.
- Quản lý state thuần giao diện: dialog đang mở, input chưa gửi, focus, expanded/collapsed, trạng thái tạm của form.
- Biểu diễn loading, error, empty, disabled và trạng thái kết nối.
- Đăng ký và hủy subscription đúng vòng đời.
- Giữ accessibility, responsive behavior và tuân thủ Design System.

React không được:

- Import hoặc khởi tạo `GameEngine` trong component.
- Đọc trực tiếp `engine.state`, `engine.src`, module nội bộ hoặc runtime queue.
- Gọi trực tiếp các module như Action/Scene/Effect để thay thế command contract.
- Tự sửa snapshot rồi coi bản sửa đó là runtime state đã được xác nhận.
- Tự quyết định action có hợp lệ, effect có thành công, scene nào được phép vào hoặc password có đúng hay không.
- Đưa scenario source, password answer hoặc dữ liệu bí mật vào presentation projection.

## 3. Các message của JSON Protocol v2

Các message cấp protocol dùng envelope chung:

- `protocol: "vsr"`
- `protocolVersion: 2`
- `type`: `command`, `ack`, `snapshot` hoặc `event`

Không nhầm envelope protocol với envelope nội bộ của Worker transport. Ví dụ Worker dùng `{ type: "request", requestId, command }` và `{ type: "response", requestId, ok, body }` ở lớp vận chuyển; command bên trong vẫn là message protocol VSR.

### 3.1. Command

Client gửi yêu cầu thao tác, không gửi bản state mới để Engine chấp nhận một cách mù quáng.

Ví dụ cấu trúc:

```json
{
  "protocol": "vsr",
  "protocolVersion": 2,
  "type": "command",
  "commandId": "client-generated-id",
  "command": "action.trigger",
  "expectedStateRevision": 12,
  "payload": {
    "actionId": "open-door",
    "uniqueId": "scene-a_router-b_open-door"
  }
}
```

Quy tắc:

- `commandId` là định danh cho một lần gửi command và được dùng cho idempotency.
- `expectedStateRevision` là revision mà client dựa vào khi gửi; protocol cũng chấp nhận alias tương thích `expectedRevision`.
- `payload` phải là object JSON.
- Command phải nằm trong allow-list handler đã đăng ký ở Engine.
- Không tự tạo tên command mới trong React nếu Engine chưa đăng ký handler tương ứng.
- Không tự retry command có side effect với một `commandId` mới khi chưa xác định kết quả lần gửi trước. Nếu retry cùng một thao tác logic, cần hiểu rõ semantics idempotency và giới hạn lưu kết quả hiện tại.

### 3.2. Acknowledgement

Engine trả acknowledgement gắn với `commandId`:

- `ok: true`: handler đã hoàn thành thành công theo protocol.
- `ok: false`: command bị từ chối hoặc thất bại; đọc `error.code` và `error.message` nếu có.
- `revision` và `stateRevision`: revision tại thời điểm tạo acknowledgement.
- `result`: kết quả handler, có thể là `null`.

Các mã lỗi có thể phát sinh từ protocol hiện tại gồm:

| Code | Ý nghĩa |
|---|---|
| `FORBIDDEN` | Authorization hook hoặc yêu cầu authorization từ chối command |
| `REVISION_CONFLICT` | Revision client gửi không còn khớp |
| `UNKNOWN_COMMAND` | Không có handler cho tên command |
| `COMMAND_FAILED` | Handler ném lỗi không cung cấp code riêng |

Transport cũng có thể thất bại trước khi nhận acknowledgement, ví dụ Worker lỗi, HTTP không khả dụng hoặc kết nối SSE/HTTP bị gián đoạn. Phân biệt lỗi transport với acknowledgement `ok: false`; chúng không tương đương nhau.

**Quy ước React:** không coi việc người dùng nhấn nút hoặc việc request được gửi đi là bằng chứng command đã thành công. Chỉ cập nhật UI gameplay dựa trên snapshot/event xác nhận từ Engine. UI có thể hiển thị trạng thái pending trong lúc chờ acknowledgement.

### 3.3. Snapshot

Snapshot là dữ liệu đồng bộ trạng thái tại một thời điểm. Các trường cấp cao hiện có:

| Trường | Vai trò |
|---|---|
| `engineId` | Định danh instance Engine |
| `revision`, `stateRevision` | Revision trạng thái; `revision` là alias tương thích |
| `eventSequence` | Vị trí event stream tại lúc snapshot được tạo |
| `game` | `initialized`, `sceneId`, `routerId`; khi scenario đã load nhưng chưa vào scene, `initialized` là `true` còn `sceneId` và `routerId` là `null` |
| `presentation` | Projection client-safe của scenario title, scene, router, ancestor-to-current `scenePath`, resolved cover metadata và action projection có `key`, `meta`, `presentation`, `availability`, `runtimeState` |
| `session` | Chat, password challenge đã sanitize, timer và notification |
| `state` | Runtime state đã chuyển sang JSON-compatible form và loại bỏ một số runtime-only keys |

Các quy tắc quan trọng:

- `stateRevision` là revision trạng thái có thẩm quyền.
- `presentation` là projection để trình bày, không phải toàn bộ scenario source.
- `session.passwordChallenge` là descriptor đã sanitize; password challenge bị loại khỏi bản sao `state.session`.
- Không thêm password answer, secret scenario data hoặc executable effect vào projection dành cho client.
- Snapshot không phải nơi React ghi ngược thay đổi.

Không giả định mọi field tùy chọn luôn tồn tại. React phải xử lý `null`, array rỗng và trạng thái chưa initialize theo schema/implementation thực tế.

### 3.4. Event

Event có các trường chính: `engineId`, `eventId`, `sequence`, `revision`, `stateRevision`, `timestamp`, `event`, `payload`.

Phân biệt hai loại cursor:

- `stateRevision`: theo dõi thay đổi trạng thái.
- `eventSequence` / event `sequence`: tăng với mọi event được publish, bao gồm cả event trình bày và command lifecycle.

Do đó, không dùng `sequence` thay cho `stateRevision`, hoặc ngược lại.

Các event đáng chú ý:

- `state.snapshot`: payload chứa snapshot mới; client hiện tại dùng event này để cập nhật snapshot.
- `command.accepted`, `command.completed`, `command.failed`: vòng đời command.
- `presentation.*`: tín hiệu ý định trình bày; không mặc nhiên là state gameplay bền vững.

Presentation event có thể mô tả hiệu ứng tạm thời. Client không được suy ra durable state chỉ từ event trình bày; hãy lấy durable state từ snapshot/domain state.

Event buffer có giới hạn. Khi `getEventsAfter(sequence)` hoặc `getEventsSince(revision)` báo `gap: true`, client phải lấy snapshot mới thay vì giả định đã nhận đủ event.

## 4. Command hiện được protocol tài liệu hóa

Các command sau được liệt kê trong `protocol/README.md`. Payload dưới đây là hợp đồng cấp cao; schema và handler thực tế vẫn là nguồn quyết định cuối cùng.

| Command | Payload | Ý nghĩa |
|---|---|---|
| `scenario.inspect` | `{ scenario }` | Chuẩn hóa/validate scenario và trả metadata an toàn, không khởi chạy gameplay |
| `snapshot.get` | `{}` | Lấy snapshot client-safe mới nhất, không thay đổi state/revision |
| `engine.init` | `{ script, enterScene? }` | Nạp scenario; `enterScene: false` giữ runtime đã load nhưng chưa vào scene (mặc định `true` để tương thích) |
| `action.trigger` | `{ actionId, uniqueId? }` | Thực thi action trên router đang active |
| `action.markAsRead` | `{ uniqueId }` | Đánh dấu mô tả action đã đọc |
| `chat.next` | `{}` | Tiến hội thoại |
| `chat.selectChoice` | `{ index }` | Chọn lựa chọn hội thoại |
| `inventory.toggleHand` | `{ itemId }` | Trang bị/bỏ trang bị item |
| `item.use` | `{ itemId }` | Sử dụng item |
| `scene.enter` | `{ sceneId, skipTransition? }` | Vào scene |
| `password.submit` | `{ challengeId, input?, cancel? }` | Gửi hoặc hủy challenge đang active |
| `engine.pause` | `{}` | Tạm dừng background tasks |
| `engine.resume` | `{}` | Tiếp tục background tasks |
| `save.export` | `{}` | Xuất save envelope |
| `save.restore` | `{ save }` | Khôi phục save envelope đã validate |
| `notification.read` | `{ notificationId }` | Đánh dấu notification đã đọc |
| `notification.dismiss` | `{ notificationId }` | Bỏ notification đang pending |

Không suy ra command khác chỉ vì một module Engine có public method. Giao diện protocol chỉ hỗ trợ command đã được đăng ký trong protocol handler.

### 4.1. Password challenge là luồng đặc biệt

Client chỉ gửi `challengeId` được Engine cấp và input người dùng nhập (hoặc yêu cầu cancel). Engine kiểm tra ownership, scene/router đang active, retry policy, deadline, định nghĩa password và câu trả lời.

Client tuyệt đối không gửi:

- Cờ `success: true` hoặc kết quả xác minh do client tự tính.
- Retry counter hoặc retry limit do client tự quyết.
- Password definition hoặc answer authority.
- Challenge ID tự chế thay cho ID đang active.

Với puzzle, client gửi arrangement theo quy ước original piece indices ở vị trí cuối theo row-major; Engine xác minh dimensions và arrangement. Với `find_way`, client gửi mảng tọa độ `[x,y]`; Engine kiểm tra bounds, adjacency, điểm đầu/cuối, không lặp ô và đối chiếu đường đi đúng. Snapshot chỉ được cung cấp hint công khai như lưới, start, target và puzzle media; không gửi đáp án hoặc đường đi chuẩn.

## 5. Client Adapter API hiện có

### 5.1. JsonClient

`client/adapters/JsonClient.js` cung cấp các API chính:

- `new JsonClient(transport)`
- `subscribe(listener)`
- `getSnapshot()`
- `initialize(scenario)`
- `dispatch(name, payload)`
- `refreshSnapshot()` — gọi command read-only `snapshot.get`, không gửi `expectedStateRevision`, cập nhật `JsonStateStore` từ projection mới
- Các wrapper: `triggerAction`, `markActionRead`, `nextChat`, `selectChatChoice`, `toggleHand`, `useItem`, `enterScene`, `submitPassword`, `pause`, `resume`, `exportSave`, `restoreSave`
- `dispose()`

Khi nhận snapshot, JsonClient cập nhật `JsonStateStore` và phát message `{ type: "state", reason, snapshot, changedKeys }`. Khi nhận event, nó phát `{ type: "event", event }`. Lỗi parse/transport được chuyển thành message `transport.error`.

Lưu ý implementation hiện tại:

- `dispatch` tự tạo `commandId` và thêm `expectedStateRevision` nếu đã có snapshot.
- `dispatch` parse acknowledgement; nếu `ack.ok === false`, nó throw Error có gắn `code` và `acknowledgement`.
- `initialize(scenario, { enterScene = true } = {})` gửi `engine.init`; mặc định giữ hành vi tương thích là vào entry scene. Luồng Loading có thể truyền `enterScene: false` để chỉ nạp scenario và giữ `game.sceneId === null`. Sau đó yêu cầu snapshot có `game.initialized`; nếu chưa có, nó throw.
- `dispose()` hủy subscription transport và xóa listener của JsonClient. Vòng đời transport (ví dụ `close()`) vẫn do nơi tạo transport quản lý.

Không gọi `JsonClient.receive` trực tiếp từ component như một cách cập nhật state; message đến từ transport subscription.

### 5.2. Transport contract

JsonClient yêu cầu transport có:

- `request(commandJson)`: nhận JSON command và trả JSON acknowledgement.
- `subscribe(listener)`: đăng ký nhận message JSON từ transport.

Các implementation hiện có:

| Adapter | Cơ chế |
|---|---|
| `WorkerJsonTransport` | Dedicated module Worker; UI thread không giữ GameEngine reference |
| `HttpJsonTransport` | HTTP request và Server-Sent Events |
| `LocalEngineHost` | Host trong cùng process, dùng cho tích hợp local/test phù hợp |

Không để React component phụ thuộc trực tiếp vào API riêng của Worker hoặc EventSource. Nếu cần đổi transport, thay ở composition/service layer.

## 6. Hợp đồng tích hợp với React

### 6.1. Một owner cho runtime client

**Quy ước tích hợp:** tạo một application-level owner cho transport và JsonClient, đặt ở app integration layer/provider hoặc service composition. Không tạo một Engine/transport mới trong mỗi page hoặc mỗi component.

Ví dụ minh họa về composition, không phải file/provider đã tồn tại trong repository:

```js
import { JsonClient } from './client/adapters/JsonClient.js';
import { WorkerJsonTransport } from './client/adapters/WorkerJsonTransport.js';

const transport = new WorkerJsonTransport();
const runtimeClient = new JsonClient(transport);

// Truyền runtimeClient vào application integration layer.
```

Nơi khởi tạo phải đồng thời chịu trách nhiệm teardown:

```js
runtimeClient.dispose();
transport.close();
```

Với `HttpJsonTransport`, dùng `close()` để đóng EventSource. Không gọi `close()` khi một consumer khác vẫn đang dùng chung transport.

### 6.2. Hook/application service là cầu nối

**Quy ước tích hợp:** React component không tự parse protocol hoặc biết transport. Tạo hook/service mỏng để:

1. Đọc snapshot hiện tại từ `client.getSnapshot()`.
2. Subscribe khi component mount và unsubscribe khi unmount.
3. Cập nhật React state khi nhận message `state`.
4. Chuyển user intent thành lời gọi public method của client.
5. Quản lý pending/error ở lớp UI hoặc application layer.
6. Không lưu bản sao runtime state độc lập có thể lệch snapshot.

Ví dụ hook tối giản dưới đây chỉ minh họa subscription; cần điều chỉnh theo cách app cung cấp client và theo yêu cầu concurrency thực tế:

```jsx
import { useEffect, useState } from 'react';

export function useVsrSnapshot(client) {
  const [snapshot, setSnapshot] = useState(() => client.getSnapshot());

  useEffect(() => {
    setSnapshot(client.getSnapshot());

    const unsubscribe = client.subscribe(message => {
      if (message.type === 'state') {
        setSnapshot(message.snapshot);
      }
    });

    return unsubscribe;
  }, [client]);

  return snapshot;
}
```

Đây là ví dụ định hướng, không phải hook đã được thêm vào `src/`. Với React Strict Mode, đảm bảo subscribe/unsubscribe đối xứng và client có identity ổn định.

### 6.3. Command từ UI

Component nên phát ý định qua callback/service, không tự chứa protocol envelope.

Ví dụ:

```jsx
function ActionButton({ action, runtime }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  async function handleTrigger() {
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      await runtime.triggerAction(action.id, action.uniqueId);
      // Snapshot/event từ Engine là nguồn xác nhận state mới.
    } catch (err) {
      setError(err.message || 'Action failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button disabled={pending} onClick={handleTrigger}>
        {pending ? 'Đang xử lý…' : action.title}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
```

Đây là pseudocode minh họa luồng trách nhiệm; sản phẩm thực tế phải dùng Button và feedback component từ VSR Design System, đồng thời xử lý error code theo trải nghiệm cụ thể. Không dùng optimistic gameplay mutation nếu chưa có chiến lược rollback/conflict rõ ràng.

### 6.4. Phân loại state trong React

| Loại state | Nơi sở hữu | Ví dụ |
|---|---|---|
| Durable gameplay state | Engine; client nhận qua snapshot | scene/router hiện tại, inventory, runtime action state |
| Session state do Engine quản lý | Engine; client nhận projection | chat history, active password challenge, notifications, timer |
| Transport/client state | Adapter hoặc integration layer | connected/disconnected, request in-flight, transport error |
| Presentation-local state | React | modal mở, input draft, focus, hover, tab đang chọn |

Không đưa input draft chưa submit vào runtime state. Không dùng React state làm nguồn sự thật thứ hai cho inventory, scene hoặc chat progression.

### 6.5. Đồng bộ snapshot và event

- Snapshot là điểm khởi đầu và cơ chế phục hồi đồng bộ.
- Event stream là cập nhật theo thứ tự; dùng `sequence` để theo dõi event cursor.
- `stateRevision` dùng để phát hiện stale command/concurrency conflict.
- Khi phát hiện event gap, reconnect không đủ để khẳng định đã có đủ dữ liệu; cần lấy snapshot mới.
- Không áp dụng event trùng lặp như thể đó là thao tác gameplay mới.
- Không giả định mỗi command thành công luôn tạo đúng một snapshot event; kiểm tra contract/handler của use case tương ứng.

Implementation JsonClient hiện xử lý event `state.snapshot` và message snapshot. Cơ chế replay/gap recovery ở cấp ứng dụng React cần được thiết kế dựa trên transport/server API; không được mặc định rằng hook ví dụ ở trên đã triển khai replay.

## 7. Luồng tích hợp chuẩn

### 7.1. Inspect, confirm và khởi tạo scenario

1. Application layer tạo transport và JsonClient.
2. Gọi `client.inspectScenario(scenario)` để Engine chuẩn hóa, kiểm tra schema/tham chiếu và trả metadata an toàn.
3. Command inspection không gọi `GameEngine.init`, không vào entry scene, không khởi tạo gameplay và không tăng `stateRevision`.
4. React hiển thị metadata; người dùng có thể hủy hoặc xác nhận.
5. Chỉ sau khi xác nhận mới gọi `client.initialize(scenario)`.
6. Chờ acknowledgement và snapshot initialized theo semantics của `JsonClient.initialize`.
7. React render từ snapshot.
8. Nếu inspect hoặc init lỗi, hiển thị lỗi có thể phục hồi; không tự tạo snapshot giả.

Scenario JSON là input để Engine nạp. Nó không phải save data.

### 7.2. Thực thi action

1. React render danh sách action từ `snapshot.presentation.actions`.
2. Người dùng chọn action.
3. Integration layer gọi `client.triggerAction(actionId, uniqueId)`.
4. UI hiển thị pending và khóa thao tác trùng nếu cần.
5. Xử lý acknowledgement; nếu lỗi `REVISION_CONFLICT`, gọi `client.refreshSnapshot()` (command read-only `snapshot.get`) để cập nhật snapshot mới.
6. Không tự retry command có side effect sau revision conflict; hiển thị trạng thái mới và yêu cầu người dùng xác nhận thao tác lại.
7. Render state mới khi nhận snapshot/event.

Không lấy danh sách action từ scenario source tự parse trong component nếu snapshot đã cung cấp projection phù hợp.

### 7.3. Import JSON

UI có thể chịu trách nhiệm chọn file, đọc text và parse JSON ở presentation/application layer. Tuy nhiên:

- Parse thành công ở browser không có nghĩa scenario hợp lệ theo Engine.
- Engine là nơi chuẩn hóa/validate scenario trong bước `scenario.inspect`; bước `engine.init` vẫn kiểm tra lại khi thực sự khởi chạy.
- Không tự bỏ field hoặc sửa cấu trúc scenario âm thầm để “làm cho chạy”.
- Phân biệt lỗi đọc file, lỗi JSON syntax, lỗi scenario validation và lỗi khởi tạo runtime.
- Không gửi file lớn hoặc dữ liệu không tin cậy mà không áp dụng giới hạn phù hợp ở host/transport.

### 7.4. Save và restore

Save envelope khác scenario JSON. UI không tự serialize toàn bộ React state để giả lập save runtime. Dùng `client.exportSave()` và `client.restoreSave(save)`; xử lý lỗi và snapshot mới theo kết quả Engine.

Save export có thể chứa scenario và runtime data nhạy cảm. Không đưa save vào URL, log công khai, analytics hoặc storage không tin cậy nếu chưa có quyết định bảo mật rõ ràng.

## 8. Bảo mật và trust boundary

- Worker là ranh giới thực thi, không phải ranh giới bảo mật/confidentiality. Scenario và password definitions chạy phía client có thể được người chơi quan sát.
- Local HTTP/SSE server hiện bind localhost để phát triển; không coi đây là production authoritative server.
- Với deployment network-facing, xác thực caller ở transport/server đáng tin cậy; truyền principal qua trusted context.
- `authorizeCommand` là hook authorization, không phải cơ chế authentication. Khi cần, cấu hình `requireAuthorization: true` cùng authorization function.
- Không nhận identity/principal từ command payload.
- Không gửi scenario source hoặc password answer cho client không tin cậy.
- Không đặt bí mật trong `presentation`, `session` hoặc bất kỳ snapshot field nào được gửi tới browser.
- Validate payload, giới hạn body size, xử lý rate limit/abuse và quản lý session ở host/server theo threat model của deployment.

## 9. Những điều không được giả định

Các điểm sau cần được kiểm tra trước khi thiết kế feature:

- Không giả định đã có authentication/account system.
- Không giả định có cloud save, đồng bộ nhiều thiết bị hoặc multiplayer.
- Không giả định có scenario catalog/marketplace hoặc discovery service.
- Không giả định UI đã có router/navigation cho các màn runtime.
- Không giả định có hook React, provider hoặc runtime context chính thức; hiện tài liệu này chỉ đề xuất cách tổ chức.
- Không giả định Worker bảo vệ được scenario secret.
- Không giả định HTTP server local hiện tại đã sẵn sàng cho production.
- Không giả định event stream không bao giờ mất event.
- Không giả định `ack.ok` thay thế snapshot mới; acknowledgement và state synchronization là hai phần khác nhau.

Trong triển khai hiện tại, hai nút Home gọi `scenario.inspect` qua Worker-backed `JsonClient`. Metadata chỉ được hiển thị sau khi Engine xác thực scenario; `engine.init` chỉ được gọi khi người dùng chọn “Chạy kịch bản”.

## 10. Checklist khi xây dựng một feature React dùng Engine

### Contract
- [ ] Use case dùng command đã có handler.
- [ ] Payload khớp contract; không gửi dữ liệu nghiệp vụ do client tự quyết.
- [ ] Xử lý acknowledgement success/failure và transport failure riêng biệt.
- [ ] Xử lý revision conflict và stale snapshot.
- [ ] Render từ snapshot/projection phù hợp; không đọc Engine internals.

### Lifecycle và synchronization
- [ ] Một owner có trách nhiệm tạo và dispose client/transport.
- [ ] Subscription được đăng ký và cleanup đối xứng.
- [ ] Runtime state không bị nhân bản thành nhiều nguồn sự thật.
- [ ] Có chiến lược phục hồi snapshot khi event gap/reconnect.
- [ ] Không giả định event presentation là durable state.

### Security
- [ ] Không lộ scenario secret/password answer.
- [ ] Không tin success flag hoặc authorization claim từ UI.
- [ ] Không coi Worker/local server là security boundary.
- [ ] Xác định rõ trust model của deployment.

### UI quality
- [ ] Dùng shared Design System components/tokens.
- [ ] Có pending, disabled, error và empty states phù hợp.
- [ ] Có keyboard/accessibility semantics.
- [ ] Không tạo UI cho capability chưa có contract/data source.
- [ ] Test cả adapter/service và hành vi UI ở mức phù hợp.

## 11. Source code và tài liệu đối chiếu

Tài liệu được xây dựng từ source branch `engine-only`, tập trung vào:

- `protocol/README.md`: JSON Protocol v2, revision/event cursor, snapshot projection, command list, password submission và trust boundary.
- `protocol/protocol.schema.json`: schema của snapshot, event, command và acknowledgement.
- `protocol/JsonProtocol.js`: serialization, snapshot, event log, command dispatch, revision conflict, idempotency và authorization hook.
- `protocol/index.js`: Engine API facade và presentation event proxy.
- `client/README.md`: ranh giới client adapter và ví dụ sử dụng.
- `client/adapters/JsonClient.js`: public client API, snapshot store, dispatch và subscription.
- `client/adapters/WorkerJsonTransport.js`: Worker request/response/event transport.
- `client/adapters/HttpJsonTransport.js`: HTTP/SSE transport.
- `engine/LocalEngineHost.js`, `engine/engine.worker.js`: host và Worker execution.
- `server/index.js`: local HTTP/SSE endpoints và server lifecycle.
- `engine/index.js`, `package.json`: public exports và package entry points.
- `src/App.jsx`, `src/pages/home/HomePage.jsx`, `src/components/home/HomeActionCard.jsx`: trạng thái React app hiện tại.
- `dev/UI-ENGINEERING-PRINCIPLES.md`: nguyên tắc presentation layer và Design System.

Khi protocol/schema thay đổi, cập nhật tài liệu này cùng thay đổi code tương ứng. Không dùng tài liệu làm lý do để giữ một contract đã lỗi thời so với implementation.
