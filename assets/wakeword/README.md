# OpenWakeWord Models Directory

Thư mục này lưu trữ các mô hình ONNX phục vụ tính năng Wake Word on-device (offline) cho Libbot:

1. **`melspectrogram.onnx`**: Mô hình trích xuất phổ âm Mel từ sóng âm raw PCM 16kHz.
2. **`embedding_model.onnx`**: Mô hình trích xuất vector đặc trưng âm thanh 96 chiều (Google Speech Embedding).
3. **`hey_siri.onnx`**: Mô hình phân loại từ khóa kích hoạt "Hey Siri" (~405 KB).

### Thay thế mô hình "Hey LiBot" trong tương lai:
Khi có mô hình `hey_libot.onnx`, copy file vào thư mục này và cập nhật cấu hình tại:
`src/features/idle/wakeword/constants/wakeWordConfig.ts`
