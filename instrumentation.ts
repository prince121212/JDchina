// 在应用启动时设置全局变量，解决 "self is not defined" 错误
export async function register() {
  // 确保在服务器端 self 被正确定义
  if (typeof global !== 'undefined') {
    if (typeof (global as any).self === 'undefined') {
      (global as any).self = global;
    }
    if (typeof (global as any).window === 'undefined') {
      (global as any).window = {
        matchMedia: (query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false
        }),
        localStorage: {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
          clear: () => {}
        },
        sessionStorage: {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
          clear: () => {}
        }
      };
    }

    // 确保这些 API 在全局作用域中也可用
    if (typeof (global as any).matchMedia === 'undefined') {
      (global as any).matchMedia = (global as any).window.matchMedia;
    }
    if (typeof (global as any).localStorage === 'undefined') {
      (global as any).localStorage = (global as any).window.localStorage;
    }
    if (typeof (global as any).sessionStorage === 'undefined') {
      (global as any).sessionStorage = (global as any).window.sessionStorage;
    }
  }
}
