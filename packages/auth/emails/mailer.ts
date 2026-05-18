import { Resend } from "resend";
import { otpEmailTemplate } from "./templates/otp";

interface MailerEnv {
	RESEND_API_KEY: string;
	RESEND_FROM_EMAIL: string;
	APP_NAME: string;
}

export const createMailer = (env: MailerEnv) => {
	const resend = new Resend(env.RESEND_API_KEY);
	const from = `${env.APP_NAME} <${env.RESEND_FROM_EMAIL}>`;

	return {
		async sendOTP(to: string, otp: string): Promise<void> {
			await resend.emails.send({
				from,
				to,
				subject: "Your Verification Code",
				html: otpEmailTemplate(otp)
			});
		}
	};
};

export type Mailer = ReturnType<typeof createMailer>;
