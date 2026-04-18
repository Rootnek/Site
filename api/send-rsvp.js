export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { name, attendance, note } = req.body || {};

    if (!name || !name.trim()) {
        return res.status(400).json({ error: "Имя обязательно" });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        return res.status(500).json({
            error: "Не настроены TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID",
        });
    }

    const text =
        `📩 RSVP\n\n` +
        `👤 Имя: ${name}\n` +
        `📅 Присутствие: ${attendance || "Не указано"}\n` +
        `📝 Важная информация: ${note || "Нет"}`;

    try {
        const telegramRes = await fetch(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text,
                }),
            }
        );

        const data = await telegramRes.json();

        if (!data.ok) {
            throw new Error(data.description || "Telegram error");
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Telegram error:", error);
        return res.status(500).json({
            error: "Ошибка отправки в Telegram",
            details: error.message,
        });
    }
}