
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendBookingConfirmationEmail = async (to, bookingDetails) => {
    try {
        console.log("Sender:", "onboarding@resend.dev");

console.log("Recipient is valid:", 
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)
);

console.log("Recipient exists:", Boolean(to));
        const { data, error } = await resend.emails.send({
            from: "onboarding@resend.dev",
            to: [to],
             subject: `Your QueueLess booking is confirmed - Token ${bookingDetails.tokenNumber}`,

            template: {
                id: process.env.RESEND_BOOKING_TEMPLATE_ID,

                variables: {
                    USERNAME: bookingDetails.username,
                    ORGANIZATION_NAME: bookingDetails.orgName,
                    SERVICE_NAME: bookingDetails.service,
                    TOKEN_NUMBER: String(bookingDetails.tokenNumber),
                    BOOKING_DATE: bookingDetails.bookingDate,
                    TIME_SLOT: bookingDetails.timeSlot,
                    PRICE: Number(bookingDetails.price)
                }
            }
        });

        if (error) {
            throw error;
        }

        console.log("Booking confirmation email sent:", data.id);

        return data;

    } catch (error) {
        console.log("Email sending failed:", error.message);
        throw error;
    }
};

exports.sendCancellationEmail = async (to, bookingDetails) => {
    try {
        const { data, error } = await resend.emails.send({
            from: "onboarding@resend.dev",
            to: [to],
            subject: "Your QueueLess Booking Has Been Cancelled",
            template: {
                id: process.env.RESEND_CANCELLATION_TEMPLATE_ID,
                variables: {
                    USERNAME: bookingDetails.username,
                    ORGANIZATION_NAME: bookingDetails.orgName,
                    SERVICE_NAME: bookingDetails.service,
                    TOKEN_NUMBER: String(bookingDetails.tokenNumber),
                    BOOKING_DATE: bookingDetails.bookingDate,
                    TIME_SLOT: bookingDetails.timeSlot
                }
            }
        });

        if (error) {
            throw error;
        }

        console.log("Cancellation email sent:", data.id);
        return data;

    } catch (error) {
        console.log("Cancellation email failed:", error.message);
        throw error;
    }
};

exports.sendNextTokenEmail = async (to, bookingDetails) => {
    try {
        const { data, error } = await resend.emails.send({
            from: "onboarding@resend.dev",
            to: [to],
            subject: "Your Turn Is Next! - QueueLess",
            template: {
                id: process.env.RESEND_NEXT_TOKEN_TEMPLATE_ID,
                variables: {
                    USERNAME: bookingDetails.username,
                    ORGANIZATION_NAME: bookingDetails.orgName,
                    SERVICE_NAME: bookingDetails.service,
                    TOKEN_NUMBER: String(bookingDetails.tokenNumber)
                }
            }
        });

        if (error) {
            throw error;
        }

        console.log("Next-token email sent:", data.id);
        return data;

    } catch (error) {
        console.log("Next-token email failed:", error.message);
        throw error;
    }
};
