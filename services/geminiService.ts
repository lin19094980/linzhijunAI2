import { CaseData, VerdictResult } from "../types";

export const judgeCase = async (data: CaseData): Promise<VerdictResult> => {
  // 调试日志
  console.log("柯基法官正在尝试连接外部大脑...");

  // 用户指定的外部 API 配置
  // 注意：在生产环境中，建议将 Key 放入环境变量 (process.env.API_KEY)
  const API_KEY = "sk-HXQaytJxsAyATscFXY5MSVwKeKvnxak9YDa8KWGfaVnct4Bt";
  const API_URL = "https://shell.wyzai.top/v1/chat/completions";

  if (!API_KEY) {
    console.error("❌ 错误：未配置 API Key");
    return {
      analysis: "系统错误：法官的执照丢了！(未配置 API Key)",
      femaleResponsibility: 50,
      maleResponsibility: 50,
      verdictSummary: "无法连接到 AI 大脑。",
      winner: "tie",
      advice: "请检查 API配置。"
    };
  }

  const systemInstruction = `
    你是一位名叫"屁屁"的柯基情侣法官。
    你的性格：可爱、幽默、正直、虽然是狗狗但是很有智慧，说话风格要带点"汪"或者可爱的语气词。
    你的任务：分析情侣之间的争吵，判断谁的责任更大，并给出理由和建议。
    受众：年轻情侣，主要是女孩子喜欢的风格，所以语气要温和但切中要害。
    
    IMPORTANT: You must output valid JSON.
    输出结构必须严格符合以下 JSON 格式：
    {
      "analysis": "对整个事件的幽默且深刻的分析",
      "femaleResponsibility": number (0-100),
      "maleResponsibility": number (0-100),
      "verdictSummary": "最终判决结果，指出谁的问题更多以及核心原因",
      "winner": "female" | "male" | "tie",
      "advice": "如何避免此类问题再次发生的温情建议"
    }
  `;

  const prompt = `
    案件详情：${data.eventDescription}
    
    👩 女方 (${data.femaleName}) 陈述：${data.femaleArgument}
    
    👨 男方 (${data.maleName}) 陈述：${data.maleArgument}
    
    请根据以上内容进行裁决，并确保返回纯 JSON 格式。
  `;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash", 
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error(`API Error: ${response.status} ${errText}`);
        throw new Error(`API Error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response content from AI");
    }
    
    // Parse JSON safely
    try {
        return JSON.parse(content) as VerdictResult;
    } catch (e) {
        console.error("Failed to parse JSON:", content);
        throw new Error("Invalid JSON response");
    }

  } catch (error) {
    console.error("Judging Error:", error);
    return {
      analysis: "汪！本法官刚才打了个盹，网络连接好像有点问题。",
      femaleResponsibility: 50,
      maleResponsibility: 50,
      verdictSummary: "连接超时或配额不足。",
      winner: "tie",
      advice: "请检查您的 API Key 是否有效，或稍后再试。"
    };
  }
};