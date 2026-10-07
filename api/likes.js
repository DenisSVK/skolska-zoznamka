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

            const { toUser } = req.body;

            if (!toUser) {
                return res.status(400).json({
                    error: "Chýba používateľ."
                });
            }

            if (toUser === userId) {
                return res.status(400).json({
                    error: "Nemôžeš označiť vlastný profil."
                });
            }

            await sql`
                INSERT INTO likes (
                    from_user,
                    to_user
                )
                VALUES (
                    ${userId},
                    ${toUser}
                )
                ON CONFLICT (
                    from_user,
                    to_user
                )
                DO NOTHING
            `;

            const mutual = await sql`
                SELECT id
                FROM likes
                WHERE from_user = ${toUser}
                AND to_user = ${userId}
                LIMIT 1
            `;

            if (mutual.length > 0) {

                return res.status(200).json({
                    liked: true,
                    match: true
                });

            }

            return res.status(200).json({
                liked: true,
                match: false
            });
        }


        if (req.method === "GET") {

            const toUser = req.query.user;

            if (!toUser) {
                return res.status(400).json({
                    error: "Chýba používateľ."
                });
            }

            const result = await sql`
                SELECT id
                FROM likes
                WHERE from_user = ${userId}
                AND to_user = ${toUser}
                LIMIT 1
            `;

            return res.status(200).json({
                liked: result.length > 0
            });
        }


        return res.status(405).json({
            error: "Metóda nie je povolená."
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: "Nepodarilo sa spracovať like."
        });
    }
}
