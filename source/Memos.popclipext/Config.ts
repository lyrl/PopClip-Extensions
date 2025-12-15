// #popclip
// name: Memos
// identifier: com.lyrl.popclip.extension.memos
// description: Save selected text as a memo to your Memos service.
// popclip version: 4688
// icon: 📝
// entitlements: [network]

import axios from "axios";

export const options = [
  {
    identifier: "apiUrl",
    type: "string",
    label: "Memos API URL",
    description: "Your Memos server URL (e.g., http://localhost:5230)",
    defaultValue: "http://10.0.0.5:5230",
  },
  {
    identifier: "apiToken",
    type: "secret",
    label: "API Token",
    description: "Your Memos API access token",
  },
  {
    identifier: "enableTags",
    type: "boolean",
    label: "Enable Auto Tags",
    description: "Automatically generate and add tags to memos",
    defaultValue: true,
  },
  {
    identifier: "openaiApiKey",
    type: "secret",
    label: "OpenAI API Key",
    description: "Your OpenAI API key for intelligent tag generation",
  },
  {
    identifier: "openaiBaseUrl",
    type: "string",
    label: "OpenAI Base URL",
    description: "OpenAI API base URL (default: https://api.openai.com/v1)",
    defaultValue: "https://api.openai.com/v1",
  },
  {
    identifier: "maxTags",
    type: "string",
    label: "Max Tags",
    description: "Maximum number of tags per memo (1-5)",
    defaultValue: "3",
  },
] as const;
type Options = InferOptions<typeof options>;

export const action: Action<Options> = {
  requirements: ["text"],
  async code(input, options) {
    try {
      const tags = options.enableTags && options.openaiApiKey 
        ? await generateTagsForContent(input.text, options)
        : [];
      
      await createMemo(input.text, options, tags);
      
      // 成功提醒，显示生成的标签
      const tagInfo = tags.length > 0 ? ` (${tags.length} 个标签)` : "";
      popclip.showText(`✅ 已保存到Memos${tagInfo}`, { preview: false });
      popclip.showSuccess();
    } catch (error) {
      // 失败提醒
      popclip.showText(`❌ 保存失败: ${error.message}`, { preview: false });
    }
  },
};

// 获取现有标签
async function getExistingTags(options: Options): Promise<string[]> {
  const apiUrl = options.apiUrl.replace(/\/$/, '');
  const endpoint = `${apiUrl}/api/v1/tags`;
  
  try {
    const response = await axios.get(endpoint, {
      headers: {
        "Authorization": `Bearer ${options.apiToken}`,
        "Content-Type": "application/json",
      },
    });
    
    // Memos API 返回的标签格式可能是 { name: string }[]
    return response.data?.tags?.map((tag: any) => tag.name) || [];
  } catch (error) {
    console.warn("无法获取现有标签:", error.message);
    return [];
  }
}

// 使用 OpenAI 分析内容并生成标签
async function analyzeContentWithAI(content: string, existingTags: string[], options: Options): Promise<string[]> {
  const baseUrl = options.openaiBaseUrl.replace(/\/$/, '');
  const endpoint = `${baseUrl}/chat/completions`;
  
  // 分析现有标签的特征
  const tagAnalysis = analyzeExistingTagPatterns(existingTags);
  const maxTags = Math.min(Math.max(parseInt(options.maxTags) || 3, 1), 5);
  
  const prompt = `请为以下内容生成合适的标签：

内容：
${content}

要求：
1. 生成 1-${maxTags} 个相关标签
2. 优先使用现有标签：${existingTags.length > 0 ? existingTags.join(', ') : '无'}
3. 新标签应遵循现有规范：${tagAnalysis.pattern}
4. 只返回标签名称，用逗号分隔
5. 标签应该简洁且有意义

示例格式：学习,技术,笔记`;

  try {
    const response = await axios.post(endpoint, {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system", 
          content: "你是一个专业的内容标签生成器。请根据内容特征生成准确、相关的标签。"
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      max_tokens: 100,
      temperature: 0.3,
    }, {
      headers: {
        "Authorization": `Bearer ${options.openaiApiKey}`,
        "Content-Type": "application/json",
      },
    });

    const aiResponse = response.data?.choices?.[0]?.message?.content || "";
    return aiResponse.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
  } catch (error) {
    console.warn("OpenAI 标签生成失败:", error.message);
    return [];
  }
}

