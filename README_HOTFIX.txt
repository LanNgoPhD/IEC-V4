IEC V4 – BEST STT CANDIDATE DISPLAY HOTFIX – 03 OCT 2026

Mục tiêu:
- Khi Web Speech trả nhiều alternatives, IEC chấm theo phương án giống đáp án nhất.
- Phương án dùng để chấm cũng chính là phương án được HIỂN THỊ cho sinh viên.
- Không còn tình trạng PASS nhờ "cylinder bore" nhưng giao diện lại hiện "cylinder ball".

Phạm vi sửa:
1) common.js
   - PRACTICE: trả/hiển thị match.candidate tốt nhất.
   - DRILL chính thức: khi PASS, hiển thị best candidate đã làm hệ thống PASS.
   - vẫn giữ raw alternative #1 trong rawHeard (PRACTICE) và giữ toàn bộ alternatives.
2) drill.html + final.html
   - chỉ đổi cache common.js: 20261003.5 -> 20261003.6.

KHÔNG sửa:
- TTS/voice/rate.
- AGAIN.
- countdown.
- backend scoring.
- config Sheet.
- morning/dashboard/TA review.
