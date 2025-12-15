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
] as const;
type Options = InferOptions<typeof options>;

export const action: Action<Options> = {
  requirements: ["text"],
  async code(input, options) {
    try {
      await createMemo(input.text, options);
      // 成功提醒
      popclip.showText("✅ 已保存到Memos", { preview: false });
      popclip.showSuccess();
    } catch (error) {
      // 失败提醒
      popclip.showText(`❌ 保存失败: ${error.message}`, { preview: false });
    }
  },
};

async function createMemo(content: string, options: Options) {
  const apiUrl = options.apiUrl.replace(/\/$/, ''); // Remove trailing slash
  const endpoint = `${apiUrl}/api/v1/memos`;
  
  const memoData = {
    content: content.trim(),
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
  };
  
  try {
    await createMemo("Test memo from PopClip extension", testOptions);
    print("✅ Test memo created successfully");
  } catch (error) {
    print(`❌ Test failed: ${error.message}`);
  }
}