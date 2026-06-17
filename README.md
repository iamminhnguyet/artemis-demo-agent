# Vũ trụ đồ đạc - Phiên chợ trên mây

Artemis là demo AgentBase theo theme vũ trụ dành cho Starter tại VNG. Agent giúp mọi người gửi tín hiệu tìm đồ thất lạc, trả lại đồ nhặt được, nhận thông báo khi có tín hiệu phù hợp, và pass lại đồ cũ qua khu "Phiên chợ trên mây".

## Vấn đề

Hiện tại VNG chưa có một platform hoặc channel chính thống dành riêng cho việc tìm và trả đồ thất lạc. Khi một Starter làm mất hoặc nhặt được đồ, thông tin thường bị phân tán ở chat cá nhân, nhóm nhỏ, hoặc các bài đăng rời rạc. Vì vậy người mất khó biết ai đang giữ món đồ, còn người nhặt được cũng khó tìm đúng chủ nhân.

Artemis đóng vai trò như một radar nội bộ: ghi nhận tín hiệu, lưu thông tin, tự dò các tín hiệu gần giống nhau và gợi ý contact point để hai bên kết nối nhanh hơn.

## Live endpoint

https://endpoint-0f7feba7-a302-4a7b-91f5-5b49b2a6fc36.agentbase-runtime.aiplatform.vngcloud.vn/

Health check:

```text
https://endpoint-0f7feba7-a302-4a7b-91f5-5b49b2a6fc36.agentbase-runtime.aiplatform.vngcloud.vn/health
```

## Tính năng chính

- Đăng nhập bằng domain và tạo mật khẩu để lần sau quay lại nhận thông báo từ radar Artemis.
- Flow tìm đồ thất lạc: Starter mô tả món đồ, nhập thời gian mất và có thể đính kèm ảnh.
- Flow trả lại đồ bị mất: Starter mô tả món đồ, nhập thời gian nhặt được, vị trí nhặt được và có thể đính kèm ảnh.
- Radar match theo mô tả món đồ, thời gian và tín hiệu ảnh.
- Nếu match chính xác hoặc gần giống, Artemis trả contact point ngay trên mặt trăng radar và lưu vào ô thông báo.
- Ô thông báo được chia nhóm: Radar match đồ, Phiên chợ trên mây, Tín hiệu radar.
- Dashboard quản trị để xem tổng quan tín hiệu tìm/trả đồ, duyệt vật phẩm, chỉnh sửa, ẩn/hiện vật phẩm khi cần.
- Phiên chợ trên mây cho Starter pass lại đồ cũ, có ảnh sản phẩm, mô tả, giá, contact, trạng thái còn hàng/đã pass và số lượt quan tâm.
- Flow đăng vật phẩm dạng chat: Artemis hỏi từng câu rồi tự đưa thông tin vào template vật phẩm.
- Thanh tìm kiếm trong Phiên chợ trên mây: Starter nhập món cần mua, Artemis đẩy các món phù hợp lên đầu.

## Cách hoạt động

Ứng dụng frontend được viết bằng HTML, CSS và JavaScript thuần. Dữ liệu demo như tín hiệu radar, thông báo và vật phẩm marketplace được đồng bộ qua server JSON state (`GET/POST /api/state`) để nhiều Starter có thể cùng thấy dữ liệu trong cùng một runtime. Trình duyệt vẫn giữ một bản local để demo không bị mất trải nghiệm khi mạng chậm.

Runtime AgentBase dùng server Python nhỏ:

- `GET /` mở giao diện Artemis.
- `GET /health` trả trạng thái health check cho runtime.
- `GET /api/state` lấy dữ liệu chung của radar và Phiên chợ trên mây.
- `POST /api/state` lưu dữ liệu chung để các user khác có thể thấy.
- `POST /invocations` là endpoint tương thích để AgentBase gọi khi cần.

## Chạy local

```powershell
python server.py
```

Sau đó mở:

```text
http://127.0.0.1:8080/
```

Nếu muốn chạy bằng static server:

```powershell
python -m http.server 4173
```

Sau đó mở:

```text
http://127.0.0.1:4173/
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

Mật khẩu được tạo local trong lần đăng nhập đầu tiên để mô phỏng trải nghiệm an toàn cho demo.

Đây là bản hackathon demo, chưa dùng authentication thật hoặc database backend chuyên dụng. Nếu triển khai production, server JSON state nên được thay bằng database persistent storage và tích hợp VNG domain SSO.
