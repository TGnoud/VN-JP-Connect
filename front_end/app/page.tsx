"use client"; // Bắt buộc thêm dòng này để dùng useEffect trong App Router

import { useEffect, useState } from "react";

export default function Home() {
  const [message, setMessage] = useState<string>("Đang kết nối tới Render...");

  useEffect(() => {
    // Lấy đường link Render từ biến môi trường của Vercel
    // Đảm bảo bạn đã cấu hình NEXT_PUBLIC_API_URL trên Vercel nhé!
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    // Gọi API (Giả sử NestJS có sẵn API ở trang chủ '/')
    fetch(apiUrl)
      .then((res) => res.text()) // NestJS mặc định trả về text "Hello World!" ở route '/'
      .then((data) => {
        setMessage(`✅ Kết nối thành công! Render nói: "${data}"`);
      })
      .catch((error) => {
        setMessage(`❌ Lỗi kết nối: Không thể gọi tới Render. Vui lòng kiểm tra lại link.`);
        console.error("Chi tiết lỗi:", error);
      });
  }, []);

  return (
    <main style={{ padding: "50px", fontFamily: "sans-serif" }}>
      <h1>Trạng thái kết nối Vercel ↔ Render</h1>
      <div style={{ padding: "20px", border: "1px solid #ccc", borderRadius: "8px", marginTop: "20px" }}>
        <strong>Kết quả: </strong> {message}
      </div>
    </main>
  );
}