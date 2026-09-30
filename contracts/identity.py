# v0.1.0
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *


class Identity(gl.Contract):
    """链上荣誉（灵魂绑定勋章集合）：按钱包记录多枚荣誉勋章。

    - 只有部署者（operator）能 mint，玩家无法直接凭空铸造——荣誉只能来自真实游玩。
    - generate_title  用 exec_prompt 生成「战绩称号」（无状态，simulateWriteContract leader-only）
    - mint            纯确定性写整个荣誉 JSON 数组（仅 operator）
    - get             视图读取荣誉数组
    """

    honors: TreeMap[str, str]
    operator: Address

    def __init__(self):
        self.operator = gl.message.sender_address

    @gl.public.write
    def generate_title(self, games: str, wins: str, points: str) -> str:
        if len(games) > 10 or len(wins) > 10 or len(points) > 20:
            raise Exception("invalid stats")

        def gen() -> str:
            prompt = (
                "你是「AI 卧底局」的身份官，为一位 crypto 玩家生成链上战绩称号。\n"
                "根据战绩生成一个中文专属称号（2-6 字，朗朗上口、有 crypto 圈梗，"
                "如「卧底猎手」「老江湖」「连胜狂魔」「局中王者」），不要带引号或标点。\n"
                "战绩：局数 " + games + "，胜场 " + wins + "，积分 " + points + "。\n"
                "只输出称号本身，不要解释、不要引号。"
            )
            return gl.nondet.exec_prompt(prompt)

        principle = (
            "两个结果都是贴合给定战绩的 2-6 字中文称号，语义等价。措辞可不同。"
        )
        title = gl.eq_principle.prompt_comparative(gen, principle=principle).strip()
        cleaned = "".join(ch for ch in title if ch.isalnum())
        return cleaned if cleaned else "局中王者"

    @gl.public.write
    def mint(self, address: str, honors_json: str) -> str:
        if gl.message.sender_address != self.operator:
            raise Exception("only operator can mint")
        if len(address) < 2 or len(address) > 64:
            raise Exception("invalid address")
        if len(honors_json) == 0 or len(honors_json) > 4000:
            raise Exception("invalid honors")

        self.honors[address] = honors_json
        return honors_json

    @gl.public.view
    def get(self, address: str) -> str:
        return self.honors.get(address, "[]")
