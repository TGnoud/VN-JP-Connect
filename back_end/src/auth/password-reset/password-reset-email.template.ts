/**
 * Lightweight responsive HTML compatible with Gmail/Outlook basics.
 */
export function buildPasswordResetEmailHtml(payload: {
  otp: string;
  minutesValid: number;
}): string {
  const safeOtp = escapeHtml(payload.otp);
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>パスワード再設定</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:36px 12px;background:#edf2f7;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="border-radius:16px;background:#ffffff;overflow:hidden;box-shadow:0 14px 40px rgba(15,52,96,0.12);border:1px solid #dde5ef;">
          <tr>
            <td style="padding:34px 32px;background:linear-gradient(135deg,#1B4332 0%,#2d6a4f 100%);color:#ffffff;">
              <p style="margin:0;font-size:12px;opacity:0.9;letter-spacing:0.06em;text-transform:uppercase;">VN-JP Connect</p>
              <h1 style="margin:10px 0 0;font-size:26px;line-height:1.25;font-weight:700;">パスワード再設定</h1>
              <p style="margin:12px 0 0;font-size:15px;opacity:0.95;line-height:1.6;">
                アカウント復旧のために、確認コードをお送りします。
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#243040;">
              <p style="margin:0 0 22px;font-size:15px;line-height:1.7;">
                以下の確認コードを入力してください。第三者と共有しないでください。
              </p>
              <div style="text-align:center;margin:28px 0;">
                <div style="display:inline-block;padding:16px 32px;border-radius:14px;border:2px dashed #b7c9d9;background:#f8fafc;color:#14332a;font-size:32px;letter-spacing:10px;font-weight:800;font-family:'SF Mono',Consolas,Menlo,monospace;">
                  ${safeOtp}
                </div>
              </div>
              <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#4a6276;">
                このコードは <strong>${payload.minutesValid}分間</strong> のみ有効です。
                このメールにお心当たりがない場合は破棄してください。
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;color:#6b7f92;font-size:12px;line-height:1.6;">
              © ${new Date().getFullYear()} VN-JP Connect — 多言語クラブでの交流がさらに滑らかに。
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
