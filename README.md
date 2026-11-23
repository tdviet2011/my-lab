# MY LAB — Phòng lab vi mạch cá nhân (online)

Phòng lab ảo để quản lý dự án và đề tài NCKH, mô hình 3D, sơ đồ khối, mô phỏng tín hiệu, không gian toán học (vẽ phương trình 2D/3D), nhật ký thí nghiệm và thư viện tài liệu. Chạy trên GitHub Pages, tài khoản + dữ liệu + tệp lưu bằng Supabase.

## Cài đặt một lần
1. **Supabase → SQL Editor**: dán toàn bộ `supabase/setup.sql` rồi Run. Lệnh này tạo bảng dữ liệu, kho tệp riêng tư, phân quyền theo tài khoản (RLS) và khóa chỉ một chủ lab.
2. **Supabase → Authentication → URL Configuration**: đặt *Site URL* và thêm vào *Redirect URLs*: `https://tdviet2011.github.io/my-lab/`
3. **GitHub → Settings → Pages**: Source = *Deploy from a branch*, Branch = `main`, thư mục `/ (root)`.
4. Mở `https://tdviet2011.github.io/my-lab/`, bấm **Đăng ký**, xác minh email, đăng nhập. Tài khoản đầu tiên là chủ lab; các đăng ký sau bị từ chối.

## Bảo mật
- Mật khẩu do Supabase Auth xử lý (băm bcrypt), không lưu trong mã. Tối thiểu 10 ký tự, có chữ và số.
- Khóa `sb_publishable_…` trong `config.js` được phép công khai. Mọi bảng và tệp đều bị RLS khóa theo `auth.uid()`; không bao giờ đưa `service_role` key vào repo.
- Tệp tài liệu nằm trong bucket riêng tư, mở bằng liên kết ký có hạn 5 phút.
- Phiên tự khóa sau 30 phút không thao tác; ghi dữ liệu dùng khóa phiên bản để tránh ghi đè giữa hai thiết bị.
- Nên bật xác minh email và (tùy chọn) xác thực 2 lớp trong Supabase.

## Chạy trên máy
`MO_LAB.cmd` hoặc `npm start` (Node 20+). Nếu để trống `SUPABASE_URL` trong `config.js`, lab chạy offline với localStorage.

## Cấu trúc
`index.html`, `app.js` (lõi), `cloud.js` (đăng nhập, đồng bộ, tệp), `config.js`, `project-viz.js` (ảnh đại diện + sơ đồ khối), `project-model.js` (mô hình 3D theo dự án), `signals.js` (mô phỏng tín hiệu), `equation-plotter.js` + `math-expr.js` (vẽ phương trình, không dùng eval), `scene.js`, `math-studio.js`, `effects.js`, `vendor/` (Three.js, supabase-js).

## Nhóm NCKH chung (nhiều tài khoản)
Chạy thêm `supabase/team.sql` trong Supabase → SQL Editor (sau `setup.sql`). File này mở đăng ký cho mọi người và tạo bảng nhóm, thành viên, biểu đồ / tệp / ghi chú chung. Trong web: **Nhóm NCKH** → tạo nhóm → Thành viên → nhập email để thêm.
