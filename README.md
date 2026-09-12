# Hệ thống giám sát và cảnh báo hồ sơ

Ứng dụng web hỗ trợ quản lý, giám sát tiến độ xử lý hồ sơ, cảnh báo hồ sơ có nguy cơ trễ hạn và gửi thông báo nhắc nhở đến cán bộ phụ trách.

Project được xây dựng theo mô hình frontend/backend tách biệt:

- Frontend: React + Vite
- Backend: Flask REST API
- Database: Microsoft SQL Server / Azure SQL
- Authentication: JWT
- Email: Flask-Mail
- Deployment:
  - Frontend: Vercel
  - Backend: Render
  - Database: Azure SQL Database

---

## Demo

### Frontend

https://project-python-v3.vercel.app

### Backend API

https://project-python-v3.onrender.com

> Backend không có giao diện tại route `/`.
> Các API được cung cấp qua `/api/...`.

---

## Chức năng chính

Hệ thống hiện hỗ trợ:

- Đăng nhập và xác thực bằng JWT
- Quản lý người dùng
- Quản lý hồ sơ
- Theo dõi trạng thái xử lý hồ sơ
- Quản lý lĩnh vực và thủ tục hành chính
- Dashboard thống kê
- Import dữ liệu hồ sơ
- Cảnh báo hồ sơ
- Gửi nhắc nhở xử lý hồ sơ
- Gửi email thông báo bằng Flask-Mail
- Quản lý thông báo của người dùng
- Refresh access token bằng refresh token
- Bảo vệ refresh token bằng CSRF
- Kết nối Azure SQL Database khi chạy production

---

## Công nghệ sử dụng

### Frontend

- React
- Vite
- Redux Toolkit
- Axios
- Tailwind CSS
- React Router

### Backend

- Python
- Flask
- Flask-SQLAlchemy
- Flask-Migrate
- Flask-JWT-Extended
- Flask-CORS
- Flask-Mail
- Gunicorn
- pyodbc
- Pandas
- OpenPyXL

### Database

- Microsoft SQL Server
- Azure SQL Database

### Deployment

- Vercel
- Render
- Docker
- Azure SQL

---

## Cấu trúc project

```text
project-python-v3/
│
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   └── extensions.py
│   │
│   ├── migrations/
│   ├── tests/
│   ├── .env.example
│   ├── Dockerfile
│   ├── requirements.txt
│   └── run.py
│
├── dashboard-admin-ui/
│   ├── src/
│   ├── public/
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
│
└── README.md