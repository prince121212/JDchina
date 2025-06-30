'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [showPaymentDemo, setShowPaymentDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [terminalInfo, setTerminalInfo] = useState<{
    terminal_sn: string;
    terminal_key: string;
    device_id: string;
  } | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [orderInfo, setOrderInfo] = useState<{
    client_sn: string;
    order_sn?: string;
  } | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showPaymentQR, setShowPaymentQR] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [queryCount, setQueryCount] = useState(0);

  // 控制是否启用6次查询后自动认为支付成功的逻辑
  const AUTO_SUCCESS_AFTER_6_QUERIES = false;

  useEffect(() => {
    setMounted(true);
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  // 商品数据
  const products = [
    {
      id: 1,
      name: "景德镇青花瓷茶杯",
      price: 0.01,
      image: "https://si.geilicdn.com/weidian1286456178-48f0000001762c299fd30a21c2a8_1560_2340.jpg",
      description: "传统青花工艺，手工绘制"
    },
    {
      id: 2,
      name: "景德镇白瓷花瓶",
      price: 0.02,
      image: "https://si.geilicdn.com/weidian1286456178-4256000001762c2158df0a21348d_1560_2196.jpg",
      description: "纯白瓷质，简约优雅"
    },
    {
      id: 3,
      name: "景德镇彩绘茶壶",
      price: 0.05,
      image: "https://si.geilicdn.com/weidian1286456178-55d6000001762c2971520a217216_1560_2340.jpg",
      description: "精美彩绘，实用美观"
    }
  ];

  // 激活终端
  const handleActivate = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/sqb-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'activate',
        }),
      });

      const result = await response.json();

      if (result.success && result.data.terminalData.result_code === '200') {
        const { terminal_sn, terminal_key } = result.data.terminalData.biz_response;
        const terminalData = {
          terminal_sn,
          terminal_key,
          device_id: result.data.deviceId,
        };
        setTerminalInfo(terminalData);
        setResult({
          type: 'success',
          message: '终端激活成功！',
          data: terminalData,
        });
      } else {
        setResult({
          type: 'error',
          message: result.message || '激活失败',
          data: result,
        });
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: `激活异常: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // 签到
  const handleCheckin = async () => {
    if (!terminalInfo) {
      setResult({
        type: 'error',
        message: '请先激活终端',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/sqb-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'checkin',
          terminalSn: terminalInfo.terminal_sn,
          terminalKey: terminalInfo.terminal_key,
          deviceId: terminalInfo.device_id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setResult({
          type: 'success',
          message: '签到成功！',
          data: result.data,
        });
      } else {
        setResult({
          type: 'error',
          message: result.message || '签到失败',
          data: result,
        });
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: `签到异常: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // 创建支付订单（需要先激活和签到）
  const handleCreatePayment = async (payway: string) => {
    if (!terminalInfo) {
      setResult({
        type: 'error',
        message: '请先激活终端',
      });
      return;
    }

    setLoading(true);
    setResult(null);
    setQrCode('');

    try {
      const clientSn = `ORDER_${Date.now()}`;
      const amount = selectedProduct ? selectedProduct.price * 100 : 1; // 转换为分
      const subject = selectedProduct ? selectedProduct.name : '景德瓷测试支付';

      const response = await fetch('/api/sqb-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_payment',
          terminalSn: terminalInfo.terminal_sn,
          terminalKey: terminalInfo.terminal_key,
          clientSn: clientSn,
          amount: amount,
          subject: subject,
          payway: payway,
        }),
      });

      const result = await response.json();

      if (result.success && result.data.paymentData.result_code === '200') {
        const { qr_code, sn } = result.data.paymentData.biz_response.data;
        setQrCode(qr_code);
        setOrderInfo({
          client_sn: clientSn,
          order_sn: sn,
        });
        setResult({
          type: 'success',
          message: `${payway === '2' ? '支付宝' : '微信'}支付订单创建成功！请扫描二维码支付`,
          data: result.data,
        });
      } else {
        setResult({
          type: 'error',
          message: result.message || '创建支付订单失败',
          data: result,
        });
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: `创建支付订单异常: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // 直接支付（先激活获取有效终端信息，然后签到更新密钥）
  const handleDirectPayment = async (payway: string) => {
    setLoading(true);
    setResult(null);
    setQrCode('');

    try {
      // 步骤1：激活终端获取有效的终端信息
      setResult({
        type: 'info',
        message: '正在激活终端...',
      });

      const activateResponse = await fetch('/api/sqb-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'activate',
        }),
      });

      const activateResult = await activateResponse.json();
      console.log('激活响应:', activateResult); // 调试信息

      if (!activateResult.success) {
        throw new Error(`激活失败: ${activateResult.message}`);
      }

      const { deviceId, terminalData } = activateResult.data;
      console.log('终端数据:', terminalData); // 调试信息

      // 根据收钱吧API文档，激活成功后终端信息在 biz_response 中
      const { terminal_sn, terminal_key } = terminalData.biz_response || terminalData;
      console.log('解析的终端信息:', { terminal_sn, terminal_key, deviceId }); // 调试信息

      // 步骤2：签到更新终端密钥
      setResult({
        type: 'info',
        message: '正在签到更新密钥...',
      });

      console.log('准备签到，参数:', { terminal_sn, terminal_key, deviceId }); // 调试信息

      const checkinResponse = await fetch('/api/sqb-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkin',
          terminalSn: terminal_sn,  // 传递终端序列号
          terminalKey: terminal_key, // 传递终端密钥
          deviceId: deviceId,       // 传递设备ID
        }),
      });

      const checkinResult = await checkinResponse.json();
      if (!checkinResult.success) {
        throw new Error(`签到失败: ${checkinResult.message}`);
      }

      // 获取签到后的最新终端密钥
      // 根据官方文档，签到成功后会在 biz_response 中返回新的 terminal_key
      const updatedTerminalKey = checkinResult.data.checkinData?.biz_response?.terminal_key ||
                                 checkinResult.data.checkinData?.terminal_key ||
                                 terminal_key;

      // 更新终端信息
      setTerminalInfo({
        terminal_sn,
        terminal_key: updatedTerminalKey,
        device_id: deviceId,
      });

      // 步骤3：创建支付订单
      setResult({
        type: 'info',
        message: '正在创建支付订单...',
      });

      const clientSn = `ORDER_${Date.now()}`;
      const amount = selectedProduct ? selectedProduct.price * 100 : 1;
      const subject = selectedProduct ? selectedProduct.name : '景德瓷测试支付';

      const paymentResponse = await fetch('/api/sqb-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_payment',
          terminalSn: terminal_sn,
          terminalKey: updatedTerminalKey, // 使用最新的终端密钥
          clientSn: clientSn,
          amount: amount,
          subject: subject,
          payway: payway,
        }),
      });

      const paymentResult = await paymentResponse.json();

      if (paymentResult.success && paymentResult.data.paymentData.result_code === '200') {
        const { qr_code, sn } = paymentResult.data.paymentData.biz_response.data;
        setQrCode(qr_code);
        setOrderInfo({
          client_sn: clientSn,
          order_sn: sn,
        });
        setResult({
          type: 'success',
          message: `${payway === '2' ? '支付宝' : '微信'}支付订单创建成功！请扫描二维码支付`,
          data: paymentResult.data,
        });
      } else {
        throw new Error(paymentResult.message || '创建支付订单失败');
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: `支付失败: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // 查询支付状态
  const handleQueryPayment = async () => {
    if (!terminalInfo || !orderInfo) {
      setResult({
        type: 'error',
        message: '请先创建支付订单',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/sqb-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'query_payment',
          terminalSn: terminalInfo.terminal_sn,
          terminalKey: terminalInfo.terminal_key,
          clientSn: orderInfo.client_sn,
        }),
      });

      const result = await response.json();

      if (result.success && result.data.queryData.result_code === '200') {
        const orderStatus = result.data.queryData.biz_response.data.order_status;
        let message = '';
        let type: 'success' | 'error' | 'info' = 'info';

        switch (orderStatus) {
          case 'PAID':
            message = '支付成功！';
            type = 'success';
            break;
          case 'CREATED':
            message = '订单已创建，等待支付';
            type = 'info';
            break;
          case 'CANCELED':
            message = '订单已取消';
            type = 'error';
            break;
          case 'EXPIRED':
            message = '订单已过期';
            type = 'error';
            break;
          default:
            message = `订单状态: ${orderStatus}`;
            type = 'info';
        }

        setResult({
          type,
          message,
          data: result.data,
        });
      } else {
        setResult({
          type: 'error',
          message: result.message || '查询支付状态失败',
          data: result,
        });
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: `查询支付状态异常: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // 购买商品
  const handleBuyProduct = (product: any) => {
    setSelectedProduct(product);
    setShowPaymentMethodModal(true);
  };

  // 选择支付方式并开始支付流程
  const handlePaymentMethodSelect = async (method: string) => {
    setPaymentMethod(method);
    setShowPaymentMethodModal(false);
    setShowPaymentQR(true);
    setLoading(true);
    setPaymentStatus('正在创建订单...');
    setQueryCount(0); // 重置查询计数

    try {
      // 1. 激活终端
      const activateResponse = await fetch('/api/sqb-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate' }),
      });
      const activateResult = await activateResponse.json();

      if (!activateResult.success || activateResult.data.terminalData.result_code !== '200') {
        throw new Error('终端激活失败');
      }

      const { terminal_sn, terminal_key } = activateResult.data.terminalData.biz_response;
      const deviceId = activateResult.data.deviceId;

      // 2. 签到
      setPaymentStatus('正在...');
      const checkinResponse = await fetch('/api/sqb-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'checkin',
          terminalSn: terminal_sn,
          terminalKey: terminal_key,
          deviceId: deviceId,
        }),
      });

      // 3. 创建支付订单
      setPaymentStatus('正在创建支付订单...');
      const clientSn = `ORDER_${Date.now()}`;
      const amount = selectedProduct ? selectedProduct.price * 100 : 1;
      const subject = selectedProduct ? selectedProduct.name : '景德瓷测试支付';

      const paymentResponse = await fetch('/api/sqb-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_payment',
          terminalSn: terminal_sn,
          terminalKey: terminal_key,
          clientSn: clientSn,
          amount: amount,
          subject: subject,
          payway: method === 'wechat' ? '3' : '2',
        }),
      });

      const paymentResult = await paymentResponse.json();

      if (paymentResult.success && paymentResult.data.paymentData.result_code === '200') {
        const { qr_code, sn } = paymentResult.data.paymentData.biz_response.data;
        setQrCode(qr_code);
        setOrderInfo({
          client_sn: clientSn,
          order_sn: sn,
        });
        setTerminalInfo({
          terminal_sn,
          terminal_key,
          device_id: deviceId,
        });
        setPaymentStatus('请扫描二维码支付');
        setLoading(false);

        // 开始定时查询支付状态
        startStatusCheck(terminal_sn, terminal_key, clientSn);
      } else {
        throw new Error(paymentResult.message || '创建支付订单失败');
      }
    } catch (error) {
      setPaymentStatus(`支付失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setLoading(false);
    }
  };

  // 开始定时查询支付状态
  const startStatusCheck = (terminalSn: string, terminalKey: string, clientSn: string) => {
    setQueryCount(0); // 重置查询计数
    const interval = setInterval(async () => {
      try {
        // 增加查询计数
        setQueryCount(prevCount => {
          const newCount = prevCount + 1;

          // 如果启用了自动成功逻辑且查询次数达到6次，直接认为支付成功
          if (AUTO_SUCCESS_AFTER_6_QUERIES && newCount >= 6) {
            setPaymentStatus('支付成功！（模拟）');
            setShowShippingForm(true);
            clearInterval(interval);
            setStatusCheckInterval(null);
            return newCount;
          }

          return newCount;
        });

        const response = await fetch('/api/sqb-demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'query_payment',
            terminalSn: terminalSn,
            terminalKey: terminalKey,
            clientSn: clientSn,
          }),
        });

        const result = await response.json();

        if (result.success && result.data.queryData.result_code === '200') {
          const orderStatus = result.data.queryData.biz_response.data.order_status;

          if (orderStatus === 'PAID') {
            setPaymentStatus('支付成功！');
            setShowShippingForm(true);
            clearInterval(interval);
            setStatusCheckInterval(null);
          } else if (orderStatus === 'CANCELED' || orderStatus === 'EXPIRED') {
            setPaymentStatus(orderStatus === 'CANCELED' ? '订单已取消' : '订单已过期');
            clearInterval(interval);
            setStatusCheckInterval(null);
          } else if (orderStatus === 'CREATED') {
            // 显示当前查询次数
            setPaymentStatus(`等待支付中... (${queryCount + 1}/6)`);
          }
        }
      } catch (error) {
        console.error('查询支付状态失败:', error);
      }
    }, 5000); // 每5秒查询一次

    setStatusCheckInterval(interval);
  };

  // 处理发货信息表单输入
  const handleShippingInfoChange = (field: string, value: string) => {
    setShippingInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 提交发货信息
  const handleShippingSubmit = () => {
    if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address) {
      toast.error('请填写完整的收货信息');
      return;
    }

    // 这里可以将发货信息发送到后端
    console.log('发货信息:', {
      product: selectedProduct,
      order: orderInfo,
      shipping: shippingInfo
    });

    toast.success('发货信息已提交，我们将尽快为您安排发货！');
    closePaymentModal();
  };

  // 关闭支付弹窗
  const closePaymentModal = () => {
    setShowPaymentQR(false);
    setShowPaymentMethodModal(false);
    setShowShippingForm(false);
    setSelectedProduct(null);
    setQrCode('');
    setOrderInfo(null);
    setTerminalInfo(null);
    setPaymentStatus('');
    setPaymentMethod('');
    setShippingInfo({ name: '', phone: '', address: '' });
    setQueryCount(0); // 重置查询计数
    setLoading(false);
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8 sm:py-12 lg:py-16">
        {/* 主标题区域 */}
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent leading-tight">
            景德瓷！
          </h1>
          <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mt-2 sm:mt-4 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent leading-tight">
            世界瓷！
          </h2>
        </div>

        {/* 测试按钮 - 已隐藏 */}
        <button
          onClick={() => setShowPaymentDemo(true)}
          className="hidden mt-8 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
        >
          收钱吧支付测试
        </button>

        {/* 商品展示区域 */}
        <div className="max-w-7xl mx-auto">
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 text-center mb-6 sm:mb-8 lg:mb-10">精选陶瓷商品</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <div className="aspect-w-3 aspect-h-4">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-48 sm:h-64 lg:h-80 object-cover"
                  />
                </div>
                <div className="p-4 sm:p-5 lg:p-6">
                  <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">{product.name}</h4>
                  <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">{product.description}</p>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
                    <span className="text-xl sm:text-2xl font-bold text-red-600">¥{product.price}</span>
                    <button
                      onClick={() => handleBuyProduct(product)}
                      className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold rounded-lg hover:from-red-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
                    >
                      立即购买
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 店铺装修提示 - 移动到商品下面 */}
          <div className="mt-8 mb-6">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4 sm:p-6 lg:p-8 text-center shadow-lg">
              <div className="flex items-center justify-center mb-3 sm:mb-4">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-amber-700">店铺装修中</h3>
              </div>
              <p className="text-sm sm:text-base lg:text-lg text-amber-600 font-medium mb-1 sm:mb-2">
                🚧 更多精美商品即将上线，敬请期待 🚧
              </p>
              <p className="text-xs sm:text-sm lg:text-base text-amber-500">
                我们正在精心准备更多优质的景德镇瓷器，为您带来更好的购物体验
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 支付演示弹窗 */}
      {showPaymentDemo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            {/* 弹窗头部 */}
            <div className="flex justify-between items-start p-4 sm:p-6 border-b">
              <div className="flex-1 mr-4">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 leading-tight">
                  {selectedProduct ? `购买 ${selectedProduct.name}` : '收钱吧支付演示'}
                </h3>
                {selectedProduct && (
                  <p className="text-base sm:text-lg text-red-600 font-semibold mt-1">
                    价格: ¥{selectedProduct.price}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowPaymentDemo(false);
                  // 重置状态
                  setResult(null);
                  setTerminalInfo(null);
                  setQrCode('');
                  setOrderInfo(null);
                  setSelectedProduct(null);
                  setLoading(false);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="p-4 sm:p-6">
              {/* 操作按钮 */}
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">支付流程演示</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <button
                    onClick={handleActivate}
                    disabled={loading}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors text-sm sm:text-base"
                  >
                    {loading ? '处理中...' : '1. 激活终端'}
                  </button>

                  <button
                    onClick={handleCheckin}
                    disabled={loading || !terminalInfo}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors text-sm sm:text-base"
                  >
                    {loading ? '处理中...' : '2. 签到'}
                  </button>

                  <button
                    onClick={() => handleDirectPayment('3')}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-colors text-sm sm:text-base"
                  >
                    {loading ? '处理中...' : '3. 微信支付'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <button
                    onClick={() => handleDirectPayment('2')}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    {loading ? '处理中...' : '支付宝支付'}
                  </button>

                  <button
                    onClick={handleQueryPayment}
                    disabled={loading || !orderInfo}
                    className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    {loading ? '查询中...' : '查询支付状态'}
                  </button>
                </div>
              </div>

              {/* 终端信息 */}
              {terminalInfo && (
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                  <h3 className="text-xl font-semibold mb-4">终端信息</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">设备ID:</span>
                      <p className="text-gray-600 break-all">{terminalInfo.device_id}</p>
                    </div>
                    <div>
                      <span className="font-medium">终端序列号:</span>
                      <p className="text-gray-600 break-all">{terminalInfo.terminal_sn}</p>
                    </div>
                    <div>
                      <span className="font-medium">终端密钥:</span>
                      <p className="text-gray-600 break-all">{terminalInfo.terminal_key}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 二维码显示 */}
              {qrCode && (
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6 text-center">
                  <h3 className="text-xl font-semibold mb-4">支付二维码</h3>
                  <div className="inline-block p-4 bg-gray-100 rounded-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`}
                      alt="支付二维码"
                      className="w-48 h-48"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">请使用微信或支付宝扫描二维码支付</p>
                  <p className="text-xs text-gray-500 mt-1">
                    金额: ¥{selectedProduct ? selectedProduct.price : '0.01'}
                  </p>
                </div>
              )}

              {/* 结果显示 */}
              {result && (
                <div className={`rounded-lg shadow-lg p-6 mb-6 ${
                  result.type === 'success' ? 'bg-green-50 border border-green-200' :
                  result.type === 'error' ? 'bg-red-50 border border-red-200' :
                  'bg-blue-50 border border-blue-200'
                }`}>
                  <h3 className={`text-xl font-semibold mb-4 ${
                    result.type === 'success' ? 'text-green-800' :
                    result.type === 'error' ? 'text-red-800' :
                    'text-blue-800'
                  }`}>
                    操作结果
                  </h3>
                  <p className={`mb-4 ${
                    result.type === 'success' ? 'text-green-700' :
                    result.type === 'error' ? 'text-red-700' :
                    'text-blue-700'
                  }`}>
                    {result.message}
                  </p>
                  {result.data && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                        查看详细数据
                      </summary>
                      <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* 说明 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">使用说明</h3>
                <ul className="text-yellow-700 text-sm space-y-1">
                  <li>1. 点击"激活终端"按钮激活收钱吧测试终端</li>
                  <li>2. 激活成功后点击"签到"按钮进行终端签到</li>
                  <li>3. 选择"微信支付"或"支付宝支付"创建测试订单（金额为1分钱）</li>
                  <li>4. 扫描生成的二维码进行支付测试</li>
                  <li>5. 点击"查询支付状态"查看支付结果</li>
                  <li>⚠️ 这是测试环境，使用的是测试激活码，仅用于演示</li>
                </ul>
              </div>

              {/* 终端信息 */}
              {terminalInfo && (
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                  <h3 className="text-xl font-semibold mb-4">终端信息</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">设备ID:</span>
                      <p className="text-gray-600 break-all">{terminalInfo.device_id}</p>
                    </div>
                    <div>
                      <span className="font-medium">终端序列号:</span>
                      <p className="text-gray-600 break-all">{terminalInfo.terminal_sn}</p>
                    </div>
                    <div>
                      <span className="font-medium">终端密钥:</span>
                      <p className="text-gray-600 break-all">{terminalInfo.terminal_key}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 二维码显示 */}
              {qrCode && (
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6 text-center">
                  <h3 className="text-xl font-semibold mb-4">支付二维码</h3>
                  <div className="inline-block p-4 bg-gray-100 rounded-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`}
                      alt="支付二维码"
                      className="w-48 h-48"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">请使用微信或支付宝扫描二维码支付</p>
                  <p className="text-xs text-gray-500 mt-1">
                    金额: ¥{selectedProduct ? selectedProduct.price : '0.01'}
                  </p>
                </div>
              )}

              {/* 结果显示 */}
              {result && (
                <div className={`rounded-lg shadow-lg p-6 mb-6 ${
                  result.type === 'success' ? 'bg-green-50 border border-green-200' :
                  result.type === 'error' ? 'bg-red-50 border border-red-200' :
                  'bg-blue-50 border border-blue-200'
                }`}>
                  <h3 className={`text-xl font-semibold mb-4 ${
                    result.type === 'success' ? 'text-green-800' :
                    result.type === 'error' ? 'text-red-800' :
                    'text-blue-800'
                  }`}>
                    操作结果
                  </h3>
                  <p className={`mb-4 ${
                    result.type === 'success' ? 'text-green-700' :
                    result.type === 'error' ? 'text-red-700' :
                    'text-blue-700'
                  }`}>
                    {result.message}
                  </p>
                  {result.data && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                        查看详细数据
                      </summary>
                      <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* 使用说明 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">使用说明</h3>
                <ul className="text-yellow-700 text-sm space-y-1">
                  <li>1. 点击"激活终端"按钮激活收钱吧测试终端</li>
                  <li>2. 激活成功后点击"签到"按钮进行终端签到</li>
                  <li>3. 选择"微信支付"或"支付宝支付"创建{selectedProduct ? '商品' : '测试'}订单</li>
                  <li>4. 扫描生成的二维码进行支付{selectedProduct ? '' : '测试'}</li>
                  <li>5. 点击"查询支付状态"查看支付结果</li>
                  <li>⚠️ 这是测试环境，使用的是测试激活码{selectedProduct ? '，实际商品仅用于演示' : '，仅用于演示'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 支付方式选择弹窗 */}
      {showPaymentMethodModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm sm:max-w-md w-full mx-4">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">选择支付方式</h3>
              <div className="mb-4 sm:mb-6">
                <p className="text-sm sm:text-base text-gray-600 truncate">商品：{selectedProduct.name}</p>
                <p className="text-base sm:text-lg font-semibold text-red-600">金额：¥{selectedProduct.price}</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handlePaymentMethodSelect('wechat')}
                  className="w-full flex items-center justify-center space-x-3 p-3 sm:p-4 border-2 border-green-500 rounded-lg hover:bg-green-50 transition-colors"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-xs sm:text-sm">微</span>
                  </div>
                  <span className="text-base sm:text-lg font-semibold text-green-600">微信支付</span>
                </button>

                <button
                  onClick={() => handlePaymentMethodSelect('alipay')}
                  className="w-full flex items-center justify-center space-x-3 p-3 sm:p-4 border-2 border-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500 rounded flex items-center justify-center">
                    <span className="text-white font-bold text-xs sm:text-sm">支</span>
                  </div>
                  <span className="text-base sm:text-lg font-semibold text-blue-600">支付宝</span>
                </button>
              </div>

              <button
                onClick={() => setShowPaymentMethodModal(false)}
                className="w-full mt-4 p-2 sm:p-3 text-sm sm:text-base text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 支付二维码弹窗 */}
      {showPaymentQR && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold text-gray-800">
                {paymentMethod === 'wechat' ? '微信支付' : '支付宝支付'}
              </h3>
              <button
                onClick={closePaymentModal}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4 text-center">
                <p className="text-gray-600">商品：{selectedProduct.name}</p>
                <p className="text-lg font-semibold text-red-600">金额：¥{selectedProduct.price}</p>
              </div>

              {showShippingForm ? (
                <div>
                  <h4 className="text-lg font-semibold text-green-600 mb-4 text-center">
                    🎉 支付成功！请填写收货信息
                  </h4>
                  <form className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        收件人 *
                      </label>
                      <input
                        type="text"
                        value={shippingInfo.name}
                        onChange={(e) => handleShippingInfoChange('name', e.target.value)}
                        placeholder="请输入收件人姓名"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        手机号 *
                      </label>
                      <input
                        type="tel"
                        value={shippingInfo.phone}
                        onChange={(e) => handleShippingInfoChange('phone', e.target.value)}
                        placeholder="请输入手机号码"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        收货地址 *
                      </label>
                      <textarea
                        value={shippingInfo.address}
                        onChange={(e) => handleShippingInfoChange('address', e.target.value)}
                        placeholder="请输入详细的收货地址"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={handleShippingSubmit}
                        className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                      >
                        提交发货信息
                      </button>
                      <button
                        type="button"
                        onClick={closePaymentModal}
                        className="px-6 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                      >
                        稍后填写
                      </button>
                    </div>
                  </form>
                </div>
              ) : loading ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="text-gray-600 text-center">{paymentStatus}</p>
                </div>
              ) : qrCode ? (
                <div className="text-center">
                  <div className="inline-block p-4 bg-gray-100 rounded-lg mb-4">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`}
                      alt="支付二维码"
                      className="w-48 h-48"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    请使用{paymentMethod === 'wechat' ? '微信' : '支付宝'}扫描二维码支付
                  </p>
                  <p className={`text-sm font-medium ${
                    paymentStatus === '支付成功！' ? 'text-green-600' :
                    paymentStatus.includes('失败') || paymentStatus.includes('取消') || paymentStatus.includes('过期') ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {paymentStatus}
                  </p>
                </div>
              ) : (
                <p className="text-red-600 text-center">{paymentStatus}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
