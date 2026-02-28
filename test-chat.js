const puppeteer = require('puppeteer');

const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhkMTE4ZjI3LWFlNzItNDBhZC05YjIwLTY0MWMzZDAxMWVkMiIsImxhc3RfcGFzc3dvcmRfY2hhbmdlIjoxNzcyMzA0MjExLCJleHAiOjE3NzQ4OTY2NDB9.hCR1c8MfUWyIbNtrvON8jA80CyAExabdCCZDvkL_mRA';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  
  // 设置 token
  await page.evaluateOnNewDocument((token) => {
    localStorage.setItem('token', token);
  }, authToken);
  
  // 监听请求
  page.on('request', (request) => {
    if (request.url().includes('/api/v2/chat/completions')) {
      console.log('\n=== Chat Request Captured ===');
      console.log('URL:', request.url());
      console.log('Method:', request.method());
      console.log('Headers:', JSON.stringify(request.headers(), null, 2));
      console.log('Body:', request.postData());
    }
  });
  
  // 监听响应
  page.on('response', async (response) => {
    if (response.url().includes('/api/v2/chat/completions')) {
      console.log('\n=== Chat Response ===');
      console.log('Status:', response.status());
      try {
        const text = await response.text();
        console.log('Body:', text.substring(0, 1000));
      } catch (e) {
        console.log('Error reading response:', e.message);
      }
    }
  });
  
  console.log('Navigating to chat.qwen.ai...');
  await page.goto('https://chat.qwen.ai', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 5000));
  
  // 查找聊天输入框并发送消息
  console.log('\nLooking for chat input...');
  
  try {
    // 等待页面加载完成
    await page.waitForSelector('textarea', { timeout: 10000 });
    
    const inputElement = await page.$('textarea');
    if (inputElement) {
      console.log('Found textarea, typing message...');
      await inputElement.type('hello', { delay: 50 });
      await new Promise(r => setTimeout(r, 1000));
      
      // 按 Enter 发送
      console.log('Pressing Enter to send...');
      await page.keyboard.press('Enter');
      
      // 等待响应
      await new Promise(r => setTimeout(r, 15000));
    } else {
      console.log('Could not find input element');
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await browser.close();
})();
