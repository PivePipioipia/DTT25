/**
 * FAQ Bank for Dry Eye Advisor
 * Contains all questions and answers for the FAQ chatbot
 */

export interface FAQItem {
    id: string;
    category: FAQCategory;
    question: string;
    answer: string;
    relatedIds?: string[]; // Related FAQ items
}

export type FAQCategory = 
    | 'basics'      // Kiến thức cơ bản
    | 'symptoms'    // Triệu chứng
    | 'prevention'  // Phòng ngừa
    | 'treatment'   // Điều trị
    | 'lifestyle'   // Lối sống
    | 'technology'; // Công nghệ

export interface CategoryInfo {
    id: FAQCategory;
    name: string;
    icon: string;
    description: string;
}

export const FAQ_CATEGORIES: CategoryInfo[] = [
    {
        id: 'basics',
        name: 'Kiến thức cơ bản',
        icon: '📚',
        description: 'Hiểu về bệnh khô mắt'
    },
    {
        id: 'symptoms',
        name: 'Triệu chứng',
        icon: '👁️',
        description: 'Nhận biết dấu hiệu'
    },
    {
        id: 'prevention',
        name: 'Phòng ngừa',
        icon: '🛡️',
        description: 'Cách bảo vệ mắt'
    },
    {
        id: 'treatment',
        name: 'Điều trị',
        icon: '💊',
        description: 'Khi cần can thiệp'
    },
    {
        id: 'lifestyle',
        name: 'Lối sống',
        icon: '🌱',
        description: 'Thói quen tốt cho mắt'
    },
    {
        id: 'technology',
        name: 'Công nghệ',
        icon: '💻',
        description: 'Mắt và thiết bị số'
    }
];

