# v0.1.0
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *


class Undercover(gl.Contract):
    """链上「谁是卧底」（crypto 主题）：LLM 当发牌人、NPC、裁判。

    - new_round   生成一对相似 crypto 词 + 一句主题提示
    - npc_describe NPC 给一句模糊描述（不泄底）
    - npc_vote    NPC 投最可疑的人
    - judge       链上 AI 裁判给裁决语（淘汰/胜负由客户端确定性统计）
    """

    def __init__(self):
        pass

    @gl.public.write
    def new_round(self, theme_hint: str) -> str:
        if len(theme_hint) > 200:
            raise Exception("invalid theme_hint (max 200 chars)")

        def gen() -> str:
            prompt = (
                "你是「谁是卧底」的发牌人，为 crypto 玩家出一对词。\n"
                "规则：给两个「相似但不同」的 crypto 术语——civilian_word 是更常见、"
                "更基础的那个（发给多数平民），spy_word 是相近但不同的另一个（发给卧底）。"
                "两词要足够像，让卧底能混在人群里，但又能被识破。\n"
                "再给一句 hint：描述这两个词的共同主题（不要透露具体词）。\n"
                "要求：尽量新颖、有梗、让圈内人会心一笑，不要总是常见组合；务必围绕下面指定的主题方向。\n"
                + ("主题方向：" + theme_hint + "\n" if theme_hint.strip() else "主题方向：任意 crypto 细分领域\n")
                + "\n"
                "只输出一个 JSON 对象（不要 markdown、不要解释）：\n"
                '{"civilian_word": "平民词", "spy_word": "卧底词", "hint": "一句共同主题提示"}\n'
            )
            return gl.nondet.exec_prompt(prompt)

        principle = (
            "两个结果必须给出同一主题（如都是加密货币、都是交易方式）下、难度相近、"
            "语义相关的两个不同 crypto 术语，civilian_word 比 spy_word 更常见/更基础，"
            "hint 是对该共同主题的一句简短描述。具体用词可不同，但性质必须一致。"
        )
        return gl.eq_principle.prompt_comparative(gen, principle=principle)

    @gl.public.write
    def npc_describe(self, word: str, history: str, angle: str) -> str:
        if len(word) == 0 or len(word) > 50:
            raise Exception("invalid word (must be 1-50 chars)")
        if len(history) > 2000:
            raise Exception("invalid history (max 2000 chars)")
        if len(angle) > 60:
            raise Exception("invalid angle (max 60 chars)")

        def gen() -> str:
            prompt = (
                "你是「谁是卧底」游戏里的一名 AI 玩家，拿到一个词：「" + word + "」。\n"
                "你不知道自己是平民还是卧底——平民拿的是多数人共同的词，卧底拿的是另一个相近但不同的词，"
                "只能靠后面大家的描述来推测。\n"
                "规则：用一句不超过 18 字、自然通顺的话描述你手里的词，让人大致能听懂；"
                "优先从这个角度说：" + angle + "；"
                "不要直接说出这个词本身，也不要说得太具体，避免和已出现的描述重复。\n"
                "已出现的描述（避免重复或矛盾）：\n"
                + (history if history.strip() else "（无）")
                + "\n\n"
                "只输出这一句描述（不要引号、不要解释、不要标点句号）："
            )
            return gl.nondet.exec_prompt(prompt)

        principle = (
            "两个结果都必须是一句不超过 20 字、模糊、贴合给定词、不直接说出该词本身的描述，"
            "且不与已出现描述重复或矛盾。措辞可不同。"
        )
        return gl.eq_principle.prompt_comparative(gen, principle=principle)

    @gl.public.write
    def npc_vote(self, descriptions: str, my_word: str) -> str:
        if len(descriptions) == 0 or len(descriptions) > 4000:
            raise Exception("invalid descriptions (must be 1-4000 chars)")
        if len(my_word) == 0 or len(my_word) > 50:
            raise Exception("invalid my_word (must be 1-50 chars)")

        def gen() -> str:
            prompt = (
                "你是「谁是卧底」游戏里的一名 AI 玩家。你的词是「" + my_word + "」。\n"
                "你不知道自己是平民还是卧底，只能根据大家的描述判断谁可能和你的词不同。\n"
                "以下是本轮每位玩家的描述（按顺序，从 0 开始编号）：\n"
                + descriptions
                + "\n\n"
                "请逐个阅读这些描述，找出和你自己的词最对不上、最可能是在描述另一个词的人，投给 TA。\n"
                "判断要点：描述太含糊、和你理解的对不上、或明显在说别的东西的人，最可疑。\n"
                "只输出一个 JSON 对象（不要 markdown、不要解释）：\n"
                '{"index": 编号, "reason": "一句话说明为什么投 TA"}'
            )
            return gl.nondet.exec_prompt(prompt)

        principle = (
            "两个结果必须选中相同的 index 编号，理由语义等价。措辞可不同。"
        )
        return gl.eq_principle.prompt_comparative(gen, principle=principle)

    @gl.public.write
    def judge(self, eliminated_name: str, eliminated_is_spy: str, winner: str) -> str:
        if len(eliminated_name) == 0 or len(eliminated_name) > 50:
            raise Exception("invalid eliminated_name (must be 1-50 chars)")
        if eliminated_is_spy not in ("是", "否"):
            raise Exception("invalid eliminated_is_spy (must be 是 or 否)")
        if winner not in ("平民", "卧底", "继续"):
            raise Exception("invalid winner (must be 平民/卧底/继续)")

        def gen() -> str:
            prompt = (
                "你是「谁是卧底」的链上 AI 裁判，点评本轮结果：\n"
                "- 被淘汰玩家：" + eliminated_name + "\n"
                "- 是否卧底：" + eliminated_is_spy + "\n"
                "- 本局结果：" + winner + "（平民=平民获胜，卧底=卧底获胜，继续=游戏继续）\n\n"
                "用一句不超过 40 字、带 crypto 圈幽默感的中文裁决语点评这一轮，"
                "点出淘汰结果和当前局势。只输出这句话，不要引号、不要解释。"
            )
            return gl.nondet.exec_prompt(prompt)

        principle = (
            "两个结果必须描述相同的淘汰结果与胜负状态，语义等价。措辞可不同。"
        )
        return gl.eq_principle.prompt_comparative(gen, principle=principle)
