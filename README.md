# Vũ trụ đồ đạc - Phiên chợ trên mây

Artemis là demo AI agent theo theme vũ trụ dành cho Starter tại VNG. Agent giúp Starter gửi tín hiệu tìm đồ thất lạc, trả lại đồ nhặt được, nhận thông báo khi có tín hiệu phù hợp, và pass lại đồ cũ qua khu "Phiên chợ trên mây".

## Vấn đề

Hiện tại VNG chưa có một platform hoặc channel chính thống dành riêng cho việc tìm và trả đồ thất lạc. Khi một Starter làm mất hoặc nhặt được đồ, thông tin thường bị phân tán ở chat cá nhân, nhóm nhỏ, hoặc các bài đăng rời rạc. Vì vậy người mất khó biết ai đang giữ món đồ, còn người nhặt được cũng khó tìm đúng chủ nhân.

Artemis đóng vai trò như một radar nội bộ: ghi nhận tín hiệu, lưu thông tin trong phiên demo, dò các tín hiệu gần giống nhau và gợi ý contact point để hai bên kết nối nhanh hơn.

## Live endpoint

https://endpoint-0f7feba7-a302-4a7b-91f5-5b49b2a6fc36.agentbase-runtime.aiplatform.vngcloud.vn/

Health check:

```text
https://endpoint-0f7feba7-a302-4a7b-91f5-5b49b2a6fc36.agentbase-runtime.aiplatform.vngcloud.vn/health
```

Image dùng cho bản nộp:

```text
docker.io/iamminhnguyet/artemis-starter-galaxy:backend-v17
```

## Tính năng chính

- Đăng nhập bằng domain để Artemis ghi nhớ tín hiệu theo từng Starter.
- Flow tìm đồ thất lạc: Starter mô tả món đồ, nhập thời gian mất và có thể đính kèm ảnh.
- Flow trả lại đồ bị mất: Starter mô tả món đồ, nhập thời gian nhặt được, vị trí nhặt được và có thể đính kèm ảnh.
- Radar match theo mô tả món đồ, thời gian và tín hiệu ảnh.
- Nếu match chính xác hoặc gần giống, Artemis trả contact point ngay trên mặt trăng radar và lưu vào ô thông báo.
- Ô thông báo chia nhóm để dễ theo dõi tín hiệu radar và hoạt động chợ.
- Dashboard quản trị giúp xem tổng quan tín hiệu tìm/trả đồ, duyệt vật phẩm, chỉnh sửa, ẩn/hiện vật phẩm khi cần.
- Phiên chợ trên mây cho Starter pass lại đồ cũ, có ảnh sản phẩm, mô tả, giá, contact, trạng thái còn hàng/đã pass và số lượt quan tâm.
- Flow đăng vật phẩm dạng chat: Artemis hỏi từng câu rồi tự đưa thông tin vào template vật phẩm.
- Thanh tìm kiếm trong Phiên chợ trên mây: Starter nhập món cần mua, Artemis đẩy các món phù hợp lên đầu.

## Cách hoạt động

Frontend được viết bằng HTML, CSS và JavaScript thuần. Runtime AgentBase dùng server Python nhỏ để phục vụ giao diện và health check.

Dữ liệu submission hiện được lưu qua backend SQLite để nhiều user và nhiều trình duyệt cùng thấy tín hiệu lost/found, marketplace và trạng thái duyệt. Trình duyệt vẫn giữ bản lưu tạm để giao diện không bị gãy khi backend tạm thời chưa kết nối được.

Runtime hỗ trợ:

- `GET /` mở giao diện Artemis.
- `GET /health` trả trạng thái health check cho runtime.
- `POST /invocations` là endpoint tương thích để AgentBase gọi khi cần.

## Backend persistence

Artemis lưu dữ liệu dùng chung bằng SQLite thông qua `server.py`. Mặc định file database nằm ở `.artemis-data/artemis.db` trong thư mục project. Khi deploy AgentBase nên đặt `ARTEMIS_DB=/tmp/artemis-data/artemis.db`; nếu muốn dùng đường dẫn khác, cấu hình biến môi trường `ARTEMIS_DB`.

API routes:

- `POST /api/lost-items`, `GET /api/lost-items`
- `POST /api/found-items`, `GET /api/found-items`
- `POST /api/marketplace-items`, `GET /api/marketplace-items?status=approved`
- `GET /api/admin/marketplace-items?status=pending`
- `PATCH /api/admin/marketplace-items/:id/approve`
- `PATCH /api/admin/marketplace-items/:id/reject`
- `GET /api/matches/:itemId`
- `GET /api/state`, `POST /api/state` vẫn được giữ để tương thích ngược.

## Chạy local

```powershell
python server.py
```

Sau đó mở:

```text
http://127.0.0.1:8080/
```

## Build Docker

```bash
docker build --platform linux/amd64 -t artemis-starter-galaxy:latest .
```

Build và push image đang deploy:

```powershell
docker build --platform linux/amd64 -t artemis-starter-galaxy:backend-v17 .
docker tag artemis-starter-galaxy:backend-v17 iamminhnguyet/artemis-starter-galaxy:backend-v17
docker push iamminhnguyet/artemis-starter-galaxy:backend-v17
```

Image dùng cho AgentBase:

```text
docker.io/iamminhnguyet/artemis-starter-galaxy:backend-v17
```

Biến môi trường khuyến nghị cho AgentBase:

```text
PORT=8080
ARTEMIS_DB=/tmp/artemis-data/artemis.db
```

## Upload lên GitHub

Các file/thư mục nên commit:

```text
index.html
styles.css
app.js
server.py
Dockerfile
README.md
.gitignore
.dockerignore
assets/
```

Không commit file/thư mục local/runtime:

```text
.artemis-data/
__pycache__/
*.db
*.db-journal
*.db-wal
*.db-shm
*.tmp
write-test.tmp
.env
.agentbase/
.claude/
.docker-codex/
submission-guide.docx
submission-guide.txt
app-v2.js
proxy.py
greennode-agentbase-skills-main/
artemis-vu-tru-do-dac-cho-troi-vng/
```

## Cấu trúc project

```text
index.html      Giao diện chính
styles.css      Styling theme vũ trụ, mặt trăng, phiên chợ và dashboard
app.js          Logic chat flow, radar matching, thông báo, marketplace và dashboard
server.py       Server runtime cho AgentBase
Dockerfile      Cấu hình container image
assets/         Hình ảnh, font và visual assets
```

## Ghi chú demo

Người dùng có thể đăng nhập bằng domain-style username bất kỳ, ví dụ `nguyetntm5`.

Đây là bản hackathon demo tập trung vào trải nghiệm agent, giao diện, flow tìm/trả đồ và phiên chợ nội bộ. Bản production nên bổ sung backend database, phân quyền thật, và kênh thông báo nội bộ như email hoặc MS Teams.
