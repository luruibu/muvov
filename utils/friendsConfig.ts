// Friends status check configuration
export const FriendsConfig = {
  // Status check interval (milliseconds)
  STATUS_CHECK_INTERVAL: 120000, // 2 minutes (was 30 seconds)
  
  // Initial check delay (milliseconds)
  INITIAL_CHECK_DELAY: 2000, // 2 seconds
  
  // Connection timeout (milliseconds)
  CONNECTION_TIMEOUT: 5000, // 5 seconds
  
  // Stagger delay for checks (milliseconds)
  STAGGER_DELAY: 1000, // 1 second
  
  // Optional preset configurations
  PRESETS: {
    // Low frequency - suitable for poor network or to reduce traffic
    LOW_FREQUENCY: {
      STATUS_CHECK_INTERVAL: 300000, // 5 minutes
      CONNECTION_TIMEOUT: 8000,
      STAGGER_DELAY: 2000
    },
    
    // Medium frequency - balance performance and traffic
    MEDIUM_FREQUENCY: {
      STATUS_CHECK_INTERVAL: 120000, // 2 minutes
      CONNECTION_TIMEOUT: 5000,
      STAGGER_DELAY: 1000
    },
    
    // High frequency - fast response but more traffic
    HIGH_FREQUENCY: {
      STATUS_CHECK_INTERVAL: 60000, // 1 minute
      CONNECTION_TIMEOUT: 3000,
      STAGGER_DELAY: 500
    },
    
    // Original settings - fastest but most traffic
    ORIGINAL: {
      STATUS_CHECK_INTERVAL: 30000, // 30 seconds
      CONNECTION_TIMEOUT: 5000,
      STAGGER_DELAY: 1000
    }
  }
};

// Apply preset configuration
export const applyPreset = (preset: keyof typeof FriendsConfig.PRESETS) => {
  const config = FriendsConfig.PRESETS[preset];
  Object.assign(FriendsConfig, config);
  console.log(`✅ Applied ${preset} preset:`, config);
};

// Custom configuration
export const setCustomConfig = (config: Partial<typeof FriendsConfig>) => {
  Object.assign(FriendsConfig, config);
  console.log('✅ Applied custom config:', config);
};