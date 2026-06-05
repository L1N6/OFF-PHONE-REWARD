import type { Metadata } from "next";
import { Validate } from "../_components/Validate";

/**
 * /validate — trang POS cho nhân viên quầy (specs §4 Module 4, T4-1).
 * Server shell tĩnh; tương tác (nhập mã, kiểm tra) ở client `<Validate>`.
 */
export const metadata: Metadata = {
  title: "Kiểm tra voucher — Off-Phone Rewards",
};

export default function ValidatePage() {
  return <Validate />;
}