// 分析现有标签的模式特征
function analyzeExistingTagPatterns(tags: string[]): { pattern: string, avgLength: number } {
  if (tags.length === 0) {
    return { pattern: "简短中文词汇，2-4个字符", avgLength: 3 };
  }
  
  const lengths = tags.map(tag => tag.length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  
  // 分析命名模式
  const hasChinese = tags.some(tag => /[\u4e00-\u9fff]/.test(tag));
  const hasEnglish = tags.some(tag => /[a-zA-Z]/.test(tag));
  
  let pattern = "";
  if (hasChinese && hasEnglish) {
    pattern = "中英文混合，";
  } else if (hasChinese) {
    pattern = "中文，";
  } else {
    pattern = "英文，";
  }
  
  pattern += `平均 ${Math.round(avgLength)} 个字符`;
  
  return { pattern, avgLength };
}

// 匹配现有标签并生成新标签
function matchAndFilterTags(aiTags: string[], existingTags: string[], options: Options): string[] {
  const maxTags = Math.min(Math.max(parseInt(options.maxTags) || 3, 1), 5);
  const finalTags: string[] = [];
  
  // 1. 优先匹配现有标签（模糊匹配）
  for (const aiTag of aiTags) {
    const matchedTag = findSimilarTag(aiTag, existingTags);
    if (matchedTag && !finalTags.includes(matchedTag)) {
      finalTags.push(matchedTag);
    }
  }
  
  // 2. 添加新标签（如果还有空间）
  for (const aiTag of aiTags) {
    if (finalTags.length >= maxTags) break;
    
    const isMatched = findSimilarTag(aiTag, existingTags);
    if (!isMatched && !finalTags.includes(aiTag)) {
      // 规范化新标签
      const normalizedTag = normalizeNewTag(aiTag, existingTags);
      if (normalizedTag && !finalTags.includes(normalizedTag)) {
        finalTags.push(normalizedTag);
      }
    }
  }
  
  return finalTags.slice(0, maxTags);
}

// 查找相似标签（支持模糊匹配）
function findSimilarTag(targetTag: string, existingTags: string[]): string | null {
  const target = targetTag.toLowerCase();
  
  // 1. 精确匹配
  for (const tag of existingTags) {
    if (tag.toLowerCase() === target) {
      return tag;
    }
  }
  
  // 2. 包含匹配
  for (const tag of existingTags) {
    if (tag.toLowerCase().includes(target) || target.includes(tag.toLowerCase())) {
      return tag;
    }
  }
  
  return null;
}

// 规范化新标签以匹配现有标签的格式
function normalizeNewTag(tag: string, existingTags: string[]): string {
  const analysis = analyzeExistingTagPatterns(existingTags);
  const maxLength = Math.ceil(analysis.avgLength * 1.5); // 允许比平均长度稍长
  
  let normalized = tag.trim();
  
  // 限制长度
  if (normalized.length > maxLength) {
    normalized = normalized.substring(0, maxLength);
  }
  
  // 移除特殊字符
  normalized = normalized.replace(/[^\u4e00-\u9fff\w]/g, '');
  
  return normalized;
}

// 主要的标签生成函数
async function generateTagsForContent(content: string, options: Options): Promise<string[]> {
  try {
    // 1. 获取现有标签
    const existingTags = await getExistingTags(options);
    
    // 2. 使用 OpenAI 分析内容
    const aiTags = await analyzeContentWithAI(content, existingTags, options);
    
    // 3. 匹配并过滤标签
    const finalTags = matchAndFilterTags(aiTags, existingTags, options);
    
    return finalTags;
  } catch (error) {
    console.warn("标签生成失败:", error.message);
    return [];
  }
}

async function createMemo(content: string, options: Options, tags: string[] = []) {
  const apiUrl = options.apiUrl.replace(/\/$/, ''); // Remove trailing slash
  const endpoint = `${apiUrl}/api/v1/memos`;
  
  // 构建 memo 内容，包含标签
  let memoContent = content.trim();
  if (tags && tags.length > 0) {
    memoContent += '\n\n' + tags.map(tag => `#${tag}`).join(' ');
  }
  
  const memoData = {
    content: memoContent,
  };

  try {
    const response = await axios.post(endpoint, memoData, {
      headers: {
        "Authorization": `Bearer ${options.apiToken}`,
        "Content-Type": "application/json",
      },
    });
    
    if (response.status !== 200) {
      throw new Error(`API returned status ${response.status}`);
    }
    
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`API Error: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`);
    } else if (error.request) {
      throw new Error("Network error: Cannot reach Memos server");
    } else {
      throw new Error(`Request failed: ${error.message}`);
    }
  }
}

export async function test() {
  const testOptions = {
    apiUrl: "http://10.0.0.5:5230",
    apiToken: "your-token-here",
    enableTags: true,
    openaiApiKey: "your-openai-key-here",
    openaiBaseUrl: "https://api.openai.com/v1",
    maxTags: "3",
  };
  
  try {
    const testContent = "学习 TypeScript 的高级特性，包括泛型、装饰器和模块系统";
    const tags = testOptions.enableTags && testOptions.openaiApiKey 
      ? await generateTagsForContent(testContent, testOptions)
      : [];
    
    await createMemo(testContent, testOptions, tags);
    print(`✅ Test memo created successfully with ${tags.length} tags: ${tags.join(', ')}`);
  } catch (error) {
    print(`❌ Test failed: ${error.message}`);
  }
}