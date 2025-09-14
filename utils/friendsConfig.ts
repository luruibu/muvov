// 好友状态检查配置
export const FriendsConfig = {
  // 状态检查间隔（毫秒）
  STATUS_CHECK_INTERVAL: 120000, // 2分钟（原来是30秒）
  
  // 初始检查延迟（毫秒）
  INITIAL_CHECK_DELAY: 2000, // 2秒
  
  // 连接超时时间（毫秒）
  CONNECTION_TIMEOUT: 5000, // 5秒
  
  // 错开检查的延迟（毫秒）
  STAGGER_DELAY: 1000, // 1秒
  
  // 可选的预设配置
  PRESETS: {
    // 低频率 - 适合网络较差或想减少流量的情况
    LOW_FREQUENCY: {
      STATUS_CHECK_INTERVAL: 300000, // 5分钟
      CONNECTION_TIMEOUT: 8000,
      STAGGER_DELAY: 2000
    },
    
    // 中等频率 - 平衡性能和流量
    MEDIUM_FREQUENCY: {
      STATUS_CHECK_INTERVAL: 120000, // 2分钟
      CONNECTION_TIMEOUT: 5000,
      STAGGER_DELAY: 1000
    },
    
    // 高频率 - 快速响应但流量较大
    HIGH_FREQUENCY: {
      STATUS_CHECK_INTERVAL: 60000, // 1分钟
      CONNECTION_TIMEOUT: 3000,
      STAGGER_DELAY: 500
    },
    
    // 原始设置 - 最快但流量最大
    ORIGINAL: {
      STATUS_CHECK_INTERVAL: 30000, // 30秒
      CONNECTION_TIMEOUT: 5000,
      STAGGER_DELAY: 1000
    }
  }
};

// 应用预设配置
export const applyPreset = (preset: keyof typeof FriendsConfig.PRESETS) => {
  const config = FriendsConfig.PRESETS[preset];
  Object.assign(FriendsConfig, config);
  console.log(`✅ Applied ${preset} preset:`, config);
};

// 自定义配置
export const setCustomConfig = (config: Partial<typeof FriendsConfig>) => {
  Object.assign(FriendsConfig, config);
  console.log('✅ Applied custom config:', config);
};