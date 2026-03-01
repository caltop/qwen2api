const { v4: uuidv4 } = require('uuid');

const AUTH_TOKEN = process.env.QWEN_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhkMTE4ZjI3LWFlNzItNDBhZC05YjIwLTY0MWMzZDAxMWVkMiIsImxhc3RfcGFzc3dvcmRfY2hhbmdlIjoxNzcyMzA0MjExLCJleHAiOjE3NzQ4OTY2NDB9.hCR1c8MfUWyIbNtrvON8jA80CyAExabdCCZDvkL_mRA';

(async () => {
  try {
    // 使用 fetch-baxia (浏览器模式)
    const fetchBaxia = require('./fetch-baxia');
    const { bxUa, bxUmidToken, bxV } = await fetchBaxia.getBaxiaTokens();
    
    console.log('\n=== Tokens ===');
    console.log('bx-ua length:', bxUa.length);
    console.log('bx-ua prefix:', bxUa.substring(0, 50));
    console.log('bx-umidtoken:', bxUmidToken);
    console.log('bx-v:', bxV);
    
    // 1. 先创建新的 chat 会话
    console.log('\n=== Step 1: Creating new chat session ===');
    const createChatBody = {
      title: '新建对话',
      models: ['qwen3.5-plus'],
      chat_mode: 'guest',
      chat_type: 't2t',
      timestamp: Date.now(),
      project_id: '',
    };
    
    const createHeaders = {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'bx-ua': bxUa,
      'bx-umidtoken': bxUmidToken,
      'bx-v': bxV,
      'Cookie': `token=${AUTH_TOKEN}`,
      'Referer': 'https://chat.qwen.ai/c/guest',
      'source': 'web',
      'timezone': new Date().toUTCString(),
      'x-request-id': uuidv4(),
    };
    
    const createResponse = await fetch('https://chat.qwen.ai/api/v2/chats/new', {
      method: 'POST',
      headers: createHeaders,
      body: JSON.stringify(createChatBody),
    });
    
    const createData = await createResponse.json();
    console.log('Create chat response:', JSON.stringify(createData, null, 2));
    
    if (!createData.success || !createData.data?.id) {
      console.error('Failed to create chat');
      await fetchBaxia.closeBrowser();
      process.exit(1);
    }
    
    const chatId = createData.data.id;
    console.log('Created chat with id:', chatId);
    
    // 2. 发送消息
    console.log('\n=== Step 2: Sending message ===');
    const fid = uuidv4();
    const responseFid = uuidv4();
    
    const requestBody = {
      stream: true,
      version: '2.1',
      incremental_output: true,
      chat_id: chatId,
      chat_mode: 'guest',
      model: 'qwen3.5-plus',
      parent_id: null,
      messages: [{
        fid: fid,
        parentId: null,
        childrenIds: [responseFid],
        role: 'user',
        content: 'hello, say hi back in one sentence',
        user_action: 'chat',
        files: [],
        timestamp: Date.now(),
        models: ['qwen3.5-plus'],
        chat_type: 't2t',
        feature_config: {
          thinking_enabled: true,
          output_schema: 'phase',
          research_mode: 'normal',
          auto_thinking: true,
          thinking_format: 'summary',
          auto_search: true,
        },
        extra: {
          meta: {
            subChatType: 't2t',
          },
        },
        sub_chat_type: 't2t',
        parent_id: null,
      }],
      timestamp: Date.now(),
    };
    
    const headers = {
      'Accept': 'application/json, text/event-stream',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'bx-ua': bxUa,
      'bx-umidtoken': bxUmidToken,
      'bx-v': bxV,
      'Content-Type': 'application/json',
      'sec-ch-ua': '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'source': 'web',
      'version': '0.2.9',
      'timezone': new Date().toUTCString(),
      'x-accel-buffering': 'no',
      'x-request-id': uuidv4(),
      'Cookie': `token=${AUTH_TOKEN}`,
      'Referer': 'https://chat.qwen.ai/c/guest',
    };
    
    console.log('Chat request URL:', `https://chat.qwen.ai/api/v2/chat/completions?chat_id=${chatId}`);
    
    const response = await fetch(`https://chat.qwen.ai/api/v2/chat/completions?chat_id=${chatId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });
    
    console.log('\n=== Response ===');
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    // 读取流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
    }
    
    console.log('\nFull response:');
    console.log(fullText.substring(0, 2000));
    
    await fetchBaxia.closeBrowser();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();