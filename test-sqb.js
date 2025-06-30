// 测试收钱吧支付接口
const testSQB = async () => {
  const baseUrl = 'http://localhost:3001/api/sqb-demo';
  
  console.log('🚀 开始测试收钱吧支付接口...\n');
  
  try {
    // 1. 测试激活终端
    console.log('1️⃣ 测试激活终端...');
    const activateResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'activate',
      }),
    });
    
    const activateResult = await activateResponse.json();
    console.log('激活结果:', JSON.stringify(activateResult, null, 2));
    
    if (!activateResult.success) {
      console.error('❌ 激活失败，停止测试');
      return;
    }
    
    const terminalData = activateResult.data.terminalData.biz_response;
    const deviceId = activateResult.data.deviceId;
    
    console.log('✅ 激活成功！');
    console.log(`终端序列号: ${terminalData.terminal_sn}`);
    console.log(`终端密钥: ${terminalData.terminal_key}`);
    console.log(`设备ID: ${deviceId}\n`);
    
    // 2. 测试签到
    console.log('2️⃣ 测试签到...');
    const checkinResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'checkin',
        terminalSn: terminalData.terminal_sn,
        terminalKey: terminalData.terminal_key,
        deviceId: deviceId,
      }),
    });
    
    const checkinResult = await checkinResponse.json();
    console.log('签到结果:', JSON.stringify(checkinResult, null, 2));
    
    if (!checkinResult.success) {
      console.error('❌ 签到失败，但继续测试预下单');
    } else {
      console.log('✅ 签到成功！\n');
    }
    
    // 3. 测试预下单（微信支付）
    console.log('3️⃣ 测试预下单（微信支付）...');
    const clientSn = `TEST_${Date.now()}`;
    const paymentResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create_payment',
        terminalSn: terminalData.terminal_sn,
        terminalKey: terminalData.terminal_key,
        clientSn: clientSn,
        amount: 1,
        subject: '收钱吧测试支付',
        payway: '3', // 微信支付
      }),
    });
    
    const paymentResult = await paymentResponse.json();
    console.log('预下单结果:', JSON.stringify(paymentResult, null, 2));
    
    if (!paymentResult.success) {
      console.error('❌ 预下单失败');
      return;
    }
    
    const qrCode = paymentResult.data.paymentData.biz_response.data.qr_code;
    console.log('✅ 预下单成功！');
    console.log(`二维码内容: ${qrCode}`);
    console.log(`订单号: ${clientSn}\n`);
    
    // 4. 测试查询支付状态
    console.log('4️⃣ 测试查询支付状态...');
    const queryResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'query_payment',
        terminalSn: terminalData.terminal_sn,
        terminalKey: terminalData.terminal_key,
        clientSn: clientSn,
      }),
    });
    
    const queryResult = await queryResponse.json();
    console.log('查询结果:', JSON.stringify(queryResult, null, 2));
    
    if (queryResult.success) {
      const orderStatus = queryResult.data.queryData.biz_response.data.order_status;
      console.log(`✅ 查询成功！订单状态: ${orderStatus}`);
    } else {
      console.error('❌ 查询失败');
    }
    
    console.log('\n🎉 测试完成！');
    console.log('💡 提示：可以使用微信扫描二维码进行实际支付测试');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
};

// 运行测试
testSQB();
