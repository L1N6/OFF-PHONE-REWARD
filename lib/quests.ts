/**
 * Blind Box sub-quest — kiểu dữ liệu client-safe (specs §3). KHÔNG chứa `answer_hash`
 * (đáp án ở lại server; RPC `get_active_quests` đã strip). Pure data → import được cả 2 phía.
 */
export type QuestType = "code_entry" | "physical_action";

export interface ActiveQuest {
  id: string;
  type: QuestType | string;
  title: string;
  description: string;
  hint: string | null;
  confirm_button: string | null;
}

/**
 * Mock cho dev (`?mock=`) — khớp seed venue. Cho phép render + thử Blind Box offline
 * (không gọi Supabase). Đáp án mock = "1234" (xem SessionView handleValidate).
 */
export const MOCK_QUESTS: ActiveQuest[] = [
  {
    id: "box_code",
    type: "code_entry",
    title: "🔓 Mở Blind Box",
    description: "Nhập mã trên mảnh giấy trong hộp.",
    hint: "Mã 4 chữ số.",
    confirm_button: null,
  },
  {
    id: "stretch",
    type: "physical_action",
    title: "🤸 Đứng dậy vươn vai",
    description: "Đứng dậy, vươn vai 3 cái.",
    hint: null,
    confirm_button: "✅ Đã xong",
  },
];
