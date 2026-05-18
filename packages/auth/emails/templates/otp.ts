export const otpEmailTemplate = (otp: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .otp { font-size: 24px; font-weight: bold; letter-spacing: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Verification Code</h2>
    <p>Your verification code is:</p>
    <p class="otp">${otp}</p>
    <p>This code will expire in 5 minutes.</p>
  </div>
</body>
</html>
`;
