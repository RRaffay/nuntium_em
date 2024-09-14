from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from config import settings

import logging

settings.setup_logging()
logger = logging.getLogger(__name__)

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)


async def send_verification_email(email: str, token: str):
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"

    html = f"""
    <p>Hi there,</p>
    <p>Please click the link below to verify your email address:</p>
    <p><a href="{verify_url}">{verify_url}</a></p>
    <p>If you didn't request this, you can safely ignore this email.</p>
    """

    message = MessageSchema(
        subject="Verify your email for NuntiumAI",
        recipients=[email],
        body=html,
        subtype="html"
    )

    fm = FastMail(conf)
    await fm.send_message(message)


async def send_password_reset_email(email: str, token: str):
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"

    html = f"""
    <p>Hi there,</p>
    <p>Please click the link below to reset your password:</p>
    <p><a href="{reset_url}">{reset_url}</a></p>
    <p>If you didn't request this, you can safely ignore this email.</p>
    """

    message = MessageSchema(
        subject="Reset your password for NuntiumAI",
        recipients=[email],
        body=html,
        subtype="html"
    )

    fm = FastMail(conf)
    await fm.send_message(message)


async def test_email_config():
    test_email = "ranaraffay@gmail.com"
    test_subject = "Test Email Configuration"
    test_body = "This is a test email to verify the email configuration."

    message = MessageSchema(
        subject=test_subject,
        recipients=[test_email],
        body=test_body,
        subtype="html"
    )

    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        logger.info("Test email sent successfully!")
        return True
    except Exception as e:
        logger.error(f"Failed to send test email. Error: {str(e)}")
        return False

# Uncomment the following lines to run the test when this file is executed directly
# if __name__ == "__main__":
#     asyncio.run(test_email_config())
