import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CaseData, VerdictResult } from "../types";

export const judgeCase = async (data: CaseData): Promise<VerdictResult> => {
  // 调试日志：在浏览器控制台(F12)可以看到是否成功获取到了 Key
  console.log("柯基法官正在尝试读取执照 (API Key)...");

  let apiKey = '';
  
  // 策略 1: 优先读取 Vite 注入的环境变量 (Vercel 部署必须使用 VITE_ 前缀)
  // @ts-ignore
  if (import.meta && import.meta.env && import.meta.env.VITE_API_KEY) {
    // @ts-ignore
    apiKey = import.meta.env.VITE_API_KEY;
    console.log("成功读取到 VITE_API_KEY ✅");
  } 
  // 策略 2: 读取 Node.js 风格的环境变量 (本地开发或特殊构建配置)
  else if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    apiKey = process.env.API_KEY;
    console.log("成功读取到 process.env.API_KEY ✅");
  }

  // 如果依然没有 Key，返回详细的错误指引
  if (!apiKey) {
    console.error("❌ 错误：未找到 API Key。环境变量 VITE_API_KEY 为空。");
    return {
      analysis: "系统错误：法官的执照丢了！(未检测到 API Key)",
      femaleResponsibility: 50,
      maleResponsibility: 50,
      verdictSummary: "无法连接到 AI 大脑。",
      winner: "tie",
      advice: "请在 Vercel 后台 Settings -> Environment Variables 中添加名为 'VITE_API_KEY' 的变量，并重新部署 (Redeploy)。"
    };
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  const systemInstruction = `
    你是一位名叫"屁屁"的柯基情侣法官。
    你的性格：可爱、幽默、正直、虽然是狗狗但是很有智慧，说话风格要带点"汪"或者可爱的语气词。
    你的任务：分析情侣之间的争吵，判断谁的责任更大，并给出理由和建议。
    受众：年轻情侣，主要是女孩子喜欢的风格，所以语气要温和但切中要害。
    
    输出要求：
    1. 分析双方的行为。
    2. 给出一个责任比例（双方加起来必须是100%）。
    3. 判定结果 summary。
    4. 给出具体的解决方案和避免未来的争吵的建议。
  `;

  const prompt = `
    案件详情：${data.eventDescription}
    
    👩 女方 (${data.femaleName}) 陈述：${data.femaleArgument}
    
    👨 男方 (${data.maleName}) 陈述：${data.maleArgument}
    
    请根据以上内容进行裁决。
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      analysis: {
        type: Type.STRING,
        description: "对整个事件的幽默且深刻的分析",
      },
      femaleResponsibility: {
        type: Type.INTEGER,
        description: "女方的责任百分比 (0-100)",
      },
      maleResponsibility: {
        type: Type.INTEGER,
        description: "男方的责任百分比 (0-100)",
      },
      verdictSummary: {
        type: Type.STRING,
        description: "最终判决结果，指出谁的问题更多以及核心原因",
      },
      winner: {
        type: Type.STRING,
        enum: ["female", "male", "tie"],
        description: "谁更有理（责任更小的一方赢）",
      },
      advice: {
        type: Type.STRING,
        description: "如何避免此类问题再次发生的温情建议",
      },
    },
    required: ["analysis", "femaleResponsibility", "maleResponsibility", "verdictSummary", "winner", "advice"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from AI Judge");
    }
    
    return JSON.parse(text) as VerdictResult;
  } catch (error) {
    console.error("Gemini Judging Error:", error);
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