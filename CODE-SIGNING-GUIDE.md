# MUVOV Electron 代码签名指南

## 🔐 代码签名的重要性

代码签名可以：
- ✅ 防止 Windows Defender 误报
- ✅ 提升用户信任度
- ✅ 避免"未知发布者"警告
- ✅ 支持自动更新功能

## 📋 签名选项配置

### 1. 自签名证书（测试用）

创建自签名证书：
```bash
# 使用 PowerShell（管理员权限）
New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=MUVOV" -KeyUsage DigitalSignature -FriendlyName "MUVOV Code Signing" -CertStoreLocation "Cert:\CurrentUser\My" -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}")

# 导出证书
$cert = Get-ChildItem -Path "Cert:\CurrentUser\My" -CodeSigningCert | Where-Object {$_.Subject -eq "CN=MUVOV"}
$pwd = ConvertTo-SecureString -String "your-password" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "certs\certificate.p12" -Password $pwd
```

### 2. 商业证书（生产用）

推荐的证书提供商：
- **DigiCert** - 最受信任
- **Sectigo** - 性价比高
- **GlobalSign** - 国际认可

### 3. 环境变量配置

创建 `.env` 文件：
```env
# 证书文件路径
CSC_LINK=certs/certificate.p12
# 证书密码
CSC_KEY_PASSWORD=your-certificate-password
# 发布者名称
WIN_CSC_SUBJECT_NAME=MUVOV

# 时间戳服务器（可选）
WIN_CSC_TIMESTAMP_URL=http://timestamp.digicert.com
```

### 4. 无签名构建

如果暂时不需要签名，可以禁用：
```json
{
  "build": {
    "win": {
      "sign": false
    },
    "forceCodeSigning": false
  }
}
```

## 🚀 构建命令

### 带签名构建
```bash
# 设置环境变量
set CSC_LINK=certs/certificate.p12
set CSC_KEY_PASSWORD=your-password

# 构建
npm run build:electron
```

### 无签名构建
```bash
# 禁用签名
set CSC_IDENTITY_AUTO_DISCOVERY=false

# 构建
npm run build:electron
```

## 📁 证书文件结构

```
muvov/
├── certs/
│   ├── certificate.p12      # PKCS#12 证书文件
│   ├── certificate.crt      # 公钥证书（可选）
│   └── private.key          # 私钥文件（可选）
├── .env                     # 环境变量配置
└── package.json             # 构建配置
```

## ⚠️ 安全注意事项

1. **证书保护**
   - 不要将证书文件提交到版本控制
   - 使用强密码保护证书
   - 定期更新证书

2. **环境变量**
   - 将 `.env` 添加到 `.gitignore`
   - 在 CI/CD 中使用加密的环境变量

3. **时间戳**
   - 使用可靠的时间戳服务器
   - 确保证书过期后签名仍然有效

## 🔧 故障排除

### 常见错误

1. **"找不到证书"**
   ```bash
   # 检查证书路径
   dir certs\certificate.p12
   
   # 验证证书
   certutil -dump certs\certificate.p12
   ```

2. **"密码错误"**
   ```bash
   # 重新设置密码
   set CSC_KEY_PASSWORD=correct-password
   ```

3. **"时间戳失败"**
   ```bash
   # 使用备用时间戳服务器
   set WIN_CSC_TIMESTAMP_URL=http://timestamp.sectigo.com
   ```

## 📦 分发建议

### 开发/测试阶段
- 使用自签名证书或无签名构建
- 主要关注功能完整性

### 正式发布
- 购买商业代码签名证书
- 配置完整的签名流程
- 测试在不同 Windows 版本上的表现

## 🎯 当前配置状态

你的项目已配置：
- ✅ 支持有签名和无签名构建
- ✅ 管理员权限构建脚本
- ✅ 简化构建选项
- ✅ 完整的 NSIS 安装程序配置

使用 `build-electron-admin.bat` 以管理员权限构建，会自动处理权限问题。