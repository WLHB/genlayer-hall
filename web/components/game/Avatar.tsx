import { identiconFor, isAddress } from "@/lib/format";

/** 头像：AI 用 🤖；真人地址用 identicon；其余用 🧑 */
export function Avatar({ name, isAI }: { name: string; isAI: boolean }) {
  if (isAI) return <>🤖</>;
  if (isAddress(name)) {
    return (
      <img
        className="gr-identicon"
        src={identiconFor(name)}
        alt=""
        aria-hidden
      />
    );
  }
  return <>🧑</>;
}