export const FAQ_BANK: FAQItem[] = [
    // ===== BASICS =====
    {
        id: 'what-is-dry-eye',
        category: 'basics',
        question: 'Bệnh khô mắt là gì?',
        answer: `Khô mắt (Dry Eye Disease - DED) là tình trạng mắt không sản xuất đủ nước mắt hoặc nước mắt bốc hơi quá nhanh, dẫn đến bề mặt mắt không được bôi trơn đầy đủ.

**Có 2 loại khô mắt:**
• Thiếu nước mắt: Tuyến lệ không sản xuất đủ
• Nước mắt bốc hơi nhanh: Lớp dầu trong nước mắt bất thường

Đây là bệnh phổ biến, đặc biệt ở người làm việc với màn hình nhiều giờ.`,
        relatedIds: ['causes', 'who-gets-dry-eye']
    },
    {
        id: 'causes',
        category: 'basics',
        question: 'Nguyên nhân gây khô mắt?',
        answer: `**Nguyên nhân chính:**

📱 **Sử dụng màn hình nhiều**
Khi tập trung nhìn màn hình, ta chớp mắt ít hơn 60-70%

🌡️ **Môi trường**
Điều hòa, gió, độ ẩm thấp, ô nhiễm không khí

💊 **Thuốc**
Thuốc dị ứng, thuốc trầm cảm, thuốc huyết áp

👤 **Tuổi tác và giới tính**
Phổ biến hơn ở người trên 50 tuổi và phụ nữ

🏥 **Bệnh lý**
Tiểu đường, viêm khớp, lupus, bệnh tuyến giáp`,
        relatedIds: ['what-is-dry-eye', 'symptoms-list']
    },
    {
        id: 'who-gets-dry-eye',
        category: 'basics',
        question: 'Ai dễ bị khô mắt?',
        answer: `**Nhóm nguy cơ cao:**

👩‍💻 **Dân văn phòng**
Làm việc với máy tính > 6 tiếng/ngày

👩 **Phụ nữ**
Do thay đổi hormone, đặc biệt sau mãn kinh

👴 **Người trên 50 tuổi**
Sản xuất nước mắt giảm theo tuổi

📱 **Gen Z/Millennials**
Sử dụng smartphone nhiều giờ

🎮 **Game thủ**
Tập trung cao, ít chớp mắt

👓 **Người đeo kính áp tròng**
Kính làm giảm oxy đến giác mạc`,
        relatedIds: ['causes', 'prevention-basics']
    },
    
    // ===== SYMPTOMS =====
    {
        id: 'symptoms-list',
        category: 'symptoms',
        question: 'Làm sao biết tôi bị khô mắt?',
        answer: `**Triệu chứng phổ biến:**

😣 **Cảm giác khó chịu**
• Mắt khô, rát, cộm như có cát
• Ngứa mắt, mỏi mắt
• Nóng hoặc châm chích

👁️ **Thay đổi thị giác**
• Mờ mắt thoáng qua
• Nhạy cảm với ánh sáng
• Khó nhìn vào ban đêm

💧 **Nghịch lý chảy nước mắt**
• Mắt chảy nước nhiều (phản ứng bù)
• Nước mắt loãng, không bôi trơn tốt

⚠️ **Khi nào cần gặp bác sĩ:**
Triệu chứng kéo dài > 2 tuần hoặc ảnh hưởng đến sinh hoạt`,
        relatedIds: ['when-see-doctor', 'what-is-dry-eye']
    },
    {
        id: 'eye-strain-vs-dry-eye',
        category: 'symptoms',
        question: 'Mỏi mắt và khô mắt khác nhau thế nào?',
        answer: `**Mỏi mắt (Eye Strain):**
• Thường do tập trung lâu
• Giảm sau khi nghỉ ngơi
• Đau đầu, đau cổ vai gáy
• KHÔNG phải bệnh lý

**Khô mắt (Dry Eye):**
• Do thiếu nước mắt
• Cảm giác khô, cộm, rát
• Không hết hoàn toàn khi nghỉ
• CÓ THỂ là bệnh lý cần điều trị

💡 **Lưu ý:** Hai tình trạng thường đi kèm nhau. Mỏi mắt kéo dài có thể dẫn đến khô mắt.`,
        relatedIds: ['symptoms-list', 'prevention-basics']
    },
    
    // ===== PREVENTION =====
    {
        id: '20-20-20-rule',
        category: 'prevention',
        question: 'Quy tắc 20-20-20 là gì?',
        answer: `**Quy tắc vàng bảo vệ mắt:**

⏱️ **Mỗi 20 phút** làm việc với màn hình
👀 **Nhìn xa 20 feet** (khoảng 6 mét)
⏳ **Trong 20 giây**

**Tại sao hiệu quả?**
• Cho mắt thư giãn cơ điều tiết
• Kích thích chớp mắt tự nhiên
• Giảm mỏi mắt đáng kể

**Mẹo thực hiện:**
• Dùng app DryEyeGuard để được nhắc tự động
• Đặt timer trên điện thoại
• Nhìn ra cửa sổ, nhìn cây xanh

✨ Nghiên cứu cho thấy giảm 50% triệu chứng mỏi mắt!`,
        relatedIds: ['blink-rate', 'screen-distance']
    },
    {
        id: 'blink-rate',
        category: 'prevention',
        question: 'Nên chớp mắt bao nhiêu lần/phút?',
        answer: `**Tần suất chớp mắt chuẩn:**

✅ **Bình thường:** 15-20 lần/phút
❌ **Khi nhìn màn hình:** Chỉ còn 5-7 lần/phút

**Tại sao chớp mắt quan trọng?**
• Dàn đều nước mắt trên bề mặt mắt
• Cung cấp oxy cho giác mạc
• Loại bỏ bụi bẩn

**Cách cải thiện:**
1. **Chớp mắt có ý thức** - Nhắc bản thân chớp mắt
2. **Chớp mắt hoàn toàn** - Mi trên chạm mi dưới
3. **Bài tập 20-20-20** kết hợp chớp mắt 20 lần

💡 App DryEyeGuard theo dõi tần suất chớp mắt của bạn qua camera!`,
        relatedIds: ['20-20-20-rule', 'incomplete-blink']
    },
    {
        id: 'incomplete-blink',
        category: 'prevention',
        question: 'Chớp mắt không hoàn toàn là gì?',
        answer: `**Incomplete Blink:**
Là khi mi mắt trên không chạm hoàn toàn vào mi dưới khi chớp.

**Tại sao xảy ra?**
• Tập trung cao độ khi làm việc
• Mắt mở to khi nhìn màn hình
• Thói quen xấu lâu ngày

**Hậu quả:**
• Nước mắt không được dàn đều
• Phần dưới giác mạc bị khô
• Tăng nguy cơ khô mắt

**Cách khắc phục:**
1. Chú ý chớp mắt HOÀN TOÀN
2. Thực hiện bài tập: Nhắm mắt 2 giây → Mở → Lặp lại 10 lần
3. Đặt màn hình thấp hơn tầm mắt 15-20°`,
        relatedIds: ['blink-rate', 'screen-distance']
    },
    {
        id: 'screen-distance',
        category: 'prevention',
        question: 'Khoảng cách an toàn với màn hình?',
        answer: `**Khoảng cách khuyến nghị:**

🖥️ **Máy tính để bàn:** 50-70 cm (một cánh tay)
💻 **Laptop:** 40-60 cm
📱 **Điện thoại:** 30-40 cm

**Vị trí màn hình:**
• Mép trên màn hình ngang tầm mắt hoặc thấp hơn
• Nghiêng màn hình 10-20° về phía sau
• Tránh ánh sáng phản chiếu

**Tư thế ngồi:**
• Lưng thẳng, vai thả lỏng
• Khuỷu tay vuông góc 90°
• Chân chạm sàn

⚠️ Ngồi quá gần làm mắt phải điều tiết nhiều hơn!`,
        relatedIds: ['20-20-20-rule', 'workspace-setup']
    },
    {
        id: 'prevention-basics',
        category: 'prevention',
        question: 'Cách phòng ngừa khô mắt hiệu quả?',
        answer: `**5 Nguyên tắc vàng:**

1️⃣ **Quy tắc 20-20-20**
Mỗi 20 phút, nhìn xa 6m trong 20 giây

2️⃣ **Chớp mắt đầy đủ**
15-20 lần/phút, mi trên chạm mi dưới

3️⃣ **Khoảng cách an toàn**
Màn hình cách mắt 50-70cm

4️⃣ **Môi trường phù hợp**
Độ ẩm 40-60%, tránh gió thổi thẳng vào mắt

5️⃣ **Lối sống lành mạnh**
Ngủ đủ giấc, uống đủ nước, ăn omega-3

💡 Dùng DryEyeGuard để thực hiện tất cả điều trên!`,
        relatedIds: ['20-20-20-rule', 'blink-rate', 'lifestyle-tips']
    },
    
    // ===== TREATMENT =====
    {
        id: 'when-see-doctor',
        category: 'treatment',
        question: 'Khi nào cần gặp bác sĩ?',
        answer: `**Gặp bác sĩ NGAY khi:**

🔴 **Triệu chứng nghiêm trọng:**
• Đau mắt dữ dội
• Mất thị lực đột ngột
• Nhạy cảm ánh sáng nghiêm trọng
• Chảy mủ, tiết dịch bất thường

🟡 **Triệu chứng kéo dài:**
• Khô mắt > 2 tuần không cải thiện
• Đỏ mắt liên tục
• Ảnh hưởng đến công việc/sinh hoạt
• Dùng nước mắt nhân tạo không hiệu quả

**Bác sĩ sẽ làm gì?**
• Kiểm tra màng nước mắt (TBUT test)
• Đo lượng nước mắt (Schirmer test)
• Kê đơn thuốc/gel bôi phù hợp
• Tư vấn điều trị chuyên sâu nếu cần`,
        relatedIds: ['artificial-tears', 'symptoms-list']
    },
    {
        id: 'artificial-tears',
        category: 'treatment',
        question: 'Nước mắt nhân tạo có tác dụng gì?',
        answer: `**Nước mắt nhân tạo (Artificial Tears):**
Là dung dịch bổ sung độ ẩm cho mắt, giúp bôi trơn và bảo vệ bề mặt mắt.

**Các loại phổ biến:**
💧 **Dạng nước** - Dùng ban ngày, nhẹ nhàng
🧴 **Dạng gel** - Đặc hơn, dùng khi khô nặng
🌙 **Dạng mỡ** - Dùng ban đêm

**Cách sử dụng:**
• 1-2 giọt/lần, 3-4 lần/ngày hoặc khi cần
• Ưu tiên loại KHÔNG có chất bảo quản
• Đợi 5 phút trước khi nhỏ thuốc khác

⚠️ **Lưu ý:**
• Mua tại nhà thuốc uy tín
• Đọc kỹ hướng dẫn sử dụng
• Nếu dùng > 4 lần/ngày, nên gặp bác sĩ`,
        relatedIds: ['when-see-doctor', 'prevention-basics']
    },
    
    // ===== LIFESTYLE =====
    {
        id: 'lifestyle-tips',
        category: 'lifestyle',
        question: 'Thói quen nào tốt cho mắt?',
        answer: `**Thói quen hàng ngày:**

💧 **Uống đủ nước**
2-3 lít/ngày giúp duy trì độ ẩm mắt

😴 **Ngủ đủ giấc**
7-8 tiếng, mắt được nghỉ ngơi và tái tạo

🥗 **Ăn uống lành mạnh**
Omega-3 (cá hồi, hạt), Vitamin A (cà rốt, rau xanh)

🏃 **Vận động thường xuyên**
Cải thiện tuần hoàn máu đến mắt

🌙 **Tránh màn hình trước ngủ**
Ít nhất 1 tiếng trước khi ngủ

💨 **Tránh khói thuốc**
Khói làm kích ứng và khô mắt`,
        relatedIds: ['food-for-eyes', 'sleep-and-eyes']
    },
    {
        id: 'food-for-eyes',
        category: 'lifestyle',
        question: 'Thức ăn nào tốt cho mắt?',
        answer: `**Thực phẩm giàu Omega-3:**
🐟 Cá hồi, cá thu, cá ngừ
🥜 Hạt chia, hạt lanh, óc chó
→ Giúp ổn định lớp dầu trong nước mắt

**Thực phẩm giàu Vitamin A:**
🥕 Cà rốt, bí đỏ
🥬 Rau cải xanh, rau bina
→ Bảo vệ giác mạc và võng mạc

**Thực phẩm giàu Vitamin C & E:**
🍊 Cam, chanh, kiwi
🥑 Bơ, hạnh nhân
→ Chống oxy hóa, bảo vệ mắt

**Thực phẩm giàu kẽm:**
🥩 Thịt bò, hàu
🫘 Đậu, đỗ
→ Hỗ trợ hấp thu vitamin, sức khỏe võng mạc

💡 Ăn đa dạng, cân bằng là tốt nhất!`,
        relatedIds: ['lifestyle-tips', 'prevention-basics']
    },
    {
        id: 'sleep-and-eyes',
        category: 'lifestyle',
        question: 'Giấc ngủ ảnh hưởng mắt thế nào?',
        answer: `**Tầm quan trọng của giấc ngủ:**

😴 **Khi ngủ, mắt được:**
• Nghỉ ngơi hoàn toàn
• Tái tạo tế bào bề mặt
• Sản xuất và phân phối nước mắt đều

❌ **Thiếu ngủ gây ra:**
• Mắt khô, mỏi, đỏ
• Giảm sản xuất nước mắt
• Co giật mí mắt
• Quầng thâm, bọng mắt

**Khuyến nghị:**
• Ngủ 7-8 tiếng/đêm
• Giữ phòng ngủ tối, mát
• Không dùng điện thoại 1h trước ngủ
• Giờ ngủ đều đặn

💤 Giấc ngủ chất lượng = Mắt khỏe mạnh!`,
        relatedIds: ['lifestyle-tips', 'smart-device-bed']
    },
    
    // ===== TECHNOLOGY =====
    {
        id: 'blue-light-filter',
        category: 'technology',
        question: 'Kính lọc ánh sáng xanh có hiệu quả?',
        answer: `**Ánh sáng xanh (Blue Light):**
Ánh sáng có bước sóng 400-500nm, phát ra từ màn hình và đèn LED.

**Kính lọc ánh sáng xanh:**
✅ **Có thể giúp:**
• Giảm mỏi mắt khi làm việc lâu
• Cải thiện giấc ngủ nếu dùng buổi tối
• Giảm chói khi nhìn màn hình

❌ **Chưa có bằng chứng:**
• Ngăn ngừa khô mắt
• Bảo vệ võng mạc lâu dài

**Khuyến nghị:**
• Có thể dùng nếu cảm thấy thoải mái hơn
• Bật Night Shift/Night Light miễn phí trên thiết bị
• Quan trọng hơn: Nghỉ mắt thường xuyên!

💡 Kính lọc ánh sáng xanh KHÔNG thay thế được quy tắc 20-20-20!`,
        relatedIds: ['20-20-20-rule', 'screen-settings']
    },
    {
        id: 'screen-settings',
        category: 'technology',
        question: 'Cài đặt màn hình tối ưu?',
        answer: `**Điều chỉnh màn hình:**

🔆 **Độ sáng:**
• Bằng hoặc hơi sáng hơn môi trường xung quanh
• Không quá chói hoặc quá tối

🎨 **Màu sắc:**
• Bật Night Shift/Night Light buổi tối
• Giảm ánh sáng xanh sau 8PM

📏 **Kích thước chữ:**
• Đủ lớn để đọc thoải mái
• Zoom 125-150% nếu cần

⚫ **Dark Mode:**
• Có thể giảm mỏi mắt trong môi trường tối
• Không bắt buộc, tùy sở thích

💡 **Mẹo:**
• Tránh dùng màn hình trong phòng tối
• Đặt đèn bàn chiếu sáng xung quanh
• Tránh ánh sáng phản chiếu vào màn hình`,
        relatedIds: ['blue-light-filter', 'workspace-setup']
    },
    {
        id: 'workspace-setup',
        category: 'technology',
        question: 'Bố trí góc làm việc tốt cho mắt?',
        answer: `**Góc làm việc lý tưởng:**

🖥️ **Màn hình:**
• Cách mắt 50-70cm
• Mép trên ngang tầm mắt
• Nghiêng về sau 10-20°
• Không có ánh sáng phản chiếu

💡 **Ánh sáng:**
• Đèn bàn chiếu từ bên cạnh
• Ánh sáng đều, không chói
• Độ sáng phòng phù hợp với màn hình

🪟 **Cửa sổ:**
• Màn hình vuông góc với cửa sổ
• Có rèm che nếu nắng chiếu trực tiếp

🌿 **Môi trường:**
• Độ ẩm 40-60%
• Tránh điều hòa thổi thẳng vào mặt
• Đặt cây xanh trong phòng

💺 **Ghế ngồi:**
• Có tựa lưng tốt
• Cao vừa để chân chạm sàn`,
        relatedIds: ['screen-distance', 'screen-settings']
    },
    {
        id: 'smart-device-bed',
        category: 'technology',
        question: 'Tại sao không nên dùng điện thoại trước ngủ?',
        answer: `**Tác hại của màn hình trước ngủ:**

🔵 **Ánh sáng xanh:**
• Ức chế hormone melatonin
• Làm khó đi vào giấc ngủ
• Giảm chất lượng giấc ngủ

👁️ **Mắt làm việc quá sức:**
• Mắt không được nghỉ ngơi
• Tăng nguy cơ khô mắt ban đêm
• Mỏi mắt tích lũy

🧠 **Kích thích não:**
• Khó thư giãn, khó ngủ
• Giảm giấc ngủ sâu
• Mệt mỏi ngày hôm sau

**Khuyến nghị:**
1. Dừng dùng thiết bị 1 giờ trước ngủ
2. Bật Night Mode nếu cần dùng
3. Thay bằng đọc sách, nghe nhạc
4. Để điện thoại xa giường ngủ`,
        relatedIds: ['sleep-and-eyes', 'lifestyle-tips']
    }
];

/**
 * Get FAQs by category
 */
export function getFAQsByCategory(category: FAQCategory): FAQItem[] {
    return FAQ_BANK.filter(faq => faq.category === category);
}

/**
 * Get FAQ by ID
 */
export function getFAQById(id: string): FAQItem | undefined {
    return FAQ_BANK.find(faq => faq.id === id);
}

/**
 * Get related FAQs
 */
export function getRelatedFAQs(faqId: string): FAQItem[] {
    const faq = getFAQById(faqId);
    if (!faq || !faq.relatedIds) return [];
    
    return faq.relatedIds
        .map(id => getFAQById(id))
        .filter((item): item is FAQItem => item !== undefined);
}

/**
 * Search FAQs by keyword
 */
export function searchFAQs(keyword: string): FAQItem[] {
    const lowerKeyword = keyword.toLowerCase();
    return FAQ_BANK.filter(faq => 
        faq.question.toLowerCase().includes(lowerKeyword) ||
        faq.answer.toLowerCase().includes(lowerKeyword)
    );
}
