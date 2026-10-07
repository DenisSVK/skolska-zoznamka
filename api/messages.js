import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

function getUserId(req) {
    const cookies = req.headers.cookie || "";
    const match = cookies.match(/(?:^|;\s*)user_id=([^;]+)/);
    return match ? match[1] : null;
}

export default async function handler(req, res) {

    const userId = getUserId(req);

    if (!userId) {
        return res.status(401).json({
            error: "Nie si prihlásený."
        });
    }

    try {

        // NAČÍTANIE SPRÁV
        if (req.method === "GET") {

            const conversationId = req.query.conversation;

            if (!conversationId) {
                return res.status(400).json({
                    error: "Chýba ID chatu."
                });
            }

            // Overíme, že používateľ patrí do tohto chatu
            const conversation = await sql`
                SELECT id
                FROM conversations
                WHERE id = ${conversationId}
                AND (
                    user_one = ${userId}
                    OR user_two = ${userId}
                )
                LIMIT 1
            `;

            if (conversation.length === 0) {
                return res.status(403).json({
                    error: "K tomuto chatu nemáš prístup."
                });
            }

            const messages = await sql`
                SELECT
                    id,
                    sender_id,
                    message,
                    created_at,
                    CASE
                        WHEN sender_id = ${userId}
                        THEN true
                        ELSE false
                    END AS is_mine
                FROM messages
                WHERE conversation_id = ${conversationId}
                ORDER BY created_at ASC
            `;

            return res.status(200).json({
                messages
            });
        }


        // ODOSLANIE SPRÁVY
        if (req.method === "POST") {

            const {
                conversationId,
                message
            } = req.body;

            if (!conversationId || !message) {
                return res.status(400).json({
                    error: "Správa nemôže byť prázdna."
                });
            }

            const cleanMessage = message.trim();

            if (!cleanMessage) {
                return res.status(400).json({
                    error: "Správa nemôže byť prázdna."
                });
            }

            if (cleanMessage.length > 1000) {
                return res.status(400).json({
                    error: "Správa je príliš dlhá."
                });
            }

            // Overíme, že používateľ patrí do chatu
            const conversation = await sql`
                SELECT id
                FROM conversations
                WHERE id = ${conversationId}
                AND (
                    user_one = ${userId}
                    OR user_two = ${userId}
                )
                LIMIT 1
            `;

            if (conversation.length === 0) {
                return res.status(403).json({
                    error: "K tomuto chatu nemáš prístup."
                });
            }

            const result = await sql`
                INSERT INTO messages (
                    conversation_id,
                    sender_id,
                    message
                )
                VALUES (
                    ${conversationId},
                    ${userId},
                    ${cleanMessage}
                )
                RETURNING
                    id,
                    sender_id,
                    message,
                    created_at
            `;

            return res.status(201).json({
                message: result[0]
            });
        }


        return res.status(405).json({
            error: "Metóda nie je povolená."
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: "Nepodarilo sa pracovať so správami."
        });
    }
}
