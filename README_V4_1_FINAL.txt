IEC V4.1 FINAL – 04/10/2026
===========================
Nguồn xây dựng:
1) AppsScript_CURRENT_03OCT2026(1).rar – backend đang chạy
2) IEC-V4-main (1) (2).zip – frontend đang chạy
3) IEC_V4_MASTER (1) (1).xlsx – MASTER hiện hành

NGUYÊN TẮC BẢO TOÀN
- common.js TTS/STT hiện hành được giữ nguyên byte-for-byte.
- 13_SpeechFlow.js và 19_SpeechSimilarityScoring.js được giữ nguyên byte-for-byte.
- iPhone/iPad THI NÓI vẫn dùng Chrome theo hướng dẫn hiện hành.
- Không dùng contextual phrase / keyword / boost trong luồng nhận diện/chấm.
- STT baseline: PRACTICE 5/80%; DRILL 1/80%; FINAL 3/80%.

LOGIC MÀU V4.1
- ĐỎ -> đạt VIẾT -> VÀNG -> đạt NÓI -> XANH.
- DRILL: dưới ngưỡng nói -> VÀNG, không GREEN.
- FINAL: không voice / quá reaction -> ĐỎ.
- FINAL: có voice đúng hạn + đạt match -> XANH.
- FINAL: có voice đúng hạn nhưng dưới match -> GREEN candidate.
- Nếu số GREEN của lượt FINAL <= GREEN_REVIEW_MIN_COUNT: tự trả VÀNG.
- Nếu số GREEN > GREEN_REVIEW_MIN_COUNT: đưa GREEN/PENDING sang TA.
- TA đánh giá ĐẠT -> XANH.
- TA đánh giá CHƯA ĐẠT -> VÀNG. TUYỆT ĐỐI không RED vì TA chấm phát âm chưa đạt.

GIAO DIỆN
- index.html là cổng hợp nhất: THÔNG TIN | LUYỆN TẬP | CA THI | KẾT QUẢ | QUẢN LÝ.
- CA THI có SÁNG / GIỮA NGÀY / CUỐI NGÀY.
- LUYỆN TẬP bổ sung NHỚ TỪ, CHÍNH TẢ, NGHE LIÊN TỤC; NGHE–NÓI hiện hành được giữ.
- Link cũ morning.html / drill.html / final.html / ta-review.html / dashboard.html tự chuyển sang index.html và giữ nguyên query cá nhân.

CẤU HÌNH SINGLE SOURCE
- CONFIG chỉ giữ system/static.
- CẤU_HÌNH_VẬN_HÀNH giữ tham số vận hành.
- MORNING_MAX_ATTEMPTS và FINAL_LAST_MAX_ATTEMPTS được chuyển sang CẤU_HÌNH_VẬN_HÀNH.
- Bổ sung LISTEN_CHAIN_COUNT, LISTEN_CHAIN_GAP_SEC, DICTATION_MEANING_OPTIONS.
- STT_DRILL_TEST_ALTERNATIVES được đưa về 1.

TRÌNH TỰ NÂNG CẤP AN TOÀN
A. BACKUP
- Giữ nguyên bản backup của AppsScript đang chạy và repo GitHub Pages hiện hành.
- Không deploy frontend trước khi backend + migration + tests PASS.

B. BACKEND
1. Copy toàn bộ thư mục AppsScript_V4_1_FINAL vào thư mục canonical đang dùng clasp (hoặc dùng chính thư mục này).
2. CMD tại thư mục đó:
   clasp push
3. Mở Apps Script editor và chạy DUY NHẤT:
   migrateFoundationBaseV41
   Hàm tự backup CONFIG + CẤU_HÌNH_VẬN_HÀNH trước khi thay đổi.
4. Chạy test theo thứ tự:
   testConfigSingleSourceV4
   testSpeechSingleSourcePhase1V4
   testSpeechSimilarityPhase2
   testApiIntegrityPhase21
   testRuntimeTimes
   testFoundationBaselineV41
   auditSpeechScoringConfigV4
5. Tất cả phải PASS. Nếu có lỗi: DỪNG, không deploy frontend.
6. Deploy Apps Script phiên bản mới trên deployment hiện hành để giữ URL /exec.

C. FRONTEND
1. Backup repo IEC-V4 hiện hành.
2. Copy toàn bộ nội dung thư mục IEC-V4 vào root repo hiện hành, ghi đè file cùng tên.
3. Giữ config.js nếu URL /exec không đổi (gói này đã giữ URL hiện hành).
4. Commit/push main và đợi GitHub Pages cập nhật.

D. SMOKE TEST BẮT BUỘC – TEST01
1. Mở link cũ morning/drill/final: phải tự chuyển sang index nhưng không mất class/student/run/token.
2. THÔNG TIN: đúng tên, ngày, ĐỎ/VÀNG/XANH LÁ/XANH, số lượt.
3. LUYỆN TẬP:
   - NHỚ TỪ hiện/ẩn đáp án.
   - NGHE–NÓI TTS/STT vẫn hoạt động.
   - CHÍNH TẢ: nghe Anh -> viết Anh -> chọn nghĩa Việt.
   - NGHE LIÊN TỤC chạy đúng số từ và khoảng nghỉ cấu hình.
4. CA SÁNG: đúng VIẾT; pass -> VÀNG, fail -> ĐỎ.
5. CA GIỮA NGÀY: ĐỎ viết đúng -> VÀNG; VÀNG nói đạt -> XANH; chưa đạt -> VÀNG.
6. CA CUỐI NGÀY:
   - no voice / quá reaction -> ĐỎ;
   - đạt match -> XANH;
   - có voice đúng hạn dưới match -> GREEN candidate;
   - kiểm tra threshold GREEN.
7. TA: ĐẠT -> XANH; CHƯA ĐẠT -> VÀNG; comment xuất hiện trong KẾT QUẢ.
8. iPhone Chrome: TTS giọng/tốc độ + THI NÓI phải giống bản đang chạy ổn.

MASTER XLSX
- IEC_V4_MASTER_V4_1_FINAL.xlsx là bản tham chiếu/backup đã cập nhật.
- Với hệ thống đang chạy thật: KHÔNG thay nguyên workbook live bằng XLSX này.
- Dùng migrateFoundationBaseV41 để migration dữ liệu live an toàn.
