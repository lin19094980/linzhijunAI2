import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CaseData, VerdictResult } from "../types";

export const judgeCase = async (data: CaseData): Promise<VerdictResult> => {
  // 兼容性处理：尝试从多种环境变量来源获取 API Key
  // 1. process.env.API_KEY: 适用于 Node 环境或已配置 define 的构建环境
  // 2. import.meta.env.VITE_API_KEY: 适用于 Vercel + Vite 的默认客户端构建环境
  let apiKey = '';
  
  try {
    // 优先尝试读取 process.env.API_KEY
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      apiKey = process.env.API_KEY;
    }
  } catch (e) {
    // 忽略 process 未定义的错误
  }

  if (!apiKey) {
    try {
      // @ts-ignore
      if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
        // @ts-ignore
        apiKey = import.meta.env.VITE_API_KEY;
      }
    } catch (e) {
      console.warn("尝试读取 VITE_API_KEY 失败", e);
    }
  }
  
  if (!apiKey) {
    console.error("Gemini API Key is missing. 请在 Vercel 环境变量中设置 VITE_API_KEY。");
    return {
      analysis: "系统错误：未检测到法官的执照（API Key）。请确保在 Vercel 后台设置了名为 'VITE_API_KEY' 的环境变量。",
      femaleResponsibility: 50,
      maleResponsibility: 50,
      verdictSummary: "无法连接到柯基法官大脑。",
      winner: "tie",
      advice: "请联系管理员在 Vercel Settings -> Environment Variables 中添加 VITE_API_KEY。"
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
      analysis: "汪！本法官刚才打了个盹，没听清你们说什么。不过看起来都有点小问题哦！",
      femaleResponsibility: 50,
      maleResponsibility: 50,
      verdictSummary: "双方都有责任，建议互相亲亲抱抱举高高！",
      winner: "tie",
      advice: "多沟通，少冷战，实在不行给本法官买点狗粮吧！"
    };
  }
};