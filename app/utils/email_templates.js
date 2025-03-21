function getConfirmationEmailTemplate(name, code) {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
      <table align="center" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#333;padding:20px;text-align:center;color:#fff;">
            <h1 style="margin:0;font-size:24px;">Inventario</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:30px;">
            <p style="font-size:16px;">Hola <strong>${name}</strong>,</p>
            <p style="font-size:16px;">Gracias por registrarte en Inventario. Usa el siguiente código para confirmar tu cuenta:</p>
            <div style="text-align:center;margin:30px 0;">
              <span style="display:inline-block;padding:15px 30px;font-size:24px;font-weight:bold;background:#f0f0f0;border-radius:6px;">${code}</span>
            </div>
            <p style="font-size:14px;color:#555;">Este código expira en <strong>1 hora</strong>.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:30px 0;">
            <p style="font-size:12px;color:#999;">Si no solicitaste este correo, ignóralo.<br>© ${new Date().getFullYear()} Inventario</p>
          </td>
        </tr>
      </table>
    </body>
    </html>`;
  }
  
  function getRecoveryEmailTemplate(name, code) {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
      <table align="center" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#b34700;padding:20px;text-align:center;color:#fff;">
            <h1 style="margin:0;font-size:24px;">🔐 Recuperación - Inventario</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:30px;">
            <p style="font-size:16px;">Hola <strong>${name}</strong>,</p>
            <p style="font-size:16px;">Recibimos una solicitud para restablecer tu contraseña. Usa el siguiente código:</p>
            <div style="text-align:center;margin:30px 0;">
              <span style="display:inline-block;padding:15px 30px;font-size:24px;font-weight:bold;background:#f8f8f8;border-radius:6px;">${code}</span>
            </div>
            <p style="font-size:14px;color:#555;">Este código expira en <strong>20 minutos</strong>.</p>
            <p style="font-size:14px;color:#555;">Si no solicitaste esto, puedes ignorar el mensaje.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:30px 0;">
            <p style="font-size:12px;color:#999;">© ${new Date().getFullYear()} Inventario</p>
          </td>
        </tr>
      </table>
    </body>
    </html>`;
  }
  
  module.exports = {
    getConfirmationEmailTemplate,
    getRecoveryEmailTemplate
  };
  