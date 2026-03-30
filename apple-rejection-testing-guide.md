# FitMonster — Apple 拒絕後修改項目與測試指南

本文件列出自 Apple App Review 拒絕（v1.1.7 提交）以來，我們在 **v1.1.7 → v1.1.8 → v1.1.9** 三個版本中所做的所有修改，並提供每項修改的詳細測試步驟。

---

## 修改總覽

| 版本 | 修改項目 | 對應 Apple Guideline | 修改檔案 |
|------|---------|---------------------|---------|
| v1.1.7 | Edit Profile 年齡驗證從 18+ 改為 13+ | — (功能修正) | `app/edit-profile.tsx` |
| v1.1.8 | Motion & Fitness 權限說明文字更新 | 5.1.1(ii) | `app.config.ts` |
| v1.1.8 | BMR 計算新增 Mifflin-St Jeor 醫學引用連結 | 1.4.1 | `app/edit-profile.tsx`, `app/profile-setup.tsx`, `app/(tabs)/dashboard.tsx` |
| v1.1.9 | 隱私政策和服務條款改為可點擊連結 | 5.1.1(i) | `app/auth.tsx` |
| v1.1.9 | BMR 引用新增「諮詢醫療專業人員」免責聲明 | 1.4.1 | `lib/i18n-context.tsx` |
| v1.1.9 | 麥克風權限說明文字更新（具體描述語音訊息用途） | 5.1.1(ii) | `app.config.ts` |

---

## 修改 1：Edit Profile 年齡驗證 18+ → 13+

**版本：** v1.1.7

**修改內容：** Edit Profile 頁面的生日選擇器最大年份從 `currentYear - 18` 改為 `currentYear - 13`，年齡驗證邏輯從 `age < 18` 改為 `age < 13`，錯誤訊息從「Age must be 18+」改為「Age must be 13+」。

### 測試步驟

1. 登入 App，進入 **Home** 頁面
2. 點擊右上角的 **Edit Profile**（鉛筆圖示）
3. 在 Birthday 欄位選擇一個 **14 歲** 的生日（例如 2012 年 3 月 29 日）
4. 填入其他必填欄位（性別、身高、體重）
5. 點擊 **Save**

**預期結果：** 應該可以成功儲存，不會出現年齡錯誤提示。

6. 再次進入 Edit Profile，將生日改為 **12 歲**（例如 2014 年 3 月 29 日）
7. 點擊 **Save**

**預期結果：** 應該顯示錯誤訊息「Age must be 13+」（中文：「年齡必須 13 歲以上」），不允許儲存。

8. 檢查生日選擇器的年份範圍，確認最早可選年份對應 13 歲（不是 18 歲）。

---

## 修改 2：Motion & Fitness 權限說明文字

**版本：** v1.1.8

**修改內容：** 在 `app.config.ts` 的 `infoPlist` 中新增 `NSMotionUsageDescription`，內容為：

> "FitMonster uses your device's motion and fitness activity data to count your daily steps. For example, when you tap 'Sync Steps' on the Workout screen, the app reads today's step count from your device's pedometer to calculate EXP points that help your virtual monster grow stronger."

### 測試步驟

**注意：** 權限彈窗只能在 **真機（TestFlight build）** 上測試，Expo Go 和 Web 預覽不會顯示此彈窗。

1. 在 iPhone 上安裝 TestFlight build（v1.1.9）
2. 如果之前已授權過 Motion & Fitness，需要先到 **設定 → FitMonster → Motion & Fitness** 關閉權限
3. 刪除 App 並重新安裝（確保權限狀態重置）
4. 開啟 App，登入後進入 **Workout** 頁面
5. 點擊 **Sync Steps** 按鈕

**預期結果：** 系統彈出權限請求對話框，說明文字應為上述完整描述（包含具體使用範例），而不是通用的「wants to access your motion data」。

6. 確認說明文字中包含：
   - App 名稱「FitMonster」
   - 具體用途「count your daily steps」
   - 具體操作範例「when you tap 'Sync Steps'」
   - 資料用途「calculate EXP points」

---

## 修改 3：BMR 醫學引用連結

**版本：** v1.1.8

**修改內容：** 在三個顯示 BMR 的頁面（Edit Profile、Profile Setup、Dashboard）加入 Mifflin-St Jeor 公式的 PubMed 論文引用連結。

### 測試步驟 — Edit Profile 頁面

1. 登入 App，進入 **Home** 頁面
2. 點擊右上角的 **Edit Profile**
3. 確認已填入性別、身高、體重、生日
4. 向下滾動到 **BMR** 預覽區域

**預期結果：** BMR 數值下方應顯示一行小字引用文字，包含：
- 「BMR is calculated using the Mifflin-St Jeor equation...」
- 藍色帶底線的可點擊連結「Source: Mifflin MD et al. (1990), Am J Clin Nutr.」

5. 點擊藍色連結

**預期結果：** 應開啟瀏覽器跳轉到 `https://pubmed.ncbi.nlm.nih.gov/2305711/`（PubMed 論文頁面）。

### 測試步驟 — Profile Setup 頁面（新用戶）

1. 登出帳號，註冊一個新帳號（或使用尚未完成 Profile Setup 的帳號）
2. 完成 Profile Setup 流程（選擇性別、輸入身高、體重、生日）
3. 點擊完成

