import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

function getUserId(req) {
    const cookies = req.headers.cookie || "";

    const match = cookies.match(/(?:^|;\s*)user_id=([^;]+)/);

    return match ? match[1] : null;
}

export default async function handler(req, res) {

    if (req.method !== "GET") {
        return res.status(405).json({
            error: "Metóda nie je povolená."
        });
    }

    const userId = getUserId(req);

    if (!userId) {
        return res.status(401).json({
            error: "Nie si prihlásený."
        });
    }

    try {

        const conversations = await sql`
            SELECT
                c.id AS conversation_id,

                CASE
                    WHEN c.user_one = ${userId}
                    THEN p2.id
                    ELSE p1.id
                END AS user_id,

                CASE
                    WHEN c.user_one = ${userId}
                    THEN p2.username
                    ELSE p1.username
                END AS username,

                CASE
                    WHEN c.user_one = ${userId}
                    THEN p2.class_name
                    ELSE p1.class_name
                END AS class_name,

                CASE
                    WHEN c.user_one = ${userId}
                    THEN p2.profile_image
                    ELSE p1.profile_image
                END AS profile_image,

                (
                    SELECT m.message
                    FROM messages m
                    WHERE m.conversation_id = c.id
                    ORDER BY m.created_at DESC
                    LIMIT 1
                ) AS last_message,

                (
                    SELECT m.created_at
                    FROM messages m
                    WHERE m.conversation_id = c.id
                    ORDER BY m.created_at DESC
                    LIMIT 1
                ) AS last_message_time

            FROM conversations c

            JOIN profiles p1
                ON p1.id = c.user_one

            JOIN profiles p2
                ON p2.id = c.user_two

            WHERE c.user_one = ${userId}
               OR c.user_two = ${userId}

            ORDER BY
                last_message_time DESC NULLS LAST,
                c.created_at DESC
        `;

        return res.status(200).json({
            conversations
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: "Nepodarilo sa načítať chaty."
        });
    }
}
