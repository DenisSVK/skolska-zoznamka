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

        if (req.method === "POST") {

            const { otherUserId } = req.body;

            if (!otherUserId) {
                return res.status(400).json({
                    error: "Chýba používateľ."
                });
            }

            if (otherUserId === userId) {
                return res.status(400).json({
                    error: "Nemôžeš vytvoriť chat sám so sebou."
                });
            }

            // Kontrola, či existuje vzájomný like
            const match = await sql`
                SELECT 1
                FROM likes l1
                WHERE l1.from_user = ${userId}
                AND l1.to_user = ${otherUserId}

                AND EXISTS (
                    SELECT 1
                    FROM likes l2
                    WHERE l2.from_user = ${otherUserId}
                    AND l2.to_user = ${userId}
                )
                LIMIT 1
            `;

            if (match.length === 0) {
                return res.status(403).json({
                    error: "Chat je dostupný iba po vzájomnom matchi."
                });
            }

            // Skúsime nájsť existujúci chat
            const existing = await sql`
                SELECT id
                FROM conversations
                WHERE
                    (user_one = ${userId} AND user_two = ${otherUserId})
                    OR
                    (user_one = ${otherUserId} AND user_two = ${userId})
                LIMIT 1
            `;

            if (existing.length > 0) {
                return res.status(200).json({
                    conversationId: existing[0].id
                });
            }

            // Vytvorenie nového chatu
            const created = await sql`
                INSERT INTO conversations (
                    user_one,
                    user_two
                )
                VALUES (
                    ${userId},
                    ${otherUserId}
                )
                RETURNING id
            `;

            return res.status(201).json({
                conversationId: created[0].id
            });
        }

        return res.status(405).json({
            error: "Metóda nie je povolená."
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: "Nepodarilo sa vytvoriť chat."
        });
    }
}