**預期結果：** 彈出的 Alert 訊息中應包含 BMR 數值和引用文字「BMR is calculated using the Mifflin-St Jeor equation...」。

### 測試步驟 — Dashboard 頁面

1. 登入已完成 Profile 的帳號
2. 切換到 **Dashboard** 分頁
3. 找到營養區域的 BMR badge

**預期結果：** BMR badge 下方應顯示小字引用文字和可點擊的 PubMed 連結，與 Edit Profile 頁面相同。

---

## 修改 4：隱私政策和服務條款可點擊連結

**版本：** v1.1.9

**修改內容：** 登入頁面底部的「Terms of Service」和「Privacy Policy」從純文字改為帶底線的可點擊連結，點擊後開啟隱私政策頁面。

### 測試步驟

1. 登出帳號（或開啟 App 未登入狀態）
2. 在登入頁面向下滾動，找到底部的「By continuing, you agree to our **Terms of Service** and **Privacy Policy**」文字

**預期結果：**
- 「Terms of Service」和「Privacy Policy」應有 **底線** 樣式，看起來像可點擊的連結
- 與周圍普通文字有明顯視覺區別

3. 點擊 **Terms of Service**

**預期結果：** 應開啟瀏覽器跳轉到 `https://lokhanglaw-bot.github.io/fitmonster-support/privacy-policy.html`

4. 返回 App，點擊 **Privacy Policy**

**預期結果：** 同樣應開啟瀏覽器跳轉到上述隱私政策頁面。

5. 切換語言到中文，確認中文版的「服務條款」和「隱私政策」也是可點擊的連結。

---

## 修改 5：BMR 免責聲明（諮詢醫療專業人員）

**版本：** v1.1.9

**修改內容：** 在 BMR 引用文字中新增健康免責聲明，英文版新增「This information is for reference only and does not constitute medical advice. Please consult a healthcare professional before making dietary or fitness decisions.」，中文版新增「此資訊僅供參考，不構成醫療建議。在做出飲食或健身決定前，請諮詢醫療專業人員。」

### 測試步驟

1. 登入 App，進入 **Edit Profile** 頁面
2. 確認已填入性別、身高、體重、生日
3. 找到 BMR 預覽區域下方的引用文字

**預期結果（英文模式）：** 引用文字應包含完整內容：
> "BMR is calculated using the Mifflin-St Jeor equation, a widely accepted formula in clinical nutrition. **This information is for reference only and does not constitute medical advice. Please consult a healthcare professional before making dietary or fitness decisions.** Source: Mifflin MD et al. (1990), Am J Clin Nutr."

4. 切換語言到中文

**預期結果（中文模式）：** 引用文字應包含：
> "BMR 使用 Mifflin-St Jeor 公式計算，此公式為臨床營養學中廣泛認可的基礎代謝率計算方法。**此資訊僅供參考，不構成醫療建議。在做出飲食或健身決定前，請諮詢醫療專業人員。**"

5. 同樣檢查 **Dashboard** 頁面的 BMR 引用是否也包含免責聲明。

---

## 修改 6：麥克風權限說明文字

**版本：** v1.1.9

**修改內容：** 麥克風權限說明從通用的 `"Allow $(PRODUCT_NAME) to access your microphone."` 改為：

> "FitMonster uses your microphone to record voice messages in chat conversations with your friends. For example, you can press and hold the microphone button to send a voice note instead of typing."

### 測試步驟

**注意：** 與 Motion 權限相同，麥克風權限彈窗只能在 **真機（TestFlight build）** 上測試。

1. 在 iPhone 上安裝 TestFlight build（v1.1.9）
2. 如果之前已授權過麥克風，到 **設定 → FitMonster → 麥克風** 關閉權限
3. 刪除 App 並重新安裝
4. 登入 App，進入 **Battle** 分頁
5. 找到一個已配對的好友，進入 **Chat** 頁面
6. 點擊聊天輸入框旁邊的 **麥克風按鈕**

**預期結果：** 系統彈出麥克風權限請求對話框，說明文字應為上述完整描述，包含：
- App 名稱「FitMonster」
- 具體用途「record voice messages in chat conversations」
- 具體操作範例「press and hold the microphone button to send a voice note」

---

## 測試環境建議

| 測試項目 | Web 預覽 | Expo Go | TestFlight (真機) |
|---------|---------|---------|-----------------|
| 年齡驗證 13+ | ✅ 可測試 | ✅ 可測試 | ✅ 可測試 |
| BMR 引用連結 | ✅ 可測試 | ✅ 可測試 | ✅ 可測試 |
| BMR 免責聲明 | ✅ 可測試 | ✅ 可測試 | ✅ 可測試 |
| 隱私政策連結 | ✅ 可測試 | ✅ 可測試 | ✅ 可測試 |
| Motion 權限彈窗 | ❌ 不適用 | ❌ 不適用 | ✅ 必須真機 |
| 麥克風權限彈窗 | ❌ 不適用 | ❌ 不適用 | ✅ 必須真機 |

**重要提醒：** 權限說明文字（修改 2 和修改 6）寫在 `app.config.ts` 的 `infoPlist` 中，這些文字會在 build 時編譯進 App 的 `Info.plist`。因此必須透過 **Publish → TestFlight** 的完整 build 流程才能在真機上驗證權限彈窗的文字內容。在 Expo Go 中無法看到自訂的權限說明文字。
