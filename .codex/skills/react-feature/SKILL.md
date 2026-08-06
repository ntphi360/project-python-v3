# React Feature Skill

## Purpose
Sử dụng khi xây dựng hoặc chỉnh sửa frontend React.

## Stack
- React
- Vite
- JavaScript
- Redux Toolkit
- React Router DOM
- Recharts
- Lucide React

## React Rules
- Functional components only.
- Không sử dụng TypeScript.
- Không sử dụng class component.
- Không tự ý thêm frontend library.
- Giữ component đơn giản và dễ đọc.
- Tái sử dụng component khi hợp lý.

## Layout
- Sử dụng MainLayout.
- Sidebar + Header chỉ định nghĩa một lần.
- Page render thông qua Outlet.
- Không tạo lại Sidebar/Header trong page.
- Giữ breadcrumb nhất quán với route.
- Sidebar phải hỗ trợ layout responsive theo cấu trúc hiện tại.

## Redux
- Redux Toolkit dùng cho global state.
- Không đưa mọi local UI state vào Redux.
- Modal, dropdown hoặc input cục bộ có thể dùng local state.
- Không tạo slice mới nếu chưa cần.
- Không thay đổi store nếu task không yêu cầu.

## Routing
- Không tự ý đổi route.
- Không tạo route mới nếu không cần.
- Giữ navigation hiện tại hoạt động.

## UI
- Giữ visual style hiện tại.
- Dashboard ưu tiên compact.
- Table phải responsive.
- Badge trạng thái phải nhất quán.
- Không dùng quá nhiều màu.
- Ưu tiên Lucide React cho icon.
- Ưu tiên Recharts cho chart.

## Data
- Dùng mock data nếu task chưa yêu cầu API.
- Mock data lớn hoặc dùng nhiều nơi phải tách khỏi UI.
- Thiết kế dữ liệu mock sao cho dễ thay bằng Flask API.

## Completion
- Chạy build.
- Kiểm tra lỗi import.
- Kiểm tra responsive cơ bản.
- Không làm hỏng page khác.