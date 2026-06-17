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
vcr.vngcloud.vn/111480-abp111668/artemis-starter-galaxy:submission-final-9
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

Dữ liệu trong bản hackathon demo được lưu ở trình duyệt để mô phỏng trải nghiệm nhanh, không yêu cầu database riêng. Nếu triển khai production, Artemis nên dùng backend database/persistent storage để mọi user cùng thấy dữ liệu realtime, đồng thời tích hợp VNG domain SSO.

Runtime hỗ trợ:

- `GET /` mở giao diện Artemis.
- `GET /health` trả trạng thái health check cho runtime.
- `POST /invocations` là endpoint tương thích để AgentBase gọi khi cần.

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
