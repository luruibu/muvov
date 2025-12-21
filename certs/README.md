# 证书文件目录

将你的代码签名证书文件放在这个目录中：

## 文件类型

- `certificate.p12` - PKCS#12 格式证书文件（推荐）
- `certificate.crt` - 公钥证书文件
- `private.key` - 私钥文件

## 获取证书

### 自签名证书（测试用）
```powershell
# 在 PowerShell 中运行（管理员权限）
New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=MUVOV" -KeyUsage DigitalSignature -FriendlyName "MUVOV Code Signing" -CertStoreLocation "Cert:\CurrentUser\My"

# 导出证书
$cert = Get-ChildItem -Path "Cert:\CurrentUser\My" -CodeSigningCert | Where-Object {$_.Subject -eq "CN=MUVOV"}
$pwd = ConvertTo-SecureString -String "123456" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "certificate.p12" -Password $pwd
```

### 商业证书
从以下提供商购买：
- DigiCert
- Sectigo  
- GlobalSign

## 安全提醒

⚠️ **不要将证书文件提交到版本控制系统**
⚠️ **使用强密码保护证书**
⚠️ **定期备份证书文件**